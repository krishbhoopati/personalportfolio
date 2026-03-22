# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Static personal portfolio website for Krish, a digital artist/designer based in Toronto. Single HTML file with embedded styles and vanilla JavaScript — no build system, no package manager, no frameworks.

## Development
Open `index.html` directly in a browser. No build step required.

## Assets
- `cn-tower.png` — full CN Tower image
- `cn-tower-cropped.png` — cropped version used as the "i" in the hero name "Krish"

## Architecture

### Single file: `index.html` (298 lines)

**CSS layers (Tailwind CDN v3.4.17 + custom `<style>` block):**
- Grid background: repeating-linear-gradient pattern with radial-gradient mask
- Pixel-art flowers: 7 SVG elements with staggered CSS `@keyframes float` animations
- Fade-in animations on hero text with 1s/1.5s delays
- Color scheme: `#0044CC` deep blue background, yellow (`#FFFF00`) accents

**JavaScript (inline `<script>` at bottom of body):**
- `snapToGrid()` — calculates viewport-based grid cell size (smallest of `vw/cols` or `vh/rows`), then snaps the CN Tower image position to the nearest grid intersection. Re-runs on resize.
- Mouse parallax — `mousemove` listener moves each `.flower` element proportionally to `data-speed` attribute.
- Font loading guard — waits for `document.fonts.ready` before first `snapToGrid()` call.

**Stacking context (z-index):**
- `z-0`: grid background
- `z-10`: floating flowers
- `z-20`: hero section
- `z-30`: footer
- `z-50`: navigation bar

**Navigation:**
- WORKS link has a hover dropdown (currently empty, toggled via JS `classList`)
- ABOUT and CONTACT are anchor links with `#` hrefs
- Social icons (Instagram, LinkedIn, Twitter) in the right cluster
