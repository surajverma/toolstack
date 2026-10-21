# Offline use and deployment

ToolStack is installable as a standalone PWA. Use **Install app** in the footer or your browser's install menu. On iPhone / iPad, use Safari's Share → Add to Home Screen.

Keep the app open online until the footer says **Offline ready**. Its service worker downloads every prerendered page, navigation payload, application chunk, font, worker and bundled PDF.js / qpdf runtime, including lazily loaded code. All registered tools can then be opened and used without an Internet connection, even if never previously visited. First setup requires a download (roughly 20–25 MB before transfer compression); installation itself is optional for offline use.

User-selected files, generated files and tool input are **not** placed in this cache. Only an explicit build-generated allowlist of application resources is saved. Requests to other origins, uploads and arbitrary data are not cached. Interrupted downloads show **Retry download**, and readiness is checked again when the app starts. Browser storage can be cleared or evicted; reconnect and download again if that happens. The app requests persistent storage after a supported native installation is accepted; the browser decides whether to grant it.

New versions download in the background and offer **Reload to update**. Save or download your working output before choosing it. Updates do not automatically reload a working tab. The most recent completed previous cache is retained for tabs using an older build; failed installations do not replace it.

Offline support runs only in production over HTTPS (or localhost). Development deliberately unregisters ToolStack's worker and clears its application caches to avoid stale development assets. Run `npm run build` (including its postbuild step), then `npm start` to test it. The postbuild script generates `public/pwa/sw.js` and versioned page / navigation snapshots from the actual Next build; generated files are ignored by Git and must be included in deployment output. It fails if any page is missing from the static offline bundle. `/sw.js` imports the generated worker and remains stable for existing installations. Do not deploy using a bare `next build` command that skips the postbuild step.

App icons and generation prompts are in [design/app-icons](../design/app-icons/README.md); the selected dark TS monogram is exported to install, maskable, Apple touch and favicon sizes in `public/icons/`.
