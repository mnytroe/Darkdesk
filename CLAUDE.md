# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DarkDesk is a Chrome extension (Manifest V3) that applies dark mode to Freshdesk (`*.freshdesk.com/*`). No build system — all files are plain vanilla JS and CSS loaded directly by Chrome.

## Loading the extension

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. To reload after changes: click the refresh icon on the extension card (or use the Extensions toolbar button)

There are no build, lint, or test commands.

## Architecture

The extension has four moving parts that work together:

### `dark-mode.css` — The styling engine
Overrides Freshworks Design System (DEW) CSS custom properties on `:root` / `.dew-light-theme`. The file is organized in numbered sections:
1. DEW variable overrides (the bulk of the work)
2. Shadow DOM injection styles (same rules scoped for shadow roots)
3. Element-level overrides for things DEW variables don't reach

**Color palette (3-tier elevation):**
| Name     | Hex       | Usage                          |
|----------|-----------|-------------------------------|
| Canvas   | `#111318` | Body/deepest background        |
| Chrome   | `#191d27` | Sidebar, navbar, filter panel  |
| Surface  | `#1e2230` | Table rows, content areas      |
| Elevated | `#272d3e` | Cards, conversations, hover    |
| Input    | `#252c3e` | Form fields                    |
| Text     | `#eceef2` / `#b0b6c4` | Primary / secondary |
| Links    | `#7cc4f0` | Icy blue                       |
| Border   | `#2a3040` / `#363d50` | Subtle / visible   |

### `content.js` — The runtime engine
Runs at `document_start`. Key responsibilities:
- **Shadow DOM injection**: Freshdesk uses custom elements (`ticket-notification`, `ticket-left-nav`, `ticket-top-nav`, `tickets-right-panel-filter`, `freshconnect-sidebar`) with shadow roots. The script intercepts `Element.prototype.attachShadow` and watches `SHADOW_TAGS` to inject `dark-mode.css` into each shadow root.
- **Inline style overrides**: `overrideInlineStyles()` scans `[style]` attributes using `LIGHT_BG_RE` (light background regex) and `PRIMARY_BG_RE` (CSS variable regex) to force dark values on dynamically injected inline styles.
- **MutationObserver**: Watches the entire DOM for new nodes and style attribute changes, triggering shadow injection and inline overrides as needed.
- **Fallback polling**: `setInterval` every 5 seconds re-runs `scanForShadowRoots()` and `overrideInlineStyles()` to catch anything the observer misses.
- **Toggle**: Reads `darkdesk_enabled` from `chrome.storage.local` (default `true`). Disabling hides the main stylesheet and removes injected shadow styles.

### `popup.html` + `popup.js` — The toggle UI
A 220px popup with a single on/off switch. Reads and writes `darkdesk_enabled` in `chrome.storage.local`. The content script listens to `chrome.storage.onChanged` and reacts immediately.

### `manifest.json`
Manifest V3. Permissions: `storage`, `activeTab`. The CSS is declared in `content_scripts` (injected automatically) and also listed in `web_accessible_resources` so `content.js` can fetch it via `chrome.runtime.getURL` for shadow root injection.

## Key design decisions

- `dark-mode.css` is loaded *twice*: once automatically by Chrome (for the main document) and once fetched by `content.js` and injected as `<style>` tags inside shadow roots. The `/* DarkDesk */` comment at the top of the CSS is used as a marker by `findMainSheet()` to locate the main stylesheet in `document.styleSheets`.
- Inline style overrides use regex rather than removing the `style` attribute, to avoid breaking Freshdesk's own JS that sets those styles.
- `attachShadow` is monkey-patched at `document_start` before Freshdesk's JS runs, so new shadow roots are captured immediately.
