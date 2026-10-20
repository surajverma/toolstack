// src/app/html-tag-explainer/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// Define the structure for an HTML tag
interface HtmlTag {
  tag: string;
  description: string;
  category: string;
}

// A comprehensive list of standard HTML5 tags
const HTML_TAGS: HtmlTag[] = [
  // Main Root
  { tag: '<html>', description: 'The root element of an HTML page.', category: 'Document Structure' },

  // Document Metadata
  {
    tag: '<head>',
    description: 'Contains machine-readable information (metadata) about the document.',
    category: 'Document Structure',
  },
  {
    tag: '<title>',
    description: "Specifies a title for the HTML page (which is shown in the browser's title bar or tab).",
    category: 'Document Structure',
  },
  {
    tag: '<base>',
    description: 'Specifies the base URL/target for all relative URLs in a document.',
    category: 'Document Structure',
  },
  {
    tag: '<link>',
    description:
      'Defines the relationship between the current document and an external resource (most often used to link to stylesheets).',
    category: 'Document Structure',
  },
  {
    tag: '<meta>',
    description:
      'Defines metadata about an HTML document, such as character set, page description, keywords, author, and viewport settings.',
    category: 'Document Structure',
  },
  { tag: '<style>', description: 'Contains style information (CSS) for a document.', category: 'Document Structure' },
  { tag: '<script>', description: 'Used to embed a client-side script (JavaScript).', category: 'Document Structure' },
  {
    tag: '<noscript>',
    description:
      "Defines an alternate content for users that have disabled scripts in their browser or have a browser that doesn't support script.",
    category: 'Document Structure',
  },

  // Sectioning Root
  {
    tag: '<body>',
    description: "Defines the document's body, which contains all the contents of an HTML document.",
    category: 'Document Structure',
  },

  // Content Sectioning
  {
    tag: '<address>',
    description: 'Defines contact information for the author/owner of a document or an article.',
    category: 'Sectioning & Headings',
  },
  {
    tag: '<article>',
    description: 'Specifies independent, self-contained content.',
    category: 'Sectioning & Headings',
  },
  {
    tag: '<aside>',
    description: 'Defines some content aside from the content it is placed in (like a sidebar).',
    category: 'Sectioning & Headings',
  },
  { tag: '<footer>', description: 'Defines a footer for a document or section.', category: 'Sectioning & Headings' },
  {
    tag: '<header>',
    description: 'Represents a container for introductory content or a set of navigational links.',
    category: 'Sectioning & Headings',
  },
  {
    tag: '<h1> to <h6>',
    description: 'Define HTML headings, from most important (h1) to least important (h6).',
    category: 'Sectioning & Headings',
  },
  { tag: '<main>', description: 'Specifies the main content of a document.', category: 'Sectioning & Headings' },
  { tag: '<nav>', description: 'Defines a set of navigation links.', category: 'Sectioning & Headings' },
  { tag: '<section>', description: 'Defines a section in a document.', category: 'Sectioning & Headings' },

  // Text Content
  {
    tag: '<blockquote>',
    description: 'Defines a section that is quoted from another source.',
    category: 'Text Content',
  },
  {
    tag: '<div>',
    description: 'Defines a division or a section, often used as a container for other HTML elements.',
    category: 'Text Content',
  },
  { tag: '<p>', description: 'Defines a paragraph.', category: 'Text Content' },
  {
    tag: '<pre>',
    description: 'Defines preformatted text, preserving spaces and line breaks.',
    category: 'Text Content',
  },
  {
    tag: '<hr>',
    description: 'Represents a thematic break between paragraph-level elements (e.g., a horizontal rule).',
    category: 'Text Content',
  },

  // Inline Text Semantics
  { tag: '<a>', description: 'Defines a hyperlink.', category: 'Inline Text Semantics' },
  {
    tag: '<b>',
    description: 'Defines bold text without any extra importance, such as keywords.',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<i>',
    description: 'Defines a part of text in an alternate voice or mood (often italicized).',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<u>',
    description: 'Defines text that should be stylistically different from normal text, such as a misspelled word.',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<span>',
    description: 'An inline container used to mark up a part of a text, or a part of a document.',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<strong>',
    description:
      'Defines text with strong importance, indicating that its contents have a higher degree of seriousness or urgency.',
    category: 'Inline Text Semantics',
  },
  { tag: '<em>', description: 'Defines emphasized text.', category: 'Inline Text Semantics' },
  { tag: '<code>', description: 'Defines a piece of computer code.', category: 'Inline Text Semantics' },
  { tag: '<br>', description: 'Inserts a single line break.', category: 'Inline Text Semantics' },
  {
    tag: '<mark>',
    description: 'Defines marked or highlighted text for reference purposes.',
    category: 'Inline Text Semantics',
  },
  { tag: '<sub>', description: 'Defines subscripted text.', category: 'Inline Text Semantics' },
  { tag: '<sup>', description: 'Defines superscripted text.', category: 'Inline Text Semantics' },
  { tag: '<time>', description: 'Defines a specific time (or datetime).', category: 'Inline Text Semantics' },
  { tag: '<abbr>', description: 'Defines an abbreviation or an acronym.', category: 'Inline Text Semantics' },
  {
    tag: '<cite>',
    description: 'Defines the title of a creative work (e.g., a book, a poem, a song, a movie).',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<dfn>',
    description: 'Specifies a term that is going to be defined within the content.',
    category: 'Inline Text Semantics',
  },
  { tag: '<q>', description: 'Defines a short inline quotation.', category: 'Inline Text Semantics' },
  {
    tag: '<small>',
    description: 'Defines smaller text (like copyright and other side-comments).',
    category: 'Inline Text Semantics',
  },
  {
    tag: '<wbr>',
    description: 'Defines a word-break opportunity, where a long word can be broken if needed.',
    category: 'Inline Text Semantics',
  },

  // Lists
  { tag: '<ul>', description: 'Defines an unordered (bulleted) list.', category: 'Lists' },
  { tag: '<ol>', description: 'Defines an ordered (numbered) list.', category: 'Lists' },
  { tag: '<li>', description: 'Defines a list item.', category: 'Lists' },
  { tag: '<dl>', description: 'Defines a description list.', category: 'Lists' },
  { tag: '<dt>', description: 'Defines a term/name in a description list.', category: 'Lists' },
  { tag: '<dd>', description: 'Describes a term/name in a description list.', category: 'Lists' },

  // Images and Media
  { tag: '<img>', description: 'Embeds an image in an HTML page.', category: 'Images & Media' },
  { tag: '<video>', description: 'Embeds video content.', category: 'Images & Media' },
  { tag: '<audio>', description: 'Embeds sound content.', category: 'Images & Media' },
  {
    tag: '<figure>',
    description: 'Specifies self-contained content, like illustrations, diagrams, photos, code listings, etc.',
    category: 'Images & Media',
  },
  { tag: '<figcaption>', description: 'Defines a caption for a <figure> element.', category: 'Images & Media' },
  {
    tag: '<picture>',
    description: 'Provides multiple image resources for a <img> element to adapt to different devices or screen sizes.',
    category: 'Images & Media',
  },
  {
    tag: '<source>',
    description: 'Defines multiple media resources for <picture>, <audio>, or <video> elements.',
    category: 'Images & Media',
  },
  { tag: '<svg>', description: 'Defines a container for SVG graphics.', category: 'Images & Media' },
  {
    tag: '<canvas>',
    description: 'Used to draw graphics, on the fly, via scripting (usually JavaScript).',
    category: 'Images & Media',
  },
  { tag: '<map>', description: 'Defines a client-side image-map.', category: 'Images & Media' },
  { tag: '<area>', description: 'Defines an area inside an image-map.', category: 'Images & Media' },

  // Forms
  { tag: '<form>', description: 'Used to create an HTML form for user input.', category: 'Forms' },
  { tag: '<input>', description: 'Specifies an input field where the user can enter data.', category: 'Forms' },
  { tag: '<textarea>', description: 'Defines a multi-line text input control.', category: 'Forms' },
  { tag: '<button>', description: 'Defines a clickable button.', category: 'Forms' },
  { tag: '<label>', description: 'Defines a label for several form elements.', category: 'Forms' },
  { tag: '<select>', description: 'Creates a drop-down list.', category: 'Forms' },
  { tag: '<option>', description: 'Defines an option in a drop-down list.', category: 'Forms' },
  { tag: '<fieldset>', description: 'Groups related elements in a form.', category: 'Forms' },
  { tag: '<legend>', description: 'Defines a caption for the <fieldset> element.', category: 'Forms' },
  {
    tag: '<datalist>',
    description: 'Specifies a list of pre-defined options for an <input> element.',
    category: 'Forms',
  },
  { tag: '<optgroup>', description: 'Groups related options in a drop-down list.', category: 'Forms' },
  { tag: '<output>', description: 'Represents the result of a calculation or user action.', category: 'Forms' },
  { tag: '<progress>', description: 'Represents the progress of a task.', category: 'Forms' },
  { tag: '<meter>', description: 'Defines a scalar measurement within a known range (a gauge).', category: 'Forms' },

  // Tables
  { tag: '<table>', description: 'Defines an HTML table.', category: 'Tables' },
  { tag: '<caption>', description: 'Defines a table caption.', category: 'Tables' },
  { tag: '<th>', description: 'Defines a header cell in a table.', category: 'Tables' },
  { tag: '<tr>', description: 'Defines a row in a table.', category: 'Tables' },
  { tag: '<td>', description: 'Defines a standard cell in a table.', category: 'Tables' },
  { tag: '<thead>', description: 'Groups the header content in a table.', category: 'Tables' },
  { tag: '<tbody>', description: 'Groups the body content in a table.', category: 'Tables' },
  { tag: '<tfoot>', description: 'Groups the footer content in a table.', category: 'Tables' },
  {
    tag: '<col>',
    description: 'Specifies column properties for each column within a <colgroup> element.',
    category: 'Tables',
  },
  {
    tag: '<colgroup>',
    description: 'Specifies a group of one or more columns in a table for formatting.',
    category: 'Tables',
  },

  // Interactive Elements
  {
    tag: '<details>',
    description: 'Defines additional details that the user can view or hide.',
    category: 'Interactive Elements',
  },
  {
    tag: '<summary>',
    description: 'Defines a visible heading for a <details> element.',
    category: 'Interactive Elements',
  },
  { tag: '<dialog>', description: 'Defines a dialog box or window.', category: 'Interactive Elements' },

  // Web Components
  {
    tag: '<template>',
    description:
      'A mechanism for holding client-side content that is not to be rendered when a page is loaded but may subsequently be instantiated during runtime using JavaScript.',
    category: 'Web Components',
  },
  {
    tag: '<slot>',
    description: 'A placeholder inside a web component that you can fill with your own markup.',
    category: 'Web Components',
  },
];

export default function HtmlTagExplainerPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const categorizedTags = useMemo(() => {
    const categories: Record<string, HtmlTag[]> = {};
    const lowercasedFilter = searchTerm.toLowerCase();

    const filteredTags = searchTerm
      ? HTML_TAGS.filter(
          (item) =>
            item.tag.toLowerCase().includes(lowercasedFilter) ||
            item.description.toLowerCase().includes(lowercasedFilter)
        )
      : HTML_TAGS;

    filteredTags.forEach((tag) => {
      if (!categories[tag.category]) {
        categories[tag.category] = [];
      }
      categories[tag.category].push(tag);
    });

    // Sort categories for a consistent order
    const sortedCategories = Object.keys(categories).sort((a, b) => {
      const order = [
        'Document Structure',
        'Sectioning & Headings',
        'Text Content',
        'Inline Text Semantics',
        'Lists',
        'Tables',
        'Forms',
        'Images & Media',
        'Interactive Elements',
        'Web Components',
      ];
      return order.indexOf(a) - order.indexOf(b);
    });

    const result: Record<string, HtmlTag[]> = {};
    sortedCategories.forEach((key) => {
      result[key] = categories[key];
    });

    return result;
  }, [searchTerm]);

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>HTML Tag Explainer</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>A quick reference guide for standard HTML tags.</p>
        </header>

        <section className='w-full min-w-0 mx-auto'>
          {/* Search Input */}
          <div className='mb-6 sticky top-4 z-10'>
            <input
              type='search'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search by tag or description (e.g., <img>, form)'
              className='w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500'
            />
          </div>

          {/* Tags Display */}
          <div className='space-y-8'>
            {Object.entries(categorizedTags).map(([category, tags]) => (
              <div key={category}>
                <h2 className='text-2xl font-semibold text-slate-700 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-800 pb-2 mb-4'>
                  {category}
                </h2>
                <div className='space-y-4'>
                  {tags.map(({ tag, description }) => (
                    <div key={tag} className='p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border'>
                      <code className='font-bold text-lg text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 px-2 py-1 rounded'>{tag}</code>
                      <p className='text-slate-600 dark:text-slate-300 mt-2'>{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(categorizedTags).length === 0 && (
              <div className='text-center p-8 bg-white dark:bg-slate-900 rounded-lg shadow-sm border'>
                <p className='text-slate-500 dark:text-slate-400'>No tags found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        <div className='mt-12 text-center'>
          <Link href='/' className='text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:underline'>
            &larr; Back to All Tools
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
