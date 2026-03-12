# 3D Sales Funnel Demo

Files included:
- `index.html` - main entry point
- `styles.css` - layout and styling
- `app.js` - 3D animation, physics-style bubble flow, adjustable funnel logic
- `server.py` - optional local server

## Run options

### Fastest
Open `index.html` in a browser.

### Recommended
Run a local server so browser security policies never get in the way:

```bash
python3 server.py
```

Then open:

```text
http://localhost:8000
```

## Notes
- Uses Three.js from a CDN for the 3D scene.
- Controls on the left let you adjust inflow, conversion rates, and value split.
- The right-hand tally updates as completed-client bubbles exit the value chamber.

## CI/CD: Google Apps Script auto-deploy

This repository deploys to Google Apps Script via `.github/workflows/deploy.yml` whenever code is pushed to `main` (and can also be run manually with `workflow_dispatch`).

### Required GitHub Actions secrets

Set these in **Settings → Secrets and variables → Actions**:

- `CLASPRC_JSON_B64`
  - Base64-encoded contents of your local `~/.clasprc.json` used by `clasp` authentication.
  - Example command to generate (Linux): `base64 -w 0 ~/.clasprc.json`
  - Example command to generate (macOS): `base64 ~/.clasprc.json | tr -d "\n"`
- `CLASP_SCRIPT_ID`
  - Apps Script project Script ID for this web app project.
- `GAS_DEPLOYMENT_ID`
  - Existing Apps Script deployment ID to redeploy in place.

### Current production target

- Deployment ID: `AKfycbx3-k1M9b6Rxa0LpALcRFO9ZrsVhESiHqFgDTTbya647Qv10XMsJPcMmsvbQ2H0MrA4`
- Web app URL: `https://script.google.com/macros/s/AKfycbx3-k1M9b6Rxa0LpALcRFO9ZrsVhESiHqFgDTTbya647Qv10XMsJPcMmsvbQ2H0MrA4/exec`

### Deploy flow

The workflow does the following:

1. Validates required secrets exist.
2. Installs `@google/clasp`.
3. Builds an Apps Script-safe payload in `.gas-dist` (inlined CSS/JS + `Code.gs` + `appsscript.json`).
4. Writes runtime auth/config files (`~/.clasprc.json` and `.clasp.json`).
5. Verifies Apps Script connectivity via `clasp status`.
6. Pushes project files with `clasp push --force`.
7. Creates a new Apps Script version.
8. Redeploys the existing deployment ID.
9. Writes a deployment summary (deployment ID, version, URL) to the GitHub Action run summary.

If deployment fails, check the workflow logs first for missing/invalid secrets, auth issues, or a script/deployment ID mismatch.

Troubleshooting quick checks:
- `CLASP_SCRIPT_ID` must be the **Apps Script project Script ID** (not the deployment/web-app ID).
- `GAS_DEPLOYMENT_ID` is the web-app deployment ID and typically starts with `AKfy...`.
- If `clasp push` returns `Request contains an invalid argument`, first verify those two IDs are not swapped.


### One-time local auth bootstrap

If you still need to create `CLASPRC_JSON_B64`:

1. Install clasp locally: `npm i -g @google/clasp`
2. Login once: `clasp login`
3. Base64-encode your generated `~/.clasprc.json` and store as the `CLASPRC_JSON_B64` repo secret.

After these secrets are in place, deploys should work from GitHub Actions without local machine access.

## Optional: PR auto-merge allow-list

The workflow `.github/workflows/automerge.yml` now reads a repository variable named `CODEX_AUTOMERGE_AUTHORS` (comma-separated GitHub logins).

- If the variable is empty/missing, auto-merge is skipped safely.
- Example value: `codex-bot,octocat`
