import dotenv from 'dotenv';
import { BountyBot } from './bot';
import { BotConfig } from './types';

// Load environment variables
dotenv.config();

// Validate required config
function validateConfig(): BotConfig {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!telegramToken || telegramToken === 'your_telegram_bot_token_here') {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set!');
    console.log('Please copy .env.example to .env and configure your bot token.');
    console.log('Get your bot token from @BotFather on Telegram.');
    process.exit(1);
  }

  const config: BotConfig = {
    telegramToken,
    githubOwner: process.env.GITHUB_OWNER || 'SolFoundry',
    githubRepo: process.env.GITHUB_REPO || 'solfoundry',
    githubToken: process.env.GITHUB_TOKEN,
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '60000'),
    webhookUrl: process.env.WEBHOOK_URL,
    port: parseInt(process.env.PORT || '3000'),
  };

  return config;
}

// Main entry point
async function main() {
  console.log('🚀 Starting SolFoundry Telegram Bot...\n');
  
  const config = validateConfig();
  
  // Print configuration (masked)
  console.log('📝 Configuration:');
  console.log(`   GitHub: ${config.githubOwner}/${config.githubRepo}`);
  console.log(`   Polling Interval: ${config.pollingInterval / 1000}s`);
  console.log(`   Mode: ${config.webhookUrl ? 'Webhook' : 'Polling'}`);
  console.log('');

  const bot = new BountyBot(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    bot.stop();
    process.exit(0);
  });

  // Start the bot
  await bot.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});