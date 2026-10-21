import type { LaunchKitState } from './useLaunchKit';

export default function ExportPanel({ kit }: { kit: LaunchKitState }) {
  const { site, paths, busy, exportZip } = kit;
  return (
    <div className="wb-grid">
      <section className="panel wb-stack">
        <h2>One consistent launch package</h2>
        <p>
          Metadata, social tags, favicon files, a web manifest, crawler rules
          and your sitemap. Exported filenames match their generated references.
        </p>
        <ul className="wb-change-list">
          <li>
            {site.siteName} · {site.url}
          </li>
          <li>{site.title}</li>
          <li>
            {site.noindex
              ? 'Requests noindex, nofollow'
              : 'Requests indexing and following'}
          </li>
          <li>
            {paths.split('\n').filter((line) => line.trim()).length} supplied
            sitemap paths
          </li>
        </ul>
        <button className="action" onClick={() => void exportZip()}>
          {busy ? 'Creating package…' : 'Download launch kit ZIP'}
        </button>
        <p className="wb-muted">
          Place exported files at the site root. Icons and a manifest enable
          installation metadata; your own site still needs its own service
          worker for offline operation.
        </p>
      </section>
      <section className="panel wb-stack">
        <h2>Review before publishing</h2>
        <p>
          Your project inputs and original image are not exported as an editable
          project file. The generated metadata and image assets intentionally
          contain the values you entered.
        </p>
        <p>
          Use the rules tester to check important URLs. A disallow rule prevents
          a crawler from seeing page-level noindex directives, so combining them
          may not achieve the intended result.
        </p>
      </section>
    </div>
  );
}
