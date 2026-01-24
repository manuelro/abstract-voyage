# Code Image Conversion

Replace code screenshots in a post with snippet include markers and create snippet files in `content/posts/<post-id>/snippets/`.

Usage:

```bash
node scripts/code-images/convert.js 2019-09-15_medium-feature-toggles-react \
  --map figure-01.png:withTogglesProvider.js:js \
  --map figure-02.png:withTogglesConsumer.js:js \
  --map figure-03.png:ToggleRouter.js:js \
  --map figure-04.png:Nav.js:js
```

Notes:
- The script creates snippet files with a TODO placeholder if they do not exist.
- The markdown replacement targets image references that include the image filename.
