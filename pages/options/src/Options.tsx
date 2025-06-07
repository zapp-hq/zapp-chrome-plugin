// pages/options/src/Options.tsx
import { clearAllZappPreferences } from '../../../chrome-extension/src/learning/preferenceStorage';
import { useState, useEffect } from 'react';
import type React from 'react';

const SEARCH_ENGINES = [
  { label: 'Google', value: 'google' },
  { label: 'DuckDuckGo', value: 'duckduckgo' },
];

const Options: React.FC = () => {
  const [searchEngine, setSearchEngine] = useState<string>('google');
  const [resetMessage, setResetMessage] = useState<string>('');

  // Load saved search engine on mount
  useEffect(() => {
    chrome.storage.local.get(['defaultSearchEngine'], result => {
      if (result.defaultSearchEngine) {
        setSearchEngine(result.defaultSearchEngine);
      }
    });
  }, []);

  // Save search engine when changed
  const handleSearchEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSearchEngine(value);
    chrome.storage.local.set({ defaultSearchEngine: value });
  };

  // Reset preferences using the new centralized function
  const handleResetPreferences = async () => {
    // Make it async
    await clearAllZappPreferences(); // Use the centralized function
    setResetMessage('Preferences reset!');
    setTimeout(() => setResetMessage(''), 1500);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 400 }}>
      <h2>Zapp! Options</h2>

      <div style={{ marginBottom: 20 }}>
        <label>
          Default Search Engine:{' '}
          <select value={searchEngine} onChange={handleSearchEngineChange}>
            {SEARCH_ENGINES.map(se => (
              <option key={se.value} value={se.value}>
                {se.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handleResetPreferences} style={{ padding: '6px 12px', borderRadius: 4 }}>
          Reset Learned Preferences
        </button>
        {resetMessage && <span style={{ marginLeft: 10, color: 'green' }}>{resetMessage}</span>}
      </div>

      <div style={{ marginTop: 32, fontSize: 15 }}>
        <h4>About Zapp!</h4>
        <p>
          Zapp is your **AI-native universal intent OS** for the browser. Instantly Zapp any content to your favorite
          destination with one click.
        </p>
        <p style={{ color: '#888', fontSize: 13 }}>MVP build &copy; 2025</p>
      </div>
    </div>
  );
};

export default Options;
