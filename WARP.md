# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
A Node.js Discord bot that monitors FFXIV Behemoth server status and sends notifications when character creation becomes available. The bot uses web scraping to check the official FFXIV Lodestone world status page periodically.

## Development Commands

### Setup
```bash
yarn install
cp .env.example .env
# Edit .env with your Discord bot credentials
```

### Running
```bash
yarn dev      # Development with auto-restart (uses --watch)
yarn start    # Production mode
```

### Testing Bot Functionality
Use the Discord slash command `/healthcheck` to verify bot status, current server status, uptime, and last check time.

## Architecture

### Core Components
- **FFXIVServerMonitor class**: Main bot logic with Discord.js client and monitoring functionality
- **Web scraping**: Uses axios + cheerio to parse FFXIV Lodestone world status page
- **Discord integration**: Embeds, slash commands, and optional role pinging
- **Environment-based configuration**: All sensitive data and settings via .env

### Key Features
- **Dual notification modes**: 
  - Production: Only notifies when server becomes available (Standard/Preferred status)
  - Dev mode (`DEV_MODE=true`): Notifies on all status changes
- **Configurable monitoring**: Check interval, role pinging, channel targeting
- **Health monitoring**: Built-in slash command for status verification

### Data Flow
1. Periodic polling (default 5 minutes) of FFXIV Lodestone
2. HTML parsing to extract Behemoth server status
3. Status comparison with previous check
4. Conditional Discord notification based on mode and availability change
5. Status persistence for comparison on next check

### Configuration
All configuration through environment variables in `.env`:
- `DISCORD_TOKEN`, `CLIENT_ID`, `CHANNEL_ID` (required)
- `PING_ROLE_ID` (optional role to mention)
- `DEV_MODE` (boolean for notification behavior)
- `CHECK_INTERVAL` (minutes between status checks)

## Code Patterns
- Single-class architecture with clear method separation
- Async/await for all Discord and HTTP operations
- Error handling with console logging
- Embedded Discord messages for rich notifications
- Graceful startup with initialization confirmation