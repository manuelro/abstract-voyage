// @ts-nocheck
import fs from 'fs'
import matter from 'gray-matter'
import { formatDate } from 'components/helpers/date'
import { PostType } from './posts/[slug]'
import { useMemo, useState } from 'react'
import SynthExperience from '../experiences/synth/SynthExperience'
import TagChips from '../experiences/synth/components/TagChips'

type PropsType = {
    posts: PostType[]
}

export default function SynthPage({ posts }: PropsType) {
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const articles = useMemo(() => {
        return posts
            .filter(Boolean)
            .map((post) => ({
                id: post.slug,
                title: post.title,
                tags: post.tags ?? [],
            }))
    }, [posts])

    const filteredPosts = useMemo(() => {
        if (!selectedTag) return posts
        return posts.filter((post) => (post?.tags ?? []).includes(selectedTag))
    }, [posts, selectedTag])

    const featuredTagsOverride = []

    return (
        <SynthExperience posts={filteredPosts}>
            <TagChips
                articles={articles}
                featuredTagsOverride={featuredTagsOverride}
                maxFeatured={3}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
            />
        </SynthExperience>
    )
}

export async function getStaticProps(){
    const files = fs.readdirSync('posts')

    const posts = files.map((fileName) => {
        const slug = fileName.replace('.md', '')
        const date = fileName.split('_')[0]
        const readFile = fs.readFileSync(`posts/${fileName}`, 'utf-8')
        const { data: frontmatter, content } = matter(readFile)
        const title = String(frontmatter?.title ?? slug)
        const tags = (frontmatter?.tags ?? []).map((tag: string) => tag.trim()).filter(Boolean)
        const excerpt = frontmatter?.excerpt ? String(frontmatter.excerpt) : ''

        const wordCount = content.replace(/[#_*`>\\-]/g, ' ').split(/\s+/).filter(Boolean).length
        const readingTimeMinutes = wordCount ? Math.max(1, Math.round(wordCount / 200)) : null

        return {
            slug,
            date,
            formattedDate: formatDate(date),
            title,
            excerpt,
            tags,
            canonicalPath: `/posts/${slug}`,
            externalUrl: frontmatter?.externalUrl ? String(frontmatter.externalUrl) : null,
            forceExternalNavigation: Boolean(frontmatter?.forceExternalNavigation),
            readingTimeMinutes,
        }
    }).filter((post) => Boolean(post && post.title)).sort((a, b) => {
        if ( a.date < b.date ){
            return -1
        }
        if ( a.date > b.date ){
            return 1
        }
        return 0
    }).reverse()

    return {
        props: {
            posts,
        },
    }
}
