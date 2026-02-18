// Toggle dark mode when toolbar button is clicked
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "toggle" });
});
