# Codeforces Stats Analyzer (Chrome Extension)

Analyze Codeforces solved problems by tags and rating within a date range. Runs entirely client-side using the public Codeforces API.

## Tech Stack
- Manifest V3 Chrome Extension
- HTML + CSS (no frameworks)
- JavaScript (ES Modules)
  - src/cf_api.js: API calls and data processing
  - src/utils.js: UI helpers and CSV export
- Chrome Extension APIs: storage, tabs
- External services: https://codeforces.com/api

## Features
- Enter handle and date range; quick "Last 30d" preset
- "Use page" button auto-detects handle from an open Codeforces profile tab
- Tag counts with min/max/avg rating per tag
- Solved problems detail list
- Aggregate stats (problems/day, average rating, current/max user rating)
- Export solved problems as CSV

## Permissions
- storage: persist default handle
- tabs: read the active tab URL to auto-detect the handle on profile pages
- host_permissions: https://codeforces.com/* to fetch from Codeforces API

## Install (Load Unpacked)
1. Open Chrome and go to chrome://extensions
2. Enable Developer mode (top right)
3. Click "Load unpacked" and select the codeforces-stats-extension folder
4. Optional: open the extension Options page to set a default handle

## Usage
1. 🧭 Open a Codeforces profile (e.g., https://codeforces.com/profile/tourist)
2. 🧩 Click the extension icon to open the popup
3. 👤 Click "Use page" to auto-fill the handle, or type it manually
4. 🗓️ Set dates or click "Last 30d", then click "Fetch"
5. 📊 Review Tags, Solved details, and Stats; 💾 click "Save CSV" to export

## Development
- Main popup: popup.html, popup.js, styles.css
- Logic modules: src/cf_api.js, src/utils.js
- Options page: options.html
- Toolbar icon: not provided; Chrome shows the default icon (you can add PNGs and update manifest.json if desired)

### Folder Structure
```
codeforces-stats-extension/
  manifest.json
  README.md
  popup.html
  popup.js
  styles.css
  options.html
  src/
    cf_api.js
    utils.js
```

## Notes
- All computation happens locally in the browser.
- API rate limits may apply; reduce page size or requests if needed.
- Dates are treated in UTC; a YYYY-MM-DD "To" date is interpreted as end-of-day (23:59:59Z).
