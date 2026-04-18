# Agrodomain B-036 Model Router Spec

Date: 2026-04-13
Bead: `B-036`
Project: `/mnt/vault/MWH/Projects/Agrodomain`

## Scope

Implement tiered OSS-first inference routing with deterministic budget guardrails.

## Routing Policy

- `Tier-0`: fast OSS intent / degraded budget mode.
- `Tier-1`: default OSS reasoning path.
- `Tier-2`: OSS verifier lane.
- `Tier-3`: premium escalation only for unresolved high-risk ambiguity.

## Escalation Triggers

- high risk (`>= 85`) plus low confidence
- unresolved contradiction
- repeated verifier rejection
- explicit policy ambiguity

## Budget Guardrails

- per-journey dollar cap is fail-closed
- per-day dollar cap is fail-closed
- warning mode begins at `80%` of journey or daily budget
- warning mode downgrades normal reasoning to `Tier-0`
- premium escalation is disabled in daily warning mode or when premium quota is exhausted

## Required Evidence

- unit coverage for route selection by risk, confidence, and budget
- route log must record selected tier/model and projected spend for `IDI-005`
- deterministic challenge outcome when premium escalation is needed but blocked by budget
