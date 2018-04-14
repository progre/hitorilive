import { observer } from 'mobx-react';
import React from 'react';
import Root from '../components/Root';
import Store from '../Store';

@observer
export default class App extends React.Component<{ store: Store }> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onPost = this.onPost.bind(this);
    this.onStop = this.onStop.bind(this);
  }

  private onPost(e: { message: string }) {
    this.props.store.postMessage(e.message);
  }

  private onStop() {
    // NOP
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
