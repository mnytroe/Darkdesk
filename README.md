# DarkDesk

Chrome extension (Manifest V3) that applies a dark theme to **Freshdesk** agent workspaces on `*.freshdesk.com`. No build step: plain HTML, CSS, and JavaScript.

## Install (developer / unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder
4. After code changes, click **Reload** on the extension card

## Use

Click the DarkDesk icon in the toolbar and toggle **Dark Mode** on or off. The choice is stored in `chrome.storage.local` and applies immediately on open Freshdesk tabs.

## What’s inside

| File | Role |
|------|------|
| `dark-mode.css` | Overrides Freshworks Design System (DEW) variables and adds layout-specific rules |
| `content.js` | Injects CSS into shadow roots, patches `attachShadow`, overrides inline styles, observes DOM |
| `popup.html` / `popup.js` | Simple on/off UI |
| `manifest.json` | MV3 entry point, content script + `web_accessible_resources` for shadow injection |

See `CLAUDE.md` for a deeper architecture note (intended for AI / contributor context).

## Permissions

- **storage**: persist the enable/disable toggle  
- **activeTab**: declared for typical extension patterns (primary work runs via the content script on matching URLs)

## License

Specify your license here if you publish the repo publicly.
