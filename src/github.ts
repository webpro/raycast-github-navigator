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

const ORGS_QUERY = `query {
  viewer {
    organizations(first: 100) {
      nodes { login }
    }
  }
}`;

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

async function graphql(token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(response.statusText);
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export async function fetchAllRepos(token: string): Promise<Repository[]> {
  const seen = new Set<string>();
  const allRepos: Repository[] = [];

  function addRepos(nodes: Record<string, unknown>[]) {
    for (const node of nodes) {
      const repo = toRepo(node);
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name);
        allRepos.push(repo);
      }
    }
  }

  // Fetch user's own + collaborator repos
  let cursor: string | null = null;
  while (true) {
    const data = await graphql(token, USER_REPOS_QUERY, { cursor });
    const { nodes, pageInfo } = data.viewer.repositories;
    addRepos(nodes);
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  // Fetch orgs, then all repos per org
  const orgsData = await graphql(token, ORGS_QUERY);
  const orgs: string[] = orgsData.viewer.organizations.nodes.map((n: { login: string }) => n.login);

  for (const org of orgs) {
    cursor = null;
    while (true) {
      const data = await graphql(token, ORG_REPOS_QUERY, { org, cursor });
      const { nodes, pageInfo } = data.organization.repositories;
      addRepos(nodes);
      if (!pageInfo.hasNextPage) break;
      cursor = pageInfo.endCursor;
    }
  }

  return allRepos;
}
