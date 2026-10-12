# Source and public release
Public source: https://github.com/Futurecraft-SHIFT/le-club-du-vin

A push to main validates TypeScript, exercises the real API routes against isolated SQLite, and builds the app. The deployment job is disabled until DEPLOY_ENABLED=true and the required production configuration is supplied. GitHub Pages cannot host this app's Worker, D1 database and private R2 files.

## Activation
Connect an owner-controlled Cloudflare account and a Supabase project (see AUTH-SETUP.md). Configure the variables and secrets named in .github/workflows/release.yml using GitHub settings; never commit credentials.
Use existing persistent D1/R2 resources. The current Sites-managed resources are not automatically accessible from an unrelated Cloudflare account. If changing hosts, first arrange provider export/backup and restore, transfer database and private objects, preserve all IDs, verify record counts and representative profiles/photos, and verify rollback before cutover. Local preview content is separate and is never automatically published.
Set VERIFIED_SCHEMA_SHA256 only after confirming the target database has the matching applied SQL and a working backup/restore path. The preparation script reports the required fingerprint. Future SQL changes stop deployment until reviewed and applied separately. Normal releases do not execute SQL or alter storage resources.
Set ADMIN_BOOTSTRAP_EMAIL as a Worker secret for the verified owner; preserve the existing admins row and user identity mapping. Configure Supabase verification/reset URLs and email delivery for the final domain. Test signup, email verification, reset and existing owner data before enabling public traffic.
Enable DEPLOY_ENABLED only after those checks. Thereafter successful pushes to main deploy automatically. Keep the current site intact until cutover is verified.

## Updates from this workspace
Keep the existing Sites origin and the additional github remote. After validated changes, commit through the Sites workflow when publishing there, then push the same HEAD with git push github HEAD:main. A local edit without a commit/push does not update GitHub. AGENTS.md records this completion step for future Codex work.

User profiles, tastings, prices, friendships and uploaded photos live in D1/R2, outside the source/build. The release workflow never resets or seeds them. Backups still require provider configuration; no system can promise protection against every failure.
