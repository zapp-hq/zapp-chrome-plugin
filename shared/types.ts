// shared/types.ts

export interface ZappContent {
  type: 'text' | 'link' | 'image' | 'page'; // Type of content selected/current page
  value: string; // The selected text, URL, image src, or page URL itself
  title?: string; // For links/pages, if available
  pageUrl?: string; // The URL of the page where the content was selected
}

// --- Define specific payload interfaces ---
export interface CopyPayload {
  format?: 'text' | 'markdown';
}

export type SearchPayload = Record<string, never>;

export interface OpenAppPayload {
  app: 'google_keep' | 'notion'; // Specify known app identifiers
}

// No specific payload for Bookmark, Email, WhatsApp if content carries all info.
// If 'other' needs a specific structure, define OtherPayload.
export interface OtherPayload {
  userInput?: string; // Example: if 'other' implies a generic action based on user input
}

// --- Redefine ZappSuggestion using discriminated unions ---
export type ZappSuggestion =
  | {
      id: string;
      label: string;
      actionType: 'copy';
      payload?: CopyPayload;
    }
  | {
      id: string;
      label: string;
      actionType: 'search';
      payload?: SearchPayload;
    }
  | {
      id: string;
      label: string;
      actionType: 'bookmark';
      payload?: undefined; // Or {} if a placeholder empty object is always present
    }
  | {
      id: string;
      label: string;
      actionType: 'open_app';
      payload: OpenAppPayload; // payload is required for open_app
    }
  | {
      id: string;
      label: string;
      actionType: 'email';
      payload?: undefined;
    }
  | {
      id: string;
      label: string;
      actionType: 'whatsapp';
      payload?: undefined;
    }
  | {
      id: string;
      label: string;
      actionType: 'other';
      payload?: OtherPayload;
    };

// Message from Popup to Background to trigger an action
export interface ZappIntentMessage {
  type: 'ZAPP_INTENT';
  intentPhrase: string; // The user's typed input, e.g., "notes", "copy"
  content: ZappContent; // The original captured content
  chosenSuggestion: ZappSuggestion; // The specific suggestion chosen by the user
}

// Message from Background to Popup to provide content when popup opens
export interface ZappContentToPopupMessage {
  type: 'ZAPP_CONTENT_TO_POPUP'; // This type is currently not used but is still defined.
  content: ZappContent;
}

// Message from Popup to Background to request suggestions
export interface ZappRequestSuggestionsMessage {
  type: 'ZAPP_REQUEST_SUGGESTIONS';
  intentPhrase: string; // Current text in the popup input
  content: ZappContent; // Original captured content
}

// Message from Background to Popup with suggestions
export interface ZappSuggestionsResponseMessage {
  type: 'ZAPP_SUGGESTIONS_RESPONSE';
  suggestions: ZappSuggestion[];
}
