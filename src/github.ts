import type { Repository } from './types';

const REPO_FIELDS = `
  databaseId
  name
  nameWithOwner
  description
  url
  stargazerCount
  forkCount
  issues(states: OPEN) { totalCount }
  pullRequests(states: OPEN) { totalCount }
`;

const USER_REPOS_QUERY = `query($cursor: String) {
  viewer {
    repositories(first: 100, after: $cursor, affiliations: [OWNER, COLLABORATOR]) {
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}`;

const ORG_REPOS_QUERY = `query($org: String!, $cursor: String) {
  organization(login: $org) {
    repositories(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}`;

const TOTALS_QUERY = `query {
  viewer {
    repositories(affiliations: [OWNER, COLLABORATOR]) { totalCount }
    organizations(first: 100) {
      nodes { login repositories { totalCount } }
    }
  }
}`;

export interface Progress {
  loaded: number;
  total: number;
}

interface RepoConnection {
  pageInfo: { hasNextPage: boolean; endCursor: string };
  nodes: Record<string, unknown>[];
}

interface Totals {
  viewer: {
    repositories: { totalCount: number };
    organizations: { nodes: { login: string; repositories: { totalCount: number } }[] };
  };
}

function toRepo(node: Record<string, unknown>): Repository {
  return {
    id: String(node.databaseId),
    name: node.name as string,
    full_name: node.nameWithOwner as string,
    description: (node.description as string) || '',
    html_url: node.url as string,
    stargazers_count: node.stargazerCount as number,
    open_issues_count: (node.issues as { totalCount: number }).totalCount,
    open_prs_count: (node.pullRequests as { totalCount: number }).totalCount,
  };
}

async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) throw new Error(response.statusText);
  const json = (await response.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export async function fetchAllRepos(
  token: string,
  onProgress: (repos: Repository[], progress: Progress) => void,
  signal?: AbortSignal,
): Promise<Repository[]> {
  const seen = new Set<string>();
  const allRepos: Repository[] = [];

  // Fetch repo totals and orgs first, to report progress
  const { viewer } = await graphql<Totals>(token, TOTALS_QUERY, {}, signal);
  const orgs = viewer.organizations.nodes;
  const total = orgs.reduce((sum, org) => sum + org.repositories.totalCount, viewer.repositories.totalCount);
  let loaded = 0;
  onProgress(allRepos, { loaded, total });

  function addRepos(nodes: Record<string, unknown>[]) {
    for (const node of nodes) {
      const repo = toRepo(node);
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name);
        allRepos.push(repo);
      }
    }
    loaded += nodes.length;
    onProgress(allRepos, { loaded, total });
  }

  // Fetch user's own + collaborator repos
  let cursor: string | null = null;
  while (true) {
    const data: { viewer: { repositories: RepoConnection } } = await graphql(
      token,
      USER_REPOS_QUERY,
      { cursor },
      signal,
    );
    const { nodes, pageInfo } = data.viewer.repositories;
    addRepos(nodes);
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  // Fetch all repos per org
  for (const { login: org } of orgs) {
    cursor = null;
    while (true) {
      const data: { organization: { repositories: RepoConnection } } = await graphql(
        token,
        ORG_REPOS_QUERY,
        { org, cursor },
        signal,
      );
      const { nodes, pageInfo } = data.organization.repositories;
      addRepos(nodes);
      if (!pageInfo.hasNextPage) break;
      cursor = pageInfo.endCursor;
    }
  }

  return allRepos;
}
