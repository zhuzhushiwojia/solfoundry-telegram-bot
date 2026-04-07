# SolFoundry Telegram Bounty Bot

A Telegram bot that provides real-time notifications for new SolFoundry bounties with inline buttons for viewing details and quick claim instructions.

## Features

- 🔔 **Real-time Notifications** - Instantly notifies users when new bounties are posted
- 🎯 **Tier Filtering** - Filter by Tier 1 (50-500 $FNDRY), Tier 2 (500-5K $FNDRY), or Tier 3 (5K-50K $FNDRY)
- 🏷️ **Domain Filtering** - Filter by Frontend, Backend, Contracts, Creative, Docs, Security, or Infrastructure
- 📋 **Inline Buttons** - Quick access to bounty details and claim instructions
- ⚡ **Fast Polling** - Checks for new bounties every 60 seconds (configurable)

## Prerequisites

- Node.js 18+
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))
- GitHub API (optional, for higher rate limits)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/solfoundry-telegram-bot.git
cd solfoundry-telegram-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## Configuration

Edit `.env` file with your settings:

```env
# Required: Your Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# GitHub repository to monitor
GITHUB_OWNER=SolFoundry
GITHUB_REPO=solfoundry

# Optional: GitHub token for higher API rate limits
GITHUB_TOKEN=your_github_token

# Polling interval in milliseconds (default: 60000 = 60 seconds)
POLLING_INTERVAL=60000

# Port for webhook mode (optional)
PORT=3000
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build the project
npm run build

# Start the bot
npm start
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and getting started guide |
| `/subscribe` | Set up bounty notification preferences |
| `/unsubscribe` | Stop receiving notifications |
| `/my_subscriptions` | View current subscription settings |
| `/bounties` | List all open bounties |
| `/help` | Show help information |

## Bot Interaction Flow

1. **Start**: User sends `/start` to get welcome message
2. **Subscribe**: User sends `/subscribe` to configure preferences
   - Select tier(s): T1, T2, T3, or All
   - Select domain(s): Frontend, Backend, etc., or All
3. **Confirm**: Confirm subscription to start receiving notifications
4. **Notifications**: Receive real-time alerts when matching bounties are posted
5. **Action**: Click inline buttons to view details or get claim instructions

## Project Structure

```
solfoundry-telegram-bot/
├── src/
│   ├── index.ts          # Main entry point
│   ├── bot.ts            # Telegram bot logic
│   ├── github.ts         # GitHub API client
│   ├── subscriptions.ts # User subscription manager
│   └── types.ts          # TypeScript type definitions
├── .env.example          # Environment configuration template
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Deployment

### VPS/Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

CMD ["npm", "start"]
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token |
| `GITHUB_OWNER` | No | GitHub organization (default: SolFoundry) |
| `GITHUB_REPO` | No | GitHub repository (default: solfoundry) |
| `GITHUB_TOKEN` | No | GitHub token for higher rate limits |
| `POLLING_INTERVAL` | No | Polling interval in ms (default: 60000) |
| `WEBHOOK_URL` | No | Webhook URL (for webhook mode) |
| `PORT` | No | Server port (default: 3000) |

## License

MIT

## Contributing

This bot is part of the SolFoundry bounty system. To contribute:
1. Find a bounty on [GitHub Issues](https://github.com/SolFoundry/solfoundry/issues)
2. Submit a PR with `Closes #<issue_number>` and your Solana wallet address
3. Get approved by AI code review → earn $FNDRY!