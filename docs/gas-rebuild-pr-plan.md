# Google Apps Script Rebuild Plan (PR Blueprint)

## Goal
Rebuild this project to be **Apps Script-first**, so it runs reliably from the deployed web app URL and is easier to deploy/debug from GitHub Actions.

## Why this rebuild
Current architecture is static-web-first (`index.html` + `styles.css` + `app.js`) and then transformed during CI into Apps Script payload form. This causes avoidable deployment complexity and opaque failures.

## Target architecture

### Runtime model
- Apps Script-native entrypoint (`Code.gs` with `doGet()`)
- HTML served through HtmlService templates/partials:
  - `Index.html`
  - `Styles.html`
  - `AppScript.html`
- Keep all deployable runtime files in a dedicated Apps Script payload directory.

### Build/deploy model
- Replace ad-hoc YAML-based transformations with deterministic build script.
- Build script outputs Apps Script payload only:
  - `Code.gs`
  - `Index.html` (or template set)
  - `appsscript.json`
- `clasp push` runs against this payload root, never project root.

## PR sequence

### PR 1 — Architecture foundation
- Introduce Apps Script-native source structure.
- Add deterministic build script for payload generation.
- Keep existing workflow behavior while adding side-by-side artifact generation for comparison.

### PR 2 — Deploy workflow switch-over
- Switch deploy workflow to use only generated payload root.
- Add artifact preflight checks before `clasp push`:
  - required files exist
  - payload file count + list emitted in logs
  - script/deployment ID sanity checks
- Keep version + redeploy behavior.

### PR 3 — Runtime dependency hardening
- Decide dependency strategy:
  - Preferred: vendor critical JS libs used at runtime
  - Alternative: keep CDN but add startup failure guards + user-visible fallback
- Add explicit runtime smoke checks.

### PR 4 — Docs and operational readiness
- Rewrite README sections for:
  - local development
  - CI deploy flow
  - troubleshooting matrix
  - credential rotation runbook
- Add “deploy doctor” workflow path for diagnostics-only runs.

## Acceptance criteria
- Manual (`workflow_dispatch`) deploy succeeds without hand edits.
- Push-to-main deploy succeeds and updates existing deployment.
- Web app URL renders correctly and runs controls/animation.
- Failures provide actionable diagnostics (not generic API errors).
- New maintainer can onboard and deploy with README only.

## Risks and mitigations
- **Risk:** Script ID / deployment ID confusion
  - **Mitigation:** strict validation + explicit docs + examples
- **Risk:** CDN dependency outages
  - **Mitigation:** vendor critical dependencies or fallback guards
- **Risk:** regression during architecture shift
  - **Mitigation:** phased PR rollout with acceptance checks per phase

## Out of scope
- Product feature changes to funnel behavior/UX (unless needed for Apps Script compatibility).

## Rollout recommendation
1. Merge PR 1 + PR 2 first (deployment reliability).
2. Validate production web app stability.
3. Merge PR 3 (runtime hardening).
4. Merge PR 4 (docs + operations).
