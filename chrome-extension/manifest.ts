// chrome-extension/manifest.ts
import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__', // Localizable name
  description: '__MSG_extensionDescription__', // Localizable description
  version: packageJson.version,
  icons: {
    '128': 'icon-128.png',
    '34': 'icon-34.png',
  },
  browser_specific_settings: {
    gecko: {
      id: 'zapp@yourdomain.com', // Replace with unique ID for AMO[1][4]
      strict_min_version: '109.0',
    },
  },
  permissions: [
    'contextMenus',
    'activeTab',
    'scripting',
    'storage',
    'clipboardWrite',
    'tabs',
    'bookmarks',
    'unlimitedStorage',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: {
      '34': 'icon-34.png',
      '128': 'icon-128.png',
    },
    default_title: 'Zapp!',
  },
  options_ui: {
    page: 'options/index.html',
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content/all.iife.js'],
      css: ['content.css'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+Z',
      },
      description: 'Open Zapp popup',
    },
  },
} satisfies ManifestType;

export default manifest;
