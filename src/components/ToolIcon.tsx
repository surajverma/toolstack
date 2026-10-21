import {
  AlignLeft, ArrowLeftRight, BadgeCheck, Binary, Braces, Calculator, Calendar, CalendarClock,
  Clock, Code, CodeXml, Contrast, Crop, Database, Eraser, FileCheck, FileCode,
  FileDiff, FileSearch, Files, FileText, Fingerprint, Hash, Image, ImagePlus,
  Images, Key, KeyRound, ListFilter, LockKeyhole, Network, Palette, QrCode,
  Regex, Replace, Ruler, Scan, ScanEye, ScanFace, Scaling, Shield, ShieldCheck,
  Signature, Sparkles, Table, Text, TextCursor, Unlink, WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ToolCategory } from '@/types/tool';

const toolIcons: Record<string, LucideIcon> = {
  'text-diff': FileDiff, 'json-toolbox': Braces, 'pdf-toolkit': Files,
  'support-sanitizer': ShieldCheck, 'image-compressor': Image,
  'data-anonymizer': ScanFace, 'qr-toolkit': QrCode, 'markdown-editor': FileText,
  'url-cleaner': Unlink, 'document-privacy': FileSearch, 'file-hash': Fingerprint,
  'timestamp-tool': Clock, 'image-resizer': Scaling, 'image-cropper': Crop,
  'image-converter': Images, 'placeholder-generator': ImagePlus,
  'regex-tester': Regex, 'regex-generator': WandSparkles,
  'css-specificity-calculator': Code, 'http-status-codes': Network,
  'html-tag-explainer': CodeXml, 'encoder-decoder': Binary, 'csp-builder': Shield,
  'cron-explainer': CalendarClock, 'text-analyzer': Text, 'find-replace': Replace,
  'list-cleaner': ListFilter, 'color-converter': Palette, 'csv-converter': Table,
  'unit-converter': Ruler, 'xml-toolbox': FileCode, 'yaml-json': ArrowLeftRight,
  'image-metadata': Eraser, 'password-generator': KeyRound, 'jwt-inspector': Key,
  'browser-privacy': ScanEye, 'text-privacy-cleaner': TextCursor,
  'file-encryption': LockKeyhole, 'file-signature-inspector': FileCheck,
  'content-credentials': BadgeCheck, 'hmac-tool': Signature,
  'screenshot-redactor': Scan, 'calendar-privacy': Calendar,
  'contrast-checker': Contrast, 'lorem-ipsum-generator': AlignLeft,
  'uuid-generator': Hash, 'synthetic-data': Database,
  'website-launch-kit': Files, 'meta-tag-generator': CodeXml,
  'robots-txt-generator': Network, 'favicon-generator': ImagePlus,
  'calculation-notebook': Calculator, 'everyday-calculators': Calculator,
  'finance-calculator': Table, 'subnet-calculator': Network,
  'css-playground': Palette, 'svg-toolkit': Signature,
  'encrypted-notes': LockKeyhole, 'bash-generator': Code,
  'ascii-art': AlignLeft,
};

const categoryIcons: Record<ToolCategory, LucideIcon> = {
  'Privacy & Security': ShieldCheck, Developer: Code, 'Text & Data': Text,
  Images: Image, Converters: ArrowLeftRight, 'PDF & Documents': Files,
  Generators: Sparkles, Accessibility: Contrast, Calculators: Calculator, Design: Palette,
};

export function CategoryIcon({ category }: { category: ToolCategory }) {
  const Icon = categoryIcons[category];
  return <Icon size={17} strokeWidth={1.7} aria-hidden='true' />;
}

export default function ToolIcon({ id }: { id: string }) {
  const Icon = toolIcons[id] ?? FileText;
  return <Icon size={20} strokeWidth={1.7} aria-hidden='true' />;
}
