# Agrodomain B-010 Commit-Pinned QA Rerun

Date: 2026-04-13
Reviewer: `engineering`
Repo: `/mnt/vault/MWH/Projects/Agrodomain`
Bead: `B-010`

## Outcome

`PASS`

The latest `B-010`-tagged commit now resolves to the dedicated remediation SHA and clears the commit-pinned rerun in an isolated checkout.

## Commit Resolution

```text
ad1dd8347ab646c1c622dca34959054064e3cb81 2026-04-13T05:49:16+00:00 B-010 remediation: keep package exports commit-isolated
148460c773da1e22e441919c8378481c03576124 2026-04-13T04:11:03+00:00 feat(B-010): add negotiation workflow state machine and confirmation checkpoint
```

## Exact Execution

```bash
git -C /mnt/vault archive ad1dd8347ab646c1c622dca34959054064e3cb81 MWH/Projects/Agrodomain | tar -x -C /tmp/<isolated-dir>
cd /tmp/<isolated-dir>/MWH/Projects/Agrodomain
PYTHONPATH=src pytest -q tests/test_negotiation.py tests/test_package_exports.py
```

## Output

```text
/home/node/.local/lib/python3.11/site-packages/pytest_asyncio/plugin.py:207: PytestDeprecationWarning: The configuration option "asyncio_default_fixture_loop_scope" is unset.
The event loop scope for asynchronous fixtures will default to the fixture caching scope. Future versions of pytest-asyncio will default the loop scope for asynchronous fixtures to function scope. Set the default fixture loop scope explicitly in order to avoid unexpected behavior in the future. Valid fixture loop scopes are: "function", "class", "module", "package", "session"

  warnings.warn(PytestDeprecationWarning(_DEFAULT_FIXTURE_LOOP_SCOPE_UNSET))
.......                                                                  [100%]
7 passed in 0.24s
```

## Delta From Prior Failure

- Previous exact-SHA result at `148460c7` failed during collection with `ModuleNotFoundError: agro_v2.advisory_retrieval`.
- Remediation commit `ad1dd834` keeps optional bead exports import-safe while re-raising nested dependency errors instead of masking them.
- `B-010` is no longer the blocking bead in the formal built-bead QA lane.
