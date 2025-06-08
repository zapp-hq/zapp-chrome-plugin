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
// The listener itself is NOT async. It returns a Promise for async responses.
chrome.runtime.onMessage.addListener((message, sender) => {
  // Handle ZAPP_SELECTION synchronously (no response expected by popup)
  if (message.type === 'ZAPP_SELECTION') {
    (async () => {
      // Use an IIFE here to allow await without making the listener async
      const selectedTextContent: ZappContent = {
        type: 'text',
        value: message.selection,
        pageUrl: sender.tab?.url || '',
        title: sender.tab?.title || '',
      };
      await chrome.storage.session.set({ currentZappContent: selectedTextContent });
      // No sendResponse or return true needed here as the sender doesn't await a response.
    })();
    return false; // Indicate that sendResponse will NOT be called (or return nothing)
  }

  // For message types that require an async response, return a Promise
  if (message.type === 'ZAPP_INTENT') {
    return (async () => {
      // Return an immediately invoked async function
      const zappIntentMessage = message as ZappIntentMessage;
      const { intentPhrase, content, chosenSuggestion } = zappIntentMessage;

      const result = await executeZappAction(chosenSuggestion, content);

      if (result.success) {
        await saveUserPreference(intentPhrase, content, chosenSuggestion);
        await chrome.storage.session.remove('currentZappContent');
        return { status: 'success' }; // This value resolves the sendMessage promise
      } else {
        return { status: 'error', message: result.error }; // This value resolves the sendMessage promise
      }
    })();
  } else if (message.type === 'ZAPP_REQUEST_SUGGESTIONS') {
    return (async () => {
      // Return an immediately invoked async function
      const requestMessage = message as ZappRequestSuggestionsMessage;
      const { intentPhrase, content } = requestMessage;

      const suggestions = await getZappSuggestions(intentPhrase, content);

      const response: ZappSuggestionsResponseMessage = {
        type: 'ZAPP_SUGGESTIONS_RESPONSE',
        suggestions: suggestions,
      };
      return response; // This value resolves the sendMessage promise
    })();
  } else if (message.type === 'GET_CURRENT_ZAPP_CONTENT') {
    return (async () => {
      // Return an immediately invoked async function
      try {
        const result = await chrome.storage.session.get('currentZappContent');
        const contentToSend = result.currentZappContent || null;
        console.log('Background: About to send currentZappContent (via Promise):', contentToSend);
        return contentToSend; // This value resolves the sendMessage promise
      } catch (error) {
        console.error('Background: Error fetching or sending ZappContent:', error);
        return null; // Resolve the promise with null on error
      }
    })();
  }

  // For any other messages that don't need an explicit async response,
  // or if no conditions are met, the listener implicitly returns undefined (or false),
  // meaning sendResponse will not be called asynchronously for those.
  return false; // Explicitly indicate no async response unless a specific type handles it above.
});

console.log('Zapp background script loaded.');
