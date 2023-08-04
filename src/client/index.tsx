import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';

import App from './App';
import './scss/app.scss';

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
    <FluentProvider theme={teamsLightTheme}>
        <App />
    </FluentProvider>
);

