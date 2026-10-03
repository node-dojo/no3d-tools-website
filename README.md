# NO3D Tools website

The V3 storefront, account experience, and website API for no3dtools.com.
Customer pages live in `v3/`; server endpoints live in `api/`. Commerce owns
orders, entitlements, and product checkout. The website owns its managed
account session and catalog presentation.

## Working checkout

Use `/Users/joebowers/Projects/no3d-tools-website-v3` for local integration.
The consolidated branch is `main`. It includes the
September finalization work, October payment-environment fix, account-document
corrections, and preserved editor/dashboard changes.

This is a local integration designation, not a production deployment claim.
GitHub uses `main` as its default branch. Publishing remains a separate operation. See
[repository workflow](docs/development/REPOSITORY-WORKFLOW.md) before switching
branches or retiring worktrees.

## Development

Use Node 24 (`.nvmrc`) and install the locked dependencies:

```sh
npm ci
npm test
npm run acceptance:v3
npm run acceptance:analytics
npm audit
```

`npm test` discovers every top-level `tests/*.test.mjs` file. Browser acceptance
uses Puppeteer and local fixtures; it writes evidence under `/tmp`. Database
SQL acceptance and credentialed customer lifecycle checks are separate gates.

Run the full local server with the configured Doppler environment:

```sh
npm start
```

This starts Vercel development on port 3001. Opening HTML files directly does
not supply the server APIs. Production and staging use the existing
`no3dtoolssite` Vercel project; do not create a separate V3 project.

`npm run build` regenerates the two collection pages and stamps deployment
metadata into root `index.html`. Run builds in a disposable checkout when
checking reproducibility; do not commit changing build stamps as source work.

## Code and authority

| Location | Responsibility |
| --- | --- |
| `v3/` | Current customer pages, browser modules, and styles |
| `api/auth/` | Managed website authentication |
| `api/commerce/` | Website adapter to the separate Commerce service |
| `api/lib/`, `api/cron/` | Shared server behavior and monitoring |
| `lib/collection-definitions.js` | Authored collection definitions |
| `scripts/` | Build, acceptance, publication, and operator tools |
| `tests/` | Local contracts and behavior tests |
| `supabase/migrations/` | Versioned database migrations; never applied by `npm test` |
| `archive/` | Historical integrations and reference material |

- [V3 design implementation boundary](docs/design/v3/README.md) routes approved
  design decisions back to the Vault canon.
- [Current versus retired behavior](docs/deployment/current-vs-retired.json)
  distinguishes account-based access from the older license-key flow.
- [Customer release gates](docs/deployment/V3-END-TO-END-RELEASE.md) and
  [staging guidance](docs/design/v3/STAGING-ROLLOUT.md) cover target-specific
  acceptance. Dated receipts describe their recorded run, not current state.
- [Analytics operations](docs/deployment/V3-ANALYTICS-OPERATIONS.md) covers
  ingestion, monitoring, and notifications.

Legacy root pages and compatibility endpoints remain until their callers and
minimum supported add-on versions are verified. Their presence does not make
them the current customer journey.

## SOLVET site editor

The owner-only content utility uses the existing V3 product renderer and the
adjacent SOLVET source library. Set `SOLVET_GLOBAL_ROOT` and
`SOLVET_CATALOG_ROOT` when using a different local layout. The SOLVET checkout
must provide `solvet/site-editor-content.js`.

```sh
npm run site-editor
npm run acceptance:site-editor
```

Open the printed local URL. Editing and applying changes target the configured
source library. The acceptance command instead uses a temporary library,
fixture publisher, and local read-back server.

Remote publication is a separate, explicitly enabled operator command:

```sh
npm run site-editor:publish
```

That command uses Doppler and enables the publication adapter. A passing
fixture test does not prove a remote publication or customer delivery.

## Main and production deployment

GitHub's default branch and Vercel's configured production branch are both
`main`. `vercel.json` disables automatic Git deployments only for `main`, so
integration pushes do not publish production. Feature-branch Preview builds
remain enabled. Release a reviewed commit through the explicit Preview and
production sequence; changing this setting is a separate deployment-policy
change. This uses Vercel's documented
[`git.deploymentEnabled`](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
configuration. Database state is unaffected by branch normalization.
