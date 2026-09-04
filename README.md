# ToolStack

**Privacy-first browser tools. Your working data stays on your device.**

ToolStack is an open-source collection of utilities designed around a strict local-processing rule: tool input is processed in the browser and is not sent to an application API for processing.

## Privacy contract

- Processing is local to the browser.
- No account is required.
- No advertising or analytics SDK is included.
- Tool pages are checked for network-capable APIs by `npm run privacy-check`.
- Tools that fundamentally require sending user input to a third party are intentionally excluded from the core collection.

## Included tools

### Privacy & Security
Image Metadata Remover, Data Anonymizer, File Hash & Checksum, Tracking URL Cleaner, Password & Passphrase Generator, JWT Inspector, Browser Privacy Inspector, Text Privacy Cleaner, and AES-GCM File Encryption.

### Images
Image Compressor, Image Resizer, Image Cropper, Image Format Converter, and Placeholder Image Generator.

### Developer / Data
JSON Toolbox, Regex Tester & Explainer, Easy Regex Generator, Text Diff Checker, Markdown Editor, CSV to JSON/XML Converter, CSS Specificity Calculator, HTTP Status Code Explainer, HTML Tag Explainer, Encoder / Decoder, and UUID / ULID Generator.

### Text, Accessibility, Converters & Generators
Text Statistics / Analyzer, Find & Replace, List Cleaner & Formatter, Text Contrast Checker, Color Code Converter, Unit Converter, Timestamp & Date Toolkit, and Lorem Ipsum Generator.

## Development

```bash
git clone https://github.com/surajverma/toolstack.git
cd toolstack
npm install
npm run dev
```

Open `http://localhost:3000`.

For production SEO, set `NEXT_PUBLIC_SITE_URL` to the deployed site's absolute origin before building.

Before submitting a change:

```bash
npm run verify
```

`verify` runs the privacy check, ESLint, TypeScript checking and the production build.

## Security and privacy notes

ToolStack's privacy promise concerns the data entered into its tools. Dependencies and the hosting platform still need normal supply-chain and infrastructure maintenance. Security-sensitive tools prefer browser-standard cryptographic APIs such as Web Crypto rather than custom cryptography.

## Contributing

Bug reports, privacy improvements, accessibility fixes and new local-only tools are welcome. A proposed tool should be able to perform its main function without transmitting the user's input to another service.

## License

MIT. See [LICENSE](LICENSE).

If you find ToolStack useful, you can support the project at https://ko-fi.com/skv.
