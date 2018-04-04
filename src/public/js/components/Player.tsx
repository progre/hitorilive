const flvJS = require('flv.js').default;
import React, { CSSProperties } from 'react';
import styled from 'styled-components';

export interface Props {
  styles: {
    container: CSSProperties;
  };

  onClickChat(): void;
}

const ControllerWrapper = styled.div`
  opacity: 0;
  transition: opacity 150ms;

  &:hover {
    opacity: 1;
  }
`;

export default class Player extends React.Component<Props> {
  componentDidMount() {
    start().catch((e) => { console.error(e.stack || e); });
  }

  render() {
    const centerCSS: CSSProperties = {
      alignItems: 'center',
      display: 'flex',
      height: '100%',
      justifyContent: 'center',
      position: 'absolute',
      top: 0,
      width: '100%',
    };
    return (
      <div style={{
        userSelect: 'none',
        position: 'relative',
        ...this.props.styles.container,
      }}>
        <video style={centerCSS} id="video" className="center"></video>
        <div
          style={{
            ...centerCSS,
            color: '#333',
            fontFamily: 'sans-serif',
            fontSize: '64px',
            fontWeight: 'bold',
          }}
          id="no-signal"
          className="center"
        >
          NO SIGNAL
        </div>
        <ControllerWrapper
          className="center"
          style={{
            color: 'white',
            fontSize: 40,
            height: '100%',
            position: 'absolute',
            width: '100%',
          }}
        >
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
            🖹
          </span>
        </ControllerWrapper>
      </div >
    );
  }
}

class VideoWrapper {
  constructor(
    window: Window,
    video: HTMLVideoElement,
    private noSignalBlock: HTMLDivElement,
  ) {
    this.onPlay = this.onPlay.bind(this);
    this.onStop = this.onStop.bind(this);

    video.volume = 0.5;
    video.addEventListener('loadedmetadata', this.onPlay);
    video.addEventListener('emptied', this.onStop);
  }

  private onPlay() {
    this.noSignalBlock.style.display = 'none';
  }

  private onStop() {
    this.noSignalBlock.style.display = 'flex';
  }
}

async function start() {
  const video = document.getElementById('video') as HTMLVideoElement;
  // tslint:disable-next-line:no-unused-expression
  new VideoWrapper(
    window,
    document.getElementById('video') as HTMLVideoElement,
    document.getElementById('no-signal') as HTMLDivElement,
  );
  for (; ;) {
    await startPlayer(video, location.host);
  }
}

async function startPlayer(element: HTMLVideoElement, host: string) {
  const flvPlayer = flvJS.createPlayer({
    isLive: true,
    type: 'flv',
    url: `ws://${host}/live/.flv`,
  });
  flvPlayer.attachMediaElement(element);
  flvPlayer.load();
  await new Promise((resolve, reject) => {
    flvPlayer.play();
    flvPlayer.on(flvJS.Events.LOADING_COMPLETE, resolve);
  });
  flvPlayer.destroy();
}
