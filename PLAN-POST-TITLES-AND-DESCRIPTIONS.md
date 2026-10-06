# Post metadata refinement plan — titles, descriptions, and tags

**Status:** Proposed; no post files have been edited. **Decision source:** [Post-title and description editorial review](ANALYSIS-POST-TITLES-AND-DESCRIPTIONS.md). Its IDs are the implementation keys, and its current/reviewed columns contain the exact proposed substitutions.

**Scope:** Frontmatter `title`, `excerpt`, and ordered `tags` only: 13 individually reviewable decisions across eight files in `posts/`. The other three post files, article bodies, external URLs, dates, featured flags, hero images, and navigation structure remain unchanged. The analysis audits all 11 post files, including tags it recommends preserving.

**Objective:** Make article previews and topic labels accurate to their content and complementary to the three-page positioning: engineering stays first-class; interface engineering and human-interaction questions appear where the writing supports them; exploratory ideas are not presented as validated outcomes. New tag terms are allowed only when the article body supports them.

## Decision gates

1. Review each ID in the analysis independently. Accept, revise, or reject it before touching a post file. Preserve KEEP-01 through KEEP-10 unless a separate content reason emerges. A tag recommendation is one decision about its entire ordered array, not permission to alter individual terms silently.
2. Confirm that the body of each article supports every accepted title, excerpt, and tag. If it does not, revise the proposed metadata or defer the change; do not quietly rewrite the body under this plan.
3. Treat `tags[0]` as a high-visibility editorial choice: the post loader makes it the summary `topic` shown on cards and, absent `primaryTopic`, on article pages. Later tags appear in metadata but do not currently create on-site filters. Do not use tag changes to claim a navigation or search-ranking improvement.
4. For the biomimetics essay, explicitly retain the exploratory framing. The body itself calls for more scientific evidence, so the metadata must not promise a proven measure, improved adoption, or “human” behavior as a demonstrated outcome. `Human-Computer Interaction` is a subject tag, not a new professional title.

## Proposed implementation sequence

| Stage | IDs | File and fields | Purpose |
|---|---|---|---|
| 1 — Correct technical preview and taxonomy precision | GZIP-01; DEPENDENCY-01; DEPENDENCY-02; DOM-01; DEBT-01 | Gzipping excerpt; dependency title/excerpt; DOM and technical-debt tag arrays | Remove imprecise claims and replace two generic secondary tags with body-supported engineering terms. Keep `DOM` and `Technical Debt` first. Apply the dependency title and excerpt as a pair if both are accepted. |
| 2 — Clarify leadership argument and topic | LEADING-01; RESILIENT-01; RESILIENT-02; RESILIENT-03 | Tech-leading tag array; resilient-team title/excerpt/tag array | Put the existing `Technical Leadership` term in the retrospective's visible first-tag slot. Present distributed coordination as a conditional resilience argument and use the same leadership term as a secondary tag on the companion essay. |
| 3 — Qualify the HCI exploration | BIOMIMETIC-01; BIOMIMETIC-02; BIOMIMETIC-03 | Biomimetics title/excerpt/tag array | Connect human-interaction inquiry to interface engineering without treating the essay's framework as empirically established. Review all three fields as one coherent preview even though each has its own acceptance ID. |
| 4 — Orient the collection | WELCOME-01 | Welcome excerpt | Name the journal's engineering and interface-development subjects without turning the welcome into a biography; leave the welcome untagged. |

## Validation after any accepted changes

- Confirm every edited `title`, `excerpt`, and `tags` array parses as intended with the existing post loader. Preserve the YAML frontmatter shape, tag order, and existing non-target keys; folded excerpts must resolve to the reviewed wording.
- Check the journal listing and, for `featured: true` posts, the Abstract hero/card previews. Verify the final consumer displays the intended title, description, and first-tag topic without truncation that changes meaning. Check the post page's topic, article metadata, and JSON-LD `keywords` for each changed tag array.
- Check title/excerpt/first-tag combinations together for accurate information scent and article-body fit. Do not apply a title or primary-tag change that creates a mismatch with the other fields. No `primaryTopic` override currently exists in these posts; if one is later added, recheck the article-page topic separately.
- Check spelling and terminology. Do not introduce “interface design” into new visitor-facing metadata; use “interface engineering” or “interface development” only where the article supports it. Keep `Object-Oriented Design` because it names a distinct programming concept. Avoid new claims about outcomes, reach, adoption, retention, or scientific validity.
- Do not add `Human-Computer Interaction`, `User Experience`, or related labels to earlier engineering posts solely to make the collection look more specialized. Retain accurate implementation, performance, and architecture tags.
- Preserve existing slugs, canonical paths, publication provenance, `featured` flags, and old article bodies. No redirect or historical Medium-title change is authorized by this plan.
- Run the relevant post-content parsing checks. If a visual preview is changed, follow `AGENTS.md`: check process load, use a non-3000 port and a private build directory, inspect actual desktop/tablet/mobile rendering and screenshots, and stop agent-owned verification processes at handoff.

## Decision checklist

- [ ] GZIP-01
- [ ] DOM-01
- [ ] DEBT-01
- [ ] DEPENDENCY-01
- [ ] DEPENDENCY-02
- [ ] LEADING-01
- [ ] RESILIENT-01
- [ ] RESILIENT-02
- [ ] RESILIENT-03
- [ ] BIOMIMETIC-01
- [ ] BIOMIMETIC-02
- [ ] BIOMIMETIC-03
- [ ] WELCOME-01

No recommendation is marked complete. This plan authorizes no post edits until the operator chooses which IDs to accept.
