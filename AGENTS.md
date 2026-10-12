# Le Club du Vin: data preservation

The production D1 database is independent of deployment assets. Never replace the Site ID or DB binding on updates. The initial migration creates the schema; subsequent releases must append migrations. Never reset, seed, truncate, or drop production user tables during deployment. Applied SQL and Drizzle metadata are immutable.

All private reads and writes must use the platform-authenticated user ID. Shared bottle visibility requires tasting membership. Never expose private tasting notes, inventory or email in public profiles. Only aggregate flavor values, display name and total tasting count may be shared, after opt-in.

Local preview records are test data in .wrangler/state and must not be published. Keep .wrangler, .sites-runtime, environment files and credentials ignored.

Before schema-affecting production updates, arrange and verify a database backup and restoration path with the hosting provider. User JSON exports are available but do not replace an operator backup or a tested disaster recovery process. No automatic backup schedule has been configured in this project.

The local model runs through WebLLM in the visitor browser. No paid AI API calls are permitted without a new user instruction. Do not silently replace local inference with cloud inference. External web searches require a deliberate visitor click; do not send private notes in automatic searches.

## GitHub synchronization
The user authorized public source at https://github.com/Futurecraft-SHIFT/le-club-du-vin. After completing and validating app changes, commit and push the exact source to the github remote main branch; preserve Sites origin. Follow GITHUB-RELEASE.md. GitHub deploys only when hosting/authentication are configured. Never publish local user records, private photos, credentials or runtime folders. Do not claim a release is live without checking its deployment result.
