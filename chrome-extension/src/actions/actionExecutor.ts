// chrome-extension/src/actions/actionExecutor.ts
import type { CopyPayload, OpenAppPayload, ZappContent, ZappSuggestion } from '../../../shared/types';

const handleCopyAction = async (content: ZappContent, format?: string) => {
  let textToCopy = content.value;

  if (format === 'markdown') {
    if (content.type === 'link') {
      textToCopy = `[${content.title || content.value}](${content.value})`;
    } else if (content.type === 'text' && content.pageUrl) {
      // Basic markdown for selected text with source link
      textToCopy = `"${content.value}" ([Source](${content.pageUrl}))`;
    } else if (content.type === 'page' && content.title) {
      textToCopy = `[${content.title}](${content.value})`;
    }
  }

  if (textToCopy) {
    await navigator.clipboard.writeText(textToCopy);
    console.log('Copied to clipboard:', textToCopy);
  } else {
    throw new Error('No content to copy.');
  }
};

const handleSearchAction = async (query: string) => {
  const result = await chrome.storage.local.get('defaultSearchEngine');
  const searchEngine = result.defaultSearchEngine || 'google';

  let url = '';
  if (searchEngine === 'duckduckgo') {
    url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  } else {
    // default to google
    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
  await chrome.tabs.create({ url });
};

const handleBookmarkAction = async (url: string, title: string) => {
  await chrome.bookmarks.create({ url, title });
  console.log('Bookmarked:', title, url);
};

const handleWebAppLaunch = async (appName: string, content: ZappContent) => {
  let url = '';
  if (appName === 'google_keep') {
    url = `https://keep.google.com/#p:new/text=${encodeURIComponent(content.value + (content.title ? ' - ' + content.title : '') + (content.pageUrl ? ' (' + content.pageUrl + ')' : ''))}`;
  } else if (appName === 'notion') {
    // Notion has a web clipper or API. For MVP, we'll just open a new page/search for it.
    url = `https://www.notion.so/new?title=${encodeURIComponent(content.title || '')}&content=${encodeURIComponent(content.value + (content.pageUrl ? ' - ' + content.pageUrl : ''))}`; // Simplified
  } else {
    console.warn('Unsupported web app for launch:', appName);
    throw new Error(`Unsupported web app: ${appName}`);
  }
  await chrome.tabs.create({ url });
};

const handleCommunicationLaunch = async (platform: 'email' | 'whatsapp', content: ZappContent) => {
  if (platform === 'email') {
    const subject = content.title ? `Zapp! - ${content.title}` : 'Zapp! Content';
    const body = content.value + (content.type === 'link' ? '' : `\n\nSource: ${content.pageUrl || content.value}`);
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await chrome.tabs.create({ url: mailto });
  } else if (platform === 'whatsapp') {
    const message = content.value + (content.type === 'link' ? '' : `\n\nSource: ${content.pageUrl || content.value}`);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    await chrome.tabs.create({ url: waUrl });
  } else {
    console.warn('Unsupported communication platform:', platform);
    throw new Error(`Unsupported platform: ${platform}`);
  }
};

export const executeZappAction = async (suggestion: ZappSuggestion, content: ZappContent) => {
  console.log('Executing Zapp Action:', suggestion.actionType, suggestion.payload, content);

  try {
    switch (suggestion.actionType) {
      case 'copy':
        await handleCopyAction(content, (suggestion.payload as CopyPayload)?.format);
        break;
      case 'search':
        await handleSearchAction(content.value);
        break;
      case 'bookmark':
        await handleBookmarkAction(content.value, content.title || content.value);
        break;
      case 'open_app':
        await handleWebAppLaunch((suggestion.payload as OpenAppPayload).app, content);
        break;
      case 'email':
        await handleCommunicationLaunch('email', content);
        break;
      case 'whatsapp':
        await handleCommunicationLaunch('whatsapp', content);
        break;
      case 'other':
        console.log("Executing custom 'other' action with payload:", suggestion.payload);
        // You might want to add a default action here, e.g., a search if payload has a query:
        // if (typeof suggestion.payload === 'object' && suggestion.payload && 'userInput' in suggestion.payload) {
        //   await handleSearchAction((suggestion.payload as OtherPayload).userInput || content.value);
        // } else {
        //   await handleSearchAction(content.value); // Fallback to content search
        // }
        break;
      default:
        // This is the exhaustiveness check.
        // If 'suggestion.actionType' is truly 'any' here, it indicates a problem
        // with how types are being inferred upstream or in the project configuration.
        throw new Error(`Unknown Zapp action type`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error executing Zapp action:', error);
    return { success: false, error: (error as Error).message };
  }
};
