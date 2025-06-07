// pages/popup/src/Popup.tsx
import { useState, useEffect, useCallback } from 'react';
import type {
  ZappContent,
  ZappSuggestion,
  ZappRequestSuggestionsMessage,
  ZappSuggestionsResponseMessage,
  ZappIntentMessage,
} from '../../../shared/types';
import type React from 'react';

import './Popup.css'; // Import the new CSS

const Popup: React.FC = () => {
  const [capturedContent, setCapturedContent] = useState<ZappContent | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<ZappSuggestion[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  // --- Initial Content Fetch on Mount ---
  useEffect(() => {
    // Request the captured content from the background script
    const fetchContent = async () => {
      try {
        const response: ZappContent | null = await chrome.runtime.sendMessage({
          type: 'GET_CURRENT_ZAPP_CONTENT',
        });
        setCapturedContent(response || null);
      } catch (error) {
        console.error('Error fetching captured content:', error);
        setFeedbackMessage('Failed to load content.');
      }
    };
    fetchContent();
  }, []); // Run once on mount

  // --- Request Suggestions from Background (Debounced) ---
  const requestSuggestions = useCallback(async () => {
    if (!capturedContent) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response: ZappSuggestionsResponseMessage = await chrome.runtime.sendMessage({
        type: 'ZAPP_REQUEST_SUGGESTIONS',
        intentPhrase: userInput,
        content: capturedContent,
      } as ZappRequestSuggestionsMessage); // Cast to ensure correct type

      if (response && response.suggestions) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [userInput, capturedContent]);

  // Debounce effect for requestSuggestions
  useEffect(() => {
    const timeout = setTimeout(() => {
      requestSuggestions();
    }, 300); // 300ms debounce
    return () => clearTimeout(timeout);
  }, [userInput, capturedContent, requestSuggestions]);

  // --- Send Intent to Background ---
  const sendIntentToBackground = async (chosenSuggestion: ZappSuggestion) => {
    if (!capturedContent) {
      setFeedbackMessage('No content to Zapp!');
      setTimeout(() => setFeedbackMessage(''), 1800);
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ZAPP_INTENT',
        intentPhrase: userInput, // The phrase user typed
        content: capturedContent,
        chosenSuggestion: chosenSuggestion,
      } as ZappIntentMessage);

      if (response && response.status === 'success') {
        setFeedbackMessage('Poof! Done! 🚀');
        setUserInput(''); // Clear input after successful Zapp
        setSuggestions([]); // Clear suggestions
      } else {
        setFeedbackMessage(`Error: ${response?.message || 'Action failed!'}`);
      }
    } catch (error) {
      console.error('Error sending intent:', error);
      setFeedbackMessage('Network error or background script failed!');
    } finally {
      setTimeout(() => setFeedbackMessage(''), 2500); // Give user time to see feedback
    }
  };

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        // Automatically trigger the first suggestion on Enter if available
        sendIntentToBackground(suggestions[0]);
      } else if (userInput.trim()) {
        // If no suggestions, but user typed something, create a generic "other" suggestion
        // This is a fallback to allow the user to still "Zapp" something if no specific action matched.
        // The background script's `executeZappAction` should have a fallback for 'other'.
        const genericSuggestion: ZappSuggestion = {
          id: 'other_generic_zapp',
          label: `Zapp "${userInput}"`,
          actionType: 'other',
          payload: { userInput: userInput }, // Pass user input as payload
        };
        sendIntentToBackground(genericSuggestion);
      } else {
        setFeedbackMessage('Type something or select content to Zapp!');
        setTimeout(() => setFeedbackMessage(''), 1800);
      }
    }
  };

  const handleSuggestionClick = (s: ZappSuggestion) => {
    sendIntentToBackground(s);
  };

  // --- UI ---
  const displayedContent = capturedContent
    ? capturedContent.type === 'text'
      ? capturedContent.value
      : capturedContent.title || capturedContent.value
    : '';

  return (
    <div className="zapp-popup">
      <div className="zapp-header">
        <img src="/logo_vertical_dark.svg" alt="Zapp! Logo" className="zapp-logo" />
        <h1 className="zapp-title">Zapp!</h1>
      </div>

      <div className="zapp-section">
        <div className="zapp-label">Content to Zapp:</div>
        <div className="zapp-content-display">
          {displayedContent || <span className="text-placeholder">Select text, link, or image on a page</span>}
        </div>
      </div>

      <div className="zapp-section">
        <input
          type="text"
          placeholder="Where to? (e.g., notes, search, copy)"
          value={userInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="zapp-input"
        />
        {isLoadingSuggestions && <div className="loading-spinner"></div>}
      </div>

      <div className="zapp-suggestions-container">
        {suggestions.length === 0 && userInput.trim() === '' && !isLoadingSuggestions && (
          <p className="no-suggestions-message">Start typing for suggestions...</p>
        )}
        {suggestions.length === 0 && userInput.trim() !== '' && !isLoadingSuggestions && (
          <p className="no-suggestions-message">No specific actions found for "{userInput}".</p>
        )}
        {suggestions.map(s => (
          <button
            key={s.id} // Use unique ID for key
            onClick={() => handleSuggestionClick(s)}
            className="zapp-suggestion-button">
            {s.label}
          </button>
        ))}
      </div>

      {feedbackMessage && (
        <div className={`zapp-feedback ${feedbackMessage.includes('Error') ? 'error' : 'success'}`}>
          {feedbackMessage}
        </div>
      )}
    </div>
  );
};

export default Popup;
