import { resolve } from 'node:path';
import { makeEntryPointPlugin } from '@extension/hmr';
import { getContentScriptEntries, withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';
import { build } from 'vite';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');
const matchesDir = resolve(srcDir, 'matches');

const configs = Object.entries(getContentScriptEntries(matchesDir)).map(([name, entry]) =>
  withPageConfig({
    mode: IS_DEV ? 'development' : undefined,
    resolve: {
      alias: {
        '@src': srcDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    plugins: [IS_DEV && makeEntryPointPlugin()],
    build: {
      lib: {
        name: name,
        formats: ['iife'],
        entry,
        fileName: name,
      },
      outDir: resolve(rootDir, '..', '..', 'dist', 'content'),
    },
  }),
);

const selectionListenerConfig = withPageConfig({
  mode: IS_DEV ? 'development' : undefined,
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  plugins: [IS_DEV && makeEntryPointPlugin()],
  build: {
    lib: {
      // It's important to set a name that matches your desired output filename.
      // Vite will output 'fileName.js' by default for 'iife' if fileName is a string.
      name: 'selectionListener', // Or whatever global variable you want it to expose (optional for iife)
      formats: ['iife'],
      entry: resolve(srcDir, 'selectionListener.ts'), // Explicitly point to the file
      fileName: 'selectionListener', // This will output 'selectionListener.js'
    },
  },
});

// Combine all configurations
const matchConfigs = [...configs, selectionListenerConfig];

const builds = configs.map(async config => {
  //@ts-expect-error This is hidden property into vite's resolveConfig()
  config.configFile = false;
  await build(config);
});

await Promise.all(builds);