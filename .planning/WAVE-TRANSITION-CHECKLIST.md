# Wave Transition Checklist

Updated: 2026-04-25

This checklist is mandatory for Agrodomain execution after every wave and gate.

## After Any Wave Implementation Completes

1. Confirm the wave lanes are complete.
2. Run the wave gate immediately.
3. Do not pause for approval.

## After Any Gate Fails

1. Extract exact blockers.
2. Launch remediation immediately.
3. Re-run the same gate immediately after remediation.
4. Repeat until PASS or a true external blocker exists.

## After Any Gate Passes

1. Capture screenshot proof.
2. Send the proof email.
3. Open the next wave before the next status update.

## Before Any Status Reply

1. Report concrete state only:
- implementation
- typecheck
- build
- gate
- screenshot/email
2. If the current wave is green and the next wave is not open, open it first.
3. If a gate is red and no remediation task exists, launch it first.
