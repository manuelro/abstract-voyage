#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const [, , postId, ...args] = process.argv

if (!postId) {
  console.error('Usage: node scripts/code-images/convert.js <post-id> --map <image>:<snippet>:<lang> [--map ...]')
  process.exit(1)
}

const mapArgs = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--map' && args[i + 1]) {
    mapArgs.push(args[i + 1])
    i += 1
  }
}

if (mapArgs.length === 0) {
  console.error('No mappings provided. Example: --map figure-01.png:withTogglesProvider.js:js')
  process.exit(1)
}

const postPath = path.join(process.cwd(), 'posts', `${postId}.md`)
const snippetDir = path.join(process.cwd(), 'content', 'posts', postId, 'snippets')
fs.mkdirSync(snippetDir, { recursive: true })

let markdown = fs.readFileSync(postPath, 'utf-8')

for (const entry of mapArgs) {
  const [imageName, snippetName, lang] = entry.split(':')
  if (!imageName || !snippetName || !lang) {
    console.error(`Invalid map entry: ${entry}`)
    process.exit(1)
  }

  const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\([^\\)]*${imageName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\)`, 'g')
  const marker = `<!-- code:include file="${snippetName}" lang="${lang}" title="${snippetName}" -->`
  markdown = markdown.replace(imagePattern, marker)

  const snippetPath = path.join(snippetDir, snippetName)
  if (!fs.existsSync(snippetPath)) {
    fs.writeFileSync(snippetPath, '// TODO: paste code from image\\n', 'utf-8')
  }
}

fs.writeFileSync(postPath, markdown, 'utf-8')
console.log(`Updated ${postId} and created snippets in ${snippetDir}`)
