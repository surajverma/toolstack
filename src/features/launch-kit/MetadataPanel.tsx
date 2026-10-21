import type { LaunchKitState } from './useLaunchKit';
import { CodeOutput, Field, Tabs } from '@/components/workbench/Workbench';
import { downloadLocal } from '@/lib/local-files';

export default function MetadataPanel({ kit }: { kit: LaunchKitState }) {
  const {
    site,
    html,
    setHtml,
    socialPreview,
    format,
    setFormat,
    metadata,
    update,
    field,
    previewSocial,
    importHtml,
  } = kit;
  return (
    <div className="wb-grid">
      <section className="panel wb-stack">
        <div className="wb-form-grid">
          {field('siteName', 'Site name')}
          {field('url', 'Canonical page URL', 'url')}
        </div>
        {field('title', 'Page title')}
        <Field label="Description">
          <textarea
            className="field"
            rows={3}
            value={site.description}
            maxLength={1000}
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>
        <div className="wb-form-grid">
          {field('locale', 'Locale')}
          {field('theme', 'Theme color', 'color')}
        </div>
        {field('image', 'Published social image URL (never fetched)', 'url')}
        {field('imageAlt', 'Social image alternative text')}
        <label className="wb-checkbox">
          <input
            type="checkbox"
            checked={site.noindex}
            onChange={(event) => update('noindex', event.target.checked)}
          />
          Request noindex, nofollow
        </label>
        <details className="wb-details">
          <summary>Import or inspect existing HTML</summary>
          <Field label="Existing page HTML">
            <textarea
              className="field wb-editor"
              value={html}
              maxLength={512000}
              onChange={(event) => setHtml(event.target.value)}
            />
          </Field>
          <button className="action action-secondary" onClick={importHtml}>
            Inspect & import
          </button>
        </details>
      </section>
      <section className="panel wb-stack">
        <h2>Social preview</h2>
        <div className="wb-social-preview">
          {socialPreview ? (
            <svg
              viewBox="0 0 600 315"
              role="img"
              aria-label="Local social image preview"
            >
              <image href={socialPreview} width={600} height={315} />
            </svg>
          ) : (
            <div className="wb-social-placeholder">
              Choose a local image to preview
            </div>
          )}
          <div>
            <small>
              {metadata.value
                ? new URL(metadata.value.url).hostname
                : 'example.com'}
            </small>
            <h3>{site.title}</h3>
            <p>{site.description}</p>
          </div>
        </div>
        <Field label="Local preview image (not added to exports)">
          <input
            className="field"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void previewSocial(file);
              event.target.value = '';
            }}
          />
        </Field>
        <p className="wb-muted">
          Illustrative preview. Search and social services choose their own
          presentation. Remote images are never requested.
        </p>
        <Tabs
          value={format}
          onChange={setFormat}
          items={[
            { value: 'html', label: 'HTML' },
            { value: 'next', label: 'Next.js' },
          ]}
        />
        <CodeOutput
          value={metadata.value?.[format] || ''}
          label="Metadata output"
        />
        <button
          className="action action-secondary"
          disabled={!metadata.value}
          onClick={() =>
            downloadLocal(
              metadata.value![format],
              format === 'html' ? 'head.html' : 'metadata.ts',
            )
          }
        >
          Download metadata
        </button>
      </section>
    </div>
  );
}
