// chrome-extension/src/background/index.ts

import { executeZappAction } from '../actions/actionExecutor';
import { getZappSuggestions } from '../ai/intentRecognizer';
import { saveUserPreference } from '../learning/preferenceStorage';
import type {
  ZappContent,
  ZappIntentMessage,
  ZappRequestSuggestionsMessage,
  ZappSuggestionsResponseMessage,
} from '../../../shared/types'; // Adjust path

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
    title: 'Zapp Image', // Simplified title
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
      chrome.storage.local.set({ zapp_preferences: {} }); // Store learning preferences under 'zapp_preferences'
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
      pageUrl: info.pageUrl,
    };
  } else if (info.linkUrl && info.menuItemId === 'zapp-link') {
    zappContent = {
      type: 'link',
      value: info.linkUrl,
      title: info.linkText || info.linkUrl, // Use linkText if available
      pageUrl: info.pageUrl,
    };
  } else if (info.srcUrl && info.menuItemId === 'zapp-image') {
    zappContent = {
      type: 'image',
      value: info.srcUrl,
      pageUrl: info.pageUrl,
    };
  } else if (info.pageUrl && info.menuItemId === 'zapp-page') {
    zappContent = {
      type: 'page',
      value: info.pageUrl,
      title: tab?.title, // Get tab title for page content
      pageUrl: info.pageUrl,
    };
  }

  if (zappContent) {
    // Store captured content in session storage for the popup to retrieve
    await chrome.storage.session.set({ currentZappContent: zappContent });
    console.log('Zapp: Captured content stored in session:', zappContent);

    try {
      await chrome.action.openPopup();
      console.log('Zapp: Popup opened successfully.');
    } catch (e) {
      console.error('Zapp: Failed to open popup:', e);
      // Fallback: If popup cannot be opened (e.g., not allowed in this context),
      // consider sending a notification or logging.
    }
  } else {
    console.warn('Zapp: No relevant content captured from context menu click.');
  }
});

// --- Message Listener for communication with popup ---
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'ZAPP_INTENT') {
    const zappIntentMessage = message as ZappIntentMessage;
    const { intentPhrase, content, chosenSuggestion } = zappIntentMessage;

    const result = await executeZappAction(chosenSuggestion, content);

    // After successful action, store user preference
    if (result.success) {
      await saveUserPreference(intentPhrase, content, chosenSuggestion);
      sendResponse({ status: 'success' });
    } else {
      sendResponse({ status: 'error', message: result.error });
    }
    return true; // Indicates async response
  } else if (message.type === 'ZAPP_REQUEST_SUGGESTIONS') {
    const requestMessage = message as ZappRequestSuggestionsMessage;
    const { intentPhrase, content } = requestMessage;

    // Get suggestions based on user input and learned preferences
    const suggestions = await getZappSuggestions(intentPhrase, content);

    const response: ZappSuggestionsResponseMessage = {
      type: 'ZAPP_SUGGESTIONS_RESPONSE',
      suggestions: suggestions,
    };
    sendResponse(response);
    return true; // Indicates async response
  } else if (message.type === 'GET_CURRENT_ZAPP_CONTENT') {
    // Popup requests the content stored from context menu click
    const result = await chrome.storage.session.get('currentZappContent');
    sendResponse(result.currentZappContent || null);
    await chrome.storage.session.remove('currentZappContent'); // Clear it after sending
    return true;
  }
});

console.log('Zapp background script loaded.');
