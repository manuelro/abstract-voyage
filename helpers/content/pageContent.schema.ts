import { z } from 'zod';

const copy = z.string().trim().min(1);
const metadata = z.object({ title: copy, description: copy });

export const siteContentSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.literal('en'),
  siteName: copy,
});

export const abstractSourceSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.literal('en'),
  meta: metadata,
  hero: z.object({ id: z.literal('editorial-hero'), heading: copy }),
});

export const aboutSourceSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.literal('en'),
  meta: metadata,
  timeline: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    title: copy,
    period: copy,
    line: copy,
  })).min(1).superRefine((rows, context) => {
    const ids = new Set<string>();
    rows.forEach((row, index) => {
      if (ids.has(row.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'id'], message: 'Timeline ids must be unique.' });
      ids.add(row.id);
    });
  }),
});

const conversationSchema = z.object({
  agentName: copy,
  entryMessage: copy,
  degradedEntryMessage: copy,
  recapIntro: copy,
  recapUpdateIntro: copy,
  replyRouteQuestion: copy,
  replyRouteErrorMessage: copy,
  nameQuestion: copy,
  closeMessage: copy,
  closeMessageWithReplyWindow: copy,
  entryPlaceholder: copy,
  replyRoutePlaceholder: copy,
  namePlaceholder: copy,
  namePlaceholderNarrow: copy,
  skipNameLabel: copy,
  skipNameLabelNarrow: copy,
  nameSkippedLabel: copy,
  noteEditPlaceholder: copy,
  degradedAddendumPlaceholder: copy,
  confirmCorrectLabel: copy,
  confirmAcceptLabel: copy,
  degradedConfirmCorrectLabel: copy,
  degradedConfirmAcceptLabel: copy,
  editIdentityLinkLabel: copy,
  sendAsIsLabel: copy,
  continueAsWrittenLabel: copy,
  deliveryRetryMessage: copy,
  deliveryGiveUpMessage: copy,
  starterStems: z.array(copy).min(1),
});

export const contactSourceSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.literal('en'),
  meta: metadata,
  conversation: conversationSchema,
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type AbstractPageContent = z.infer<typeof abstractSourceSchema> & { hero: z.infer<typeof abstractSourceSchema>['hero'] & { body: string[] } };
type AboutTimelineEntry = z.infer<typeof aboutSourceSchema>['timeline'][number];
export type AboutPageContent = Omit<z.infer<typeof aboutSourceSchema>, 'timeline'> & { timeline: Array<AboutTimelineEntry & { body: string }> };
export type ContactPageContent = z.infer<typeof contactSourceSchema>;
export type PageContent = AbstractPageContent | AboutPageContent | ContactPageContent;

/** Resolves the deliberately small template vocabulary used by page copy. */
export function formatContentTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g, (_match, key: string) => {
    if (!(key in values)) throw new Error(`Missing content template value: ${key}`);
    return String(values[key]);
  });
}
