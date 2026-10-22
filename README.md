# brittlab.ca

Website of the Britt Lab for Neural Circuits, Motivation, and Reinforcement
Learning (Department of Psychology, McGill University). Built with Jekyll and
served by GitHub Pages straight from `main`; there is no separate build step.

The site is bilingual. Every page exists in English (`/`) and French (`/fr/`),
and the language switch in the header links each page to its counterpart.

## Updating content

Most changes are edits to a YAML file in `_data/`, which you can make directly
on github.com.

| To change | Edit |
|---|---|
| Current lab members | `_data/people.yml`: add a block with `name` and `group` (`phd`, `msc`, `undergrad`, `postdoc`, `staff`). Optional: `photo` (put the file in `assets/img/people/`), `interests_en` / `interests_fr`, `email`, `website`, `author` (e.g. `Morris MM`, to highlight them in publication lists). Without a photo, the card shows the lab-mouse placeholder. |
| Alumni | `_data/alumni.yml`: move a member here when they leave. `role_*` is what they did in the lab, `now_*` where they went next. |
| Publications | `_data/publications.yml`: copy a block to the top. Set `featured: true` to show it on the home page. |
| Funders strip | `_data/funders.yml`, logos in `assets/img/funders/`. |
| Gallery images | `_data/gallery.yml`, files in `assets/img/gallery/` with a 720px copy in `assets/img/gallery/thumbs/`. Keep the credit and licence for paper figures. |
| Any page text | `_data/i18n/en.yml` and `_data/i18n/fr.yml`. The two files have the same keys; change both. |
| News | Add a Markdown file to `_posts/` (English) named `YYYY-MM-DD-short-title.md`, and its translation to `fr/_posts/` with the same `ref:` and a `permalink:` under `/fr/nouvelles/`. Copy an existing post for the front matter. |

## Running locally

Requires Ruby and Bundler.

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000. On Ruby 3.2 and later, the Liquid version that
GitHub Pages pins needs a small shim for local builds (GitHub's own build is
unaffected): run with `RUBYOPT=-r./path/to/shim.rb`, where the shim defines
`Object#tainted?` to return false.

## How it's put together

- `_layouts/` one layout per page type; `_includes/page-vars.html` sets the
  language, strings and cross-language links used everywhere.
- `assets/css/site.css` the whole design system (paper + fluorescence palette,
  Geist / Geist Mono).
- `assets/js/circuit.js` home-page circuit animation (also used in the gallery).
- `assets/js/mouse.js` the pixel mouse that peeks over buttons with a
  `data-mouse` attribute. `tools/mouse_sprite.py` regenerates the matching
  favicon and logo mark from the same pixel map.
- `assets/js/gallery-viz.js` interactive charts and explainer animations.
- `assets/data/*.json` chart data, packed from published source data by
  `tools/build_viz_data.py`. Sources: Lehnert et al. 2026 (Nature
  Communications source data, CC BY 4.0; Dryad example dataset, CC0) and Lax et
  al. 2023 (Translational Psychiatry Supplementary Table 2, CC BY 4.0).

## Image credits

Lab photos, microscopy and member portraits come from the lab's original McGill
website. Paper figures are reproduced under their open licences, credited on
the Gallery page. Funder logos belong to their organizations.
