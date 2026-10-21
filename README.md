# ToolStack

**Privacy-first browser tools. Your working data stays on your device.**

ToolStack is an open-source collection of utilities designed around a strict local-processing rule: files, text and other working input are processed in the browser and are not sent to an application API for processing.

## Privacy contract

- Tool input is processed locally in the browser.
- No account is required.
- No advertising or analytics SDK is included.
- Appearance and explicitly pinned tool IDs are stored as local preferences when browser storage is available; working input is not saved with them.
- Source code under `src/` is checked for direct network-capable APIs by `npm run privacy-check`.
- Runtime libraries are bundled with the application rather than loaded from third-party CDNs.
- Tools that fundamentally require transmitting user input to a third party are intentionally excluded from the core collection.

## Highlights

### Calculators, design and launch tools

The directory now contains 60 tools. The newer tools share tested processing modules and a small set of interface components; see [the architecture guide](docs/architecture.md).

| Tool | Useful details |
| --- | --- |
| Website Launch Kit | One ZIP with consistent metadata, icons, manifest, robots rules and a supplied-URL sitemap. |
| Meta Tag Generator | Escaped HTML and typed Next.js output, inert HTML inspection, duplicate warnings and a local social-image preview. Published image URLs are never fetched. |
| Robots.txt Generator | Crawler-group and path simulation with the winning rule, wildcard support and a same-origin sitemap generator. |
| Favicon Generator | Images, cleaned SVG, monograms or emoji; real multi-size ICO, PNG, SVG, Apple touch and maskable icons with matching manifest and link tags. |
| Calculation Notebook | Named variables, forward references, decimal arithmetic, percentages and compatible units. Save JSON or encrypted files; export a structure with numeric literals and comments removed. Variable names and units remain visible. |
| Everyday Calculators | Percentage change, unit prices, exact cent allocation for split bills, and date/working-day differences with supplied holidays. |
| Finance Calculator | Loan amortization with extra payments and savings projections, with readable schedules and CSV exports. Nominal rates, monthly compounding, payment rounding and contribution timing are shown; taxes and fees are excluded. |
| Subnet Calculator | IPv4 CIDR details including /31 and /32, subnet splitting, and overlap detection. No network requests or scans. |
| CSS Playground | Multi-stop gradients, sampled contrast estimates, linear sRGB PNG export, rectangular named grid areas with responsive CSS/HTML, and box shadows. |
| SVG Toolkit | Static SVG cleanup, local reference/ID rewriting, viewBox repair, currentColor conversion, React output and PNG export. Unsupported active content and external references are removed with a change list. |
| Encrypted Notes | Portable text or Markdown notes encrypted with AES-256-GCM and PBKDF2-SHA256 (600,000 iterations), random salts and nonces. The title is encrypted too. |
| Bash Script Generator | Quoted, editable Bash templates for file reports, backups and argument handling, plus a POSIX skeleton. Dry run is the default; scripts are never executed here. |
| ASCII Art Generator | Bundled text glyphs and local image conversion with custom character ramps, inversion and optional dithering. Text, standalone HTML and PNG exports. |

Encrypted notes are files, not a hosted messaging service. Share the passphrase separately. Offline copies cannot enforce expiry, revocation or one-time access. Notes, passphrases and calculation inputs remain in tab memory until an explicit download; the encrypted-note format is versioned and size-limited. This implementation has automated tamper and round-trip tests, but has not had an independent cryptographic audit.

The calculation notebook uses a restricted parser, not JavaScript evaluation. Currency units are labels without exchange rates. SVG cleanup intentionally supports a static subset; review its changes before replacing an original illustration. The favicon pack's SVG embeds a PNG to match the other icon formats; the SVG toolkit preserves supported vector paths. Generated shell scripts target the dependencies displayed in the tool and should be reviewed before running on your own machine.

### PDF & Documents
- PDF Toolkit: compress PDFs, merge and reorder merge inputs, remove accidental uploads, select which loaded PDF to edit, extract/reorder/delete/rotate pages, split every page to ZIP, edit basic metadata and turn images into a PDF.
- Lossless PDF compression runs in-browser with bundled qpdf WebAssembly and preserves document structure, selectable text, links and forms.
- Balanced and Strong compression use bundled PDF.js to render pages locally and rebuild them as JPEG-backed PDF pages. This can produce much larger reductions for scans/image-heavy files, but intentionally flattens the document: selectable text, links, forms, bookmarks, accessibility structure and digital signatures are not preserved.
- Other PDF editing operations use bundled `pdf-lib`. ToolStack does not claim secure redaction.

### Privacy & Security
Image Metadata Remover, Data Anonymizer, File Hash & Checksum, Tracking URL Cleaner, Password & Passphrase Generator, JWT Inspector, Browser Privacy Inspector, Text Privacy Cleaner, AES-GCM File Encryption, File Type & Signature Inspector, Content Credentials (C2PA) Inspector, and HMAC Generator & Verifier.

### Private sharing workflows
- Support File Sanitizer: inspect outgoing logs, JSON and HAR files with batch-wide aliases for supported identifiers. HAR bodies are excluded by default, credentials are redacted, and original filenames and alias maps are omitted from downloads. Processing runs in a time-limited worker.
- Screenshot Redactor: draw opaque redaction areas or enter pixel coordinates, then export a freshly rendered PNG. Manual review is required; this version does not include OCR or automatic detection.
- Document Privacy Inspector: inspect DOCX, XLSX and PPTX XML parts for document properties, comments, tracked changes, hidden-content markers and external references. Clear supported document properties and reinspect the generated file. Document content, comments and tracked changes are not removed. Encrypted, legacy and ZIP64 documents are unsupported; compressed and expanded size limits apply.
- Data Anonymizer now also masks linked CSV / JSON datasets with per-column actions and shared alias groups. It can remove columns, mask values, shift ISO dates and group numbers into bands. This is pseudonymization, not a guarantee of anonymity. Alias values are text labels and CSV exports escape formula-like values.
- Calendar Privacy Exporter: rebuild a selected date window as individual Busy events, using new IDs and excluding original meeting details. Recurrence, individual exceptions and embedded time zones are supported. Unsupported recurrence forms, unresolved named zones and processing limits stop the export. Busy times are still disclosed; the snapshot does not update automatically.

### Appearance and navigation
A sun/moon toggle switches between light and dark appearance across all tool pages and native form controls. The site follows the system appearance until a mode is chosen. Only the appearance preference (`toolstack-theme`) is saved in local storage; working input and generated output are not saved there. The directory includes search, category counts, compact cards and grouped browsing.

### Text & File Diff
- The existing `/text-diff` tool now has two editable CodeMirror panes, with changes highlighted inside the inputs, aligned blocks, individual-change transfer, undo/redo, next/previous navigation, wrapping, whitespace markers and folding of unchanged sections. Source highlights and merges always use exact text. Very expensive editor diffs may use a visibly disclosed approximate highlight; the separate worker review requires an exact completed comparison.
- Private Review compares text, JSON, headered CSV or literal single-line `.env` files. JSON object key order and formatting are excluded; CSV columns are matched by header. Match arrays of records with one or more exact key columns; missing/duplicate identities stop comparison. Common record reordering is counted separately using a longest increasing subsequence. Exact unique moved text blocks are annotated when they appear as distinct additions/removals.
- Explicit comparison rules support ASCII whitespace, string case, line-ending style, ISO timestamp/UUID-shaped text, literal text, structured field paths and JSON numeric tolerances. Excluded field/line differences remain inspectable. Expected field paths flag unignored changes outside the selected paths. Patterns use JSON Pointer-style paths (`~0` / `~1` escaping), `*` for one level and `**` for any depth; this is an explicit review aid, not a program-behavior validator.
- Comparison is performed on original values before masking. Per-comparison aliases preserve equality and differences between detected credentials, common identifiers and manually supplied values. No alias map is exported. Detection is best-effort; paths, keys, free text and context require review. Private Review is read-only and never overwrites source documents. File details reveal newline/BOM differences, hidden Unicode and an illustrative list of common lookalikes.
- Select individual changes, optionally include up to five context lines, preview outgoing text, then download a standalone HTML or text report. HTML has no script/external assets and escapes input markup; only selected redacted excerpts and comparison-rule descriptions are serialized. Reports exclude original filenames and full source documents. Original source downloads and exact `.diff` patches are separate, explicitly unmasked actions.
- Inputs stay in tab memory. Up to 1 MB and 20,000 line endings per side; UTF-8 and UTF-16 with BOM are decoded strictly. Source downloads retain imported encoding and existing newline characters; new typed lines use LF. Structured limits, duplicate-key detection and safe-integer checks prevent ambiguous comparisons. Worker timeout is eight seconds; bounded diff failure produces an error rather than partial results. Binary files, formatted Office/PDF comparison and shell evaluation are unsupported.

### Images
Image Compressor, Image Resizer, Image Cropper, Image Format Converter, and Placeholder Image Generator.

### Developer / Data
JSON Toolbox (including structural diff, TypeScript and JSON Schema inference), Regex Tester & Explainer, Easy Regex Generator, Text Diff Checker, sanitized Markdown Editor, CSV to JSON/XML Converter, XML Toolbox, YAML ↔ JSON Converter, AST-based CSS Specificity Calculator, CSP Builder & Analyzer, Cron Expression Explainer, HTTP Status Code Explainer, HTML Tag Explainer, Encoder / Decoder, and UUID / ULID Generator.

- JSON inference merges fields across array samples, marks missing fields optional and retains mixed types. Schemas describe the sample rather than a complete API contract. Sample values are not included in generated definitions.
- Support File Sanitizer includes a POSIX cURL-to-JavaScript converter. It parses text without executing commands or sending requests. Sharing mode replaces query values, JSON body values and most header values; URL paths, field names and content-negotiation headers remain visible. Browser-controlled headers are omitted with notices; file references, shell expansion and unsupported flags stop conversion. Output always omits browser credentials.
- Synthetic Dataset Generator creates seeded fixtures with unique per-table IDs and valid references between tables. Customize types, ranges, choices and row counts; preview tables or export CSV, JSON and a ZIP with the schema. Test names are labels and generated emails use `example.invalid`. CSV formula-like text is escaped. Seeded UUIDs are fixture data, not cryptographic identifiers. Limits: 8 tables, 20,000 total rows and 300,000 cells; processing runs in a time-limited worker.
- QR Toolkit generates text/URL, personal Wi-Fi and vCard contact codes with bundled `qrcode`. PNG/SVG exports contain the encoded values, including Wi-Fi passwords. Read or paste PNG/JPEG/WebP images with bundled `jsqr` in a time-limited worker; targets are displayed as inert text, never opened or checked over the network. Camera access is not required. Images are limited to 20 MB / 20 million pixels and scaled to at most 1,600 pixels per side for decoding; small or complex codes may need a sharper crop.

### Text, Accessibility, Converters & Generators
Text Statistics / Analyzer, Find & Replace, List Cleaner & Formatter, Text Contrast Checker, Color Code Converter, Unit Converter, Timestamp & Date Toolkit, and Lorem Ipsum Generator.

## Offline / PWA behavior

ToolStack is installable as a standalone PWA. Use **Install app** in the footer or your browser's install menu. On iPhone / iPad, use Safari's Share → Add to Home Screen.

Keep the app open online until the footer says **Offline ready**. Its service worker downloads every prerendered page, navigation payload, application chunk, font, worker and bundled PDF.js / qpdf runtime, including lazily loaded code. All registered tools can then be opened and used without an Internet connection, even if never previously visited. First setup requires a download (roughly 20–25 MB before transfer compression); installation itself is optional for offline use.

User-selected files, generated files and tool input are **not** placed in this cache. Only an explicit build-generated allowlist of application resources is saved. Requests to other origins, uploads and arbitrary data are not cached. Interrupted downloads show **Retry download**, and readiness is checked again when the app starts. Browser storage can be cleared or evicted; reconnect and download again if that happens. The app requests persistent storage after a supported native installation is accepted; the browser decides whether to grant it.

New versions download in the background and offer **Reload to update**. Save or download your working output before choosing it. Updates do not automatically reload a working tab. One previous asset cache is retained for tabs using an older build.

Offline support runs only in production over HTTPS (or localhost). Development deliberately unregisters ToolStack's worker and clears its application caches to avoid stale development assets. Run `npm run build` (including its postbuild step), then `npm start` to test it. The postbuild script generates `public/pwa/sw.js` and versioned page / navigation snapshots from the actual Next build; generated files are ignored by Git and must be included in deployment output. It fails if any page is missing from the static offline bundle. `/sw.js` imports the generated worker and remains stable for existing installations. Do not deploy using a bare `next build` command that skips the postbuild step.

App icons and generation prompts are in [design/app-icons](design/app-icons/README.md); the selected dark TS monogram is exported to install, maskable, Apple touch and favicon sizes in `public/icons/`.

## Development

```bash
git clone https://github.com/surajverma/toolstack.git
cd toolstack
npm install
npm run dev
```

Open `http://localhost:3000`.

`npm run dev` compiles directly from your current source tree. For a production-mode test, build first:

```bash
npm run build
npm start
```

`npm start` only serves an existing `.next` production build; pulling or switching branches does not rebuild `.next` automatically.

Before submitting a change:

```bash
npm run verify
```

`verify` runs the production dependency audit, privacy check, ESLint, TypeScript checking, Vitest unit tests and a production build.

## Security and privacy notes

ToolStack's privacy promise concerns the data entered into its tools. Dependencies and the hosting platform still require normal supply-chain and infrastructure maintenance. Security-sensitive tools use browser-standard APIs such as Web Crypto rather than custom cryptographic primitives where possible.

The Content Credentials inspector reads embedded C2PA provenance data locally. It does not fetch external trust lists or claim that every embedded signer is trusted.

## Contributing

Bug reports, privacy improvements, accessibility fixes and new local-only tools are welcome. A proposed core tool should be able to perform its main function without transmitting the user's input to another service.

## License

MIT. See [LICENSE](LICENSE).

If you find ToolStack useful, you can [buy me a coffee](https://ko-fi.com/skv).
