# FFXIV Server Status Discord Bot

A Discord bot that monitors the FFXIV Behemoth server status and notifies when character creation becomes available.

## Features

- 🔄 Automatically polls the FFXIV Lodestone server status page
- 📱 Sends Discord notifications **only when** character creation becomes available
- ✅ Alerts when character creation becomes available (Standard/Preferred status)
- 🤖 Health check slash command (`/healthcheck`) to verify bot status
- 🔔 Optional role ping when server becomes available
- ⏰ Configurable check interval (default: 5 minutes)
- 🔇 Silent monitoring - no spam when server stays unavailable

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Create Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token and the Application ID (Client ID)
4. Invite the bot to your server with "Send Messages" and "Use Slash Commands" permissions

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_client_id_here
CHANNEL_ID=your_channel_id_here
PING_ROLE_ID=your_role_id_here
DEV_MODE=false
CHECK_INTERVAL=5
```

To get the Channel ID:
- Enable Developer Mode in Discord (User Settings > App Settings > Advanced > Developer Mode)
- Right-click on the channel where you want notifications
- Select "Copy Channel ID"

To get the Client ID:
- In the Discord Developer Portal, go to your application
- Copy the "Application ID" from the General Information page

To get the Role ID (optional):
- Create a role for users who want to be notified (e.g., "FFXIV Notifications")
- Enable Developer Mode in Discord
- Right-click on the role in Server Settings > Roles
- Select "Copy Role ID"
- Leave this empty in .env if you don't want role pings

**DEV_MODE** (optional):
- Set to `true` for development to receive all status change notifications
- Set to `false` (or omit) for production - only notifies when server becomes available

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
4. **Production mode**: Only sends notifications when server becomes available (Standard/Preferred)
5. **Dev mode**: Sends notifications for all status changes (useful for testing)
6. Optionally pings a configurable role when server becomes available
7. Registers a `/healthcheck` slash command to verify bot status
8. Uses colored embeds (green for available, red for unavailable)

## Server Status Types

- **Standard**: Character creation available ✅
- **Preferred**: Character creation available with bonuses ✅
- **Congested**: Character creation unavailable ❌

## Commands

- `/healthcheck` - Shows bot status, current server status, uptime, and last check time

## Troubleshooting

- Make sure your bot has "Send Messages" and "Use Slash Commands" permissions
- If using role pings, ensure the bot can mention the role (role must be lower than bot's highest role)
- Check that your Discord token, client ID, and channel ID are correct
- The bot requires internet access to fetch the Lodestone page
- Use `/healthcheck` to verify the bot is running and monitoring properly
- Check console logs for error messages
