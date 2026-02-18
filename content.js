// Dark Mode for Kingwood.com — Content Script
//
// This script runs on kingwood.com pages to:
// 1. Apply/toggle the dark mode CSS class
// 2. Swap gray reaction emoji GIFs to full-color versions
// 3. Override stubborn inline styles that CSS alone cannot reach
//
// WHY MUTATIONOBSERVERS ARE NEEDED:
// Kingwood.com is a custom-built forum that heavily uses:
//   - Dynamic AJAX loading (new thread rows, posts, reactions)
//   - Inline style attributes set by site JS (popups, menus, backgrounds)
//   - Image src swapping on hover/unhover for reaction emojis
// Pure CSS with !important handles ~95% of the dark mode, but inline styles
// set by JavaScript require MutationObservers to detect and override.

// ============================================
// DARK MODE TOGGLE
// ============================================

// Apply dark mode immediately to prevent flash of light theme
document.documentElement.classList.add("kingwood-dark-mode");

// Then check storage — remove if user previously disabled
browser.storage.local.get("enabled").then((result) => {
  if (result.enabled === false) {
    document.documentElement.classList.remove("kingwood-dark-mode");
  }
});

// Listen for toggle messages from the background script (toolbar button)
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle") {
    document.documentElement.classList.toggle("kingwood-dark-mode");
    const enabled = document.documentElement.classList.contains("kingwood-dark-mode");
    browser.storage.local.set({ enabled });
  }
});

// ============================================
// REACTION EMOJI SWAP
// ============================================
// The site uses gray/white emoji GIFs (*_white6.gif, *_simple.gif) as the
// default state and swaps to full-color GIFs on hover. In dark mode the gray
// versions are nearly invisible, so we force full-color versions at all times.

function swapGraySrc(img) {
  if (img.src && (img.src.includes("_white6.gif") || img.src.includes("_simple.gif"))) {
    img.src = img.src.replace("_white6.gif", ".gif").replace("_simple.gif", ".gif");
  }
}

function swapReactionImages(root) {
  const imgs = (root || document).querySelectorAll('img[src*="_white6"], img[src*="_simple"]');
  imgs.forEach(swapGraySrc);
}

// MutationObserver #1: Watch for dynamically added reaction images AND for
// the site's own JS changing img.src back to gray on mouseout. The
// attributeFilter limits observation to only "src" changes on <img> elements,
// minimizing performance impact.
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === "src") {
      swapGraySrc(mutation.target);
    }
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) {
        swapGraySrc(node);
        swapReactionImages(node);
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"],
});

// Also run once after page load for any already-rendered reactions
document.addEventListener("DOMContentLoaded", () => swapReactionImages());

// ============================================
// INLINE STYLE OVERRIDES
// ============================================
// Many elements on kingwood.com have background colors set via inline style
// attributes (e.g. style="background-color:#fff") which cannot be overridden
// by CSS class selectors even with !important. This function targets those
// specific inline styles and replaces them with dark mode colors.

function forceDarkInlineStyles() {
  // Member details popup (appears on username hover, has inline bg:#fff)
  const memberMenu = document.getElementById("member_details_menu");
  if (memberMenu) {
    memberMenu.style.setProperty("background-color", "#2a2a2a", "important");
    memberMenu.style.setProperty("border-color", "#555", "important");
    memberMenu.style.setProperty("color", "#d0d0d0", "important");
  }

  // Body background (site sets green bg + image via inline <style> tag)
  const body = document.getElementById("mybody") || document.body;
  if (body) {
    body.style.setProperty("background-color", "#1b3316", "important");
    body.style.setProperty("background-image", "none", "important");
  }

  // News page: gray flower tile background (inline background shorthand)
  document.querySelectorAll('[style*="grayflowersbg"]').forEach((el) => {
    el.style.setProperty("background", "#1a1a1a none", "important");
  });

  // News page / sidebar: inline #f1f1f1 backgrounds
  document.querySelectorAll('[style*="background: #f1f1f1"], [style*="background:#f1f1f1"], [style*="background-color:#f1f1f1"], [style*="background-color: #f1f1f1"]').forEach((el) => {
    if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "IFRAME") return;
    el.style.setProperty("background", "#1a1a1a none", "important");
  });

  // Catch-all: any element with a light inline background (RGB > 200 per channel)
  document.querySelectorAll('[style*="background-color"]').forEach((el) => {
    if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "IFRAME") return;
    const bg = el.style.backgroundColor;
    if (!bg) return;
    const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      if (r > 200 && g > 200 && b > 200) {
        el.style.setProperty("background-color", "#2a2a2a", "important");
      }
    }
  });
}

// Run after DOM ready
document.addEventListener("DOMContentLoaded", forceDarkInlineStyles);

// MutationObserver #2: Re-run inline style overrides when the site's JS
// dynamically shows elements (popups, menus, AJAX content) by modifying
// their style attribute. The attributeFilter limits observation to only
// "style" changes, minimizing performance impact.
const styleObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === "style") {
      const el = mutation.target;
      if (el.id === "member_details_menu" || el.style.backgroundColor) {
        forceDarkInlineStyles();
      }
    }
  }
});

styleObserver.observe(document.documentElement, {
  subtree: true,
  attributes: true,
  attributeFilter: ["style"],
});
