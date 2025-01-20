import { getPreferenceValues } from '@raycast/api';
import type { Preferences, Repository } from './types';

export const sortRepos = (repositories: Repository[] = []) => {
  const repos = (repositories ?? []).filter(repo => repo.id);
  const sortBy: Preferences['sortBy'] = getPreferenceValues().sortBy;
  return repos.sort((a, b) => b[sortBy] - a[sortBy]);
};
