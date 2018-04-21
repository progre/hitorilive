import { observer } from 'mobx-react';
import React from 'react';
import Root from '../components/Root';
import Store from '../Store';

@observer
export default class App extends React.Component<{ store: Store }> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onStop = this.onStop.bind(this);
  }

  private onStop() {
    // NOP
  }

  render() {
    return (
      <Root
        player={{
          flvPlayer: this.props.store.flvPlayer,
          onStop: this.onStop,
        }}
      />
    );
  }
}
