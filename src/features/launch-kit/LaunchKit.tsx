'use client';
import { ErrorMessage, Tabs } from '@/components/workbench/Workbench';
import { useLaunchKit, type LaunchTab } from './useLaunchKit';
import MetadataPanel from './MetadataPanel';
import RobotsPanel from './RobotsPanel';
import IconsPanel from './IconsPanel';
import ExportPanel from './ExportPanel';

export default function LaunchKit({
  initialTab = 'project',
  focused = false,
}: {
  initialTab?: LaunchTab;
  focused?: boolean;
}) {
  const kit = useLaunchKit(initialTab);
  const { tab, setTab, busy, error, status, metadata, warnings } = kit;
  const shownTab = focused ? initialTab : tab;
  const reviewWarnings =
    shownTab === 'icons'
      ? []
      : shownTab === 'robots'
        ? kit.rules.value?.warnings || []
        : warnings;
  return (
    <fieldset disabled={busy} className="wb-stack">
      {!focused && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'project', label: 'Project' },
            { value: 'metadata', label: 'Meta & social' },
            { value: 'robots', label: 'Robots & sitemap' },
            { value: 'icons', label: 'Favicons' },
            { value: 'export', label: 'Export kit' },
          ]}
        />
      )}
      {(shownTab === 'project' || shownTab === 'metadata') && (
        <MetadataPanel kit={kit} />
      )}
      {shownTab === 'robots' && <RobotsPanel kit={kit} />}
      {shownTab === 'icons' && <IconsPanel kit={kit} />}
      {shownTab === 'export' && <ExportPanel kit={kit} />}
      <ErrorMessage
        message={
          error ||
          (['metadata', 'project', 'export'].includes(shownTab)
            ? metadata.error
            : '')
        }
      />
      {reviewWarnings.length > 0 && (
        <details className="wb-details">
          <summary>
            {reviewWarnings.length} review note
            {reviewWarnings.length === 1 ? '' : 's'}
          </summary>
          <ul className="wb-change-list">
            {reviewWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <p role="status" className="wb-muted">
        {status}
      </p>
    </fieldset>
  );
}
