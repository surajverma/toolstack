import type { Tool, ToolCategory } from '@/types/tool';

const tool = (slug: string, name: string, description: string, category: ToolCategory, tags: string[], options: Partial<Pick<Tool, 'featured' | 'new'>> = {}): Tool => ({
  id: slug, slug: `/${slug}`, name, description, category, tags, processing: 'local', networkRequired: false, storesData: false, ...options,
});

export const TOOLS: Tool[] = [
  tool('image-compressor','Image Compressor','Compress image batches locally with browser-side processing.','Images',['image','compress','optimize','media']),
  tool('regex-tester','Regex Tester & Explainer','Test regular expressions in a disposable worker with a timeout.','Developer',['text','developer','regex','code']),
  tool('text-diff','Text Diff Checker','Compare two pieces of text and highlight differences.','Text & Data',['text','compare','diff']),
  tool('color-converter','Color Code Converter','Convert HEX, RGB and HSL color values.','Converters',['color','design','developer','converter']),
  tool('placeholder-generator','Placeholder Image Generator','Create custom placeholder images locally.','Images',['image','design','placeholder']),
  tool('text-analyzer','Text Statistics / Analyzer','Count words, characters, sentences and more.','Text & Data',['text','stats','analyzer','counter']),
  tool('image-metadata','Image Metadata Remover','View and remove EXIF metadata from JPEG images.','Privacy & Security',['image','privacy','exif','metadata','security'],{featured:true}),
  tool('markdown-editor','Markdown Editor','Edit Markdown with a sanitized live local preview.','Text & Data',['text','markdown','editor','writing']),
  tool('csv-converter','CSV to JSON/XML Converter','Convert CSV data to JSON or XML locally.','Converters',['csv','json','xml','converter','data','developer']),
  tool('contrast-checker','Text Contrast Checker','Check color contrast against accessibility guidance.','Accessibility',['accessibility','color','design','wcag']),
  tool('image-resizer','Image Resizer','Resize images to specific dimensions locally.','Images',['image','resize','dimensions','optimize']),
  tool('image-cropper','Image Cropper','Crop images locally in your browser.','Images',['image','crop','edit','dimensions']),
  tool('lorem-ipsum-generator','Lorem Ipsum Generator','Generate placeholder text.','Generators',['text','generator','placeholder','design']),
  tool('regex-generator','Easy Regex Generator','Build common regular expressions without memorizing syntax.','Developer',['regex','generator','developer','text','code']),
  tool('find-replace','Find & Replace in Text','Find and replace text with optional regex support.','Text & Data',['text','find','replace','regex']),
  tool('data-anonymizer','Data Anonymizer','Redact common sensitive-looking values locally.','Privacy & Security',['text','privacy','security','anonymize','redact'],{featured:true}),
  tool('css-specificity-calculator','CSS Specificity Calculator','Calculate modern CSS selector specificity with an AST parser.','Developer',['css','developer','specificity','design']),
  tool('unit-converter','Unit Converter','Convert common measurement units.','Converters',['converter','units','measurement','math']),
  tool('http-status-codes','HTTP Status Code Explainer','Look up HTTP status codes and meanings.','Developer',['http','developer','reference','network']),
  tool('list-cleaner','List Cleaner & Formatter','Sort, deduplicate and format text lists.','Text & Data',['text','list','format','cleaner','sort']),
  tool('html-tag-explainer','HTML Tag Explainer','Reference standard HTML tags and their uses.','Developer',['html','developer','reference','code']),
  tool('file-hash','File Hash & Checksum','Generate SHA-256, SHA-384 and SHA-512 checksums without uploading files.','Privacy & Security',['privacy','hash','checksum','file','security'],{featured:true,new:true}),
  tool('json-toolbox','JSON Toolbox','Format, minify, validate, sort and structurally compare JSON locally.','Developer',['json','format','validate','diff','developer','data'],{new:true}),
  tool('url-cleaner','Tracking URL Cleaner','Remove common tracking parameters and inspect URL parts locally.','Privacy & Security',['privacy','url','tracking','utm','cleaner'],{featured:true,new:true}),
  tool('password-generator','Password & Passphrase Generator','Generate cryptographically secure passwords and passphrases locally.','Privacy & Security',['password','security','privacy','generator'],{featured:true,new:true}),
  tool('encoder-decoder','Encoder / Decoder','Encode and decode Base64, URLs and HTML entities.','Developer',['base64','url','html','unicode','encode','decode'],{new:true}),
  tool('jwt-inspector','JWT Inspector','Decode JWT headers and payloads locally without sending tokens anywhere.','Privacy & Security',['jwt','token','developer','privacy','security'],{new:true}),
  tool('timestamp-tool','Timestamp & Date Toolkit','Convert Unix timestamps, ISO dates, UTC and local time.','Converters',['date','time','timestamp','unix','converter'],{new:true}),
  tool('uuid-generator','UUID / ULID Generator','Generate and validate UUIDs and generate ULIDs locally.','Generators',['uuid','ulid','generator','developer','identifier'],{new:true}),
  tool('browser-privacy','Browser Privacy Inspector','See what your browser exposes to websites without transmitting the results.','Privacy & Security',['privacy','browser','fingerprint','security'],{featured:true,new:true}),
  tool('text-privacy-cleaner','Text Privacy Cleaner','Reveal or remove hidden Unicode, control and zero-width characters.','Privacy & Security',['privacy','text','unicode','cleaner','security'],{new:true}),
  tool('image-converter','Image Format Converter','Convert supported images to PNG, JPEG or WebP locally.','Images',['image','convert','png','jpeg','webp'],{new:true}),
  tool('file-encryption','File Encryption','Encrypt and decrypt files locally with AES-GCM and a password-derived key.','Privacy & Security',['privacy','encryption','aes','file','security'],{featured:true,new:true}),
  tool('pdf-toolkit','PDF Toolkit','Merge, split, reorder, extract, delete and rotate PDF pages locally.','PDF & Documents',['pdf','merge','split','pages','documents','privacy'],{featured:true,new:true}),
  tool('file-signature-inspector','File Type & Signature Inspector','Inspect file magic bytes instead of trusting only the extension.','Privacy & Security',['file','signature','magic bytes','security','inspector'],{new:true}),
  tool('content-credentials','Content Credentials Inspector','Read embedded C2PA provenance metadata locally with bundled WebAssembly.','Privacy & Security',['c2pa','content credentials','provenance','metadata','privacy'],{featured:true,new:true}),
  tool('xml-toolbox','XML Toolbox','Validate, format, minify and convert XML to JSON locally.','Converters',['xml','json','format','validate','converter'],{new:true}),
  tool('yaml-json','YAML ↔ JSON Converter','Convert YAML and JSON locally with a bundled parser.','Converters',['yaml','json','converter','developer','data'],{new:true}),
  tool('csp-builder','CSP Builder & Analyzer','Draft and inspect Content Security Policy headers locally.','Developer',['csp','security','headers','developer','web'],{new:true}),
  tool('hmac-tool','HMAC Generator & Verifier','Generate and verify HMAC-SHA signatures using Web Crypto.','Privacy & Security',['hmac','hash','signature','crypto','security'],{new:true}),
  tool('cron-explainer','Cron Expression Explainer','Explain standard five-field cron expressions.','Developer',['cron','schedule','developer','automation'],{new:true}),
];

export const TOOL_BY_SLUG = new Map(TOOLS.map(item => [item.slug, item]));
export const TOOL_CATEGORIES = [...new Set(TOOLS.map(item => item.category))];
