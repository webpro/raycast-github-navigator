import { ActionPanel, Action, List, getPreferenceValues, closeMainWindow, open } from '@raycast/api';
import { useCachedPromise, useFrecencySorting } from '@raycast/utils';
import { openInBrowserTab } from 'browser-tab-bridge';
import { fetchAllRepos } from './github';
import { sortRepos } from './repos';
import type { Preferences, Repository } from './types';

const getActions = (repo: Repository) => {
  const base = repo.html_url;
  return [
    { title: 'Open Repository', url: base },
    { title: 'Issues', url: `${base}/issues` },
    { title: 'Pull requests', url: `${base}/pulls` },
    { title: 'Actions', url: `${base}/actions` },
    { title: 'Releases', url: `${base}/releases` },
    { title: 'Settings', url: `${base}/settings` },
    { title: 'Dependents', url: `${base}/network/dependents` },
  ];
};

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

