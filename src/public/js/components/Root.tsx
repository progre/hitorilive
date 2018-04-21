import flvJS from 'flv.js';
import React from 'react';
import Player from './Player';

export interface Props {
  player: {
    flvPlayer?: ReturnType<typeof flvJS.createPlayer>;
    onStop(): void;
  };
}

export const initialState = {
};

export default class Root extends React.Component<Props, typeof initialState> {
  constructor(props: any, context?: any) {
    super(props, context);

    this.state = initialState;
  }

  render() {
    return (
      <main style={{ display: 'flex', height: '100%' }}>
        <Player
          {...this.props.player}
          styles={{ container: { width: '100%' } }}
        />
      </main>
    );
  }
}
