import TelegramBot from 'node-telegram-bot-api';
import { Bounty, BountyTier, BountyDomain, BotConfig } from './types';
import { GitHubClient } from './github';
import { SubscriptionManager } from './subscriptions';

// Emoji icons
const ICONS = {
  tier1: '⚡',
  tier2: '🔥',
  tier3: '💎',
  frontend: '🎨',
  backend: '⚙️',
  contracts: '🔐',
  creative: '🎬',
  docs: '📚',
  security: '🛡️',
  infrastructure: '🏗️',
  bounty: '🏭',
  details: '📋',
  claim: '🎯',
  subscribe: '🔔',
  unsubscribe: '🔕',
  check: '✅',
};

export class BountyBot {
  private bot: TelegramBot;
  private github: GitHubClient;
  private subscriptions: SubscriptionManager;
  private config: BotConfig;
  private knownBounties: Set<number> = new Set();
  private pollingInterval?: NodeJS.Timeout;

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.telegramToken, { polling: true });
    this.github = new GitHubClient(config.githubOwner, config.githubRepo, config.githubToken);
    this.subscriptions = new SubscriptionManager();
    
    this.setupCommands();
    this.setupCallbacks();
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    console.log('🤖 SolFoundry Bounty Bot started!');
    
    // Fetch initial bounties to populate known set
    await this.fetchInitialBounties();
    
    // Start polling for new bounties
    this.startPolling();
    
    console.log(`📡 Monitoring ${this.config.githubOwner}/${this.config.githubRepo} for new bounties`);
  }

  /**
   * Stop the bot
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.bot.stopPolling();
    console.log('🛑 Bot stopped');
  }

  /**
   * Setup bot commands
   */
  private setupCommands(): void {
    // /start - Welcome message and subscription prompt
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
👋 *Welcome to SolFoundry Bounty Bot!*

I'm here to notify you about new bounties on SolFoundry.

*Features:*
• Real-time bounty notifications
• Filter by tier (T1/T2/T3)
• Filter by domain (Frontend, Backend, etc.)
• Quick claim buttons

*Commands:*
/subscribe - Subscribe to bounty notifications
/unsubscribe - Unsubscribe from notifications
/my_subscriptions - View your current subscriptions
/bounties - List current open bounties
/help - Show this help message

_Use /subscribe to get started!_
      `;
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /help - Show help
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
📖 *Help*

*Commands:*
/start - Welcome message
/subscribe - Set up your bounty preferences
/unsubscribe - Stop receiving notifications
/my_subscriptions - View your current settings
/bounties - List all open bounties
/help - Show this message

*Bounty Tiers:*
${ICONS.tier1} Tier 1: 50-500 $FNDRY (Open race, anyone)
${ICONS.tier2} Tier 2: 500-5K $FNDRY (Gated)
${ICONS.tier3} Tier 3: 5K-50K $FNDRY (Claim-based)

*Domains:*
Frontend, Backend, Contracts, Creative, Docs, Security, Infrastructure

Click /subscribe to configure your preferences!
      `;
      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // /subscribe - Setup subscription with inline keyboard
    this.bot.onText(/\/subscribe/, (msg) => {
      this.handleSubscribe(msg);
    });

    // /unsubscribe - Remove subscription
    this.bot.onText(/\/unsubscribe/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (userId && this.subscriptions.isSubscribed(userId)) {
        this.subscriptions.unsubscribe(userId);
        this.bot.sendMessage(chatId, 
          `${ICONS.unsubscribe} You've been unsubscribed from bounty notifications.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        this.bot.sendMessage(chatId, 
          "You weren't subscribed yet. Use /subscribe to get started!",
          { parse_mode: 'Markdown' }
        );
      }
    });

    // /my_subscriptions - Show current subscription
    this.bot.onText(/\/my_subscriptions/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      if (userId) {
        const sub = this.subscriptions.getSubscription(userId);
        if (sub) {
          const tiersText = sub.subscribedTiers.map(t => `${this.getTierIcon(t)} ${t.toUpperCase()}`).join(', ');
          const domainsText = sub.subscribedDomains.map(d => `${this.getDomainIcon(d)} ${d}`).join(', ');
          
          this.bot.sendMessage(chatId, 
            `📊 *Your Subscriptions*\n\n*Tiers:* ${tiersText}\n\n*Domains:* ${domainsText}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          this.bot.sendMessage(chatId, 
            "You don't have any subscriptions yet. Use /subscribe to get started!",
            { parse_mode: 'Markdown' }
          );
        }
      }
    });

    // /bounties - List current bounties
    this.bot.onText(/\/bounties/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendBountyList(chatId);
    });
  }

  /**
   * Handle subscribe command with interactive keyboard
   */
  private handleSubscribe(msg: TelegramBot.Message): void {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: `${ICONS.tier1} Tier 1`, callback_data: 'sub_tier_tier-1' },
        { text: `${ICONS.tier2} Tier 2`, callback_data: 'sub_tier_tier-2' },
        { text: `${ICONS.tier3} Tier 3`, callback_data: 'sub_tier_tier-3' },
      ],
      [
        { text: '✅ All Tiers', callback_data: 'sub_tier_all' },
      ],
    ];

    this.bot.sendMessage(chatId, 
      `🔔 *Select Bounty Tiers*\n\nChoose which tier(s) you want to be notified about:`,
      { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  /**
   * Setup callback query handlers
   */
  private setupCallbacks(): void {
    this.bot.on('callback_query', async (query) => {
      const { data, message, from } = query;
      
      if (!data || !message || !from) return;
      
      const chatId = message.chat.id;
      const userId = from.id;

      try {
        await this.bot.answerCallbackQuery(query.id);

        // Handle tier selection
        if (data.startsWith('sub_tier_')) {
          const tier = data.replace('sub_tier_', '');
          
          if (tier === 'all') {
            // Show domain selection for all tiers
            this.showDomainSelection(chatId, userId, ['tier-1', 'tier-2', 'tier-3']);
          } else {
            this.showDomainSelection(chatId, userId, [tier as BountyTier]);
          }
          return;
        }

        // Handle domain selection
        if (data.startsWith('sub_domain_')) {
          const domain = data.replace('sub_domain_', '');
          
          if (domain === 'all') {
            this.finalizeSubscription(chatId, userId, null, null);
          } else {
            const sub = this.subscriptions.getSubscription(userId);
            this.finalizeSubscription(chatId, userId, sub?.subscribedTiers || [], [domain as BountyDomain]);
          }
          return;
        }

        // Handle confirm subscription
        if (data === 'sub_confirm') {
          const sub = this.subscriptions.getSubscription(userId);
          if (sub) {
            const tiersText = sub.subscribedTiers.map(t => t.toUpperCase()).join(', ');
            const domainsText = sub.subscribedDomains.length === 7 
              ? 'All domains' 
              : sub.subscribedDomains.join(', ');
            
            await this.bot.editMessageText(
              `${ICONS.check} *Subscription Confirmed!*\n\nYou'll be notified about:\n• Tiers: ${tiersText}\n• Domains: ${domainsText}`,
              {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
              }
            );
          }
          return;
        }

        // Handle bounty actions
        if (data.startsWith('bounty_')) {
          const parts = data.split('_');
          const action = parts[1];
          const bountyNumber = parseInt(parts[2]);

          if (action === 'details') {
            await this.sendBountyDetails(chatId, bountyNumber);
          } else if (action === 'claim') {
            await this.sendClaimInfo(chatId, bountyNumber);
          }
        }

      } catch (error) {
        console.error('Error handling callback:', error);
      }
    });
  }

  /**
   * Show domain selection keyboard
   */
  private showDomainSelection(chatId: number, userId: number, tiers: BountyTier[]): void {
    // Save tiers temporarily
    this.subscriptions.subscribe(userId, chatId, tiers, []);

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: `${ICONS.frontend} Frontend`, callback_data: 'sub_domain_frontend' },
        { text: `${ICONS.backend} Backend`, callback_data: 'sub_domain_backend' },
      ],
      [
        { text: `${ICONS.contracts} Contracts`, callback_data: 'sub_domain_contracts' },
        { text: `${ICONS.creative} Creative`, callback_data: 'sub_domain_creative' },
      ],
      [
        { text: `${ICONS.docs} Docs`, callback_data: 'sub_domain_docs' },
        { text: `${ICONS.security} Security`, callback_data: 'sub_domain_security' },
      ],
      [
        { text: `${ICONS.infrastructure} Infrastructure`, callback_data: 'sub_domain_infrastructure' },
      ],
      [
        { text: '✅ All Domains', callback_data: 'sub_domain_all' },
      ],
    ];

    this.bot.sendMessage(chatId, 
      `🎯 *Select Domains*\n\nChoose which domain(s) you're interested in:`,
      { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  /**
   * Finalize subscription
   */
  private finalizeSubscription(
    chatId: number, 
    userId: number, 
    tiers: BountyTier[] | null, 
    domains: BountyDomain[] | null
  ): void {
    const finalTiers = tiers || ['tier-1', 'tier-2', 'tier-3'];
    const finalDomains = domains || ['frontend', 'backend', 'contracts', 'creative', 'docs', 'security', 'infrastructure'];

    this.subscriptions.subscribe(userId, chatId, finalTiers, finalDomains);

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [{ text: '✅ Confirm Subscription', callback_data: 'sub_confirm' }],
    ];

    const tiersText = finalTiers.map(t => `${this.getTierIcon(t)} ${t.toUpperCase()}`).join(', ');
    const domainsText = finalDomains.length === 7 
      ? 'All domains' 
      : finalDomains.map(d => `${this.getDomainIcon(d)} ${d}`).join(', ');

    this.bot.sendMessage(chatId, 
      `📝 *Confirm Your Subscription*\n\nYou'll be notified about:\n\n*Tier(s):* ${tiersText}\n\n*Domain(s):* ${domainsText}`,
      { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  /**
   * Fetch initial bounties to populate known set
   */
  private async fetchInitialBounties(): Promise<void> {
    try {
      const issues = await this.github.getBountyIssues();
      issues.forEach(issue => {
        this.knownBounties.add(issue.number);
      });
      console.log(`📊 Loaded ${issues.length} existing bounties`);
    } catch (error) {
      console.error('Error fetching initial bounties:', error);
    }
  }

  /**
   * Start polling for new bounties
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewBounties();
    }, this.config.pollingInterval);
  }

  /**
   * Check for new bounties and notify subscribers
   */
  private async checkForNewBounties(): Promise<void> {
    try {
      const issues = await this.github.getBountyIssues();
      
      for (const issue of issues) {
        if (!this.knownBounties.has(issue.number)) {
          // New bounty found!
          this.knownBounties.add(issue.number);
          
          const bounty = this.github.parseBounty(issue);
          await this.notifySubscribers(bounty);
        }
      }
    } catch (error) {
      console.error('Error checking for new bounties:', error);
    }
  }

  /**
   * Send notification to all matching subscribers
   */
  private async notifySubscribers(bounty: Bounty): Promise<void> {
    const matchingSubs = this.subscriptions.findMatchingSubscriptions(
      [bounty.tier],
      bounty.domains
    );

    for (const sub of matchingSubs) {
      await this.sendBountyNotification(sub.chatId, bounty);
    }

    if (matchingSubs.length > 0) {
      console.log(`📢 Notified ${matchingSubs.length} users about bounty #${bounty.number}: ${bounty.title}`);
    }
  }

  /**
   * Send bounty notification with inline buttons
   */
  private async sendBountyNotification(chatId: number, bounty: Bounty): Promise<void> {
    const tierIcon = this.getTierIcon(bounty.tier);
    const domainIcons = bounty.domains.map(d => this.getDomainIcon(d)).join(' ');
    
    const message = `
${ICONS.bounty} *New Bounty!*

*${bounty.title}*

${tierIcon} ${bounty.tier.toUpperCase()} | ${domainIcons}
💰 Reward: ${bounty.reward}

_${bounty.description}_
    `.trim();

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: `${ICONS.details} View Details`, callback_data: `bounty_details_${bounty.number}` },
        { text: `${ICONS.claim} Claim`, callback_data: `bounty_claim_${bounty.number}` },
      ],
    ];

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  /**
   * Send bounty details
   */
  private async sendBountyDetails(chatId: number, bountyNumber: number): Promise<void> {
    const issue = await this.github.getIssue(bountyNumber);
    
    if (!issue) {
      await this.bot.sendMessage(chatId, '❌ Bounty not found');
      return;
    }

    const bounty = this.github.parseBounty(issue);
    const tierIcon = this.getTierIcon(bounty.tier);
    const domainIcons = bounty.domains.map(d => this.getDomainIcon(d)).join(' ');

    const message = `
📋 *Bounty #${bounty.number}*

*${bounty.title}*

${tierIcon} *Tier:* ${bounty.tier.toUpperCase()}
${domainIcons} *Domain(s):* ${bounty.domains.join(', ')}
💰 *Reward:* ${bounty.reward}
👤 *Author:* @${bounty.author}

*Description:*
${bounty.description}

🔗 [View on GitHub](${bounty.url})
    `.trim();

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Send claim info
   */
  private async sendClaimInfo(chatId: number, bountyNumber: number): Promise<void> {
    const issue = await this.github.getIssue(bountyNumber);
    
    if (!issue) {
      await this.bot.sendMessage(chatId, '❌ Bounty not found');
      return;
    }

    const bounty = this.github.parseBounty(issue);
    const tier = bounty.tier;

    let instructions = `
🎯 *How to Claim Bounty #${bountyNumber}*

1. Fork the [SolFoundry repository](https://github.com/SolFoundry/solfoundry)
2. Check the bounty details and acceptance criteria
3. Create a branch and implement your solution
4. Open a PR with: \`Closes #${bountyNumber}\` + your Solana wallet address
5. Wait for AI code review (score ≥ 6.0/10)
6. On merge, receive ${bounty.reward}
    `;

    if (tier === 'tier-3') {
      instructions += `\n\n⚠️ *Note:* Tier 3 bounties require 3+ merged T2 bounties to claim.`;
    } else if (tier === 'tier-2') {
      instructions += `\n\n⚠️ *Note:* Tier 2 bounties require 4+ merged T1 bounties to access.`;
    }

    await this.bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });
  }

  /**
   * Send list of current bounties
   */
  private async sendBountyList(chatId: number): Promise<void> {
    const issues = await this.github.getBountyIssues();
    
    if (issues.length === 0) {
      await this.bot.sendMessage(chatId, '📭 No open bounties at the moment.');
      return;
    }

    let message = `📋 *Open Bounties (${issues.length})*\n\n`;

    for (const issue of issues.slice(0, 10)) {
      const bounty = this.github.parseBounty(issue);
      const tierIcon = this.getTierIcon(bounty.tier);
      message += `${tierIcon} [${bounty.title}](${bounty.url}) - ${bounty.reward}\n`;
    }

    if (issues.length > 10) {
      message += `\n_...and ${issues.length - 10} more_`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Get emoji icon for tier
   */
  private getTierIcon(tier: BountyTier): string {
    switch (tier) {
      case 'tier-1': return ICONS.tier1;
      case 'tier-2': return ICONS.tier2;
      case 'tier-3': return ICONS.tier3;
    }
  }

  /**
   * Get emoji icon for domain
   */
  private getDomainIcon(domain: BountyDomain): string {
    switch (domain) {
      case 'frontend': return ICONS.frontend;
      case 'backend': return ICONS.backend;
      case 'contracts': return ICONS.contracts;
      case 'creative': return ICONS.creative;
      case 'docs': return ICONS.docs;
      case 'security': return ICONS.security;
      case 'infrastructure': return ICONS.infrastructure;
    }
  }
}