type DecapCms = {
  init: () => void;
  registerEditorComponent: (definition: Record<string, unknown>) => void;
  registerEventListener: (listener: {
    name: string;
    handler: (payload: { entry: any }) => any;
  }) => void;
  registerPreviewStyle: (path: string) => void;
  registerPreviewTemplate: (name: string, component: unknown) => void;
};

declare global {
  interface Window {
    CMS?: DecapCms;
    CMS_MANUAL_INIT?: boolean;
    createClass?: (definition: Record<string, unknown>) => unknown;
    h?: (...args: any[]) => unknown;
  }
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export function initializeDecap() {
  const cms = window.CMS;
  const createClass = window.createClass;
  const h = window.h;

  if (!cms || !createClass || !h) {
    throw new Error('The Decap CMS browser bundle did not expose its initialization API.');
  }

  cms.registerEditorComponent({
    id: 'code-include',
    label: 'Code include',
    fields: [
      { name: 'file', label: 'Snippet filename', widget: 'string' },
      { name: 'lang', label: 'Language', widget: 'string', default: 'js' },
      { name: 'title', label: 'Display title', widget: 'string', required: false },
    ],
    pattern: /^<!--\s*code:include\s+file="([^"]+)"\s+lang="([^"]+)"(?:\s+title="([^"]+)")?\s*-->$/m,
    fromBlock: (match: RegExpMatchArray) => ({
      file: match[1],
      lang: match[2],
      title: match[3] ?? '',
    }),
    toBlock: ({ file, lang, title }: { file: string; lang: string; title?: string }) => (
      `<!-- code:include file="${file}" lang="${lang}"${title ? ` title="${title}"` : ''} -->`
    ),
    toPreview: ({ file, lang, title }: { file: string; lang: string; title?: string }) => (
      `<div class="abstract-editor-directive"><strong>Code include</strong><br>${escapeHtml(title || file)} · ${escapeHtml(lang)}</div>`
    ),
  });

  cms.registerEditorComponent({
    id: 'data-table',
    label: 'Data table',
    fields: [
      { name: 'id', label: 'Table identifier', widget: 'string' },
    ],
    pattern: /^<!--\s*table:([a-z0-9-]+)\s*-->$/im,
    fromBlock: (match: RegExpMatchArray) => ({ id: match[1] }),
    toBlock: ({ id }: { id: string }) => `<!-- table:${id.trim().toLowerCase()} -->`,
    toPreview: ({ id }: { id: string }) => (
      `<div class="abstract-editor-directive"><strong>Data table</strong><br>${escapeHtml(id)}</div>`
    ),
  });

  cms.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      const data = entry.get('data');
      const title = data.get('title');
      if (typeof title !== 'string' || !title.trim()) {
        throw new Error('Title is required.');
      }

      for (const fieldPath of [['url'], ['externalUrl'], ['source', 'url']]) {
        const value = data.getIn(fieldPath);
        if (value && !/^https?:\/\//i.test(value)) {
          throw new Error(`${fieldPath.join('.')} must start with http:// or https://.`);
        }
      }

      return data;
    },
  });

  cms.registerPreviewStyle('/admin/preview.css');
  cms.registerPreviewTemplate('posts', createClass({
    render: function render(this: any) {
      const entry = this.props.entry;
      return h(
        'article',
        { className: 'abstract-editor-preview' },
        h('p', { className: 'abstract-editor-preview__meta' }, entry.getIn(['data', 'author']) || 'Abstract Voyage'),
        h('h1', {}, entry.getIn(['data', 'title']) || 'Untitled article'),
        h('p', { className: 'abstract-editor-preview__excerpt' }, entry.getIn(['data', 'excerpt']) || ''),
        h('div', { className: 'abstract-editor-preview__body' }, this.props.widgetFor('body')),
      );
    },
  }));
  cms.registerPreviewTemplate('footer', createClass({
    render: function render(this: any) {
      const entry = this.props.entry;
      const links = entry.getIn(['data', 'links']);
      const visibleLinks = ['abstract', 'about', 'journal', 'contact']
        .map(key => links?.get(key))
        .filter(link => link?.get('enabled'));
      const contactVisible = entry.getIn(['data', 'contactEmailEnabled']);
      const contactText = entry.getIn(['data', 'contactText']);

      return h(
        'footer',
        { className: 'abstract-footer-preview' },
        h(
          'nav',
          { 'aria-label': entry.getIn(['data', 'navigationLabel']) || 'Footer navigation' },
          ...visibleLinks.map(link => h(
            'section',
            { className: 'abstract-footer-preview__link', key: link.get('title') },
            h('h2', {}, link.get('title')),
            h('p', {}, link.get('description')),
          )),
        ),
        contactVisible && contactText
          ? h('a', { className: 'abstract-footer-preview__contact', href: `mailto:${contactText}` }, contactText)
          : null,
        h('p', { className: 'abstract-footer-preview__wordmark' }, 'Abstract Voyage'),
      );
    },
  }));

  cms.init();
}
