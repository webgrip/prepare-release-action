# Development

## Prerequisites

- Node 24.x
- Docker (optional for Make targets)
- GitHub token for integration testing (not required for unit tests)

## Install

```bash
npm install
```

Or via Docker:

```bash
make build-base
make run-npm CMD=test
```

## Build

```bash
npm run build
```

Uses `@vercel/ncc` to bundle `src/index.ts` to a single artifact.

## Test

```bash
npm test
```

Coverage thresholds enforced per diff (see `AGENTS.md`). Current suite exercises:

- Entrypoint success & failure path (`tests/index.test.ts`).
- Basic instantiation & run path for `ApplicationService`.

Add tests for:

- Changelog insertion/replacement edge cases.
- Branch merge error logging.
- AI summary skip conditions.

## Lint

```bash
npm run lint
```

Auto-fix:

```bash
npm run fix
```

Makefile shortcuts:

| Target | Purpose |
| ------ | ------- |
| `make start` | Build stack + lint (auto-fix fallback). |
| `make test` | Run tests inside container. |
| `make lint` | Lint inside container. |
| `make dev` | Mounted development container. |
| `make start-app` | Run built runtime image. |

## Action Iteration

After changes:

1. `npm run build`
2. Commit compiled artifacts (CI/build stage will re-bundle).
3. Push branch (`feat/<ticket>-slug` etc).
4. Open PR with changelog section (per `AGENTS.md`).

## Adding Inputs

1. Extend `buildContext()` in `ApplicationService`.
2. Document new input in `usage.md`.
3. Add test validating default + explicit override.
4. Consider ADR if input changes architectural scope.

## Adding Services

Place in `src/services/`. Export types in `types.ts` if reused.

## Releasing

Semantic-release on `main` tags & updates `CHANGELOG.md`. Avoid manual edits—this action writes sections pre-release; semantic-release later appends official notes.

## Debugging

Set `ACTIONS_STEP_DEBUG=true` in workflow to see extra logs.

## Roadmap (Indicative)

| Item | Rationale |
| ---- | --------- |
| Conventional commit semantic bump | Align release versioning with commit intent. |
| Better PR template parsing | Improve category accuracy. |
| Pluggable AI provider abstraction | Reduce vendor lock-in. |
| Caching GitHub queries | Lower rate limit consumption. |

Contribute via PR following `AGENTS.md` checklist.
