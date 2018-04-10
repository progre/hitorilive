// tslint:disable-next-line:no-implicit-dependencies
import { ipcRenderer } from 'electron';
import { configure } from 'mobx';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './containers/App';
import Store from './Store';

configure({ enforceActions: true });

const store = new Store(JSON.parse(location.hash.slice(1)), ipcRenderer);

ReactDOM.render(<App store={store} />, document.getElementById('app'));
