// chrome-extension/src/ai/intentRecognizer.ts
import { getLearnedPreference } from '../learning/preferenceStorage'; // Adjust path
import type { ZappContent, ZappSuggestion } from '../../../shared/types'; // Adjust path

// Helper to define common suggestions
const COMMON_SUGGESTIONS: ZappSuggestion[] = [
  { id: 'copy_text_only', label: 'Copy Text Only', actionType: 'copy', payload: { format: 'text' } },
  { id: 'search_google', label: 'Search Google', actionType: 'search', payload: {} },
  { id: 'open_google_keep', label: 'Google Keep (Notes)', actionType: 'open_app', payload: { app: 'google_keep' } },
  { id: 'open_notion', label: 'Notion (Doc)', actionType: 'open_app', payload: { app: 'notion' } },
  { id: 'launch_email', label: 'Email This', actionType: 'email', payload: {} },
  { id: 'launch_whatsapp', label: 'WhatsApp This', actionType: 'whatsapp', payload: {} },
];

// Generates initial rule-based suggestions
const getBaseSuggestions = (content: ZappContent): ZappSuggestion[] => {
  const suggestions: ZappSuggestion[] = [...COMMON_SUGGESTIONS]; // Start with common ones

  // Add context-specific suggestions
  if (content.type === 'link' || content.type === 'page') {
    suggestions.push({ id: 'bookmark_link', label: 'Bookmark This', actionType: 'bookmark', payload: {} });
    suggestions.push({
      id: 'copy_markdown_link',
      label: 'Copy Link as Markdown',
      actionType: 'copy',
      payload: { format: 'markdown' },
    });
  }
  if (content.type === 'text') {
    suggestions.push({
      id: 'copy_markdown_text',
      label: 'Copy Text as Markdown',
      actionType: 'copy',
      payload: { format: 'markdown' },
    });
  }
  if (content.type === 'image') {
    suggestions.push({
      id: 'copy_image_url',
      label: 'Copy Image URL',
      actionType: 'copy',
      payload: { format: 'text' },
    });
  }

  return suggestions;
};

// Filters and orders suggestions based on user input and learned preferences
export const getZappSuggestions = async (intentPhrase: string, content: ZappContent): Promise<ZappSuggestion[]> => {
  let baseSuggestions = getBaseSuggestions(content);
  const phraseLower = intentPhrase.toLowerCase().trim();

  // 1. Prioritize learned preference
  const learnedPref = await getLearnedPreference(phraseLower, content.type);
  if (learnedPref) {
    const preferredSuggestion = baseSuggestions.find(s => s.id === learnedPref.chosenSuggestionId);
    if (preferredSuggestion) {
      // Move preferred to the top
      baseSuggestions = [preferredSuggestion, ...baseSuggestions.filter(s => s.id !== learnedPref.chosenSuggestionId)];
    }
  }

  // 2. Filter by user input (simple keyword match for MVP)
  const filteredSuggestions = baseSuggestions.filter(suggestion => {
    if (!phraseLower) return true; // Show all if no input
    return (
      suggestion.label.toLowerCase().includes(phraseLower) ||
      suggestion.actionType.toLowerCase().includes(phraseLower) ||
      suggestion.id.toLowerCase().includes(phraseLower)
    );
  });

  // 3. Return top N suggestions (e.g., 5-7 for a popup)
  return filteredSuggestions.slice(0, 7); // Adjust limit as needed
};
