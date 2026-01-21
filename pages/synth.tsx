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
        return posts.map((post) => ({
            id: post.slug,
            title: post.frontmatter?.title ?? post.slug,
            tags: post.frontmatter?.tags ?? [],
        }))
    }, [posts])

    const filteredPosts = useMemo(() => {
        if (!selectedTag) return posts
        return posts.filter((post) => (post.frontmatter?.tags ?? []).includes(selectedTag))
    }, [posts, selectedTag])

    const featuredTagsOverride = ['AI', 'Consulting', 'Web Development', 'Design', 'Cloud']

    return (
        <SynthExperience posts={filteredPosts}>
            <TagChips
                articles={articles}
                featuredTagsOverride={featuredTagsOverride}
                maxFeatured={5}
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
        const { data: frontmatter } = matter(readFile)

        return {
            slug,
            date,
            formattedDate: formatDate(date),
            frontmatter,
        }
    }).sort((a, b) => {
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
