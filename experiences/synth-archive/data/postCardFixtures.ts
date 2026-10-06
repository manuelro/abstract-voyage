export type Item = {
  title: string
  excerpt: string
  topic: string
  readingTime: string
  date: string
  href?: string
}

export const items: Item[] = [
  {
    title: 'Thinking in systems.',
    excerpt:
      'A journal by Manuel Cerdas — engineer & consultant, formerly McKinsey. On systems and craft.',
    topic: 'Announcement',
    readingTime: '2 min read',
    date: 'May 2023',
  },
  {
    title:
      'The implementation of biomimetics in the design and development of highly efficient user interfaces',
    excerpt:
      'We examine biomimetic principles such as feedback loops, energy efficiency, and adaptive motion to inform modern UI design.',
    topic: 'Interfaces',
    readingTime: '6 min read',
    date: 'Jan 2023',
  },
  {
    title:
      'The resilient team, the Tech Lead role and the coordination function in Scrum',
    excerpt:
      'This piece breaks down resilient team habits, tech lead responsibilities, and the coordination glue that keeps Scrum healthy.',
    topic: 'Leadership',
    readingTime: '7 min read',
    date: 'Dec 2020',
  },
  {
    title: 'A retrospective to my first 5 years leading people',
    excerpt:
      'A candid retrospective on culture building, coaching rhythms, and the hard-earned lessons that shaped my leadership style.',
    topic: 'Management',
    readingTime: '5 min read',
    date: 'Nov 2020',
  },
  {
    title: 'The taxonomy of dependencies in software and their associated risk',
    excerpt:
      'We map dependency types, explain their risks, and propose a pragmatic model for tracking and reducing coupling.',
    topic: 'Architecture',
    readingTime: '6 min read',
    date: 'Nov 2020',
  },
  {
    title: 'Real-Time Feature Toggles with React and LaunchDarkly',
    excerpt:
      'A practical guide to feature flags in React, including rollout strategies, kill switches, and safe experimentation.',
    topic: 'Frontend',
    readingTime: '8 min read',
    date: 'Sep 2019',
  },
  {
    title: 'The importance of tackling technical debt',
    excerpt:
      'We outline a clear, actionable approach to technical debt that protects delivery speed and long-term code health.',
    topic: 'Engineering',
    readingTime: '4 min read',
    date: 'Nov 2017',
  },
  {
    title: 'Understanding the Document Object Model (DOM)',
    excerpt:
      'An approachable explanation of the DOM, how it’s built, and how to work with it without performance surprises.',
    topic: 'Web',
    readingTime: '6 min read',
    date: 'Feb 2017',
  },
  {
    title: 'Gzipping vs minification',
    excerpt:
      'A concise comparison of compression techniques, when to use each, and how they affect load time and caching.',
    topic: 'Performance',
    readingTime: '3 min read',
    date: 'Jan 2017',
  },
  {
    title: 'Mastering the SOLID principles',
    excerpt:
      'We translate SOLID into day-to-day engineering decisions with examples that avoid unnecessary abstraction.',
    topic: 'Design',
    readingTime: '9 min read',
    date: 'Dec 2016',
  },
]
