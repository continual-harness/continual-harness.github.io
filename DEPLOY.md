# Deploying the Continual Harness blog

This folder **is** the site. It is fully static: `index.html` renders
`ARC-AGI-3-CH.md` in the browser (marked + KaTeX from a pinned CDN) and fills the
`<div data-embed="…">` anchors with the interactive `prompt_loop.html` iframe and the
replay videos under `artifacts/`. There is **no build step**.

```
index.html        page shell (loads marked + KaTeX, then app.js)
style.css         reading theme
app.js            render markdown + wire embeds
ARC-AGI-3-CH.md   the source (single source of truth)
.nojekyll         tells GitHub Pages to serve files as-is (no Jekyll)
artifacts/        prompt_loop.html, figures/*.png, CH-videos/*.mp4, Hermes-videos/*.mp4
```

## Preview locally

`fetch()` of the markdown is blocked under `file://`, so serve over HTTP:

```bash
cd blog_data/continual-harness-arcagi-site
python3 -m http.server 8000
# open http://localhost:8000/
```

## Deploy to GitHub Pages

All asset paths are **relative**, so the site works both at a domain root and under a
project subpath — pick whichever repo model you want.

### Option A — user/org site (served at `https://<user>.github.io/`)

```bash
cd blog_data/continual-harness-arcagi-site
git init -b main
git add -A          # .nojekyll and the mp4s included; total ~42 MB, well under limits
git commit -m "Continual Harness ARC-AGI-3 blog"
git remote add origin git@github.com:<user>/<user>.github.io.git
git push -u origin main
```

In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
`main` / `/ (root)`**. Live within a minute or two at `https://<user>.github.io/`.

### Option B — project page (served at `https://<user>.github.io/<repo>/`)

Push this folder's contents to a repo (root, or a `/docs` folder, or a `gh-pages`
branch), then point **Settings → Pages** at that branch/folder. Relative paths mean no
further changes are needed.

## Notes

- **Videos** total ~42 MB (largest 15 MB) — under GitHub's 100 MB/file limit, so no
  Git LFS is required. If the repo later grows large, move `artifacts/*-videos/` to
  Releases or external storage and update the paths in `app.js`.
- **CDN fallback / offline.** `index.html` pins `marked@12.0.2` and `katex@0.16.11` with
  SRI. To remove the CDN dependency, download those files plus KaTeX's `fonts/` into a
  local `vendor/`, point the `<link>`/`<script>` tags at them, and drop the `integrity`
  attributes. The page shows a clear error message if the libraries fail to load.
- **Interactive artifacts** in `artifacts/` are generated, self-contained HTML embedded
  via auto-resizing `<iframe>`s: `prompt_loop.html` (one decision as a multi-turn
  conversation, from `blog_data/prompt_loop_viz.py`) and `refinement_lp85.html` /
  `refinement_cn04.html` (reset-free refinement timelines, from
  `blog_data/refinement_timeline_viz.py`). Regenerate with those scripts.
