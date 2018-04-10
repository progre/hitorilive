import { observer } from 'mobx-react';
import React from 'react';
import Root from '../components/Root';
import Store from '../Store';

export interface Prop {
  store: Store;
}

@observer
export default class App extends React.Component<Prop> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onPost = this.onPost.bind(this);
    this.onStop = this.onStop.bind(this);
  }

  private onPost(e: { message: string }) {
    this.props.store.postMessage(e.message);
  }

  private onStop() {
    this.props.store.cleanUpPlayer();
  }

  render() {
    return (
      <Root
        chat={{
          messages: this.props.store.chat.messages,
          onPost: this.onPost,
        }}
        player={{
          flvPlayer: this.props.store.flvPlayer,
          onStop: this.onStop,
        }}
      />
    );
  }
}
