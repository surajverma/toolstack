# ToolStack

**Privacy-first browser tools. Your data stays on your device.**

ToolStack is a free, open-source toolbox with 60 tools that run locally in your browser. No accounts, uploads, ads or analytics.

## What you can do

- **Privacy:** sanitize support files, redact screenshots, inspect metadata, and encrypt files or notes.
- **Developer tools:** compare files, work with JSON/CSV/XML/YAML, test regex and plan IPv4 subnets.
- **PDFs and images:** compress, merge or split PDFs; resize, crop and convert images.
- **Calculators:** split bills, compare prices, model loans and savings, or calculate with variables and units.
- **Design and websites:** build CSS gradients and grids, prepare SVGs, and generate favicons, metadata, robots.txt and sitemaps.
- **Generators:** create QR codes, repeatable test datasets, shell templates and ASCII art.

Search or browse by category, pin frequently used tools, and switch between light and dark mode. See the [tool reference](docs/tool-reference.md) for detailed features and limitations.

## Privacy

Working input is processed in the browser and isn't saved with the app. Only your theme preference and pinned tool IDs are stored locally. Fonts and processing libraries are bundled without third-party CDNs.

Review sensitive exports before sharing: automatic detection and sanitization have limits. The [tool reference](docs/tool-reference.md) explains what each tool preserves or removes.

## Run locally

Use Node.js 24, matching the project's CI.

```bash
git clone https://github.com/surajverma/toolstack.git
cd toolstack
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Offline and installation

Build and run the production app to enable offline use:

```bash
npm run build
npm start
```

Keep it open online until the footer says **Offline ready**. All tools can then run offline, including ones you haven't opened yet. Choose **Install app** to add ToolStack to your device; installation is optional.

The offline cache contains application resources, not your files or tool input. Browser storage can be cleared or evicted; reconnect to download the app again. Offline support requires HTTPS or localhost and is disabled during development.

Save your work before choosing **Reload to update**. For deployment and caching details, see the [offline guide](docs/offline.md). Always run `npm run build` so the offline postbuild step is included.

## Contributing

Bug fixes, privacy improvements and useful local-only tools are welcome.

```bash
npm run verify
```

This runs the dependency audit, privacy check, lint, types, tests and production build. See the [architecture guide](docs/architecture.md) for where code belongs and how to add a tool.

## License

[MIT](LICENSE) · [Support ToolStack](https://ko-fi.com/skv)
