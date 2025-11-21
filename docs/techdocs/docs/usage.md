# Usage

## Action Reference

```yaml
jobs:
  prepare-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: webgrip/prepare-release-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          base-branch: main
          source-branch: development
          release-label: release
          changelog-path: CHANGELOG.md
          openai-api-key: ${{ secrets.OPENAI_API_KEY }} # optional
```

## Inputs

| Name | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| github-token | yes | — | Token for GitHub GraphQL/REST operations. |
| base-branch | no | main | Branch into which the release PR will merge. |
| source-branch | no | development | Branch used as release content source. |
| release-label | no | release | Label identifying release PRs. |
| changelog-path | no | CHANGELOG.md | Path to changelog file. |
| openai-api-key | no | — | Enables AI summary generation. |

## Outputs

| Name | Description |
| ---- | ----------- |
| version | Resolved next semantic version (patch bump). |
| branch | Release branch name (`release/<version>`). |
| pr-number | Numeric pull request id. |

## Permissions

Grant `contents: write`, `pull-requests: write`, `issues: write` where labels or PR creation are needed. Minimal read scopes suffice for listing PRs & tags.

## Behavior Notes

- Version resolution: patch increment of latest tag (or `0.0.1` if none).
- Changelog: Section inserted or replaced for `## [<version>]`.
- AI summary skipped unless key present.
- Action does not publish packages; semantic-release later tags & updates full CHANGELOG.

## Failure Modes

| Case | Mitigation |
| ---- | ---------- |
| Missing source branch | Fails early; ensure branch exists. |
| Tag fetch fails | Falls back to initial version logic. |
| OpenAI error | Warns, continues without summary. |
| Git merge conflicts | Warning logged; surface in PR for manual resolution. |

## Security

No secrets written to disk. Provide `openai-api-key` via encrypted secret. Avoid overly broad tokens.

## Example Downstream Consumption

```yaml
- name: Echo version
  run: echo "Version is ${{ steps.prepare-release.outputs.version }}"
```
