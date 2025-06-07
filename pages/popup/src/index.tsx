import Popup from './Popup';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './Popup.css';

const rootElement = document.getElementById('app-container');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
