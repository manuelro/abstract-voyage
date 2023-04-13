## Abstract Voyage: A Static Blog Based On Next + Markdown Files
Abstract Voyage employs static file generation, utilizing Markdown files to store both metadata and data, including text, links, and other supported markup structures.

An example of the site can be accessed [here](https://abstract.voyage).

By adopting this approach, modifications to blog posts are directly made within the codebase, ensuring they are stored as Git commits. This implementation grants us version control capabilities for our blog posts and the flexibility to tailor the user interface and experience to meet specific requirements.

This project serves as an open-source foundation for developers, enabling them to build upon it for their own endeavors. Regular updates will include publicly accessible blog posts, available free of charge to all users.

![Statically Generated Blog](https://github.com/manuelro/abstract-voyage/blob/main/public/preview.png)

## Software Design and Components
The technology stack employed in this project relies on the Next.js framework. To generate the static output files, two server-side methods are utilized: [`getStaticProps`](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-props) and [`getStaticPaths`](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-paths). Additionally, the Node.js fs module is utilized for file reading operations.

To parse the Markdown files effectively, the project integrates [`gray-matter`](https://www.npmjs.com/package/gray-matter), a well-known parser capable of handling various file formats, including `.md` files. This library facilitates the extraction of metadata from these Markdown files and produces an equivalent JSON representation of the data.

The blog posts located at `~/posts/` adhere to a specific naming convention. They are named using a valid date format, followed by a slug containing relevant keywords. This complete slug serves as the unique identifier and filename for each statically generated post file.

`[date]_[keywords]`

In addition to the naming convention and metadata extraction, Markdown files in this project can include additional details through the use of Markdown-specific sections. Here's an example of the contents of a Markdown file:

File: `~/posts/2023-05-03_infinity-labs-open-education.md`
```markdown
---
title: 'Introducing Infinity Labs: The Open Education Initiative'
author: "Manu"
tags:
    - Open Education
    - YouTube
---
I am excited to announce the launch of [Infinity Labs](https://www.youtube.com/@infinity-labs-edu/videos), an **open education initiative** that aims to provide **high-quality educational resources** for software engineering professionals, from junior to senior developers.  
```

Upon processing the Markdown files using the gray-matter parser, the resultant output will manifest as a JSON data structure akin to the following representation. Subsequently, this JSON structure will be harnessed during the static file generation procedure:

```json
{
  "data": {
    "title": "Introducing Infinity Labs: The Open Education Initiative",
    "author": "Manu",
    "tags": ["Open Education", "YouTube"]
  },
  "content": "..."
}
```

___

This is, for now, the home of my personal journal. Thank you for passing by and for exploring the technical side of this tiny but interesting static blog generator using Markdown files. 🤗

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
