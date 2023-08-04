import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App';
import './scss/app.scss';

const rootElement = document.getElementById('root') as HTMLElement;
const root = createRoot(rootElement) ;
root.render(<App />);