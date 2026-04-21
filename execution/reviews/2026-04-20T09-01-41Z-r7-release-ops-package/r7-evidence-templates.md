# R7 Evidence Templates

## Promotion Summary Template

```md
# R7 Promotion Evidence

- timestamp_utc:
- candidate_commit_sha:
- artifact_id:
- promotion_operator:
- r6_closeout_report:
- rollback_pointer:

## Environment Results

| environment | deploy_id | url | artifact_id | result |
| --- | --- | --- | --- | --- |
| staging |  |  |  |  |
| canary |  |  |  |  |
| production |  |  |  |  |
```

## Environment Capture Template

```md
## <environment>

- deploy_id:
- url:
- candidate_commit_sha:
- artifact_id:
- healthcheck_status:
- smoke_result:
- screenshot_bundle:
- notes:
```

## Smoke Assertions Template

```md
| check | assertion | result | evidence |
| --- | --- | --- | --- |
| /healthz | returns 200 |  |  |
| /signin | route loads |  |  |
| /app/onboarding/consent | page renders |  |  |
| consent persistence | survives refresh |  |  |
| /app/home | farmer home renders |  |  |
| /app/market/listings | listings render |  |  |
| publish draft listing | action succeeds |  |  |
| /app/market/negotiations | thread renders |  |  |
| approve negotiation | action succeeds |  |  |
| escrow release | action succeeds |  |  |
| advisory citations | evidence visible |  |  |
| climate acknowledgement | evidence visible |  |  |
| /app/traceability | route renders |  |  |
| traceability dispatch | evidence visible |  |  |
| /app/wallet | route renders |  |  |
| /app/admin/analytics | route renders |  |  |
| /app/finance/queue | route renders |  |  |
| finance approval | action succeeds |  |  |
```

## Screenshot Index Template

```md
| environment | screen | file |
| --- | --- | --- |
| staging | signin |  |
| staging | consent |  |
| staging | farmer-home |  |
| staging | listings |  |
| staging | negotiations |  |
| staging | traceability |  |
| staging | wallet |  |
| staging | admin-analytics |  |
| staging | finance-queue |  |
| canary | signin |  |
| canary | consent |  |
| canary | farmer-home |  |
| canary | listings |  |
| canary | negotiations |  |
| canary | traceability |  |
| canary | wallet |  |
| canary | admin-analytics |  |
| canary | finance-queue |  |
| production | signin |  |
| production | consent |  |
| production | farmer-home |  |
| production | listings |  |
| production | negotiations |  |
| production | traceability |  |
| production | wallet |  |
| production | admin-analytics |  |
| production | finance-queue |  |
```

## Rollback Evidence Template

```md
# R7 Rollback Evidence

- timestamp_utc:
- failed_environment:
- failed_deploy_id:
- failure_trigger:
- prior_good_commit_sha:
- prior_good_artifact_id:
- prior_good_deploy_id:
- rollback_operator:
- rollback_result:

## Post-Rollback Smoke

| check | result | evidence |
| --- | --- | --- |
| /healthz |  |  |
| /signin |  |  |
| /app/home |  |  |
| /app/market/listings |  |  |
| /app/market/negotiations |  |  |
| /app/traceability |  |  |
| /app/wallet |  |  |
| /app/admin/analytics |  |  |
| /app/finance/queue |  |  |
```
