// Apply dark mode immediately to prevent flash of light theme
document.documentElement.classList.add("kingwood-dark-mode");

// Then check storage — remove if user previously disabled
browser.storage.local.get("enabled").then((result) => {
  if (result.enabled === false) {
    document.documentElement.classList.remove("kingwood-dark-mode");
  }
});

// Listen for toggle messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle") {
    document.documentElement.classList.toggle("kingwood-dark-mode");
    const enabled = document.documentElement.classList.contains("kingwood-dark-mode");
    browser.storage.local.set({ enabled });
  }
});

// Swap gray reaction emojis to full-color versions
function swapGraySrc(img) {
  if (img.src && (img.src.includes("_white6.gif") || img.src.includes("_simple.gif"))) {
    img.src = img.src.replace("_white6.gif", ".gif").replace("_simple.gif", ".gif");
  }
}

function swapReactionImages(root) {
  const imgs = (root || document).querySelectorAll('img[src*="_white6"], img[src*="_simple"]');
  imgs.forEach(swapGraySrc);
}

// Watch for new nodes AND attribute changes (site JS swaps src on hover/unhover)
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

// Force dark backgrounds on elements with stubborn inline styles
function forceDarkInlineStyles() {
  // Member details popup
  const memberMenu = document.getElementById("member_details_menu");
  if (memberMenu) {
    memberMenu.style.setProperty("background-color", "#2a2a2a", "important");
    memberMenu.style.setProperty("border-color", "#555", "important");
    memberMenu.style.setProperty("color", "#d0d0d0", "important");
  }

  // Any element with inline white backgrounds
  document.querySelectorAll('[style*="background-color:#fff"], [style*="background-color: #fff"], [style*="background-color:#ffffff"], [style*="background-color: #ffffff"]').forEach((el) => {
    // Skip images and media
    if (el.tagName === "IMG" || el.tagName === "VIDEO" || el.tagName === "IFRAME") return;
    el.style.setProperty("background-color", "#2a2a2a", "important");
  });
}

// Run after DOM ready and also watch for dynamically shown elements
document.addEventListener("DOMContentLoaded", forceDarkInlineStyles);

// Re-run when elements become visible (popups, menus)
const styleObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === "style") {
      const el = mutation.target;
      if (el.id === "member_details_menu" || (el.style && el.style.backgroundColor && el.style.backgroundColor.includes("fff"))) {
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
