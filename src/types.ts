// Bounty types from GitHub Issues
export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  state: 'open' | 'closed';
}

// Bounty tier types
export type BountyTier = 'tier-1' | 'tier-2' | 'tier-3';

// Bounty domain types (from labels)
export type BountyDomain = 
  | 'frontend' 
  | 'backend' 
  | 'contracts' 
  | 'creative' 
  | 'docs' 
  | 'security'
  | 'infrastructure';

// Parsed bounty information
export interface Bounty {
  id: number;
  number: number;
  title: string;
  description: string;
  reward: string;
  tier: BountyTier;
  domains: BountyDomain[];
  url: string;
  createdAt: string;
  author: string;
}

// User subscription for bounty notifications
export interface UserSubscription {
  userId: number;
  chatId: number;
  subscribedTiers: BountyTier[];
  subscribedDomains: BountyDomain[];
  createdAt: Date;
}

// Bot configuration
export interface BotConfig {
  telegramToken: string;
  githubOwner: string;
  githubRepo: string;
  githubToken?: string;
  pollingInterval: number;
  webhookUrl?: string;
  port: number;
}