import { configure } from 'mobx';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './containers/App';
import Store from './Store';

configure({ enforceActions: true });

// if before it, will display loading indicator on Firefox
window.addEventListener('load', async () => {
  const store = new Store();
  ReactDOM.render(<App store={store} />, document.getElementById('app'));
});
