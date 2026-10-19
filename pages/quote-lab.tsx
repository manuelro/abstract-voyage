import { useMemo, useState } from 'react';
import {
  PanelShell,
  PanelStandardHeaderActions,
  PanelButton,
  SubLabel,
  PanelDescription,
} from '../components/Panel';
import {
  ConfigScopeList,
  createConfigScopeBinding,
  useConfigPanelBindings,
} from '../components/Panel/config';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import { useSharedDesignConfig } from '../components/SharedDesignConfigProvider';
import { normalizePageSurfaceConfig } from '../components/PageSurface.config';
import { usePolymorphicLayoutColors } from '../experiences/abstract/components/PolymorphicLayout';
import { PolymorphicScrollGradientBackground } from '../experiences/abstract/components/PolymorphicScrollGradientBackground';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../components/CtaButton/config/registered';
import { DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG } from '../experiences/abstract/components/AbstractPostDock/config/registered';
import { DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG } from '../experiences/abstract/components/AbstractPostDock/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../experiences/abstract/components/AbstractPostDock/config/legacy';
import { useLiquidSliderMotion } from '../experiences/abstract/components/AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../experiences/abstract/helpers/deckPalette';
import type { AbstractPostDockItem } from '../experiences/abstract/helpers/abstractPostDockItems';
import { DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG } from './abstract.config';
import { WALL_POLYMORPHIC_LAYOUT_CONFIG } from './wall.layoutConfig';
import { Quote, type QuoteCoverFlowGradient } from '../experiences/abstract/components/Quote/Quote';
import {
  DEFAULT_QUOTE_CONFIG,
  deriveQuoteTextColor,
  generateQuotePalette,
  normalizeQuoteConfig,
  pinQuoteConfigToTier,
  QUOTE_PALETTE_SIZE,
  type QuoteBreakpointTier,
  type QuoteConfig,
} from '../experiences/abstract/components/Quote/config';
import { resolveQuoteCssInkFallback } from '../experiences/abstract/components/Quote/cssInkFallback';
import type { AbstractPostDockPaletteConfig } from '../experiences/abstract/components/AbstractPostDock/config/registered';
import { QUOTE_PANEL } from '../experiences/abstract/components/Quote/Quote.panel';
import quoteStyles from '../experiences/abstract/components/Quote/Quote.module.css';
import { saveQuoteTheme, deleteQuoteTheme, useQuoteThemes, type QuoteThemeRecord, type QuoteThemeVariant } from '../experiences/abstract/components/Quote/themes';
import { useQuoteLiveDesign } from '../experiences/abstract/components/Quote/liveDesign';
import { EditorialQuote } from '../experiences/abstract/components/Quote/EditorialQuote';
import { createEditorialQuotePanel } from '../experiences/abstract/components/Quote/EditorialQuote.panel';
import { QUOTE_HEADING_PANEL, QUOTE_SOURCE_LINK_PANEL } from '../experiences/abstract/components/Quote/QuoteParts.panel';
import { VOICE_QUOTE_PANEL } from '../experiences/abstract/components/Quote/VoiceQuote.panel';
import { VOICE_QUOTE_SOURCE } from '../experiences/abstract/components/Quote/voiceQuoteConfig';
import { setVoiceQuoteDesign, useVoiceQuoteDesign } from '../experiences/abstract/components/Quote/voiceQuoteLiveDesign';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, EDITORIAL_VARIANTS, type EditorialVariant } from '../experiences/abstract/components/Quote/editorialConfig';
import { setEditorialQuoteDesign, useEditorialQuoteDesigns } from '../experiences/abstract/components/Quote/editorialLiveDesign';
import { DEFAULT_QUOTE_HEADING_APPEARANCE, DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE } from '../experiences/abstract/components/Quote/quotePartsConfig';
import { setQuoteHeadingAppearance, setQuoteSourceLinkAppearance, useQuotePartsDesign } from '../experiences/abstract/components/Quote/quotePartsLiveDesign';
import { buildWallQuoteItems } from './wallQuoteModel';
import type { AboutPageContent } from '../helpers/content/pageContent.schema';

// getStaticProps below loads the SAME real post-dock content abstract.tsx's
// own CoverFlow deck renders, via the identical server loader -- so the
// "CoverFlow gradient" picker here resolves against the actual featured
// articles (same filter: not `welcome`, `featured: true`, newest-first,
// capped at DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.visibleItemCount) and
// the same default AbstractPostDockPaletteConfig those cards use. Quote.tsx's
// own `computeDeckChord`-based color resolves a card's hue from its
// position WITHIN the live count (index/count along the poster spectrum) --
// a wrong count silently produces a DIFFERENT, invented color for the same
// "Card N" selection even with the right algorithm and the right default
// palette config. The lab also passes this real deck into each Quote preview
// so the selected card paints a live mesh behind its blend layer.
export async function getStaticProps() {
  const { loadAbstractPostDockItems } = await import('../experiences/abstract/helpers/loadAbstractPostDockItems.server');
  const { loadAboutPageContent } = await import('../helpers/content/pageContent.build');
  const { loadWallContent } = await import('../helpers/wallFeed.server');
  const dockItems = loadAbstractPostDockItems();
  const about = loadAboutPageContent();
  return { props: {
    dockItems,
    aboutTimeline: about.timeline,
    practiceExample: loadWallContent(dockItems, about).practices.practices[0],
  } };
}

const EDITORIAL_PANELS = Object.fromEntries(EDITORIAL_VARIANTS.map(variant => [variant, createEditorialQuotePanel(variant)])) as Record<EditorialVariant, ReturnType<typeof createEditorialQuotePanel>>;

// The lab authors four editorial compositions and the existing base Quote.
// Each wall composition has its own in-memory live-preview design (not
// persisted -- it resets on reload) and named themes; the previews render
// the same EditorialQuote component the wall uses.

// The lab starts with content-driven height, so long quotes remain fully
// visible. The base Quote's Match card ratio switch is an explicit opt-in:
// it holds the same portrait shape as a card and makes excess copy scroll
// within that surface. The default keeps the two existing card traits:
//  - borderRadiusEnabled + 'rounded-2xl' matches Card's own default
//    cardRadius ('rounded-2xl', AbstractPostDock/config/registered.ts).
//  - liftPhysics (passed as DEFAULT_CTA_BUTTON_CONFIG on every <Quote> below)
//    is the SAME useCardLiftPhysics engine Card itself uses for its
//    proximity-driven tilt/scale/lift -- Quote.tsx has supported this as an
//    opt-in prop since before this task; it was simply never turned on here.
function createDefaultQuoteLabConfig(): QuoteConfig {
  return normalizeQuoteConfig({
    ...DEFAULT_QUOTE_CONFIG,
    geometryShape: 'auto',
    cardAspectRatioEnabled: false,
    borderRadiusEnabled: true,
  });
}

/** The actual, visible, clickable background swatches -- INSIDE the settings
 * panel only. Quote.tsx itself renders no swatch picker (deliberately: the
 * component stays presentational, and a design-tool-only affordance like a
 * clickable swatch grid has no business living in a component the wall's
 * masonry and the standalone editorial quote also mount in production).
 * This is the ONLY swatch picker in the app. Computed fresh from the SAME
 * generateQuotePalette function Quote.tsx uses internally to resolve its own
 * background (not a second, possibly-drifting color recipe), and the SAME
 * live quoteConfig.paletteColorIndex selection, so clicking a swatch here
 * drives the exact color the live quote preview below already resolves to. */
function PaletteSwatchPicker({
  config, onSelect,
}: {
  config: QuoteConfig;
  onSelect: (index: number) => void;
}) {
  const swatches = useMemo(
    () => generateQuotePalette(config.paletteSaturationPercent, config.paletteLightnessPercent),
    [config.paletteSaturationPercent, config.paletteLightnessPercent],
  );
  // Same derived-ink value Quote.tsx itself computes for the CURRENTLY
  // selected swatch, reused here as every button's own `color` so
  // `currentColor` (the selected-ring border/box-shadow in
  // .paletteSwatchButtonSelected) renders identically to how the quote
  // preview's own ink reads.
  const selectedIndex = Math.min(QUOTE_PALETTE_SIZE, Math.max(1, config.paletteColorIndex)) - 1;
  const selectedBackground = swatches[selectedIndex];
  const ringColor = selectedBackground
    ? deriveQuoteTextColor(selectedBackground, config.textColorSaturationPercent, config.textColorLightnessPercent).color
    : undefined;
  return (
    <div className={quoteStyles.paletteSwatchRow} role="radiogroup" aria-label="Background swatch">
      {swatches.map((swatch, index) => {
        const swatchNumber = index + 1;
        const selected = swatchNumber === config.paletteColorIndex;
        return (
          <button
            key={swatch + index}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Swatch ${swatchNumber}`}
            data-quote-palette-swatch-index={swatchNumber}
            className={`${quoteStyles.paletteSwatchButton} ${selected ? quoteStyles.paletteSwatchButtonSelected : ''}`}
            style={{ backgroundColor: swatch, color: ringColor }}
            onClick={() => onSelect(swatchNumber)}
          />
        );
      })}
    </div>
  );
}

/** Live preview of the CSS-fallback gradient (QuoteConfig.gradientInkRenderMode
 * === 'css'), rendered in the config panel -- NOT on the quote itself. The
 * quote only ever shows this gradient clipped to its glyphs, so an operator
 * picking a source card can't otherwise read the whole ramp; this swatch shows
 * it in full and updates live as the card / saturation / brightness / X/Y scale /
 * angle change. Uses the same fallback derivation as Quote.tsx. */
function CssGradientPreview({
  config, paletteConfig, cardCount,
}: {
  config: QuoteConfig;
  paletteConfig: AbstractPostDockPaletteConfig;
  cardCount: number;
}) {
  const fallback = useMemo(() => resolveQuoteCssInkFallback(config, cardCount, paletteConfig), [
    cardCount, paletteConfig, config.gradientInkSourceCard, config.gradientInkCssAngleDegrees,
    config.gradientInkMeshSaturationPercent, config.gradientInkMeshDarkeningPercent,
    config.gradientInkMeshLighteningPercent,
    config.gradientInkMeshScale, config.gradientInkMeshScaleX, config.gradientInkMeshScaleY,
  ]);
  if (!fallback) {
    return <PanelDescription>No gradient available for the selected card.</PanelDescription>;
  }
  return (
    <div
      data-quote-css-gradient-preview={fallback.gradient}
      aria-label={`CSS gradient preview for card ${config.gradientInkSourceCard}`}
      style={{
        height: 40,
        borderRadius: 8,
        backgroundImage: fallback.gradient,
        backgroundSize: fallback.backgroundSize,
        border: '1px solid rgba(0, 0, 0, 0.12)',
      }}
    />
  );
}

/** Save a viable design as a named, reusable quote config, OR load an
 * existing one back in and re-save the edits under the SAME name -- the
 * operator ask: "pick one quote config and update it (edit it) and save the
 * edits as well." `editingThemeName` (lifted to the page, set by
 * SavedQuoteThemes' own Apply button below) tracks which saved theme, if
 * any, is currently loaded; the name field is pre-filled with it so the
 * default action is "update," while still letting the operator type a
 * different name to branch off a new theme instead. */
function SaveQuoteThemeForm({
  config, variant, themeName, onThemeNameChange, editingThemeName, onSaved,
}: {
  config: QuoteConfig;
  variant: QuoteThemeVariant;
  themeName: string;
  onThemeNameChange: (name: string) => void;
  editingThemeName: string | null;
  onSaved: (name: string) => void;
}) {
  const themes = useQuoteThemes();
  const trimmedName = themeName.trim();
  const isUpdatingLoadedTheme = trimmedName.length > 0 && trimmedName === editingThemeName;
  const collidesWithDifferentTheme = trimmedName.length > 0
    && trimmedName !== editingThemeName
    && trimmedName in themes;
  // One accessible name per visible state -- aria-label must always match
  // what's actually printed on the button, including the collision case
  // (an earlier version only branched Update/Save, silently leaving the
  // accessible name wrong whenever the visible text read "OVERWRITE THEME").
  const saveButtonLabel = isUpdatingLoadedTheme
    ? 'UPDATE THEME'
    : collidesWithDifferentTheme ? 'OVERWRITE THEME' : 'SAVE AS NEW THEME';

  const handleSave = () => {
    if (!trimmedName) return;
    saveQuoteTheme(config, trimmedName, variant);
    onSaved(trimmedName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {editingThemeName ? (
        <PanelDescription>
          Editing &quot;{editingThemeName}&quot;. Change settings above, then save to update it --
          or change the name below to save as a new theme instead.
        </PanelDescription>
      ) : null}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, opacity: 0.7 }}>THEME NAME</span>
        <input
          type="text"
          value={themeName}
          onChange={event => onThemeNameChange(event.target.value)}
          placeholder="e.g. Pastel pull quote"
          aria-label="Theme name"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            color: 'inherit',
            padding: '6px 8px',
            fontSize: 13,
          }}
        />
      </label>
      {collidesWithDifferentTheme ? (
        <PanelDescription>
          A theme named &quot;{trimmedName}&quot; already exists -- saving will overwrite it.
        </PanelDescription>
      ) : null}
      <div>
        <PanelButton onClick={handleSave} ariaLabel={saveButtonLabel}>
          {saveButtonLabel}
        </PanelButton>
      </div>
    </div>
  );
}

/** Dynamic (grows/shrinks as themes are saved/deleted), so it is deliberately
 * NOT expressed as a declarative ConfigFieldDefinition `select` -- that kind
 * carries a fixed `options` array resolved once at scope-definition time
 * (components/Panel/config/types.ts), which cannot reflect a localStorage
 * record that changes while the panel is open. Hand-built here instead,
 * reusing the panel's own PanelButton/SubLabel/PanelDescription primitives
 * so it reads as part of the same panel language, not a bespoke control. */
function SavedQuoteThemes({ onApply }: { onApply: (record: QuoteThemeRecord) => void }) {
  const themes = useQuoteThemes();
  const records = useMemo(
    () => Object.values(themes).sort((a, b) => b.savedAt - a.savedAt),
    [themes],
  );

  if (records.length === 0) {
    return (
      <PanelDescription>
        No saved themes yet. Name one above and save it.
      </PanelDescription>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {records.map(record => (
        <div
          key={record.name}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}
        >
          <span
            title={record.name}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {record.name} ({record.variant})
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <PanelButton onClick={() => onApply(record)} ariaLabel={`Apply theme ${record.name}`}>
              APPLY
            </PanelButton>
            <PanelButton onClick={() => deleteQuoteTheme(record.name)} ariaLabel={`Delete theme ${record.name}`}>
              DELETE
            </PanelButton>
          </div>
        </div>
      ))}
    </div>
  );
}

// Three device-tier copies of the one live quote design (operator ask:
// "one for using the desktop config, another using the tablet config, and
// another one using the mobile config, all same size"). pinQuoteConfigToTier
// (config.ts) collapses each tiered field's base/Md/Lg trio to a single
// tier's own resolved value across all three slots, so Tailwind's own
// base/md:/lg: classes agree regardless of the ACTUAL viewport -- these
// render each tier's real resolved typography/padding side by side, at one
// shared physical width, rather than needing to actually resize the browser
// three times. ('Same size' means equal preview width, not equal rendered
// text size -- that's the entire point: it lets an operator SEE how much
// each tier's own resolved sizes differ.)
const QUOTE_TIER_STEPS: ReadonlyArray<{ tier: QuoteBreakpointTier; label: string }> = [
  { tier: 'lg', label: 'DESKTOP CONFIG' },
  { tier: 'md', label: 'TABLET CONFIG' },
  { tier: 'base', label: 'MOBILE CONFIG' },
];

// Realistic content-length check (operator ask): the live design's own
// short/default text, plus two more copies of the SAME style config with
// medium- and large-length real passages substituted in, so an operator can
// see whether the design still holds up once there's more to read, not just
// with the placeholder-length default copy. Famous, public-domain passages
// from Antoine de Saint-Exupéry's The Little Prince (English translation --
// exact wording varies slightly by edition/translator; this is the common
// rendering, not a verbatim quote from one specific published translation).
const LITTLE_PRINCE_MEDIUM_TEXT = 'All men have the stars, but they are not the same things for different people. For some, who are travelers, the stars are guides. For others they are no more than little lights in the sky.';
const LITTLE_PRINCE_LARGE_TEXT = 'Here is my secret. It is very simple: it is only with the heart that one can see rightly. What is essential is invisible to the eye. It is the time you have wasted for your rose that makes your rose so important. Men have forgotten this truth, said the fox. But you must not forget it. You become responsible, forever, for what you have tamed. You are responsible for your rose.';

/** One labeled, centered preview slot -- shared by both the tier stack and
 * the text-length stack below so every quote on this page gets the exact
 * same Card-parity treatment (liftPhysics) and width/centering, not two
 * independently-hand-rolled wrappers that could drift apart. */
function QuotePreviewSlot({
  label, config, coverFlowGradient, showSourceHeading = false,
}: { label: string; config: QuoteConfig; coverFlowGradient: QuoteCoverFlowGradient; showSourceHeading?: boolean }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span style={{ fontSize: 11, letterSpacing: '0.08em', opacity: 0.55 }}>{label}</span>
      {/* w-full at lg (not a further 1/3 narrowing): the two-column layout
          below (DEVICE CONFIG / CONTENT LENGTH side by side) already halves
          the available width via each <section>'s own lg:w-1/2, so this
          quote fills its already-narrowed column rather than being narrowed
          twice over. md:w-1/2 still applies at tablet, where the page stays
          single-column (no room for two side-by-side quote columns). */}
      <div className="w-full md:w-1/2 lg:w-full">
        <Quote
          config={showSourceHeading ? { ...config, sourceHeadingText: 'Source heading preview' } : config}
          liftPhysics={DEFAULT_CTA_BUTTON_CONFIG}
          coverFlowGradient={coverFlowGradient}
        />
      </div>
    </div>
  );
}

/** Three copies of the live quote design, each pinned to one device tier's
 * own resolved config, stacked and each centered (center/center, both
 * axes) -- desktop (Lg), tablet (Md), mobile (base). All three render at
 * the SAME physical preview width (w-full md:w-1/2 lg:w-1/3, matching every
 * other quote on this page) -- only the PINNED CONFIG differs between them,
 * not a visual zoom. */
function QuoteTierPreviewStack({
  config, coverFlowGradient,
}: { config: QuoteConfig; coverFlowGradient: QuoteCoverFlowGradient }) {
  return (
    <div className="flex w-full flex-col items-center gap-10">
      {QUOTE_TIER_STEPS.map(({ tier, label }) => (
        <QuotePreviewSlot key={tier} label={label} config={pinQuoteConfigToTier(config, tier)} coverFlowGradient={coverFlowGradient} />
      ))}
    </div>
  );
}

/** The live design's own (short) text, plus the same style config applied to
 * a medium- and a large-length real passage -- "how will this look with
 * realistic text," independent of the device-tier question above. Each
 * renders at its own natural tier (not pinned), matching how the design
 * will actually behave on a real page. */
function QuoteTextLengthPreviewStack({
  config, coverFlowGradient,
}: { config: QuoteConfig; coverFlowGradient: QuoteCoverFlowGradient }) {
  return (
    <div className="flex w-full flex-col items-center gap-10">
      <QuotePreviewSlot label="SHORT TEXT (live, source heading)" config={config} coverFlowGradient={coverFlowGradient} showSourceHeading />
      <QuotePreviewSlot label="MEDIUM TEXT (The Little Prince)" config={{ ...config, text: LITTLE_PRINCE_MEDIUM_TEXT }} coverFlowGradient={coverFlowGradient} />
      <QuotePreviewSlot label="LARGE TEXT (The Little Prince)" config={{ ...config, text: LITTLE_PRINCE_LARGE_TEXT }} coverFlowGradient={coverFlowGradient} />
    </div>
  );
}

export default function QuoteLabPage({ dockItems, aboutTimeline, practiceExample }: {
  dockItems?: AbstractPostDockItem[];
  aboutTimeline: AboutPageContent['timeline'];
  practiceExample: { title: string; description: string };
}) {
  const { pageSurfaceConfig } = useSharedDesignConfig();
  const normalizedPageSurfaceConfig = useMemo(
    () => normalizePageSurfaceConfig(pageSurfaceConfig),
    [pageSurfaceConfig],
  );
  // Same WALL_POLYMORPHIC_LAYOUT_CONFIG object /wall itself resolves its
  // gradient from (pages/wall.layoutConfig.ts) fed through the same
  // usePolymorphicLayoutColors hook /wall and /about already call -- this is
  // what keeps the two pages' background gradients in sync: one shared
  // config value and one shared resolver, not a hand-copied recipe.
  const colors = usePolymorphicLayoutColors(
    WALL_POLYMORPHIC_LAYOUT_CONFIG, normalizedPageSurfaceConfig.color,
  );

  // The SAME filter/order/cap abstract.tsx's own carouselAndListItems applies
  // (featured, non-welcome posts; newest-first; capped at the default
  // visibleItemCount) -- not this page's own invented selection. Getting the
  // The selected card's position in this filtered deck determines its mesh
  // palette, so all previews receive these same real article inputs.
  const carouselAndListItems = useMemo(() => {
    const sourceItems = (dockItems ?? []).filter(item => item.slug !== 'welcome' && item.featured === true);
    return [...sourceItems]
      .sort((a, b) => (b.publishedDate ?? '').localeCompare(a.publishedDate ?? ''))
      .slice(0, DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.visibleItemCount);
  }, [dockItems]);
  const gradientMotion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);
  const gradientPalettes = useMemo(() => buildDeckPaletteStates({
    slides: carouselAndListItems,
    paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
    hueInfluenceConfig: {
      ...DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
      enabled: false,
      transitionEnabled: false,
    },
    activeIndex: null,
    tier: colors.breakpointTier,
  }), [carouselAndListItems, colors.breakpointTier]);
  // All previews use the real featured article deck and the shared palette
  // builder. Frozen meshes give a stable comparison without six
  // continuously animating WebGL canvases in this authoring page.
  const coverFlowGradient = useMemo<QuoteCoverFlowGradient>(() => ({
    slides: carouselAndListItems,
    palettes: gradientPalettes,
    motion: gradientMotion,
    config: DEFAULT_LIQUID_SLIDER_CONFIG,
    activity: 'frozen',
    // Enables the CSS-fallback render mode to derive each card's three
    // representative colors (computeDeckChord) from the same palette config
    // that built `palettes` above.
    paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  }), [carouselAndListItems, gradientPalettes, gradientMotion]);

  const [quoteConfig, setQuoteConfig] = useQuoteLiveDesign();
  const editorialDesigns = useEditorialQuoteDesigns();
  const voiceDesign = useVoiceQuoteDesign();
  const partsDesign = useQuotePartsDesign();
  const [selectedDesign, setSelectedDesign] = useState<'base' | EditorialVariant | 'heading' | 'link'>('featured');
  const editorialExamples = useMemo(() => {
    const items = buildWallQuoteItems(aboutTimeline);
    return {
      featured: items.find(item => item.role === 'feature') ?? items[0],
      plain: items.find(item => item.role === 'statement') ?? items[0],
      solid: items.find(item => item.role === 'excerpt') ?? items[0],
    };
  }, [aboutTimeline]);
  const [themeName, setThemeName] = useState('');
  const [editingThemeName, setEditingThemeName] = useState<string | null>(null);
  const { showAuthoringTools, isPanelOpen, togglePanel } = useAuthoringToolsVisibility();

  const quoteBinding = useMemo(() => createConfigScopeBinding({
    definition: QUOTE_PANEL,
    value: quoteConfig,
    onChange: setQuoteConfig,
  }), [quoteConfig]);
  const editorialBindings = useMemo(() => EDITORIAL_VARIANTS.map(variant => createConfigScopeBinding({
    definition: EDITORIAL_PANELS[variant],
    value: editorialDesigns[variant],
    onChange: value => setEditorialQuoteDesign(variant, value),
  })), [editorialDesigns]);
  // One shared binding each for the heading and link appearance: editing them
  // here writes the single shared store, so all editorial previews (and the wall)
  // update together.
  const headingBinding = useMemo(() => createConfigScopeBinding({
    definition: QUOTE_HEADING_PANEL, value: partsDesign.heading, onChange: setQuoteHeadingAppearance,
  }), [partsDesign.heading]);
  const linkBinding = useMemo(() => createConfigScopeBinding({
    definition: QUOTE_SOURCE_LINK_PANEL, value: partsDesign.link, onChange: setQuoteSourceLinkAppearance,
  }), [partsDesign.link]);
  const voiceBinding = useMemo(() => createConfigScopeBinding({
    definition: VOICE_QUOTE_PANEL, value: voiceDesign, onChange: setVoiceQuoteDesign,
  }), [voiceDesign]);
  const localBindings = useMemo(
    () => [quoteBinding, ...editorialBindings, voiceBinding, headingBinding, linkBinding],
    [quoteBinding, editorialBindings, voiceBinding, headingBinding, linkBinding],
  );
  const configPanelBindings = useConfigPanelBindings(localBindings);

  const handleReset = () => {
    if (selectedDesign === 'base') setQuoteConfig(createDefaultQuoteLabConfig());
    else if (selectedDesign === 'heading') setQuoteHeadingAppearance(DEFAULT_QUOTE_HEADING_APPEARANCE);
    else if (selectedDesign === 'link') setQuoteSourceLinkAppearance(DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE);
    else setEditorialQuoteDesign(selectedDesign, DEFAULT_EDITORIAL_QUOTE_CONFIGS[selectedDesign]);
    setThemeName('');
    setEditingThemeName(null);
  };
  // The theme save/apply workflow only targets quote configs (base + editorial
  // types); the shared heading/link scopes persist through their own store and
  // UPDATE DIFF, so the save form is hidden for them.
  const isQuoteConfigTarget = selectedDesign === 'base' || selectedDesign === 'featured' || selectedDesign === 'plain' || selectedDesign === 'solid' || selectedDesign === 'practice';
  const selectedEditorialConfig = selectedDesign !== 'base' && selectedDesign !== 'heading' && selectedDesign !== 'link'
    ? editorialDesigns[selectedDesign] : null;
  const selectedQuoteConfig: QuoteConfig | null = selectedDesign === 'base' ? quoteConfig : selectedEditorialConfig;
  const showCssGradientPreview = selectedQuoteConfig?.gradientInkRenderMode === 'css'
    && (selectedDesign === 'base' ? selectedQuoteConfig.gradientInkEnabled : selectedEditorialConfig?.backgroundMode === 'gradient');

  return (
    <div
      className="relative min-h-dvh w-full overflow-x-clip"
      style={{ backgroundColor: normalizedPageSurfaceConfig.color }}
    >
      {/* Same mount condition/props PolymorphicLayout.tsx itself uses for its
          own un-clipped (single, full-viewport) gradient case -- this page has
          no wide/narrow split columns to clip the gradient against, so it
          always renders full-bleed when active. */}
      {colors.viewportWidthPx !== undefined && colors.scrollGradientActive ? (
        <PolymorphicScrollGradientBackground {...colors.scrollGradientResolved} />
      ) : null}
      {/* Primary wall variants stay visible; the older base Quote checks are
          available on demand without crowding the editable examples. */}
      <main className="relative z-[1] flex min-h-dvh w-full flex-col items-center justify-center gap-16 px-4 py-16 lg:flex-row lg:items-start lg:gap-8">
        <section className="flex w-full flex-col items-center gap-8 lg:w-1/2">
          <SubLabel>WALL QUOTE PREVIEWS</SubLabel>
          {EDITORIAL_VARIANTS.map(variant => {
            const item = variant === 'practice' ? null : editorialExamples[variant];
            const source = variant === 'practice'
              ? { key: 'practice-preview', title: practiceExample.title, period: '', destination: '/contact', text: practiceExample.description }
              : item
                ? { key: item.key, title: item.title, period: item.period, destination: item.destination, text: item.displayText }
                : null;
            return source ? (
              <div key={variant} className="w-full max-w-lg" data-quote-lab-variant={variant}>
                <div className="mb-3 inline-flex rounded-full border border-current/30 px-3 py-1 text-[10px] font-sans font-medium uppercase tracking-widest" aria-label={`${variant} quote preview`}>
                  {variant} preview
                </div>
                <EditorialQuote
                  variant={variant}
                  config={editorialDesigns[variant]}
                  headingAppearance={partsDesign.heading}
                  linkAppearance={partsDesign.link}
                  source={source}
                  coverFlowGradient={coverFlowGradient}
                  liftPhysics={DEFAULT_CTA_BUTTON_CONFIG}
                />
              </div>
            ) : null;
          })}
          <div className="w-full max-w-lg" data-quote-lab-variant="voice">
            <div className="mb-3 inline-flex rounded-full border border-current/30 px-3 py-1 text-[10px] font-sans font-medium uppercase tracking-widest" aria-label="voice quote preview">
              voice preview
            </div>
            <EditorialQuote
              variant="plain"
              config={voiceDesign}
              headingAppearance={partsDesign.heading}
              linkAppearance={partsDesign.link}
              source={VOICE_QUOTE_SOURCE}
              coverFlowGradient={coverFlowGradient}
              liftPhysics={DEFAULT_CTA_BUTTON_CONFIG}
            />
          </div>
        </section>
        <details className="w-full lg:w-1/2">
          <summary className="cursor-pointer">BASE QUOTE: DEVICE AND TEXT LENGTH CHECKS</summary>
          <div className="flex flex-col gap-10 pt-6">
            <section className="flex w-full flex-col items-center gap-6">
              <SubLabel>DEVICE CONFIG</SubLabel>
              <QuoteTierPreviewStack config={quoteConfig} coverFlowGradient={coverFlowGradient} />
            </section>
            <section className="flex w-full flex-col items-center gap-6">
              <SubLabel>CONTENT LENGTH</SubLabel>
              <QuoteTextLengthPreviewStack config={quoteConfig} coverFlowGradient={coverFlowGradient} />
            </section>
          </div>
        </details>
      </main>
      {showAuthoringTools ? (
        <PanelShell
          title="QUOTE LAB SETTINGS"
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          headerActions={(
            <PanelStandardHeaderActions
              bindings={configPanelBindings}
              onReset={handleReset}
            />
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <label htmlFor="quote-lab-save-target">SAVE / RESET TARGET</label>
            <select id="quote-lab-save-target" style={{ color: 'inherit', background: 'transparent', border: '1px solid currentColor', borderRadius: 4, padding: '6px 8px' }} value={selectedDesign} onChange={event => {
              setSelectedDesign(event.target.value as 'base' | EditorialVariant | 'heading' | 'link');
              setThemeName('');
              setEditingThemeName(null);
            }}>
              <option value="featured">Featured wall quote</option>
              <option value="plain">Plain wall quote</option>
              <option value="solid">Solid wall quote</option>
              <option value="practice">Practice quote</option>
              <option value="base">Base quote</option>
              <option value="heading">Heading (shared)</option>
              <option value="link">Source link (shared)</option>
            </select>
          </div>
          <ConfigScopeList bindings={configPanelBindings} lazyContent />
          {showCssGradientPreview && selectedQuoteConfig ? (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <SubLabel>CSS GRADIENT PREVIEW</SubLabel>
              <CssGradientPreview
                config={selectedQuoteConfig}
                paletteConfig={DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG}
                cardCount={coverFlowGradient.slides.length}
              />
            </div>
          ) : null}
          {!quoteConfig.gradientInkEnabled && quoteConfig.paletteBackgroundEnabled ? (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <SubLabel>BACKGROUND SWATCH</SubLabel>
              <PaletteSwatchPicker
                config={quoteConfig}
                onSelect={index => setQuoteConfig(current => ({ ...current, paletteColorIndex: index }))}
              />
            </div>
          ) : null}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <SubLabel>SAVE QUOTE CONFIG</SubLabel>
            {isQuoteConfigTarget ? (
              <SaveQuoteThemeForm
                config={selectedDesign === 'base' ? quoteConfig : editorialDesigns[selectedDesign]}
                variant={selectedDesign}
                themeName={themeName}
                onThemeNameChange={setThemeName}
                editingThemeName={editingThemeName}
                onSaved={name => setEditingThemeName(name)}
              />
            ) : (
              <PanelDescription>
                The heading and source link are shared across every quote. Edit them in their
                own panel section above; edits here are a live preview only until you click
                UPDATE DIFF, and RESET (above) restores their defaults.
              </PanelDescription>
            )}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <SubLabel>SAVED QUOTE CONFIGS</SubLabel>
            <SavedQuoteThemes
              onApply={record => {
                setSelectedDesign(record.variant);
                if (record.variant === 'base') setQuoteConfig(record.config);
                else setEditorialQuoteDesign(record.variant, record.config as typeof editorialDesigns[EditorialVariant]);
                setThemeName(record.name);
                setEditingThemeName(record.name);
              }}
            />
          </div>
        </PanelShell>
      ) : null}
    </div>
  );
}
