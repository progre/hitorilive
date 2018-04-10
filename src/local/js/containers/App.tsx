import { Checkbox, FormControlLabel, Snackbar, TextField } from 'material-ui';
import { observer } from 'mobx-react';
import React, { ChangeEvent } from 'react';
import Chat from '../../../commons/components/Chat';
import Store from '../Store';

@observer
export default class App extends React.Component<{ store: Store }> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onChangeRTMP = this.onChangeRTMP.bind(this);
    this.onChangeHTTP = this.onChangeHTTP.bind(this);
    this.onCloseError = this.onCloseError.bind(this);
    this.onCheckUpnp = this.onCheckUpnp.bind(this);
    this.onPost = this.onPost.bind(this);
  }

  private onChangeRTMP(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setRTMPPort(e.target.valueAsNumber);
  }

  private onChangeHTTP(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setHTTPPort(e.target.valueAsNumber);
  }

  private onCloseError(_: any, reason: string) {
    this.props.store.clearError();
  }

  private onCheckUpnp(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setUseUpnpPortMapping(e.target.checked);
  }

  private onPost(ev: { message: string }) {
    this.props.store.postMessage(ev.message);
  }

  render() {
    return (
      <div style={{
        boxSizing: 'border-box',
        display: 'flex',
        height: '100%',
        padding: 8,
      }}>
        <div>
          <div>
            <Snackbar
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              open={this.props.store.latestError != null}
              onClose={this.onCloseError}
              autoHideDuration={6000}
              message={<span>{this.props.store.latestError}</span>}
            />
            <TextField
              label="RTMP Port"
              type="number"
              inputProps={{ min: 0, max: 65535 }}
              value={this.props.store.rtmpPort}
              onChange={this.onChangeRTMP}
            />
            <TextField
              label="HTTP Port"
              type="number"
              inputProps={{ min: 0, max: 65535 }}
              value={this.props.store.httpPort}
              onChange={this.onChangeHTTP}
            />
          </div>
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={this.props.store.useUpnp}
                  onChange={this.onCheckUpnp}
                />
              }
              label="Use UPnP port mapping"
            />
          </div>
          <div>
            <TextField
              label="Listeners"
              value={this.props.store.listeners}
              inputProps={{ readOnly: true }}
            />
          </div>
        </div>
        <Chat
          messages={this.props.store.chat.messages}
          onPost={this.onPost}
          styles={{
            container: {
              backgroundColor: 'black',
              height: '100%',
              width: 300,
            },
          }}
        />
      </div>
    );
  }
}
