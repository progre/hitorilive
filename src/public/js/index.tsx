import flvJS from 'flv.js';
import { configure } from 'mobx';
import React from 'react';
import ReactDOM from 'react-dom';
import { sync as uid } from 'uid-safe';
import { Message } from '../../commons/types';
import Root from './components/Root';
import API from './infrastructures/API';
import SignalingClient from './infrastructures/SignalingClient';

configure({ enforceActions: true });

interface State {
  chat: {
    messages: ReadonlyArray<Message>;
  };
  flvPlayer?: ReturnType<typeof flvJS.createPlayer>;
}

class App extends React.Component<{}, State> {
  private api = new API();
  private signalingClient?: SignalingClient;

  constructor(props: any, context?: any) {
    super(props, context);
    this.onPost = this.onPost.bind(this);
    this.state = { chat: { messages: [] } };

    // if before it, will display loading indicator on Firefox
    window.addEventListener('load', async () => {
      this.api.getMessagesStream().subscribe(
        (x) => { this.addMessages(x); },
        handleError,
      );
      this.signalingClient = await SignalingClient.create(location.host);
      this.setState({
        ...this.state,
        flvPlayer: this.signalingClient.flvPlayer,
      });
    });
  }

  private onPost(e: { message: string }) {
    this.api.postMessage({ id: uid(16), message: e.message }).catch(handleError);
  }

  render() {
    return (
      <Root
        chat={{
          messages: this.state.chat.messages,
          onPost: this.onPost,
        }}
        player={{
          flvPlayer: this.state.flvPlayer,
          onStop: async () => {
            this.setState({
              ...this.state,
              flvPlayer: undefined,
            });
            this.signalingClient = await SignalingClient.create(location.host);
            this.setState({
              ...this.state,
              flvPlayer: this.signalingClient.flvPlayer,
            });
          },
        }}
      />
    );
  }

  private addMessages(messages: ReadonlyArray<Message>) {
    const currentMessages = this.state.chat.messages;
    const newMessages = [
      ...currentMessages,
      ...messages.filter(x => currentMessages.every(y => y.id !== x.id)),
    ].slice(-1000); // limit 1000
    this.setState({
      ...this.state,
      chat: {
        ...this.state.chat,
        messages: newMessages,
      },
    });
  }
}

function handleError(e: Error) {
  console.error(`${e.message || e.toString()} ${e.stack || e}`);
}

ReactDOM.render(<App />, document.getElementById('app'));
