import { UserSubscription, BountyTier, BountyDomain } from './types';

/**
 * Manages user subscriptions for bounty notifications
 */
export class SubscriptionManager {
  private subscriptions: Map<number, UserSubscription> = new Map();

  /**
   * Add or update a user's subscription
   */
  subscribe(
    userId: number,
    chatId: number,
    tiers: BountyTier[],
    domains: BountyDomain[]
  ): UserSubscription {
    const existing = this.subscriptions.get(userId);
    const subscription: UserSubscription = {
      userId,
      chatId,
      subscribedTiers: tiers.length > 0 ? tiers : ['tier-1', 'tier-2', 'tier-3'],
      subscribedDomains: domains.length > 0 ? domains : ['frontend', 'backend', 'contracts', 'creative', 'docs', 'security', 'infrastructure'],
      createdAt: existing?.createdAt || new Date(),
    };
    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Unsubscribe a user
   */
  unsubscribe(userId: number): boolean {
    return this.subscriptions.delete(userId);
  }

  /**
   * Get a user's subscription
   */
  getSubscription(userId: number): UserSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): UserSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Check if a user is subscribed
   */
  isSubscribed(userId: number): boolean {
    return this.subscriptions.has(userId);
  }

  /**
   * Find subscriptions that match a given bounty
   */
  findMatchingSubscriptions(
    tiers: BountyTier[],
    domains: BountyDomain[]
  ): UserSubscription[] {
    return this.getAllSubscriptions().filter(sub => {
      // Check if user wants this tier
      const tierMatch = sub.subscribedTiers.some(t => tiers.includes(t));
      
      // Check if user wants at least one domain
      const domainMatch = sub.subscribedDomains.some(d => domains.includes(d));
      
      return tierMatch && domainMatch;
    });
  }

  /**
   * Get subscription count
   */
  getCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Persist subscriptions to file (optional)
   */
  saveToFile(filepath: string): void {
    const data = JSON.stringify(Array.from(this.subscriptions.entries()), null, 2);
    require('fs').writeFileSync(filepath, data);
  }

  /**
   * Load subscriptions from file (optional)
   */
  loadFromFile(filepath: string): void {
    try {
      const data = require('fs').readFileSync(filepath, 'utf-8');
      const entries = JSON.parse(data);
      this.subscriptions = new Map(
        entries.map(([key, val]: [number, UserSubscription]) => [
          key,
          { ...val, createdAt: new Date(val.createdAt) },
        ])
      );
    } catch (error) {
      console.log('No existing subscriptions file found');
    }
  }
}