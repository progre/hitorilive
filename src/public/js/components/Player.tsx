import flvJS from 'flv.js';
import React, { CSSProperties } from 'react';
import styled from 'styled-components';

const ControllerWrapper = styled.div`
  opacity: 0;
  transition: opacity 150ms;

  &:hover {
    opacity: 1;
  }
`;

const centerCSS: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  position: 'absolute',
  top: 0,
  width: '100%',
};

export interface Props {
  styles: {
    container: CSSProperties;
  };

  onClickChat(): void;
}

export const initialState = {
  playing: false,
};

export default class Player extends React.Component<Props, typeof initialState> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
    this.onEmptied = this.onEmptied.bind(this);
    this.state = initialState;
  }

  componentDidMount() {
    const video = document.getElementById('video') as HTMLVideoElement;
    video.volume = 0.5;
    start(video).catch((e) => { console.error(e.message, e.stack || e); });
  }

  onLoadedMetadata() {
    this.setState({ ...this.state, playing: true });
  }

  onEmptied() {
    this.setState({ ...this.state, playing: false });
  }

  render() {
    return (
      <div style={{
        userSelect: 'none',
        position: 'relative',
        ...this.props.styles.container,
      }}>
        <video
          style={centerCSS}
          id="video"
          onLoadedMetadata={this.onLoadedMetadata}
          onEmptied={this.onEmptied}
        ></video>
        <div style={{
          ...centerCSS,
          color: '#333',
          display: this.state.playing ? 'none' : 'flex',
          fontFamily: 'sans-serif',
          fontSize: '64px',
          fontWeight: 'bold',
        }}>
          NO SIGNAL
        </div>
        <ControllerWrapper style={{
          color: 'white',
          fontSize: 40,
          height: '100%',
          position: 'absolute',
          width: '100%',
        }}>
          <span
            title="Open / Close chat view"
            onClick={this.props.onClickChat}
            style={{
              bottom: 0,
              cursor: 'pointer',
              margin: 20,
              position: 'absolute',
              right: 0,
            }}
          >
            📝
          </span>
        </ControllerWrapper>
      </div >
    );
  }
}

async function start(element: HTMLVideoElement) {
  for (; ;) {
    await startPlayer(element, location.host);
  }
}

/**
 * resolve when video is ended.
 */
async function startPlayer(element: HTMLVideoElement, host: string) {
  // 通信用のwebocket
  // メディア用のwebsocket or メディア用のWebRTC
  // websocketが切れた場合全て切ってやり直し
  return new Promise((resolve, reject) => {
    const webSocket = new WebSocket(`ws://${host}/join`);
    webSocket.onerror = (ev) => {
      webSocket.close();
      console.error(ev);
      reject(new Error('WebSocket error'));
    };
    webSocket.onmessage = (ev) => {
      // 色々やることあるぞ
      const { type, payload } = JSON.parse(ev.data);
      switch (type) {
        case 'upstream': {
          resolve(startPlayerFromWebSocket(element, payload.url));
          return;
        }
        default: {
          reject(new Error('not implemented'));
        }
      }
    };
  });
}

async function startPlayerFromWebSocket(element: HTMLVideoElement, url: string) {
  const flvPlayer = flvJS.createPlayer(
    {
      url,
      type: 'flv',
    },
    {
      isLive: true,
    },
  );
  flvPlayer.attachMediaElement(element);
  flvPlayer.load();
  await Promise.all([
    flvPlayer.play(),
    new Promise((resolve, reject) => {
      flvPlayer.on(flvJS.Events.LOADING_COMPLETE, resolve);
    }),
  ]);
  flvPlayer.destroy();
}
