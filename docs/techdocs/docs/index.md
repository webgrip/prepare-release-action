---
hide:
  - navigation
  - toc
search:
  boost: 2
---

# prepare-release-action

Automates preparation of a release pull request and changelog generation prior to final tagging & publishing.

## Purpose

This GitHub Action:

- Ensures (or creates) an open release PR (pattern: `release/<version>`).
- Synchronizes the release branch from a source branch (default: `development`).
- Collects merged PRs since last tag into a structured changelog section.
- Optionally generates an AI summary (if `openai-api-key` provided).
- Commits changelog changes and sets action outputs (`version`, `branch`, `pr-number`).

## High-Level Flow

1. Build context from inputs.
2. `GitHubService` finds or creates release PR.
3. Branch sync (fetch & merge from source branch).
4. List merged PRs since last tag.
5. `ChangelogService` builds & inserts section.
6. Optional AI summarization.
7. Commit/push CHANGELOG diff.
8. Outputs exposed by `index.ts`.

## Quick Links

- Usage: Action YAML, inputs & outputs.
- Architecture: Components, sequence, versioning, extensibility.
- Development: Build, test, lint, roadmap.
- ADRs: Decision history.

Navigate using the sidebar tabs.
