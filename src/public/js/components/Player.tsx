import flvJS from 'flv.js';
import React, { CSSProperties, WheelEvent } from 'react';
import styled from 'styled-components';
import VolumeIndicator from './VolumeIndicator';

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

  flvPlayer?: ReturnType<typeof flvJS.createPlayer>;

  onStop(): void;
}

export const initialState = {
  playing: false,
  volumePercent: 50,
};

export default class Player extends React.Component<Props, typeof initialState> {
  private videoRef = React.createRef<HTMLVideoElement>();

  constructor(props: any, context?: any) {
    super(props, context);
    this.onLoadedMetadata = this.onLoadedMetadata.bind(this);
    this.onEmptied = this.onEmptied.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.state = initialState;
  }

  componentDidUpdate(prevProps: Props, prevState: typeof initialState, snapshot: any) {
    const video = this.videoRef.current!;
    video.volume = this.state.volumePercent / 100;
    if (prevProps.flvPlayer !== this.props.flvPlayer && this.props.flvPlayer != null) {
      play(video, this.props.flvPlayer)
        .catch((e) => { console.error(e.message, e.stack || e); });
    }
  }

  private onLoadedMetadata() {
    this.setState({ ...this.state, playing: true });
  }

  private onEmptied() {
    this.setState({ ...this.state, playing: false });
    this.props.onStop();
  }

  private onWheel(ev: WheelEvent<HTMLDivElement>) {
    const volumePercent = addVolumeByWheel(
      Math.floor(this.videoRef.current!.volume * 100),
      navigator.platform,
      ev.deltaY,
    );
    this.setState({ ...this.state, volumePercent });
  }

  render() {
    return (
      <div
        onWheel={this.onWheel}
        style={{
          userSelect: 'none',
          position: 'relative',
          ...this.props.styles.container,
        }}
      >
        <VolumeIndicator volumePercent={this.state.volumePercent} />
        <video
          ref={this.videoRef}
          style={centerCSS}
          autoPlay={true}
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
        </ControllerWrapper>
      </div >
    );
  }
}

async function play(element: HTMLVideoElement, flvPlayer: ReturnType<typeof flvJS.createPlayer>) {
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

function addVolumeByWheel(currentVolumePercent: number, platform: string, deltaY: number) {
  // Windowsのデフォルトでは+-100 OSXだと+-1~
  let deltaPercent: number;
  const isWin = platform.indexOf('Win') >= 0;
  if (isWin) {
    deltaPercent = deltaY > 0 ? -5 : 5;
  } else {
    deltaPercent = deltaY / 10;
  }
  let volumePercent = currentVolumePercent + deltaPercent;
  if (volumePercent < 0) {
    volumePercent = 0;
  } else if (100 < volumePercent) {
    volumePercent = 100;
  }
  return volumePercent;
}
