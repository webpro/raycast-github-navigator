import { ActionPanel, Action, List, getPreferenceValues, closeMainWindow, open } from '@raycast/api';
import { useCachedPromise, useFrecencySorting } from '@raycast/utils';
import { openInBrowserTab } from 'open-in-browser-tab';
import { sortRepos } from './repos';
import type { Preferences, Repository } from './types';
import { join } from 'node:path';
const getActions = (repo: Repository) => {
  const base = repo.html_url;
  return [
    { title: 'Open Repository', url: base },
    { title: 'Issues', url: join(base, "issues") },
    { title: 'Pull requests', url: join(base, "pulls") },
    { title: 'Actions', url: join(base, "actions") },
    { title: 'Releases', url: join(base, "releases") },
    { title: 'Settings', url: join(base, "settings") },
    { title: 'Dependents', url: join(base, "network", "dependents") },
  ];
};

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

async function fetchAllRepos(token: string): Promise<Repository[]> {
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

export default function Command() {
  const { personalAccessToken, showStars, showIssuesPRs, reuseTab } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useCachedPromise(fetchAllRepos, [personalAccessToken], {
    keepPreviousData: true,
  });

  const { data: sortedData, visitItem } = useFrecencySorting<Repository>(sortRepos(data), { key: repo => repo.id });

  return (
    <List isLoading={isLoading && !data?.length} searchBarPlaceholder="Search repositories..." throttle>
      {sortedData.map(repo => {
        return (
          <List.Item
            key={repo.full_name}
            title={repo.full_name}
            subtitle={repo.description}
            keywords={[repo.name]}
            accessories={[
              ...(showIssuesPRs ? [{ tag: `${repo.open_issues_count}/${repo.open_prs_count}` }] : []),
              ...(showStars ? [{ tag: `${repo.stargazers_count} ★` }] : []),
            ]}
            actions={
              <ActionPanel>
                {getActions(repo).map((action, index) => {
                  return (
                    <Action
                      key={action.title}
                      title={action.title}
                      shortcut={{
                        modifiers: ['cmd'],
                        key: String(index + 1),
                      }}
                      onAction={async () => {
                        await (reuseTab ? openInBrowserTab(action.url) : open(action.url));
                        visitItem(repo);
                        closeMainWindow();
                      }}
                    />
                  );
                })}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

