import {
  ActionPanel,
  Action,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  closeMainWindow,
  open,
  showToast,
} from '@raycast/api';
import { useCachedState, useFrecencySorting, usePromise } from '@raycast/utils';
import { openInBrowserTab } from 'browser-tab-bridge';
import { useRef } from 'react';
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

  const [repos, setRepos] = useCachedState<Repository[]>('repositories', []);
  const abortable = useRef<AbortController>(null);

  const { isLoading } = usePromise(
    async (token: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: 'Loading repositories' });
      try {
        const latest = await fetchAllRepos(
          token,
          (fetched, { loaded, total }) => {
            toast.message = `${loaded} of ${total}`;
            const names = new Set(fetched.map(repo => repo.full_name));
            setRepos(cached => [...fetched, ...cached.filter(repo => !names.has(repo.full_name))]);
          },
          abortable.current?.signal,
        );
        setRepos(latest);
      } finally {
        await toast.hide();
      }
    },
    [personalAccessToken],
    { abortable },
  );

  const { data: sortedData, visitItem } = useFrecencySorting<Repository>(sortRepos(repos), { key: repo => repo.id });

  return (
    <List isLoading={isLoading && !repos.length} searchBarPlaceholder="Search repositories..." throttle>
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
                        key: String(index + 1) as Keyboard.KeyEquivalent,
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
