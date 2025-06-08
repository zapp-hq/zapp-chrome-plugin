// Listen for selection changes and send the latest selection to the background
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection()?.toString() || '';
  if (selection) {
    chrome.runtime.sendMessage({ type: 'ZAPP_SELECTION', selection });
  }
});
