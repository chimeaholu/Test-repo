# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advisory-climate-gate.spec.ts >> N4 advisory and climate tranche diagnostics >> CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence
- Location: tests/e2e/advisory-climate-gate.spec.ts:89:7

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e8]:
      - img [ref=e9]
    - generic [ref=e12]:
      - button "Open issues overlay" [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: "0"
          - generic [ref=e16]: "1"
        - generic [ref=e17]: Issue
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - main [ref=e22]:
    - generic [ref=e23]:
      - article [ref=e24]:
        - generic [ref=e26]:
          - paragraph [ref=e27]: Consent and access
          - heading "Review access before the workspace opens" [level=2] [ref=e28]
          - paragraph [ref=e29]: Review what will be recorded, why it is needed, and which actions remain locked until you agree.
        - generic [ref=e30]:
          - generic [ref=e31]: Protected actions locked
          - generic [ref=e32]: Policy 2026.04.w1
        - list "Onboarding steps" [ref=e33]:
          - listitem [ref=e34]:
            - generic [ref=e36]:
              - strong [ref=e37]: Identity confirmed
              - paragraph [ref=e38]: Role, country, and contact details carry over from sign-in so you can confirm you are granting access in the right context.
          - listitem [ref=e39]:
            - generic [ref=e41]:
              - strong [ref=e42]: Consent review
              - paragraph [ref=e43]: Regulated actions stay blocked until consent is captured with the policy version and timestamp.
          - listitem [ref=e44]:
            - generic [ref=e46]:
              - strong [ref=e47]: Workspace access
              - paragraph [ref=e48]: Once consent is granted, your workspace opens with the same policy checks still enforced on the server.
        - complementary [ref=e49]:
          - strong [ref=e50]: Plain-language rule
          - paragraph [ref=e51]: "Keep the explanation concrete: what is recorded, why it is required, and what stays blocked if you do not agree."
        - generic "Consent outcomes" [ref=e52]:
          - article [ref=e53]:
            - generic [ref=e54]: Recorded immediately
            - strong [ref=e55]: Policy version and capture time
            - paragraph [ref=e56]: The consent record becomes part of the active session state.
          - article [ref=e57]:
            - generic [ref=e58]: Still enforced later
            - strong [ref=e59]: Server-side policy checks
            - paragraph [ref=e60]: Granting consent does not bypass subsequent permission or workflow checks.
      - article [ref=e61]:
        - generic [ref=e63]:
          - paragraph [ref=e64]: Consent details
          - heading "Choose what you agree to" [level=2] [ref=e65]
          - paragraph [ref=e66]: Select the scopes you accept. The policy version and capture time are stored as soon as consent is granted.
        - list [ref=e67]:
          - listitem [ref=e68]:
            - generic [ref=e69]: Policy version
            - strong [ref=e70]: 2026.04.w1
          - listitem [ref=e71]:
            - generic [ref=e72]: Channel
            - strong [ref=e73]: pwa
          - listitem [ref=e74]:
            - generic [ref=e75]: Country
            - strong [ref=e76]: GH
          - listitem [ref=e77]:
            - generic [ref=e78]: Role
            - strong [ref=e79]: farmer
        - generic "Scope explanation" [ref=e80]:
          - article [ref=e81]:
            - heading "Identity scope" [level=3] [ref=e82]
            - paragraph [ref=e83]: Needed to route you correctly, maintain session continuity, and explain who performed each action.
          - article [ref=e84]:
            - heading "Workflow scope" [level=3] [ref=e85]
            - paragraph [ref=e86]: Needed where regulated actions, approvals, or evidence retention apply.
        - generic [ref=e87]:
          - group "Select the consent scopes you accept" [ref=e88]:
            - generic [ref=e89]: Select the consent scopes you accept
            - generic [ref=e90]:
              - checkbox "Identity and session controlsNeeded to load the correct workspace and verify your identity state." [checked] [ref=e91]
              - generic [ref=e92]:
                - strong [ref=e93]: Identity and session controls
                - text: Needed to load the correct workspace and verify your identity state.
            - generic [ref=e94]:
              - checkbox "Workflow audit and regulated operationsNeeded to log regulated actions and keep audit history intact." [checked] [ref=e95]
              - generic [ref=e96]:
                - strong [ref=e97]: Workflow audit and regulated operations
                - text: Needed to log regulated actions and keep audit history intact.
            - generic [ref=e98]:
              - checkbox "Channel delivery and recovery promptsNeeded to send recovery prompts and channel handoff advice." [ref=e99]
              - generic [ref=e100]:
                - strong [ref=e101]: Channel delivery and recovery prompts
                - text: Needed to send recovery prompts and channel handoff advice.
          - generic [ref=e102]:
            - checkbox "I confirm this consent text can be recorded with its policy version and capture time." [checked] [ref=e103]
            - generic [ref=e104]: I confirm this consent text can be recorded with its policy version and capture time.
          - generic [ref=e105]:
            - button "Grant consent" [active] [ref=e106] [cursor=pointer]
            - link "Back to sign in" [ref=e107] [cursor=pointer]:
              - /url: /signin
          - paragraph [ref=e108]: If consent is not granted, protected actions remain blocked and the workspace will not open.
```