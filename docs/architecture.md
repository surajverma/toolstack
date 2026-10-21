# ToolStack architecture

## Where a tool belongs

- `src/app/<slug>/page.tsx` owns the route and metadata. New tools use thin server wrappers with `FeaturePage` and a client workspace.
- `src/features/<feature>/` keeps related interface components, processing functions and tests together. A feature may power several focused routes: the launch kit and standalone metadata, robots and favicon generators use the same modules.
- `src/components/workbench/Workbench.tsx` contains small shared fields, buttons, output panels and segmented controls. Their scoped styles live in the `wb-*` section of `globals.css`.
- `src/config/tools.ts` is the searchable directory registry. `tool-categories.ts` defines category order and the category type. `ToolIcon.tsx` maps slugs and categories to bundled icons.
- `src/lib/` contains genuinely shared utilities and existing tools' processing modules. Existing routes can move to feature folders when they need substantial work; there is no requirement to relocate working code just to add a tool.

Processing modules do not depend on React. This makes their behavior easier to inspect and test. Browser-only image and SVG adapters are called after hydration or explicit user actions. Large optional libraries, such as ZIP generation, are imported when needed. The launch kit has a state hook and separate metadata, robots, icons and export panels rather than one large route component.

## Data boundaries

Working input stays in component/tab memory. Files enter through local file controls and leave through explicit copy/download actions. Do not add automatic working-data persistence or remote previews. HTML inspection uses a SAX parser without creating DOM elements, and SVG previews render cleaned content as an image. Notes use Web Crypto; no custom cryptographic primitives or hosted delivery service are involved.

Every parser has input and processing limits. Errors stop or identify unsupported work rather than silently returning incomplete output. Keep domain assumptions next to the relevant controls, such as monthly interest conventions or supported shell dependencies.

The privacy check guards direct network APIs in `src/`; it is a useful regression check, not a proof covering all dependency behavior. Dependencies and generated assets still need review and normal maintenance.

## Adding a tool

1. Create a feature module with pure processing functions and a compact client interface. Reuse the shared controls when they fit.
2. Add meaningful tests for tricky logic, resource limits, hostile inputs and exported formats. Avoid tests that only repeat the UI's markup.
3. Add a route, descriptive metadata, a registry entry, tags and an icon. Prefer one useful workspace to many nearly identical routes.
4. Check keyboard use, narrow screens, both themes and errors. Any previews must stay local and any destructive transformations must explain their limits.
5. Run `npm run verify`. Its build step regenerates the complete offline allowlist and fails if a prerendered page is missing. Test the production PWA with the server stopped, including an unvisited route and any lazy export path.

## Offline build

`npm run build` runs Next's production build, then `scripts/build-pwa.mjs`. The postbuild step enumerates prerendered pages, navigation payloads and static assets, adds bundled runtimes, and produces versioned snapshots plus the worker in ignored `public/pwa/`. `/sw.js` is the stable loader. Deploy the postbuild output alongside the Next build.

The worker caches only this generated application-resource allowlist. It never stores tool inputs or arbitrary requests. A ready marker is written only after the entire download succeeds. Updates offer a user-controlled reload, and the most recent completed previous cache remains available for already-open tabs. Failed installations are excluded from retention.
