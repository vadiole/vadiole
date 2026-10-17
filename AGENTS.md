# vadiole.me

Personal website served by GitHub Pages from `gh-pages`.
It's a selection of things the user values and cares about: projects, ideas, and people.

## Copy

- The user approves each change; collaborate to find the best version.
- Tone of voice and rules: [docs/voice.md](docs/voice.md).
- Current copy: [docs/copy.md](docs/copy.md). Changes land there first, then in code.

## Current design

- Quiet, text first, every element must earn its place.
- Every new element or style must be approved by the user.
- Links inline with text.
- Mobile is as important as desktop.
- No layout shifts.

## Engineering

- Plain HTML and CSS. No build step, frameworks, or dependencies.
- JavaScript loaded and used only where needed. Content and links must work without it.
- Respect `prefers-reduced-motion`.
- Pages: `index.html` and `404.html`. A new page needs the user's approval.
- Keep `sitemap.xml` and page meta in sync when pages change.
- Files that aren't part of the site go into `exclude` in `_config.yml`.

## Verification

- Preview with `python3 -m http.server`.
- Check visual changes with headless screenshots, e.g. `npx -y playwright screenshot --viewport-size=320,800 --color-scheme=dark --full-page <url> <file>`.
- Cover 320px and wide desktop, light and dark, and JavaScript off when the change involves it.
- Keep screenshots out of the repo.

## Git

- `gh-pages` is the deployed version. Branch from it by default.
- Name branches simply, after the user's request. Each branch is a new scope, so agree on the name with the user first.
- Commit finished work, scoped so the history reads like a changelog; amend or squash when it makes sense. Messages are one-line, lowercase, high-level goals or outcomes, e.g. `the new photos page is available via photography link from the main page`, `fixed light rendering`, `improved performance on firefox`, `simplified code so it's easier to support`.
- Stage explicit paths; don't commit unrelated changes.
- Create PRs on explicit request from the user, or with an explicit ok when it's the only step left.
- PR description is a minimal one-sentence summary of the outcome, plus risks or critical info.

## Meta rules

- Suggest reasonable updates to AGENTS.md and docs as the project evolves.
