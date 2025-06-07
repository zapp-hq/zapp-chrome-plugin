// chrome-extension/src/learning/preferenceStorage.ts
import type { ZappContent, ZappSuggestion } from '../../../shared/types';

interface UserPreference {
  chosenSuggestionId: string;
  timestamp: number;
  count?: number;
}

// Generates a unique key for storing preferences based on intent and content type
const getPreferenceKey = (intentPhrase: string, contentType: ZappContent['type']): string =>
  `zapp_pref_${intentPhrase.toLowerCase().replace(/\s/g, '_')}_${contentType}`;

export const saveUserPreference = async (
  intentPhrase: string,
  content: ZappContent,
  chosenSuggestion: ZappSuggestion,
) => {
  const key = getPreferenceKey(intentPhrase, content.type);
  const preference: UserPreference = {
    chosenSuggestionId: chosenSuggestion.id,
    timestamp: Date.now(),
  };
  try {
    // Retrieve existing preferences to potentially update count if needed
    const result = await chrome.storage.local.get(key);
    const existingPref = result[key] as UserPreference | undefined;
    if (existingPref) {
      preference.count = (existingPref.count || 0) + 1;
    } else {
      preference.count = 1;
    }
    await chrome.storage.local.set({ [key]: preference });
    console.log('Zapp: Saved preference:', key, preference);
  } catch (error) {
    console.error('Zapp: Error saving preference:', error);
  }
};

export const getLearnedPreference = async (
  intentPhrase: string,
  contentType: ZappContent['type'],
): Promise<UserPreference | null> => {
  const key = getPreferenceKey(intentPhrase, contentType);
  try {
    const result = await chrome.storage.local.get(key);
    const pref = result[key] as UserPreference | undefined;
    return pref ?? null;
  } catch (error) {
    console.error('Zapp: Error getting preference:', error);
    return null;
  }
};

export const clearAllZappPreferences = async () => {
  try {
    const allItems = await chrome.storage.local.get(null);
    // allItems: any, so type keys as string[]
    const zappKeys = Object.keys(allItems).filter((key: string) => key.startsWith('zapp_pref_'));
    await chrome.storage.local.remove(zappKeys);
    console.log('Zapp: All Zapp preferences cleared.');
  } catch (error) {
    console.error('Zapp: Error clearing preferences:', error);
  }
};
