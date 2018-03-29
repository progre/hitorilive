import { configure } from 'mobx';
import React from 'react';
import ReactDOM from 'react-dom';
import Player from './Player';

configure({ enforceActions: true });

class App extends React.Component {
  constructor(props: any, context?: any) {
    super(props, context);
  }

  render() {
    return (
      <>
        <Player />
      </>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
