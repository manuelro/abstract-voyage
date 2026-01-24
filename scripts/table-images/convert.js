#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const [, , postId, ...args] = process.argv

if (!postId) {
  console.error('Usage: node scripts/table-images/convert.js <post-id> --map <image>:<tableKey>')
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
  console.error('No mappings provided. Example: --map figure-02.png:human-communication-traits')
  process.exit(1)
}

const postPath = path.join(process.cwd(), 'posts', `${postId}.md`)
const tablesDir = path.join(process.cwd(), 'content', 'posts', postId, 'tables')
fs.mkdirSync(tablesDir, { recursive: true })

let markdown = fs.readFileSync(postPath, 'utf-8')

for (const entry of mapArgs) {
  const [imageName, tableKey] = entry.split(':')
  if (!imageName || !tableKey) {
    console.error(`Invalid map entry: ${entry}`)
    process.exit(1)
  }

  const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\([^\\)]*${imageName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\)`, 'g')
  const marker = `<!-- table:${tableKey} -->`
  markdown = markdown.replace(imagePattern, marker)

  const tablePath = path.join(tablesDir, `${tableKey}.json`)
  if (!fs.existsSync(tablePath)) {
    fs.writeFileSync(tablePath, JSON.stringify({ headers: [], rows: [] }, null, 2), 'utf-8')
  }
}

fs.writeFileSync(postPath, markdown, 'utf-8')
console.log(`Updated ${postId} and created tables in ${tablesDir}`)
