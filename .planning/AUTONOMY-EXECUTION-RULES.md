# Agrodomain Autonomy Execution Rules

Updated: 2026-04-24

These rules are mandatory for ongoing Agrodomain execution.

1. Proceed by default.
- Do not pause after wave completion, gate completion, or remediation completion.
- Open the next lane, gate, rerun, or screenshot/email proof step automatically.

2. Gate failures trigger immediate loops.
- If a gate fails, launch remediation immediately.
- Re-run the gate automatically.
- Repeat until PASS or a true external blocker exists.

3. Do not ask for approval for normal execution.
- No approval required for wave starts, QA gates, code-review gates, reruns, screenshot capture, or proof email delivery.
- Approval is only required for truly mission-critical business/design decisions, destructive actions, or external blockers that cannot be cleared autonomously.

4. Status updates must be specific.
- Report concrete state only: implementation, typecheck, build, gate, screenshot/email.
- Do not use vague progress phrasing when a step is actually stalled or blocked.

5. Screenshot-proof email is part of gate closeout.
- QA PASS is not complete until screenshots are captured and proof email is sent.

6. Prefer codex-only swarm execution for this remediation track.
- Keep lane ownership aligned to the Codex-only swarm plan wherever possible.
