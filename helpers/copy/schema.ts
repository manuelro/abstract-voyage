// SPEC_VERSION: 3
import { z } from 'zod';

// ── Budget ──────────────────────────────────────────────────────────────────

const BudgetSchema = z.object({
  target: z.number().describe('Target character count for this node.'),
  min: z.number().describe('Minimum acceptable character count.'),
  max: z.number().describe('Maximum acceptable character count.'),
  hard: z.boolean().describe(
    'When true, exceeding max is a layout-breaking error (e.g. a button that wraps). '
    + 'When false, exceeding max is permitted but must be declared via overBudget.'
  ),
});

// ── Project Card ───────────────────────────────────────────────────────────

const ProofItemSchema = z.object({
  id: z.string(),
  type: z.string().describe('metric | client | credential | tenure | testimonial | guarantee'),
  fact: z.string(),
  source: z.string(),
  verified: z.boolean(),
});

const OperativeRuleSchema = z.object({
  rule: z.string().describe('A writing rule the site consistently follows, stated as something that could be violated.'),
  evidence: z.string().describe('Verbatim evidence from the site copy.'),
  source: z.string().describe('File path where the evidence was found.'),
});

const EvaluationCriterionSchema = z.object({
  trait: z.string(),
  means: z.string().describe('What this trait denotes; what passing looks like.'),
});

const EvaluationRubricSchema = z.object({
  name: z.string(),
  source: z.string().describe('Path or URL where the framework was published.'),
  criteria: z.array(EvaluationCriterionSchema),
  applies_to_copy: z.string().describe(
    'How this framework — which may be about interfaces, systems, or design — '
    + 'translates into judging a piece of writing.'
  ),
});

const GlossaryEntrySchema = z.object({
  canonical: z.string(),
  variants_found: z.array(z.string()),
});

const BudgetBaselineSchema = z.record(
  z.string(),
  z.object({ typical: z.number(), max_observed: z.number() }),
);

export const ProjectCardSchema = z.object({
  meta: z.object({ generated_at: z.string() }),
  company: z.object({
    name: z.string(),
    what_we_do: z.string(),
    who_for: z.string(),
    not_for: z.string(),
  }),
  positioning: z.object({
    mechanism: z.string(),
    alternatives: z.string(),
    defensible_claim: z.string(),
  }),
  proof: z.array(ProofItemSchema),
  motive: z.object({
    origin: z.string(),
    why_we_care: z.string(),
  }),
  voice: z.object({
    person: z.string(),
    case: z.string(),
    contractions: z.boolean(),
    sentence_length_avg: z.number(),
    banned: z.array(z.string()),
    sample_lines: z.array(z.string()),
  }),
  operative_rules: z.array(OperativeRuleSchema),
  evaluation_rubric: z.array(EvaluationRubricSchema),
  audience: z.object({
    awareness: z.string().describe('unaware | problem | solution | product | most'),
    objections: z.array(z.string()),
  }),
  glossary: z.array(GlossaryEntrySchema),
  budgets: z.record(z.string(), BudgetBaselineSchema),
  conventions: z.object({
    emphasis: z.object({
      mechanism: z.string().describe('markdown | span-class | inline-style | none'),
      syntax: z.string().describe('What a generated string must contain for emphasis.'),
      anchors_per_paragraph: z.number(),
      parsed_in: z.string(),
    }),
  }),
  tenure: z.object({ first_commit: z.string() }),
});

export type ProjectCard = z.infer<typeof ProjectCardSchema>;
export type ProofItem = z.infer<typeof ProofItemSchema>;
export type OperativeRule = z.infer<typeof OperativeRuleSchema>;
export type EvaluationRubric = z.infer<typeof EvaluationRubricSchema>;

// ── Taxonomy Entry ─────────────────────────────────────────────────────────

const StrategySchema = z.object({
  id: z.string(),
  brief: z.string(),
});

export const TaxonomyEntrySchema = z.object({
  status: z.string(),
  applies_to: z.array(z.string()),
  label: z.string(),
  visitor_question: z.string(),
  narrative_role: z.enum(['opens', 'expands', 'closes', 'standalone']),
  description: z.string(),
  roles: z.array(z.string()),
  strategies: z.array(StrategySchema).length(3),
  failure_modes: z.array(z.string()),
  constraints: z.array(z.string()),
});

export type TaxonomyEntry = z.infer<typeof TaxonomyEntrySchema>;

// ── Page Role ──────────────────────────────────────────────────────────────

export const PageRoleSchema = z.object({
  purpose: z.string().describe('What this page exists to accomplish — not what it contains, what it is for.'),
  visitorQuestion: z.string().describe('The page-level question the visitor is trying to answer.'),
  narrativePosition: z.enum(['opens', 'develops', 'resolves']).describe(
    'opens: plants threads, allowed to leave unresolved. '
    + 'develops: expands what an earlier page planted. '
    + 'resolves: closes threads, must not open new questions.'
  ),
  arrivesKnowing: z.string().describe('What the reader has likely already read by the time they get here.'),
  leavesTo: z.string().describe('The intended next step — route or action.'),
  mustNot: z.array(z.string()).describe(
    'Page-level prohibitions that override anything else except the proof boundary.'
  ),
});

export type PageRole = z.infer<typeof PageRoleSchema>;

// ── Extraction (request) ────────────────────────────────────────────────────

const ExtractionNodeSchema = z.object({
  id: z.string().describe('Stable identifier for this DOM node, unique within the extraction.'),
  tag: z.string().describe('HTML tag name (h1, p, span, button, a, etc.).'),
  text: z.string().describe('Current visible text content of the node.'),
  chars: z.number().describe('Character count of the current text.'),
  fontSize: z.number().describe('Approximate font size in px (from CSS classes or stylesheet).'),
  fontWeight: z.number().describe('Approximate font weight (400 = normal, 600 = semibold, 700 = bold).'),
  isLink: z.boolean().describe('True if this node is or is inside an <a> element.'),
  isButton: z.boolean().describe('True if this node is or is inside a <button> element.'),
  hasElementChildren: z.boolean().describe(
    'True if the node contains child elements (e.g. <span> for emphasis). '
    + 'When true, text is the concatenated text content, not the inner HTML.'
  ),
  siblingGroup: z.string().nullable().describe(
    'Identifier shared by nodes that must maintain parallel structure '
    + '(e.g. all cards in a grid, all narrative paragraphs in a slider). Null if standalone.'
  ),
  role: z.string().nullable().describe(
    'Semantic role within the section: heading, subhead, body, cta_primary, '
    + 'cta_placeholder, card_heading, narrative_paragraph, eyebrow, greeting, etc. '
    + 'Null if the role cannot be determined.'
  ),
  carriesDownstreamReference: z.array(z.string()).describe(
    'Phrases in this node that a later page depends on. Changing their wording breaks a cross-page reference. '
    + 'Treat as protected — preserve verbatim even where a rejection test would flag them.'
  ),
  budget: BudgetSchema.describe('Character budget for generated replacement text.'),
});

const PageOutlineEntrySchema = z.object({
  index: z.number().describe('Zero-based position of this section on the page.'),
  heading: z.string().describe('The heading text of this section (empty if none).'),
  excerpt: z.string().describe('A short excerpt of the section content for context.'),
  isTarget: z.boolean().describe('True if this is the section being rewritten.'),
});

const UpstreamSchema = z.object({
  route: z.string().describe('The route this section inherits from.'),
  copy: z.string().describe('Full visible text of the upstream page — linking phrases only work at exact wording.'),
  linkingPhrases: z.array(z.string()).describe('Exact phrases from the upstream page that this section resolves.'),
  pinnedBeat: z.string().nullable().describe(
    'The upstream beat this section expands, set by the toolbar. '
    + 'Null means the model should infer it and declare it in brief.inheritsBeat.'
  ),
});

const CurrentScoreSchema = z.object({
  passed: z.number(),
  total: z.number(),
  failed: z.array(z.string()).describe('Names of the tests that failed.'),
});

export const ExtractionSchema = z.object({
  route: z.string().describe('The page route this extraction comes from (e.g. /about).'),
  page: PageRoleSchema.describe(
    'The page-level role from page_role in the page map. Always present. '
    + 'The section\'s job is subordinate to the page\'s purpose.'
  ),
  sectionType: z.string().describe('The taxonomy key for this section (e.g. about_hero).'),
  homepageH1: z.string().nullable().describe(
    'The homepage h1 text, if available — gives the model a sense of site-wide voice. Null if unavailable.'
  ),
  pageOutline: z.array(PageOutlineEntrySchema).describe(
    'All sections on this page, in order. Provides context so the model knows '
    + 'what comes before and after the target section and avoids restating.'
  ),
  slotConstraints: z.array(z.string()).describe(
    'Layout-level constraints from the page map for this section (slot counts, character ceilings). '
    + 'Distinct from copy-level constraints in the taxonomy.'
  ),
  upstream: UpstreamSchema.nullable().describe(
    'When this route inherits from an upstream page, the full upstream copy and linking phrases. '
    + 'Null when the route has no upstream relationship.'
  ),
  currentScore: CurrentScoreSchema.nullable().describe(
    'Heuristic score of the existing copy against locally computable rejection test proxies. '
    + 'Null if scoring was not run.'
  ),
  nodes: z.array(ExtractionNodeSchema).describe(
    'Every text node in the target section that should be rewritten, in document order. '
    + 'Index 0 is what the reader sees first. Downstream rules about first and last position depend on this ordering.'
  ),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractionNode = z.infer<typeof ExtractionNodeSchema>;

// ── Response ────────────────────────────────────────────────────────────────

const ResponseNodeSchema = z.object({
  id: z.string().describe('Must match an id from the extraction. Every extraction node must be covered.'),
  text: z.string().describe('The replacement text for this node.'),
  overBudget: z.boolean().describe(
    'True if this text exceeds the node budget max. Must be explicitly declared; '
    + 'never exceed a hard-budget node.'
  ),
  proofRefs: z.array(z.string()).describe(
    'Ids of proof items (from the project card) used to source factual claims in this text. '
    + 'Every factual claim must map to a verified proof item or become a [[PROOF: ...]] hole.'
  ),
});

const VariantSchema = z.object({
  strategyId: z.string().describe('Must match a strategy id from the taxonomy entry for this section type.'),
  label: z.string().describe('Human-readable label for this variant (e.g. "Problem-led").'),
  rationale: z.string().describe(
    'One or two sentences explaining the argument this variant makes — what it leads with '
    + 'and why that is a different claim from the other two variants. No principle names.'
  ),
  proofHoles: z.array(z.string()).describe(
    'Each entry is a [[PROOF: ...]] hole found in this variant\'s text. '
    + 'A hole is a correct output. An invented fact is a serious failure.'
  ),
  nodes: z.array(ResponseNodeSchema).describe(
    'Replacement text for every node in the extraction, in the same order.'
  ),
});

const BriefSchema = z.object({
  sectionType: z.string().describe('The taxonomy key, echoed back for traceability.'),
  sectionJob: z.string().describe(
    'One sentence: what this section is doing for the reader. '
    + 'Committed to before any prose is written.'
  ),
  servesPageJob: z.string().describe(
    'How this section\'s job serves the page\'s purpose. '
    + 'A section that serves its own question while working against the page\'s purpose is a failure.'
  ),
  readerAssumedToKnow: z.string().describe(
    'What the reader already knows when they arrive at this section. '
    + 'Prevents the copy from re-explaining things the visitor already established.'
  ),
  assumptions: z.array(z.string()).describe(
    'Every assumption made that was not given in the extraction or taxonomy. '
    + 'Filler assumptions are worse than none — only list what shapes the output.'
  ),
  inheritsBeat: z.string().nullable().describe(
    'The upstream beat this section expands. Set from upstream.pinnedBeat if provided, '
    + 'otherwise inferred. Null when there is no upstream relationship.'
  ),
  opensThreads: z.array(z.string()).describe(
    'Threads this section leaves unresolved for a later section or page to close. '
    + 'Required when narrative_role is "opens". Empty otherwise.'
  ),
});

export const ResponseSchema = z.object({
  brief: BriefSchema.describe(
    'Declared before writing. The operator reviews these, so this is not filler.'
  ),
  variants: z.array(VariantSchema).length(3).describe(
    'Exactly three variants, one per strategy in the taxonomy entry, in order. '
    + 'These are different arguments, not rewordings.'
  ),
});

export type CopyResponse = z.infer<typeof ResponseSchema>;
export type ResponseNode = z.infer<typeof ResponseNodeSchema>;

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Returns an error string if any variant omits or invents a node id.
 * Every variant must cover every requested node — no more, no less.
 */
export function validateCoverage(
  extraction: Extraction,
  response: CopyResponse,
): string | null {
  const expectedIds = extraction.nodes.map((n: ExtractionNode) => n.id);

  for (let variantIndex = 0; variantIndex < response.variants.length; variantIndex++) {
    const variant = response.variants[variantIndex];
    const variantIds = variant.nodes.map((n: ResponseNode) => n.id);

    for (let ei = 0; ei < expectedIds.length; ei++) {
      if (variantIds.indexOf(expectedIds[ei]) === -1) {
        return `Variant ${variantIndex} (${variant.strategyId}) is missing node "${expectedIds[ei]}".`;
      }
    }

    for (let vi = 0; vi < variantIds.length; vi++) {
      if (expectedIds.indexOf(variantIds[vi]) === -1) {
        return `Variant ${variantIndex} (${variant.strategyId}) contains unknown node "${variantIds[vi]}".`;
      }
    }
  }

  return null;
}

/**
 * Regex matching proof-hole placeholders in generated text.
 * Shape: [[PROOF: <question>]]
 */
export const PROOF_HOLE_PATTERN = /\[\[PROOF:\s*[^\]]+\]\]/g;
