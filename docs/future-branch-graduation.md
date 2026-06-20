# Future-Branch Graduation Criteria

> Issue: #134  
> Any work promoted from a `future/*` branch to `main` must clear these quality gates.

## Graduation Checklist

Each criterion must be satisfied before a `future/*` branch merges to `main`:

### 1. Unit Tests (Required)
- Vitest test suite covers the new code path
- Branch coverage ≥ 85% on changed files
- No skipped or pending tests in the new code

### 2. Property-Based Tests (Required where applicable)
- PBT (fast-check) suites for modules where the input space is large
- Custom generators for domain-specific inputs
- Round-trip properties verified (e.g., emit→parse→emit identity)

### 3. Snapshot Tests (Required)
- Snapshot test on the fixture corpus (`tests/fixtures/sveltekit-synthetic/`)
- Snapshot locked in `__snapshots__/` and reviewed manually
- CI snapshot-diff script (`scripts/snapshot-diff.sh`) runs on PRs

### 4. Dogfood Validation (Required)
- At least one fixture from the dogfood corpus (`examples/`) produces a sensible diagram with the new feature
- Manual review notes added to `examples/REVIEW.md` or a feature-specific review doc

### 5. Documentation (Required)
- README section describing the new feature
- CLI `--help` output updated if new flags/commands are added
- ADR (Architecture Decision Record) in `docs/architecture/` if the feature introduces architectural changes

### 6. Owner Approval (Required)
- PR reviewed and approved by repo owner
- All CI checks green (or pre-existing infrastructure failures acknowledged)

## Active Future Branches

| Branch | Description | Status |
|--------|-------------|--------|
| `future/sequence` | Sequence diagram emitter | Not started |
| `future/state` | State-machine emitter (XState integration) | Not started |
| `future/trace` | Runtime-trace-driven diagrams | Not started |
| `future/mermaid` | Alternative Mermaid emitter | Not started |

## Process

1. Create branch: `future/<name>` from `main`
2. Implement feature following TDD (red-green-refactor)
3. Satisfy all graduation criteria above
4. Open PR: `future/<name>` → `main`
5. Update this table with the PR number and status
6. After merge: delete the `future/<name>` branch

## Notes

- Future branches should be long-lived only if the feature is complex enough to warrant isolation
- Small features can be developed directly on feature branches without the `future/` prefix
- If a future branch falls behind `main` significantly, rebase before opening a PR
