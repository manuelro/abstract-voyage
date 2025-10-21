import fs from 'fs'
import matter from 'gray-matter'
import md from 'markdown-it'
import Article from '../../components/Article'
import Header from '../../components/Header'
import Head from 'next/head'
import { formatDate } from 'components/helpers/date'
import NavBarLite from 'components/experiences/sphere/NavBarLite'
import { CONFIG, ORCHESTRATION } from '../../experiences/sphere/Sphere.config'
import { buildIntroFlow } from 'components/experiences/sphere/intro'
import { useMemo } from 'react'

export type PostType = {
  frontmatter: {
    title: string
    tags: string[]
  }
  content: string
  formattedDate: string
}

export default function Post({ frontmatter, content, formattedDate }: PostType) {
    const {title, tags} = frontmatter

    const GOLDEN = (1 + Math.sqrt(5)) / 2
    const FLOW = useMemo(() => buildIntroFlow({ CONFIG, ORCHESTRATION, GOLDEN }), [])

    return (
        <main className='flex min-h-screen flex-col p-5 md:p-24'>
            <Head>
                <title>{title}</title>
            </Head>

            <NavBarLite
              brand={{ href: '/', logoSrc: '/logo-white.svg', label: 'Sota' }}
              links={[
                // { href: '/posts', label: 'Posts' },
                // { href: '/visuals', label: 'Visuals' },
                { href: '/', label: 'Home' } // ← switch (ALWAYS last)
              ]}
              style={{
                opacity: true ? 1 : 0,
                transition: `opacity ${FLOW.tokens.logoFadeMs}ms ${FLOW.tokens.ease}`,
                willChange: 'opacity'
              }}
            />

            {/* <Header /> */}

            <Article title={title} tags={tags} formattedDate={formattedDate}>
                <div dangerouslySetInnerHTML={{ __html: md().render(content) }} />
            </Article>
        </main>
    )
}

export async function getStaticPaths() {
  const files = fs.readdirSync('posts')
  const paths = files.map((fileName) => ({
    params: {
      slug: fileName.replace('.md', ''),
    },
  }))

  return {
    paths,
    fallback: false
  }
}

export async function getStaticProps({ params: { slug } } : { params: { slug: string } }) {
  const fileName = fs.readFileSync(`posts/${slug}.md`, 'utf-8')
  const date = fileName.split('_')[0]
  const { data: frontmatter, content } = matter(fileName)
  return {
    props: {
      frontmatter,
      content,
      formattedDate: formatDate(date)
    },
  }
}