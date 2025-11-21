# 0001 – Release Branch & Patch Bump Strategy

* **Status**: Accepted
* **Deciders**: Engineering team
* **Date**: 2025-11-20
* **Tags**: Release, Versioning
* **Version**: 1.0.0

---

## Context and Problem Statement

Need automated creation of release PRs with predictable versioning without parsing commit semantics initially.

## Decision Drivers

| # | Driver |
| - | ------ |
| 1 | Simple automation bootstrap |
| 2 | Low cognitive overhead for teams |
| 3 | Compatibility with semantic-release downstream |
| 4 | Deterministic changelog section insertion |

## Considered Options

1. Patch bump only (chosen)
2. Full semantic analysis (major/minor/patch)
3. Manual version input
4. Calendar versioning (YYYY.MM.DD)

## Decision Outcome

### Chosen Option

Patch bump off latest tag (default start: `0.0.1`).

### Rationale

* Minimizes early complexity.
* Easy to evolve to semantic commit parsing later.
* Reduces error surface.

### Positive Consequences

* Fast implementation.
* Clear mental model.

### Negative Consequences / Trade-offs

* Minor/major changes require external intervention.
* Risk of accumulating breaking changes unnoticed.

### Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Hidden breaking changes | Future semantic parsing enhancement |
| Inaccurate version semantics | Reviewer vigilance + PR template |

## Validation

* Unit tests planned for tag parsing edge cases.
* Observed correct branch naming in dry runs.

## Compliance, Security & Privacy Impact

No additional data exposure. Uses existing repo read/write via token.

## Notes

* Follow-up: Introduce conventional commit analysis for dynamic bump.
* Related Decisions: Future ADR on AI summarization prompts.

---

### Revision Log

| Version | Date | Author | Change |
| ------- | ---- | ------ | ------ |
| 1.0.0 | 2025-11-20 | AI Agent | Initial creation |
