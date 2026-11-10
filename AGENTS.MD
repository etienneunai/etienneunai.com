# Site Map & Features

This repository contains the source code for Etienne Vinton Horn's personal website (`etienneunai.com`).

## Directory Structure
- `/site/`: Contains all the web-facing static files (HTML, CSS, JS) that are served on the domain.
  - `index.html`: The main portfolio and landing page (About, Contact, Top Projects, Side Projects).
  - `assets/`: Global site assets (CSS stylesheets, images, icons).
  - `fasttyper/`: A sub-project showcase and live animated demo for **FastTyper** (`index.html`, `demo.js`, `style.css`).
  - `CNAME`: Domain configuration (`etienneunai.com`).
  - `.nojekyll`: Disables Jekyll processing so static assets are served directly.
- `.github/workflows/`: GitHub Actions workflows (`jekyll-gh-pages.yml` for static deployment to GitHub Pages targeting `./site`).

## Features

### Personal Portfolio (`/`)
- **Landing & About**: Introduction and contact cards (Email, GitHub, LinkedIn).
- **Top Projects**:
  - **UWAGuessr**: Panoramic campus exploration and guessing game.
  - **Diplomacy Bot**: Autonomous bot playing the strategy board game *Diplomacy*.
- **Side Projects**: Side projects showcase, featuring FastTyper.

### FastTyper (`/fasttyper`)
- Showcase page for FastTyper, a fully local LLM-based spell and grammar checker with extensions for Obsidian and Firefox.
- Includes an interactive animated simulation demonstrating real-time typo detection, LLM inference pulse, wavy underlined corrections, and hover-to-revert tooltips.

## Technology Stack
- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript (no heavy frameworks or runtimes).
- **Deployment**: Static hosting via GitHub Pages configured through GitHub Actions.
