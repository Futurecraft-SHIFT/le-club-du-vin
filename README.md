# Le Club du Vin

A responsive wine journal, private cellar, shared tasting tables, flavor portraits and local sommelier built with React/Vinext on Sites.

- Landing: one device-height screen. Guest navigation explains each section; authenticated navigation opens personal tools.
- Surprise bottle: anonymous random discovery from a curated three-wine selection, source links, estimated six-axis flavor chart and external location-based shop search. Retailer stock is not verified.
- D1 stores profiles, bottles, sessions, membership and private tastings. R2 stores bottle photographs. Deployments preserve both bindings and append migrations.
- Photos are uploaded by the owner and visible only to that owner or shared tasting members. Prefer exact-bottle cutouts. External catalog photos can show a different vintage label.
- Public profile sharing is opt-in and returns aggregate taste/color data only.
- Sommelier and note scoring use optional browser WebLLM, requiring WebGPU and an initial model download. No paid AI APIs. The first download may exceed 1 GB.

## Local development

Node 22.13+ required. Install with `npm run install:ci`, then `npm run dev -- --host 127.0.0.1 --port 5173`. Sites helpers manage build configuration; run the plugin's `build-site.mjs` for deployment builds. Use `npx tsc --noEmit` for type checking.

Local sign-in is a development simulation. Local D1/R2 state lives in ignored `.wrangler/state`; never upload it as production data. SQL migrations are under `drizzle/` and must be applied to the selected local database before testing. Never replay initial table creation over an existing database.

## Operations

Keep the existing Site project ID and DB/BUCKET bindings. Append migrations; never reset production data during an update. No scheduled backup or tested disaster-recovery service has been configured. Arrange those before collecting important production data. JSON export contains records, not original photo files.

Sources for the surprise wine facts are linked beside each description. Flavor intensities are clearly labeled editorial estimates, not measured or user-submitted scores. Photo search is deliberate and never automatically substitutes a similarly named wine.
