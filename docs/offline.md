# Offline use and deployment

ToolStack is installable as a standalone PWA. The footer offers **Install app** only after the offline download finishes and the browser supplies a native install prompt. The button disappears after installation and in the installed app. On iPhone / iPad, use Safari's Share → Add to Home Screen. Browsers do not universally expose installation status to ordinary tabs; the app does not persist a flag that could become stale after uninstalling.

The footer stays quiet during background downloads and after successful setup, including while offline. It shows no permanent readiness label. Failed downloads offer **Retry offline download** when connected; available updates still offer **Reload to update**. Installation uses browser events and standalone display detection, without a stored installed flag or network probes. Its service worker downloads every prerendered page, navigation payload, application chunk, font, worker and bundled PDF.js / qpdf runtime, including lazily loaded code. All registered tools can then be opened and used without an Internet connection, even if never previously visited. First setup requires a download (roughly 20–25 MB before transfer compression); installation itself is optional for offline use.

User-selected files, generated files and tool input are **not** placed in this cache. Only an explicit build-generated allowlist of application resources is saved. Requests to other origins, uploads and arbitrary data are not cached. Interrupted downloads offer **Retry offline download** when connected, and readiness is checked again when the app starts. Browser storage can be cleared or evicted; reconnect and download again if that happens. The app requests persistent storage after a supported native installation is accepted; the browser decides whether to grant it.

New versions download in the background and offer **Reload to update**. Save or download your working output before choosing it. Updates do not automatically reload a working tab. The most recent completed previous cache is retained for tabs using an older build; failed installations do not replace it.

Offline support runs only in production over HTTPS (or localhost). Development deliberately unregisters ToolStack's worker and clears its application caches to avoid stale development assets. Run `npm run build` (including its postbuild step), then `npm start` to test it. The postbuild script generates `public/pwa/sw.js` and versioned page / navigation snapshots from the actual Next build; generated files are ignored by Git and must be included in deployment output. It fails if any page is missing from the static offline bundle. `/sw.js` imports the generated worker and remains stable for existing installations. Do not deploy using a bare `next build` command that skips the postbuild step.

App icons and generation prompts are in [design/app-icons](../design/app-icons/README.md); the selected dark TS monogram is exported to install, maskable, Apple touch and favicon sizes in `public/icons/`.

## Check a deployment

```bash
npm run check-pwa -- https://tools.surajverma.in
```

This read-only check downloads the resources in the deployed worker's allowlist, reports failed URLs and cache keys, and warns about cacheable worker scripts. It exits unsuccessfully for missing, redirected, blocked, empty or unexpected HTML responses. It cannot check browser storage quotas or simulate a particular browser's installed state. Worker download failures also include the resource and HTTP status in the page's developer console.

Offline snapshots use opaque filenames: some hosts reject filenames such as `license.txt` even when the file exists. Keep the generated `public/pwa/` files together with their matching Next build.

The outermost server/CDN should serve `/sw.js` and `/pwa/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`. A reverse proxy serving public files directly may override `next.config.ts` headers. For Cloudflare, bypass caching for those two paths and purge their existing entries after deployment. Keep content-hashed application assets cached normally. The deployment check prints the headers' effect so you can verify the live configuration.

## Docker

`docker compose up --build -d` builds and starts ToolStack at `http://localhost:5010`. The Dockerfile enables `TOOLSTACK_STANDALONE=1` only in its build stage, then copies Next's standalone server, static chunks and the complete postbuild `public/` folder into a non-root Node.js 24 runtime. Regular builds keep the existing `next start` / cPanel custom-server deployment path. The container uses Next's generated `server.js`, not a custom startup script.

For self-hosting, edit the public site URL directly in `compose.yml`:

```yaml
build:
  context: .
  args:
    NEXT_PUBLIC_SITE_URL: https://tools.example.com
```

`NEXT_PUBLIC_SITE_URL` is compiled into sitemap and robots metadata; changing it requires rebuilding. The `5010:5010` mapping publishes port 5010 on all host interfaces for access from other machines. To use a different host port, change the first number in `compose.yml`; the container continues listening on 5010. Beyond localhost, serve HTTPS through that proxy for PWA support. No database or persistent tool-input volume is needed.

Use `docker compose down` to stop, and `docker compose up --build -d` after pulling updates. A Dockerfile-only build also works with `docker build --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:5010 -t toolstack:local .` and `docker run --rm -p 5010:5010 toolstack:local`. Run the deployment check against the published address after startup. The image includes the project license.
