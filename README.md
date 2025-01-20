# GitHub Navigator

Navigate your GitHub repositories from Raycast — personal, collaborator, and organization repos in one place with smart sorting.

![GitHub Navigator screenshot][1]

## Features

- All your repos: personal (owner), collaborator, and organization repositories
- Sort by stars, open issues, or open PRs
- Frecency sorting: repos you use most float to the top over time
- Quick actions: open repo, issues, PRs, actions, releases, settings, or dependents (⌘1–⌘7)
- Reuse browser tab: optionally focus an existing tab instead of opening a new one
- Configurable labels for stars and issues/PRs counts

## Install

Requires [Raycast][2] and [Node.js][3] 20+.

```sh
git clone https://github.com/webpro/raycast-github-navigator.git
cd github-navigator
npm install
npm run dev
```

This registers the extension in Raycast. After the initial setup, the extension persists — you don't need to keep the dev server running.

To update later:

```sh
git pull
npm install
npm run build
```

## GitHub Token

The extension requires a [personal access token][4] (classic) with these scopes:

- `repo` — access repository data
- `read:org` — list organization repos
- `read:user` — identify your account

You'll be prompted to enter the token when you first run the command.

## Configuration

| Setting           | Description                               | Default |
| ----------------- | ----------------------------------------- | ------- |
| Sort by           | Sort repos by stars, open issues, or PRs  | Stars   |
| Stars label       | Show star count                           | On      |
| Issues/PRs label  | Show open issues/PRs count                | On      |
| Reuse browser tab | Focus existing tab instead of opening new | Off     |

## Tip: Hotkey

Assign a global hotkey to open this command directly:
Raycast Settings → Extensions → GitHub Navigator → Navigate GitHub → Hotkey (e.g. `Hyper Key` + `N`).

[1]: assets/screenshot-1.png
[2]: https://raycast.com
[3]: https://nodejs.org
[4]: https://github.com/settings/tokens
