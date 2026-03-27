const STYLE_ID = "darkdesk-shadow-styles";
const MARKER = "DarkDesk";
let darkCss = null;
let enabled = true;
let styleOverridePending = false;

const LIGHT_BG_RE =
  /background(?:-color)?:\s*(?:#F3FCF9|#fff(?:fff)?(?=[;\s"'])|white|rgb\(2(?:5[0-5]|4[3-9]|[34]\d)|linear-gradient[^)]*#fff|#(?:f[5-9a-f]|e[b-f])[0-9a-f]{4})/i;

const PRIMARY_BG_RE = /--primary-bg-color/;

function overrideInlineStyles() {
  const els = document.querySelectorAll("[style]");
  for (let i = 0; i < els.length; i++) {
    const s = els[i].getAttribute("style");
    if (!s) continue;

    if (LIGHT_BG_RE.test(s)) {
      els[i].style.setProperty("background", "#1e2230", "important");
      els[i].style.setProperty("background-image", "none", "important");
    }

    if (PRIMARY_BG_RE.test(s)) {
      els[i].style.setProperty("--primary-bg-color", "#191d27");
      els[i].style.setProperty("--nav-bg-color", "#191d27");
      els[i].style.setProperty("--icon-normal-color", "#98a0b8");
      els[i].style.setProperty("--icon-hover-color", "#e4e7ee");
      els[i].style.setProperty("--icon-active-border-color", "#363d50");
      els[i].style.setProperty("--icon-active-bg-color", "rgba(44,51,69,0.7)");
    }
  }

  const notifications = document.querySelectorAll(
    '.__ui-components__refresh-notification, .refresh-notification, [class*="refresh-notification"]'
  );
  for (let i = 0; i < notifications.length; i++) {
    const el = notifications[i];
    if (el.dataset.darkdesk) continue;
    el.dataset.darkdesk = "1";
    el.style.setProperty("background", "#232940", "important");
    el.style.setProperty("background-image", "none", "important");
    el.style.setProperty("border-color", "#363d50", "important");
    el.style.setProperty("color", "#eceef2", "important");
    el.style.setProperty("box-shadow", "0 2px 12px rgba(0,0,0,0.4)", "important");
  }
}

function scheduleStyleOverride() {
  if (styleOverridePending) return;
  styleOverridePending = true;
  requestAnimationFrame(() => {
    styleOverridePending = false;
    if (enabled) overrideInlineStyles();
  });
}

async function loadCss() {
  if (darkCss) return darkCss;
  const url = chrome.runtime.getURL("dark-mode.css");
  const resp = await fetch(url, { cache: "no-store" });
  darkCss = await resp.text();
  return darkCss;
}

function injectIntoShadow(shadowRoot) {
  if (!darkCss || shadowRoot.querySelector("#" + STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = darkCss;
  shadowRoot.prepend(style);
}

function removeFromShadow(shadowRoot) {
  const el = shadowRoot.querySelector("#" + STYLE_ID);
  if (el) el.remove();
}

function findMainSheet() {
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (rules && rules.length > 0 && rules[0].cssText &&
          rules[0].cssText.includes(MARKER)) {
        return sheet;
      }
    } catch (e) {}
  }
  return null;
}

const knownShadowRoots = new Set();
const SHADOW_TAGS = [
  "ticket-notification", "ticket-left-nav", "ticket-top-nav",
  "tickets-right-panel-filter", "freshconnect-sidebar"
];

function scanForShadowRoots() {
  for (const tag of SHADOW_TAGS) {
    const els = document.getElementsByTagName(tag);
    for (let i = 0; i < els.length; i++) {
      if (els[i].shadowRoot && !knownShadowRoots.has(els[i].shadowRoot)) {
        knownShadowRoots.add(els[i].shadowRoot);
        injectIntoShadow(els[i].shadowRoot);
      }
    }
  }
}

async function applyDarkMode() {
  await loadCss();
  const mainSheet = findMainSheet();
  if (mainSheet) mainSheet.disabled = false;
  scanForShadowRoots();
  overrideInlineStyles();
}

function disableDarkMode() {
  const mainSheet = findMainSheet();
  if (mainSheet) mainSheet.disabled = true;
  knownShadowRoots.forEach((sr) => removeFromShadow(sr));
}

function handleNewNodes(mutations) {
  if (!enabled || !darkCss) return;
  let hasNewShadow = false;
  let hasStyleChange = false;

  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === "style") {
      hasStyleChange = true;
      continue;
    }

    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;

      if (node.shadowRoot && !knownShadowRoots.has(node.shadowRoot)) {
        knownShadowRoots.add(node.shadowRoot);
        injectIntoShadow(node.shadowRoot);
        hasNewShadow = true;
      }

      if (node.hasAttribute?.("style")) hasStyleChange = true;

      if (SHADOW_TAGS.includes(node.tagName?.toLowerCase())) {
        hasNewShadow = true;
      }
    }
  }

  if (hasNewShadow) scanForShadowRoots();
  if (hasStyleChange) scheduleStyleOverride();
}

const originalAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
  const shadow = originalAttachShadow.call(this, init);
  if (enabled && darkCss) {
    knownShadowRoots.add(shadow);
    setTimeout(() => injectIntoShadow(shadow), 0);
  }
  return shadow;
};

const observer = new MutationObserver(handleNewNodes);

chrome.storage.local.get({ darkdesk_enabled: true }, async (data) => {
  enabled = data.darkdesk_enabled;
  if (enabled) {
    await applyDarkMode();
  } else {
    disableDarkMode();
  }
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.darkdesk_enabled) return;
  enabled = changes.darkdesk_enabled.newValue;
  if (enabled) {
    applyDarkMode();
  } else {
    disableDarkMode();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (enabled) applyDarkMode();
  });
} else {
  if (enabled) applyDarkMode();
}

window.addEventListener("load", () => {
  if (enabled) applyDarkMode();
});

setInterval(() => {
  if (!enabled) return;
  scanForShadowRoots();
  overrideInlineStyles();
}, 5000);
