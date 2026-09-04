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
- PDF Toolkit: merge PDFs, reorder merge inputs, extract/reorder/delete/rotate pages, split every page to ZIP, edit basic metadata and turn images into a PDF.
- PDF operations run in-browser with bundled `pdf-lib`; ToolStack does not claim secure redaction or general PDF compression.

### Privacy & Security
Image Metadata Remover, Data Anonymizer, File Hash & Checksum, Tracking URL Cleaner, Password & Passphrase Generator, JWT Inspector, Browser Privacy Inspector, Text Privacy Cleaner, AES-GCM File Encryption, File Type & Signature Inspector, Content Credentials (C2PA) Inspector, and HMAC Generator & Verifier.

### Images
Image Compressor, Image Resizer, Image Cropper, Image Format Converter, and Placeholder Image Generator.

### Developer / Data
JSON Toolbox (including structural diff), Regex Tester & Explainer, Easy Regex Generator, Text Diff Checker, sanitized Markdown Editor, CSV to JSON/XML Converter, XML Toolbox, YAML ↔ JSON Converter, AST-based CSS Specificity Calculator, CSP Builder & Analyzer, Cron Expression Explainer, HTTP Status Code Explainer, HTML Tag Explainer, Encoder / Decoder, and UUID / ULID Generator.

### Text, Accessibility, Converters & Generators
Text Statistics / Analyzer, Find & Replace, List Cleaner & Formatter, Text Contrast Checker, Color Code Converter, Unit Converter, Timestamp & Date Toolkit, and Lorem Ipsum Generator.

## Offline / PWA behavior

ToolStack registers a same-origin service worker in production. The home page, offline fallback and ToolStack's own static assets are cached, and successfully visited tool pages can be reopened from the cache when offline.

User-selected files, generated files and tool input are **not** deliberately placed into the service-worker cache.

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

If you find ToolStack useful, you can support the project at https://ko-fi.com/skv.
