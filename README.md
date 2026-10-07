# GitHub Navigator

Navigate your GitHub repositories from Raycast: personal, collaborator, and
organization repos in one place with smart sorting.

![GitHub Navigator screenshot][1]

## Features

- All your repos: personal (owner), collaborator, and organization repositories
- Sort by stars, open issues, or open PRs
- Frecency sorting: repos you use most float to the top over time
- Quick actions: open repo, issues, PRs, actions, releases, settings, or
  dependents (⌘1–⌘7)
- Reuse browser tab: optionally focus an existing tab instead of opening a new
  one
- Cached repo list: refreshed on open when older than a day, or on demand with
  ⌘R
- Configurable labels for stars and issues/PRs counts

## Install

Requires [Raycast][2], [Node.js][3] 22.22.2+, and [pnpm][4].

```sh
git clone https://github.com/webpro/raycast-github-navigator.git
cd raycast-github-navigator
pnpm install
pnpm dev
```

This registers the extension in Raycast. After the initial setup, the extension
persists, so you don't need to keep the dev server running.

To update later:

```sh
git pull
pnpm install
pnpm build
```

## GitHub Token

The extension requires a [personal access token][5] (classic) with these scopes:

- `repo`: access repository data
- `read:org`: list organization repos

You'll be prompted to enter the token when you first run the command.

## Configuration

| Setting           | Description                               | Default |
| ----------------- | ----------------------------------------- | ------- |
| Sort by           | Sort repos by stars, open issues, or PRs  | Stars   |
| Stars label       | Show star count                           | On      |
| Issues/PRs label  | Show open issues/PRs count                | On      |
| Reuse browser tab | Focus existing tab instead of opening new | Off     |

## Firefox / Zen

The "Reuse existing browser tab" feature works out of the box for Chrome and
Safari (via AppleScript).

For Firefox and Zen, a companion browser extension and native messaging host are
required. See [browser-tab-bridge][6] to set this up.

## Tip: Hotkey

Assign a global hotkey to open this command directly: Raycast Settings →
Extensions → GitHub Navigator → Navigate GitHub → Hotkey (e.g. `Hyper Key` +
`N`).

[1]: assets/screenshot-1.png
[2]: https://raycast.com
[3]: https://nodejs.org
[4]: https://pnpm.io
[5]: https://github.com/settings/tokens
[6]: https://github.com/webpro/browser-tab-bridge
