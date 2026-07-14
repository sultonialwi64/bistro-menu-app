# AGENTS.md

## Project

Static mobile-first menu book website. Single `index.html` file with inline CSS and JS — no build tools, no dependencies.

## Stack

- Pure HTML/CSS/JS (no framework)
- Google Fonts: Playfair Display (headings), Inter (body)
- External PNG assets loaded via CDN (pngtree.com)

## Key behaviors

- Food popup: click card → image flies from card position to center → text emerges from behind image (top: restaurant branding, bottom: food details)
- Scroll lock via `position: fixed` on body during modal
- Background blur via `backdrop-filter`
- All state managed in vanilla JS variables (`flyImg`, `flyTopEl`, `flyTextEl`, `lastScroll`)

## Conventions

- Bahasa Indonesia for UI text
- Prices in Rupiah format (`Rp XX.XXX`)
- No build step — edit `index.html` directly
