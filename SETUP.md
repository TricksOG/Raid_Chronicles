# Raid Chronicles — GitHub Pages Setup Guide

## Repo Structure (Flat — All Files in Root)

All files go directly in the root of the repository. No subfolders.

```
Raid_Chronicles/
├── index.html
├── style.css
├── data.js
├── engine.js
├── ui.js
├── main.js
└── SETUP.md
```

---

## How to Upload New Files

When Claude gives you updated files, upload each one directly to the **root** of the repo:

1. Go to `github.com/TricksOG/Raid_Chronicles`
2. Click **Add file → Upload files**
3. Drag all the new files in — GitHub will overwrite existing ones automatically
4. Add a commit message (e.g. "Update engine and ui") and click **Commit changes**

GitHub Pages rebuilds in about 60 seconds. Then do a hard refresh (`Shift+F5` or `Ctrl+Shift+R`) to clear cache.

---

## Enabling GitHub Pages (One Time)

1. Go to your repo → **Settings** → **Pages**
2. Under **Branch**, select `main` and folder `/ (root)`
3. Click **Save**
4. Your game is live at: `https://TricksOG.github.io/Raid_Chronicles/`

---

## Why Flat Structure?

The game references all files without subfolders in `index.html`:

```html
<link rel="stylesheet" href="style.css">
<script src="data.js"></script>
<script src="engine.js"></script>
<script src="ui.js"></script>
<script src="main.js"></script>
```

If files are in subfolders (`js/` or `css/`), the browser gets a **404** and nothing works.
Always keep everything in the root to avoid this.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Game looks unstyled (plain HTML) | `style.css` is missing or in a subfolder |
| Buttons don't work / console shows `RC is not defined` | One of the JS files is missing or in a subfolder |
| Old version still showing | Hard refresh: `Shift+F5` |
| Changes not live yet | Wait 60s for Pages to rebuild |
| Console shows 404 errors | Check file paths — everything must be in root |
