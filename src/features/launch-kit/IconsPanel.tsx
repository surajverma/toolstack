import type { LaunchKitState } from './useLaunchKit';
import { CodeOutput, Field } from '@/components/workbench/Workbench';
import { ICON_HTML } from './icons';

export default function IconsPanel({ kit }: { kit: LaunchKitState }) {
  const { icon, iconPreview, busy, updateIcon, loadIcon, exportZip, field } =
    kit;
  return (
    <div className="wb-grid">
      <section className="panel wb-stack">
        <div className="wb-form-grid">
          {field('siteName', 'App name')}
          {field('theme', 'App theme color', 'color')}
        </div>
        <Field label="Image source">
          <input
            className="field"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadIcon(file);
              event.target.value = '';
            }}
          />
        </Field>
        <Field label="Or a short monogram / emoji">
          <input
            className="field"
            value={icon.text}
            maxLength={8}
            onChange={(event) =>
              updateIcon({ text: event.target.value, image: null })
            }
          />
        </Field>
        <div className="wb-form-grid">
          <Field label="Background">
            <input
              className="field"
              type="color"
              value={icon.background}
              onChange={(event) =>
                updateIcon({ background: event.target.value })
              }
            />
          </Field>
          <Field label="Text color">
            <input
              className="field"
              type="color"
              value={icon.foreground}
              onChange={(event) =>
                updateIcon({ foreground: event.target.value })
              }
            />
          </Field>
        </div>
        <Field label={`Padding: ${icon.padding}%`}>
          <input
            type="range"
            min={0}
            max={35}
            value={icon.padding}
            onChange={(event) =>
              updateIcon({ padding: Number(event.target.value) })
            }
          />
        </Field>
        <label className="wb-checkbox">
          <input
            type="checkbox"
            checked={icon.transparent}
            onChange={(event) =>
              updateIcon({ transparent: event.target.checked })
            }
          />
          Transparent standard icons
        </label>
        <button
          className="action action-secondary"
          onClick={() => updateIcon({})}
        >
          Refresh preview
        </button>
        <button className="action" onClick={() => void exportZip(true)}>
          {busy ? 'Creating icons…' : 'Download complete favicon pack'}
        </button>
      </section>
      <section className="panel wb-stack">
        <h2>Small sizes and masks</h2>
        <div className="wb-icon-previews">
          {[16, 32, 64, 180].map((size) => (
            <div key={size}>
              <div
                className="wb-icon-tile"
                style={{
                  width: size,
                  height: size,
                  background: iconPreview
                    ? `url("${iconPreview}") center / contain`
                    : icon.background,
                }}
              >
                {!iconPreview && (
                  <span style={{ color: icon.foreground, fontSize: size / 2 }}>
                    {icon.text}
                  </span>
                )}
              </div>
              <small>{size}px</small>
            </div>
          ))}
        </div>
        <div className="wb-icon-masks">
          {['0', '25%', '50%'].map((radius) => (
            <div
              key={radius}
              style={{
                borderRadius: radius,
                background: iconPreview
                  ? `url("${iconPreview}") center / cover`
                  : icon.background,
                color: icon.foreground,
              }}
            >
              {!iconPreview && icon.text}
            </div>
          ))}
        </div>
        <p className="wb-muted">
          The mask previews show your standard icon. The separate maskable
          export adds at least 24% padding and a solid background to keep
          artwork inside the safe circle.
        </p>
        <CodeOutput value={ICON_HTML} label="HTML icon links" />
        <p>
          Includes ICO (16/32/48), SVG, PNG (16/32/48/180/192/512), a maskable
          PNG, manifest and usage instructions. SVG uploads are cleaned before
          rendering. The exported SVG embeds a PNG so all formats look consistent.
        </p>
      </section>
    </div>
  );
}
