import React from 'react';
import Chat from './Chat';
import Player from './Player';

export default function Root(props: {
  chat: {
    messages: ReadonlyArray<{
      id: string;
      index: number;
      message: string;
    }>;

    onPost(event: { message: string }): void;
  };
}) {
  return (
    <main style={{ display: 'flex', height: '100%' }}>
      <Player styles={{ container: { width: '100%' } }} />
      <Chat
        styles={{ container: { flexShrink: 0, width: 300 } }}
        {...props.chat}
      />
    </main>
  );
}
