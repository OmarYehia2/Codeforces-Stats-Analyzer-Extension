# Codeforces Stats Analyzer Extension

Analyze Codeforces solved problems by tags and rating within a date range. Runs entirely client-side using the public Codeforces API.

## ⚙️ Tech Stack
- Manifest V3 Chrome Extension
- HTML + CSS
- JavaScript (ES Modules)
  - src/cf_api.js: API calls and data processing
  - src/utils.js: UI helpers and CSV export
- Chrome Extension APIs: storage, tabs
- External services: https://codeforces.com/api

## ✨ Features
- Enter handle and date range
- "Use page" button auto-detects handle from an open Codeforces profile tab
- Tag counts with min/max/avg rating per tag
- Solved problems detail list
- Aggregate stats (problems/day, average rating, current/max user rating)
- Export solved problems as CSV

## 🚀 Install
1. Clone the repository:
   ```bash
   git clone https://github.com/OmarYehia2/Codeforces-Stats-Analyzer-Extension.git
   cd Codeforces-Stats-Analyzer-Extension/codeforces-stats-extension
   ```
2. Open Chrome and go to chrome://extensions
3. Enable Developer mode (top right)
4. Click "Load unpacked" and select the codeforces-stats-extension folder
5. Optional: open the extension Options page to set a default handle

## Usage
1. 🧭 Open a Codeforces profile (e.g., https://codeforces.com/profile/MR_NoSolution)
2. 🧩 Click the extension icon to open the popup
3. 👤 Click "Use page" to auto-fill the handle, or type it manually
4. 🗓️ Set dates or click "Last 30d", then click "Fetch"
5. 📊 Review Tags, Solved details, and Stats; 💾 click "Save CSV" to export

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
