# Writing a blog post by hand

1. Open this folder on GitHub (`blog/_write`) and click **Add file → Create new file**.
2. Name the file after the web address you want, in lowercase with hyphens, ending in `.md`.
   `fed-holds-rates.md` becomes `quasidb.com/blog/fed-holds-rates/`.
3. Copy everything from `TEMPLATE.md` into it and fill in the header lines between the `---` lines:
   - **title**: the headline. **highlight** (optional): a second half shown in orange.
   - **description**: one sentence for the blog list, Google and social shares.
   - **type**: `market` for a market note, or `site` for a site update.
   - **tags**: currencies or pairs, separated by commas (optional).
   - **crowd**: for market notes, up to 3 pairs to show today's retail crowd for, e.g. `GBPUSD, EURGBP` (optional).
   - **date**: the publish date as YYYY-MM-DD (optional; leave it out to use today).
4. Write the post under the header. `## ` starts a new section heading, `**bold**`, `- ` bullets, `[text](link)` links.
5. Click **Commit changes** and commit straight to `main`.

About two minutes later the post is live, on the blog page and in the RSS feed. Market notes automatically
get the crowd figures and the "How to use this as a day trader" box with the one rule.

To fix a typo later, edit the same `.md` file and commit again: the page is rebuilt.
To remove a post, delete the `.md` file, the `blog/<name>/` folder, and its card in `blog/index.html`.
