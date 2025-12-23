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
        this.pingRoleId = process.env.PING_ROLE_ID; // Optional role to ping
        this.devMode = process.env.DEV_MODE === 'true'; // Feature toggle for dev notifications
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
            
            if (status) {
                const isNowAvailable = status === 'Standard' || status === 'Preferred' || status === 'Preferred+';
                const wasAvailable = this.lastStatus === 'Standard' || this.lastStatus === 'Preferred' || this.lastStatus === 'Preferred+';
                const hasStatusChanged = status !== this.lastStatus;
                
                // Send notification based on mode
                let shouldNotify = false;
                if (this.devMode) {
                    // Dev mode: notify every check regardless of status change
                    shouldNotify = true;
                    if (hasStatusChanged) {
                        console.log(`[DEV MODE] Status changed: ${this.lastStatus || 'Unknown'} → ${status}`);
                    } else {
                        console.log(`[DEV MODE] Status unchanged: ${status} (periodic notification)`);
                    }
                } else {
                    // Production mode: only notify when server becomes available
                    shouldNotify = isNowAvailable && !wasAvailable && hasStatusChanged;
                }
                
                if (shouldNotify) {
                    await this.sendStatusUpdate(status, isNowAvailable, hasStatusChanged);
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

        const notificationMode = this.devMode ? 'Every check regardless of status (DEV MODE)' : 'Only when server becomes available';
        const embed = new EmbedBuilder()
            .setTitle(`🤖 FFXIV Server Monitor Started ${this.devMode ? '(DEV MODE)' : ''}`)
            .setDescription('Bot is now monitoring Behemoth server status')
            .setColor(this.devMode ? 0xff9900 : 0x0099ff) // Orange for dev mode
            .setTimestamp()
            .setFooter({ text: 'FFXIV Server Monitor' })
            .addFields([
                { 
                    name: '📋 Configuration', 
                    value: `Check interval: ${this.checkInterval / (60 * 1000)} minutes\nNotifications: ${notificationMode}`, 
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
            console.log(`Startup message sent successfully ${this.devMode ? '(DEV MODE)' : ''}`);
        } catch (error) {
            console.error('Error sending startup message:', error);
            throw error; // Re-throw to handle in initializeMonitoring
        }
    }

    async sendStatusUpdate(status, isAvailable, hasStatusChanged = true) {
        if (!this.channel) return;

        const color = isAvailable ? 0x00ff00 : 0xff0000; // Green if available, red if not
        
        let title;
        if (this.devMode && !hasStatusChanged) {
            // Dev mode periodic notification
            title = isAvailable 
                ? '🔄 Behemoth Server - Still Available (Periodic Check)' 
                : '🔄 Behemoth Server - Still Unavailable (Periodic Check)';
        } else {
            // Status change notification (or production mode)
            title = isAvailable 
                ? '✅ Behemoth Server - Character Creation Available!' 
                : '❌ Behemoth Server - Character Creation Unavailable';
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Server Status: **${status}**`)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `FFXIV Server Monitor${this.devMode ? ' (DEV MODE)' : ''}` });

        if (isAvailable) {
            embed.addFields([
                { 
                    name: '🎉 Good News!', 
                    value: 'You can now create new characters on Behemoth server!', 
                    inline: false 
                }
            ]);
        } else {
            embed.addFields([
                { 
                    name: 'Status Update', 
                    value: 'Character creation is currently unavailable. The bot will notify when it becomes available.', 
                    inline: false 
                }
            ]);
        }

        // Prepare message content with optional role ping
        let messageContent = '';
        if (this.pingRoleId) {
            // In dev mode, ping for all notifications; in production, only for availability
            if (this.devMode || isAvailable) {
                messageContent = `<@&${this.pingRoleId}>`;
            }
        }

        try {
            await this.channel.send({ 
                content: messageContent,
                embeds: [embed] 
            });
            const shouldPing = this.pingRoleId && (this.devMode || isAvailable);
            const pingText = shouldPing ? ' (with role ping)' : '';
            const modeText = this.devMode ? ' [DEV MODE]' : '';
            console.log(`Status notification sent: ${status}${pingText}${modeText}`);
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