# AGENTS.md

## Project

Static mobile-first menu book website. Single `index.html` file with inline CSS and JS — no build tools, no dependencies.

## Stack

- Pure HTML/CSS/JS (no framework bundler, but using modular ES Modules)
- Google Fonts: Playfair Display (headings), Inter (body)
- External PNG assets loaded via CDN (pngtree.com)

## Key behaviors

- Food popup: click card → image flies from card position to center → text emerges from behind image (top: restaurant branding, bottom: food details)
- Scroll lock via `position: fixed` on body during modal
- Background blur via `backdrop-filter`
- Keranjang belanja (Cart) & Auto meja detector.

## Conventions

- Bahasa Indonesia for UI text
- Prices in Rupiah format (`Rp XX.XXX`)
- **Architecture**: Modular folder structure (`/css` and `/js`). No longer a single monolithic file. ES Modules (`<script type="module">`) used for scripts.
