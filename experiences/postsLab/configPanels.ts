import { defineConfigScopeRegistry } from '../../components/Panel/config';
import { POST_LAB_PAGE_LAYOUT_PANEL, POST_LAB_PAGE_LAYOUT_SCOPE_ID } from '../../pages/posts/postLab.panel';
import { POST_LAB_ARTICLE_READING_PANEL, POST_LAB_ARTICLE_READING_SCOPE_ID } from '../abstract/components/MarkdownContent/config/panel';
import { POST_LAB_ARTICLE_TOC_PANEL, POST_LAB_ARTICLE_TOC_SCOPE_ID } from '../abstract/components/TableOfContents/config/panel';
import { LAYOUT_DEBUG_PANEL, LAYOUT_DEBUG_SCOPE_ID } from '../../components/LayoutDebug.panel';

export const postsLabConfigPanelRegistry = defineConfigScopeRegistry({
  [POST_LAB_PAGE_LAYOUT_SCOPE_ID]: POST_LAB_PAGE_LAYOUT_PANEL,
  [POST_LAB_ARTICLE_READING_SCOPE_ID]: POST_LAB_ARTICLE_READING_PANEL,
  [POST_LAB_ARTICLE_TOC_SCOPE_ID]: POST_LAB_ARTICLE_TOC_PANEL,
  [LAYOUT_DEBUG_SCOPE_ID]: LAYOUT_DEBUG_PANEL,
});
