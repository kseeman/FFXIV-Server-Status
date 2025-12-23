const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`Bot logged in as ${this.client.user.tag}!`);
            this.initializeMonitoring();
        });

        this.client.on('error', console.error);
    }

    async initializeMonitoring() {
        try {
            this.channel = await this.client.channels.fetch(this.channelId);
            console.log(`Connected to channel: ${this.channel.name}`);
            
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
            
            if (status && status !== this.lastStatus) {
                await this.sendStatusUpdate(status);
                this.lastStatus = status;
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

    async sendStatusUpdate(status) {
        if (!this.channel) return;

        const isAvailable = status === 'Standard' || status === 'Preferred' || status === 'Preferred+';
        const color = isAvailable ? 0x00ff00 : 0xff0000; // Green if available, red if not
        const title = isAvailable ? '✅ Behemoth Server - Character Creation Available!' : '❌ Behemoth Server - Character Creation Unavailable';
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Server Status: **${status}**`)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: 'FFXIV Server Monitor' });

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
                    name: 'Status', 
                    value: 'Character creation is currently unavailable. The bot will notify when it becomes available.', 
                    inline: false 
                }
            ]);
        }

        try {
            await this.channel.send({ embeds: [embed] });
            console.log(`Status update sent: ${status}`);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    start() {
        if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID) {
            console.error('Missing required environment variables. Please check your .env file.');
            console.error('Required: DISCORD_TOKEN, CHANNEL_ID');
            process.exit(1);
        }

        this.client.login(process.env.DISCORD_TOKEN);
    }
}

// Start the bot
const monitor = new FFXIVServerMonitor();
monitor.start();