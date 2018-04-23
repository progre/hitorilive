import React from 'react';

export interface Props {
  volumePercent: number;
}

export default class VolumeIndicator extends React.Component<Props> {
  private fadeoutTimer: any;
  private rootRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: Props, prevState: {}, snapshot: any) {
    if (prevProps.volumePercent === this.props.volumePercent) {
      return;
    }
    const elem = this.rootRef.current!;
    elem.style.transitionDuration = '0s';
    elem.style.opacity = '1';
    clearTimeout(this.fadeoutTimer);
    this.fadeoutTimer = setTimeout(
      () => {
        elem.style.transitionDuration = '300ms';
        elem.style.opacity = '0';
      },
      2000,
    );
  }

  render() {
    return (
      <div ref={this.rootRef} style={{
        color: 'white',
        fontFamily: 'sans-serif',
        margin: '1em',
        opacity: 0,
        position: 'absolute',
        left: 0,
        transition: 'opacity 0s 0s linear',
      }}>
        Volume {this.props.volumePercent} %
    </div>
    );
  }
}
