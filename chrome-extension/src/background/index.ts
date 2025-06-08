// chrome-extension/src/background/index.ts

import { executeZappAction } from '../actions/actionExecutor';
import { getZappSuggestions } from '../ai/intentRecognizer';
import { saveUserPreference } from '../learning/preferenceStorage';
import type {
  ZappContent,
  ZappIntentMessage,
  ZappRequestSuggestionsMessage,
  ZappSuggestionsResponseMessage,
} from '../../../shared/types';

// --- Initialization: Create context menus and set up storage on install ---
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'zapp-selection',
    title: 'Zapp "%s"',
    contexts: ['selection'],
  });
  // Context menu for links
  chrome.contextMenus.create({
    id: 'zapp-link',
    title: 'Zapp Link',
    contexts: ['link'],
  });
  // Context menu for images
  chrome.contextMenus.create({
    id: 'zapp-image',
    title: 'Zapp Image',
    contexts: ['image'],
  });
  // Context menu for current page
  chrome.contextMenus.create({
    id: 'zapp-page',
    title: 'Zapp Current Page',
    contexts: ['page'],
  });

  // Initialize preferences in storage if they don't exist
  chrome.storage.local.get(['zapp_preferences'], result => {
    if (!result.zapp_preferences) {
      chrome.storage.local.set({ zapp_preferences: {} });
    }
  });
});

// --- Context Menu Click Listener ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let zappContent: ZappContent | null = null;

  if (info.selectionText && info.menuItemId === 'zapp-selection') {
    zappContent = {
      type: 'text',
      value: info.selectionText,
      // For selected text, info.pageUrl is directly available.
      pageUrl: info.pageUrl,
      title: tab?.title || '', // Add tab title for completeness
    };
  } else if (info.linkUrl && info.menuItemId === 'zapp-link') {
    zappContent = {
      type: 'link',
      value: info.linkUrl,
      title: info.linkText || info.linkUrl,
      pageUrl: info.pageUrl,
    };
  } else if (info.srcUrl && info.menuItemId === 'zapp-image') {
    zappContent = {
      type: 'image',
      value: info.srcUrl,
      pageUrl: info.pageUrl,
      title: tab?.title || '', // Add tab title for completeness
    };
  } else if (info.pageUrl && info.menuItemId === 'zapp-page') {
    zappContent = {
      type: 'page',
      value: info.pageUrl,
      title: tab?.title || '', // Ensure title is always present
      pageUrl: info.pageUrl,
    };
  }

  if (zappContent) {
    // Always store the most recent deliberate capture in currentZappContent
    await chrome.storage.session.set({ currentZappContent: zappContent });
    console.log('Zapp: Captured content stored in session:', zappContent);

    // Optionally, open the popup immediately after context menu selection
    // if you want this to be the primary way users interact.
    // chrome.action.openPopup(); // Note: Not universally supported across all browsers/versions
  } else {
    console.warn('Zapp: No relevant content captured from context menu click.');
  }
});

// --- Message Listener for communication with popup and content script ---
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'ZAPP_SELECTION') {
    // When content script sends selection, store it as generic text content.
    // This will overwrite any previous 'currentZappContent' if a selection is made
    // AFTER a context menu action, or if the popup is opened without a context menu.
    const selectedTextContent: ZappContent = {
      type: 'text',
      value: message.selection,
      pageUrl: sender.tab?.url || '',
      title: sender.tab?.title || '',
    };
    await chrome.storage.session.set({ currentZappContent: selectedTextContent });
    // No need to sendResponse for ZAPP_SELECTION unless the content script needs confirmation.
    return; // No sendResponse needed here, as it's an asynchronous set
  } else if (message.type === 'ZAPP_INTENT') {
    const zappIntentMessage = message as ZappIntentMessage;
    const { intentPhrase, content, chosenSuggestion } = zappIntentMessage;

    const result = await executeZappAction(chosenSuggestion, content);

    // After successful action, store user preference and clear current content
    if (result.success) {
      await saveUserPreference(intentPhrase, content, chosenSuggestion);
      // Crucially, clear the content after it has been "Zapped"
      await chrome.storage.session.remove('currentZappContent');
      sendResponse({ status: 'success' });
    } else {
      sendResponse({ status: 'error', message: result.error });
    }
    return true; // Indicate that sendResponse will be called asynchronously
  } else if (message.type === 'ZAPP_REQUEST_SUGGESTIONS') {
    const requestMessage = message as ZappRequestSuggestionsMessage;
    const { intentPhrase, content } = requestMessage;

    const suggestions = await getZappSuggestions(intentPhrase, content);

    const response: ZappSuggestionsResponseMessage = {
      type: 'ZAPP_SUGGESTIONS_RESPONSE',
      suggestions: suggestions,
    };
    sendResponse(response);
    return true;
  } else if (message.type === 'GET_CURRENT_ZAPP_CONTENT') {
    // Popup requests the current content (either from context menu or last selection)
    const result = await chrome.storage.session.get('currentZappContent');
    sendResponse(result.currentZappContent || null);
    // Do NOT remove 'currentZappContent' here. The popup needs it to display.
    // It should only be removed AFTER a Zapp action is successfully performed.
    return true;
  }
  // Removed 'GET_CURRENT_ZAPP_SELECTION' since we are consolidating.
});

console.log('Zapp background script loaded.');
