import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import * as connections from './services/connections';

import App from './components/App';
import './scss/app.scss';

import { initializeIcons } from '@fluentui/react/lib/Icons';

initializeIcons(/* optional base url */);

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
    <FluentProvider theme={teamsLightTheme}>
        <App />
    </FluentProvider>
);