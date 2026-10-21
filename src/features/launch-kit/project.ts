import { DEFAULT_SITE, type SiteMetadata } from './metadata';
import { defaultRobots, defaultSitemap } from './robots';

export type LaunchProject = {
  site: SiteMetadata;
  robots: string;
  automaticSitemap: string | null;
};

function rewriteSitemaps(source: string, rewrite: (url: string) => string) {
  return source.replace(
    /^([ \t]*sitemap[ \t]*:[ \t]*)([^#\s]+)([^\r\n]*)(\r?)$/gim,
    (
      _line,
      prefix: string,
      url: string,
      suffix: string,
      carriageReturn: string,
    ) => prefix + rewrite(url) + suffix + carriageReturn,
  );
}

export function createLaunchProject(): LaunchProject {
  return {
    site: { ...DEFAULT_SITE },
    robots: defaultRobots(DEFAULT_SITE.url),
    automaticSitemap: defaultSitemap(DEFAULT_SITE.url),
  };
}

/** Keep only the generated directive in sync, preserving custom rules and formatting. */
export function updateProjectSite(
  project: LaunchProject,
  changes: Partial<SiteMetadata>,
): LaunchProject {
  const next = { ...project, site: { ...project.site, ...changes } };
  if (!project.automaticSitemap) return next;
  let sitemap: string;
  try {
    sitemap = defaultSitemap(next.site.url);
  } catch {
    return next;
  } // Keep the last valid directive while a URL is being typed.
  return {
    ...next,
    robots: rewriteSitemaps(project.robots, (url) =>
      url === project.automaticSitemap ? sitemap : url,
    ),
    automaticSitemap: sitemap,
  };
}

export function editProjectRobots(
  project: LaunchProject,
  source: string,
): LaunchProject {
  let retainsGeneratedSitemap = false;
  rewriteSitemaps(source, (url) => {
    if (url === project.automaticSitemap) retainsGeneratedSitemap = true;
    return url;
  });
  return {
    ...project,
    robots: source,
    // Editing or removing the generated URL transfers ownership to the user.
    automaticSitemap: retainsGeneratedSitemap ? project.automaticSitemap : null,
  };
}

export function allowProjectCrawling(project: LaunchProject): LaunchProject {
  return {
    ...project,
    robots: defaultRobots(project.site.url),
    automaticSitemap: defaultSitemap(project.site.url),
  };
}
