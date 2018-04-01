import React from 'react';
import Chat from './Chat';
import Player from './Player';

export interface Props {
  chat: {
    messages: ReadonlyArray<{
      id: string;
      index: number;
      message: string;
    }>;

    onPost(event: { message: string }): void;
  };
}

export const initialState = {
  chat: true,
};

export default class Root extends React.Component<Props, typeof initialState> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onClickChat = this.onClickChat.bind(this);

    this.state = initialState;
  }

  private onClickChat() {
    this.setState({
      ...this.state,
      chat: !this.state.chat,
    });
  }

  render() {
    return (
      <main style={{ display: 'flex', height: '100%' }}>
        <Player
          onClickChat={this.onClickChat}
          styles={{ container: { width: '100%' } }}
        />
        <div style={{
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 150ms',
          width: this.state.chat ? 300 : 0,
        }}>
          <Chat
            styles={{ container: { width: 300 } }}
            {...this.props.chat}
          />
        </div>
      </main>
    );
  }
}
