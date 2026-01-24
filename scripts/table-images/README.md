# Table Image Conversion

Replace table screenshots in a post with table markers and create JSON table stubs in `content/posts/<post-id>/tables/`.

Usage:

```bash
node scripts/table-images/convert.js 2023-01-27_medium-biomimetics \
  --map figure-02.png:human-communication-traits \
  --map figure-03.png:gorilla-communication-traits \
  --map figure-04.png:human-communication-rank
```

Notes:
- The script creates JSON stubs with `headers` and `rows` if they do not exist.
- Fill the JSON files with the table data after conversion.
