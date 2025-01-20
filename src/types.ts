export interface Preferences {
  personalAccessToken: string;
  sortBy: 'stargazers_count' | 'open_issues_count' | 'open_prs_count';
  showStars: boolean;
  showIssuesPRs: boolean;
  reuseTab: boolean;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  open_prs_count: number;
}
