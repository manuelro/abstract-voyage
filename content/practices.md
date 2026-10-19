---
# The wall's closing banner: its own editorial quote (quote:) plus the
# "Practices" block nested inside it (header + four practice cards +
# delivery/industry copy + CTA) -- one file because they render as one
# visual unit (PracticesSection is the quote's own `children`).
# Every field below is optional copy -- leave any one empty (or delete it)
# and PracticesSection simply omits that element; it never renders empty
# tags or leftover spacing. quote and practices (the four grid cards) are
# the exceptions: the banner's own quote is the page's main editorial
# statement, not a decorative aside, and practices is exactly four items,
# each needing both title and description.
schemaVersion: 1
locale: en

# The banner's own quote -- the large statement text, its source heading,
# the heading's link destination, and the section's aria-label. The source
# heading is the single, canonical disciplines line; it used to be repeated
# as the section `heading` below, which is now deliberately blank.
quote:
  text: Judgment carried from the first decision through to real measurable use.
  sourceHeading: Product, experience, engineering & applied AI
  title: Abstract Voyage
  destination: /about
  ariaLabel: Abstract Voyage introduction

# The section title, rendered with the same treatment as the "Independent
# expertise. Connected delivery." title below, so every section title shares
# one look. The eyebrow is intentionally empty (the title replaces it).
eyebrow: ''
heading: The Practice
introduction: >-
  Each area below is approached as serious engineering work, creative where
  it helps and systematic where it counts, with equal care for how it is
  made and for what finally ships.
# Optional line shown under the introduction, above the practices grid.
subtext: ''

practices:
  - title: Product Strategy & Direction
    description: >-
      Deciding what is worth building, and what is not. Opportunities and
      alternatives are weighed against user needs, business goals, and
      technical reality, so **priorities hold up under scrutiny** and the
      product advances with intent.
  - title: Experience & Interface Design
    description: >-
      How people understand and move through a product, worked out in code
      rather than static mockups. Interaction and interface are prototyped
      as **working software**, so ideas can be explored, tested, and refined
      against real behavior.
  - title: Software Engineering & Architecture
    description: >-
      The engineering underneath: architecture, integration, implementation,
      and modernization of complex systems. Built to stay **reliable and
      maintainable** as they grow, with operational constraints treated as
      part of the design rather than an afterthought.
  - title: Applied AI & Intelligent Automation
    description: >-
      Where intelligent capabilities genuinely earn a place in a product or
      workflow. Feasibility is tested and interactions are prototyped with
      the same rigor as everything else, including integration, reliability,
      and the **human oversight** these systems require.

delivery:
  heading: Independent expertise. Connected delivery.
  text: >-
    Each area can stand on its own. More often the value is in connecting
    them, with product decisions, design, and engineering held in one
    continuous line of reasoning, so **nothing is lost in handoffs**,
    rediscovered twice, or left to fall between roles.

industry:
  label: INDUSTRY EXPERIENCE
  title: Digital commerce & online retail
  text: >-
    A background in online-retail engineering, where customer experience,
    business workflows, and the systems beneath them meet under real
    commercial pressure, and where the gaps between them tend to show.

cta:
  label: Get in touch
  href: /contact
---
