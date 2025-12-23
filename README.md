# FFXIV Server Status Discord Bot

A Discord bot that monitors the FFXIV Behemoth server status and notifies when character creation becomes available.

## Features

- 🔄 Automatically polls the FFXIV Lodestone server status page
- 📱 Sends Discord notifications when Behemoth server status changes
- ✅ Alerts when character creation becomes available (Standard/Preferred status)
- ❌ Notifies when character creation becomes unavailable (Congested status)
- ⏰ Configurable check interval (default: 5 minutes)

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Create Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token
4. Invite the bot to your server with "Send Messages" permissions

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CHANNEL_ID=your_channel_id_here
CHECK_INTERVAL=5
```

To get the Channel ID:
- Enable Developer Mode in Discord (User Settings > App Settings > Advanced > Developer Mode)
- Right-click on the channel where you want notifications
- Select "Copy Channel ID"

### 4. Run the Bot

For development (with auto-restart):
```bash
yarn dev
```

For production:
```bash
yarn start
```

## How It Works

The bot:
1. Fetches the FFXIV Lodestone world status page every 5 minutes (configurable)
2. Parses the HTML to find Behemoth's current status
3. Compares with the previous status
4. Sends a Discord notification if the status changed
5. Uses colored embeds (green for available, red for unavailable)

## Server Status Types

- **Standard**: Character creation available ✅
- **Preferred**: Character creation available with bonuses ✅
- **Congested**: Character creation unavailable ❌

## Troubleshooting

- Make sure your bot has "Send Messages" permission in the target channel
- Check that your Discord token and channel ID are correct
- The bot requires internet access to fetch the Lodestone page
- Check console logs for error messages