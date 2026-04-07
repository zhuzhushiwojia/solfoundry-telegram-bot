import axios, { AxiosInstance } from 'axios';
import { GitHubIssue, Bounty, BountyTier, BountyDomain } from './types';

/**
 * GitHub API client for fetching bounty issues
 */
export class GitHubClient {
  private client: AxiosInstance;
  private owner: string;
  private repo: string;

  constructor(owner: string, repo: string, token?: string) {
    this.owner = owner;
    this.repo = repo;
    
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(token ? { 'Authorization': `token ${token}` } : {}),
      },
    });
  }

  /**
   * Fetch all open bounty issues
   */
  async getBountyIssues(): Promise<GitHubIssue[]> {
    try {
      const response = await this.client.get(
        `/repos/${this.owner}/${this.repo}/issues`,
        {
          params: {
            labels: 'bounty',
            state: 'open',
            per_page: 100,
            sort: 'created',
            direction: 'desc',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching bounty issues:', error);
      return [];
    }
  }

  /**
   * Fetch a single issue by number
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const response = await this.client.get(
        `/repos/${this.owner}/${this.repo}/issues/${issueNumber}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching issue #${issueNumber}:`, error);
      return null;
    }
  }

  /**
   * Parse a GitHub issue into a Bounty object
   */
  parseBounty(issue: GitHubIssue): Bounty {
    // Extract tier from labels
    const tier = this.extractTier(issue.labels.map(l => l.name));
    
    // Extract domains from labels
    const domains = this.extractDomains(issue.labels.map(l => l.name));
    
    // Extract reward from body
    const reward = this.extractReward(issue.body);
    
    // Clean up description (take first 200 chars)
    const description = this.cleanDescription(issue.body);

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      description,
      reward,
      tier,
      domains,
      url: issue.html_url,
      createdAt: issue.created_at,
      author: issue.user.login,
    };
  }

  private extractTier(labels: string[]): BountyTier {
    if (labels.includes('tier-3')) return 'tier-3';
    if (labels.includes('tier-2')) return 'tier-2';
    return 'tier-1';
  }

  private extractDomains(labels: string[]): BountyDomain[] {
    const domainLabels = ['frontend', 'backend', 'contracts', 'creative', 'docs', 'security', 'infrastructure'];
    return labels
      .filter(label => domainLabels.includes(label))
      .map(label => label as BountyDomain);
  }

  private extractReward(body: string): string {
    // Try to extract reward from body (e.g., "Reward: 500 $FNDRY")
    const rewardMatch = body.match(/\*\*Reward:\*\*\s*([\d,]+K?\s*\$FNDRY)/i);
    if (rewardMatch) {
      return rewardMatch[1];
    }
    
    // Alternative pattern
    const altMatch = body.match(/(\d+[\d,]*K?)\s*\$FNDRY/i);
    if (altMatch) {
      return `${altMatch[1]} $FNDRY`;
    }
    
    return 'TBD';
  }

  private cleanDescription(body: string): string {
    // Remove markdown headers and get first meaningful text
    const lines = body.split('\n')
      .filter(line => !line.startsWith('#') && line.trim())
      .slice(0, 5);
    
    let description = lines.join(' ').trim();
    
    // Remove markdown formatting
    description = description
      .replace(/\*\*|__/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`/g, '');
    
    // Truncate if too long
    if (description.length > 300) {
      description = description.substring(0, 297) + '...';
    }
    
    return description || 'No description provided';
  }
}