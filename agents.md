# Site Map & Features

This repository contains the source code for Etienne Vinton Horn's personal website (`etienneunai.com`).

## Directory Structure
- `/site/`: Contains all the web-facing static files (HTML, CSS, JS) that are served on the domain.
  - `index.html`: The main portfolio and landing page (About, Contact, Top Projects, Slop Projects).
  - `assets/`: Global site assets (CSS, images, JS).
  - `quizzes/`: A sub-project containing the **QuizMap**.
    - `data/`: JSON datasets for quizzes, pricing, and commute matrices.
  - `fasttyper/`: A sub-project showcase and live animated demo for **FastTyper**.
- `/scripts/fetch_quizzes/`: Backend Python scripts to scrape/fetch quiz data from QuizFinder.com.au and geocode venues (`fetch_quizzes.py`, `retry_geocoding.py`).
- `diff_matrices.py` & `validate_pricing.py`: Utility Python scripts for validating and comparing QuizMap data.
- `.github/`: CI/CD workflows for GitHub Actions (likely for GitHub Pages deployment).

## Features

### Personal Portfolio (`/`)
- **Landing & About**: Introduction and contact links (Email, GitHub, LinkedIn).
- **Top Projects**: Links and descriptions for UWAGuessr and Diplomacy Bot.
- **Slop Projects**: Links and descriptions for QuizMap and FastTyper.

### QuizMap (`/quizzes`)
- An interactive Leaflet map displaying quiz nights across Western Australia.
- **Filters & Toggles**:
  - Filter quizzes by day of the week.
  - **Commute Mode**: Shows travel times to venues (Near, Medium, Far) based on a pre-calculated commute matrix.
  - **Prices Mode**: Displays price estimates (Budget, Average, Premium).
- **Data Pipeline**: Python scripts fetch, geocode, and validate quiz data, producing static JSON files (`quizzes.json`, `pricing.json`, `commute_matrix.json`) used by the frontend map.

### FastTyper (`/fasttyper`)
- Showcase page for FastTyper, a local-LLM spell and grammar correction tool.
- Includes an interactive animated simulation demonstrating real-time typo detection, LLM inference pulse, wavy underlined corrections, and hover-to-revert tooltips.

## Technology Stack
- **Frontend**: Plain HTML, CSS, Vanilla JavaScript.
- **Map**: Leaflet.js (`quizzes/map.js`).
- **Data Scripts**: Python (with requests/geocoding libraries).
- **Deployment**: Static site hosting, presumably via GitHub Pages (`.nojekyll`, `CNAME` files exist in `/site`).
