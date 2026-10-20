# ToolStack

**Privacy-first browser tools. Your working data stays on your device.**

ToolStack is an open-source collection of utilities designed around a strict local-processing rule: files, text and other working input are processed in the browser and are not sent to an application API for processing.

## Privacy contract

- Tool input is processed locally in the browser.
- No account is required.
- No advertising or analytics SDK is included.
- Source code under `src/` is checked for direct network-capable APIs by `npm run privacy-check`.
- Runtime libraries are bundled with the application rather than loaded from third-party CDNs.
- Tools that fundamentally require transmitting user input to a third party are intentionally excluded from the core collection.

## Highlights

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

ToolStack registers a same-origin service worker in production. The home page, offline fallback and ToolStack's own static assets are cached, and successfully visited tool pages can be reopened from the cache when offline.

User-selected files, generated files and tool input are **not** deliberately placed into the service-worker cache. Bundled PDF.js and qpdf runtime assets are cached after successful use, alongside application chunks.

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

`verify` runs the privacy check, ESLint, TypeScript checking, Vitest unit tests and a production build.

## Security and privacy notes

ToolStack's privacy promise concerns the data entered into its tools. Dependencies and the hosting platform still require normal supply-chain and infrastructure maintenance. Security-sensitive tools use browser-standard APIs such as Web Crypto rather than custom cryptographic primitives where possible.

The Content Credentials inspector reads embedded C2PA provenance data locally. It does not fetch external trust lists or claim that every embedded signer is trusted.

## Contributing

Bug reports, privacy improvements, accessibility fixes and new local-only tools are welcome. A proposed core tool should be able to perform its main function without transmitting the user's input to another service.

## License

MIT. See [LICENSE](LICENSE).

If you find ToolStack useful, you can [buy me a coffee](https://ko-fi.com/skv).
