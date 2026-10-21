import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE, inspectMetadata } from './metadata';
import {
  allowProjectCrawling,
  createLaunchProject,
  editProjectRobots,
  updateProjectSite,
} from './project';

describe('launch project sitemap ownership', () => {
  it('keeps the generated directive synchronized through URL edits and HTML imports', () => {
    let project = updateProjectSite(createLaunchProject(), {
      url: 'https://launch.example/about',
    });
    expect(project.robots).toContain(
      'Sitemap: https://launch.example/sitemap.xml',
    );
    expect(project.robots).not.toContain('example.com');
    const imported = inspectMetadata(
      '<link rel="canonical" href="https://imported.example:8443/docs/page">',
    );
    project = updateProjectSite(project, { url: imported.values.url });
    expect(project.robots).toContain(
      'Sitemap: https://imported.example:8443/sitemap.xml',
    );
    expect(project.site.url).toBe(imported.values.url);
  });

  it('preserves edited rules, comments, CRLF and additional custom sitemap URLs', () => {
    let project = createLaunchProject();
    project = editProjectRobots(
      project,
      'User-agent: *\r\nDisallow: /private\r\n  sItEmAp :  https://example.com/sitemap.xml # generated\r\nSitemap: https://cdn.example/news.xml\r\n',
    );
    project = updateProjectSite(project, { url: 'https://launch.example/' });
    expect(project.robots).toBe(
      'User-agent: *\r\nDisallow: /private\r\n  sItEmAp :  https://launch.example/sitemap.xml # generated\r\nSitemap: https://cdn.example/news.xml\r\n',
    );
  });

  it('leaves an explicitly edited or removed sitemap alone until the preset is reset', () => {
    for (const source of [
      'User-agent: *\nDisallow: /\n',
      'User-agent: *\nAllow: /\nSitemap: https://cdn.example/custom.xml\n',
    ]) {
      let project = editProjectRobots(createLaunchProject(), source);
      project = updateProjectSite(project, { url: 'https://launch.example/' });
      expect(project.robots).toBe(source);
      expect(project.automaticSitemap).toBeNull();
      project = allowProjectCrawling(project);
      project = updateProjectSite(project, { url: 'https://next.example/' });
      expect(project.robots).toContain(
        'Sitemap: https://next.example/sitemap.xml',
      );
    }
  });

  it('retains the last valid directive while the URL is incomplete, then resumes synchronization', () => {
    let project = updateProjectSite(createLaunchProject(), {
      url: 'https://launch.example/',
    });
    project = updateProjectSite(project, { url: 'https://' });
    expect(project.site.url).toBe('https://');
    expect(project.robots).toContain(
      'Sitemap: https://launch.example/sitemap.xml',
    );
    project = updateProjectSite(project, { url: 'https://next.example/' });
    expect(project.robots).toContain(
      'Sitemap: https://next.example/sitemap.xml',
    );
    expect(DEFAULT_SITE.url).toBe('https://example.com/');
  });
});
