# Legacy Staging Runtime Runbook

The legacy harness is preserved at `legacy/staging-runtime` as reference-only material for contract extraction, regression comparison, and UX intent review.

## Python sanity check

```bash
cd legacy/staging-runtime
PYTHONPATH=src python3 -m pytest -q tests/test_staging_runtime.py
```

## Playwright test discovery

```bash
npm --prefix legacy/staging-runtime run playwright:e2e:staging -- --list
```
