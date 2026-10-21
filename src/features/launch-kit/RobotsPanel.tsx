import type { LaunchKitState } from './useLaunchKit';
import {
  CodeOutput,
  ErrorMessage,
  Field,
} from '@/components/workbench/Workbench';
import { downloadLocal } from '@/lib/local-files';
import { defaultRobots } from './robots';

export default function RobotsPanel({ kit }: { kit: LaunchKitState }) {
  const {
    site,
    robots,
    setRobots,
    testPath,
    setTestPath,
    agent,
    setAgent,
    paths,
    setPaths,
    setError,
    rules,
    sitemap,
    field,
  } = kit;
  return (
    <div className="wb-grid">
      <section className="panel wb-stack">
        <h2>robots.txt</h2>
        <div className="wb-actions">
          <button
            className="action action-secondary"
            onClick={() => {
              try {
                setRobots(defaultRobots(site.url));
                setError('');
              } catch {
                setError('Enter a valid project URL.');
              }
            }}
          >
            Allow crawling
          </button>
          <button
            className="action action-secondary"
            onClick={() => setRobots('User-agent: *\nDisallow: /\n')}
          >
            Disallow crawling
          </button>
        </div>
        <Field label="robots.txt source">
          <textarea
            className="field wb-editor"
            maxLength={64000}
            value={robots}
            onChange={(event) => setRobots(event.target.value)}
            spellCheck={false}
          />
        </Field>
        <div className="wb-form-grid">
          <Field label="Crawler product token">
            <input
              className="field"
              value={agent}
              maxLength={80}
              onChange={(event) => setAgent(event.target.value)}
            />
          </Field>
          <Field label="Test path or URL">
            <input
              className="field"
              value={testPath}
              maxLength={2048}
              onChange={(event) => setTestPath(event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={rules.error} />
        {rules.value && (
          <div className="note">
            <strong>
              {rules.value.allowed ? 'Crawling allowed' : 'Crawling disallowed'}
            </strong>
            <p>
              {rules.value.group}
              {rules.value.winner
                ? ` · line ${rules.value.winner.line}: ${rules.value.winner.allow ? 'Allow' : 'Disallow'}: ${rules.value.winner.pattern}`
                : ' · no matching rule'}
            </p>
          </div>
        )}
        <button
          className="action action-secondary"
          onClick={() => downloadLocal(robots, 'robots.txt')}
        >
          Download robots.txt
        </button>
        <p className="wb-muted">
          Local rule simulation supports matching groups, longest paths, * and
          terminal $. Crawler behavior can differ. robots.txt is public and does
          not protect private content or reliably remove URLs from search.
        </p>
      </section>
      <section className="panel wb-stack">
        {field('url', 'Site URL for sitemap', 'url')}
        <Field label="Sitemap paths or same-origin URLs (one per line)">
          <textarea
            className="field wb-editor"
            value={paths}
            maxLength={100000}
            onChange={(event) => setPaths(event.target.value)}
          />
        </Field>
        <ErrorMessage message={sitemap.error} />
        <CodeOutput value={sitemap.value} label="Sitemap XML" />
        <button
          className="action action-secondary"
          disabled={!sitemap.value}
          onClick={() =>
            downloadLocal(sitemap.value, 'sitemap.xml', 'application/xml')
          }
        >
          Download sitemap
        </button>
        <p className="wb-muted">
          {site.noindex
            ? 'This project requests noindex. Review whether publishing a sitemap matches your intent.'
            : 'Only the URLs you enter are included. The tool does not crawl your website.'}
        </p>
      </section>
    </div>
  );
}
