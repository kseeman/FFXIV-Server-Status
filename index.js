const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

class FFXIVServerMonitor {
    constructor() {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
        });
        
        this.channelId = process.env.CHANNEL_ID;
        this.checkInterval = (process.env.CHECK_INTERVAL || 5) * 60 * 1000; // Convert minutes to milliseconds
        this.lastStatus = null;
        this.channel = null;
        this.lastCheckTime = null;
        
        this.setupEventHandlers();
        this.setupSlashCommands();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`Bot logged in as ${this.client.user.tag}!`);
            this.initializeMonitoring();
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'healthcheck') {
                await this.handleHealthCheck(interaction);
            }
        });

        this.client.on('error', console.error);
    }

    async initializeMonitoring() {
        try {
            this.channel = await this.client.channels.fetch(this.channelId);
            console.log(`Connected to channel: ${this.channel.name}`);
            
            // Send startup confirmation message
            await this.sendStartupMessage();
            
            // Send initial status check
            await this.checkServerStatus();
            
            // Start periodic checking
            setInterval(() => {
                this.checkServerStatus();
            }, this.checkInterval);
            
        } catch (error) {
            console.error('Failed to initialize monitoring:', error);
        }
    }

    async checkServerStatus() {
        try {
            console.log('Checking Behemoth server status...');
            const status = await this.fetchServerStatus();
            this.lastCheckTime = new Date();
            
            if (status && status !== this.lastStatus) {
                // Only send message if server becomes available (Standard or Preferred)
                const isNowAvailable = status === 'Standard' || status === 'Preferred' || status === 'Preferred+';
                const wasAvailable = this.lastStatus === 'Standard' || this.lastStatus === 'Preferred' || this.lastStatus === 'Preferred+';
                
                if (isNowAvailable && !wasAvailable) {
                    await this.sendStatusUpdate(status);
                }
                
                this.lastStatus = status;
                console.log(`Server status: ${status} (${isNowAvailable ? 'Available' : 'Unavailable'})`);
            }
        } catch (error) {
            console.error('Error checking server status:', error);
        }
    }

    async fetchServerStatus() {
        try {
            const response = await axios.get('https://na.finalfantasyxiv.com/lodestone/worldstatus', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            
            // Look for Behemoth server status
            // The structure appears to be server names with status indicators
            let behemothStatus = null;
            
            // Search for Behemoth in the page content
            $('*').each((i, element) => {
                const text = $(element).text().trim();
                if (text.includes('Behemoth')) {
                    // Look for status indicators nearby
                    const parent = $(element).parent();
                    const statusText = parent.text();
                    
                    if (statusText.includes('Congested')) {
                        behemothStatus = 'Congested';
                    } else if (statusText.includes('Standard')) {
                        behemothStatus = 'Standard';
                    } else if (statusText.includes('Preferred')) {
                        behemothStatus = 'Preferred';
                    }
                }
            });

            // Alternative approach: look for the specific pattern in the text
            const pageText = $.text();
            const behemothMatch = pageText.match(/Behemoth\s+(Congested|Standard|Preferred\+?)/i);
            if (behemothMatch) {
                behemothStatus = behemothMatch[1];
            }

            return behemothStatus;
        } catch (error) {
            console.error('Error fetching server status:', error);
            throw error;
        }
    }

    async sendStartupMessage() {
        if (!this.channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🤖 FFXIV Server Monitor Started')
            .setDescription('Bot is now monitoring Behemoth server status')
            .setColor(0x0099ff)
            .setTimestamp()
            .setFooter({ text: 'FFXIV Server Monitor' })
            .addFields([
                { 
                    name: '📋 Configuration', 
                    value: `Check interval: ${this.checkInterval / (60 * 1000)} minutes\nNotifications: Only when server becomes available`, 
                    inline: false 
                },
                {
                    name: '🔧 Commands',
                    value: 'Use `/healthcheck` to verify bot status anytime',
                    inline: false
                }
            ]);

        try {
            await this.channel.send({ embeds: [embed] });
            console.log('Startup message sent successfully');
        } catch (error) {
            console.error('Error sending startup message:', error);
            throw error; // Re-throw to handle in initializeMonitoring
        }
    }

    async sendStatusUpdate(status) {
        if (!this.channel) return;

        const embed = new EmbedBuilder()
            .setTitle('✅ Behemoth Server - Character Creation Available!')
            .setDescription(`Server Status: **${status}**`)
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: 'FFXIV Server Monitor' })
            .addFields([
                { 
                    name: '🎉 Good News!', 
                    value: 'You can now create new characters on Behemoth server!', 
                    inline: false 
                }
            ]);

        try {
            await this.channel.send({ embeds: [embed] });
            console.log(`Availability notification sent: ${status}`);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async setupSlashCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('healthcheck')
                .setDescription('Check if the FFXIV server monitor bot is running and show current status')
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log('Started refreshing application (/) commands.');

            // For global commands (available in all servers)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('Error setting up slash commands:', error);
        }
    }

    async handleHealthCheck(interaction) {
        try {
            const status = this.lastStatus || 'Unknown';
            const isAvailable = status === 'Standard' || status === 'Preferred' || status === 'Preferred+';
            const lastCheck = this.lastCheckTime ? this.lastCheckTime.toLocaleString() : 'Never';
            const uptime = process.uptime();
            const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

            const embed = new EmbedBuilder()
                .setTitle('🤖 FFXIV Server Monitor - Health Check')
                .setColor(0x0099ff)
                .setTimestamp()
                .addFields([
                    { name: '✅ Bot Status', value: 'Online and running', inline: true },
                    { name: '🎮 Behemoth Server', value: `${status} ${isAvailable ? '(Available)' : '(Unavailable)'}`, inline: true },
                    { name: '⏰ Last Check', value: lastCheck, inline: true },
                    { name: '📈 Uptime', value: uptimeStr, inline: true },
                    { name: '🔄 Check Interval', value: `${this.checkInterval / (60 * 1000)} minutes`, inline: true },
                    { name: '📢 Channel', value: `<#${this.channelId}>`, inline: true }
                ])
                .setFooter({ text: 'Bot only sends notifications when server becomes available' });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in health check:', error);
            await interaction.reply({ content: 'Error occurred while checking bot health.', ephemeral: true });
        }
    }

    start() {
        if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID || !process.env.CLIENT_ID) {
            console.error('Missing required environment variables. Please check your .env file.');
            console.error('Required: DISCORD_TOKEN, CHANNEL_ID, CLIENT_ID');
            process.exit(1);
        }

        this.client.login(process.env.DISCORD_TOKEN);
    }
}

// Start the bot
const monitor = new FFXIVServerMonitor();
monitor.start();