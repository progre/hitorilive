import { Checkbox, FormControlLabel, Snackbar, TextField } from 'material-ui';
import { observer } from 'mobx-react';
import React, { ChangeEvent } from 'react';
import Store from '../Store';

@observer
export default class App extends React.Component<{ store: Store }> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onEnableP2PStreamRelayChange = this.onEnableP2PStreamRelayChange.bind(this);
    this.onDirectlyConnectionLimitChange = this.onDirectlyConnectionLimitChange.bind(this);
    this.onChangeRTMP = this.onChangeRTMP.bind(this);
    this.onChangeHTTP = this.onChangeHTTP.bind(this);
    this.onCloseError = this.onCloseError.bind(this);
    this.onCheckUpnp = this.onCheckUpnp.bind(this);
  }

  private onEnableP2PStreamRelayChange(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setEnableP2PStreamRelay(e.target.checked);
  }

  private onDirectlyConnectionLimitChange(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setDirectlyConnectionLimit(e.target.valueAsNumber);
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

  render() {
    return (
      <div style={{
        boxSizing: 'border-box',
        display: 'flex',
        height: '100%',
        padding: 8,
      }}>
        <div>
          <P2PSettings
            enableP2PStreamRelay={this.props.store.settings.enableP2PStreamRelay}
            directlyConnectionLimit={this.props.store.settings.directlyConnectionLimit}
            onEnableP2PStreamRelayChange={this.onEnableP2PStreamRelayChange}
            onDirectlyConnectionLimitChange={this.onDirectlyConnectionLimitChange}
          />
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
              value={this.props.store.settings.rtmpPort}
              onChange={this.onChangeRTMP}
            />
            <TextField
              label="HTTP Port"
              type="number"
              inputProps={{ min: 0, max: 65535 }}
              value={this.props.store.settings.httpPort}
              onChange={this.onChangeHTTP}
            />
          </div>
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={this.props.store.settings.useUpnp}
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
      </div>
    );
  }
}

function P2PSettings(props: {
  enableP2PStreamRelay: boolean;
  directlyConnectionLimit: number;

  onEnableP2PStreamRelayChange(e: ChangeEvent<HTMLInputElement>): void;
  onDirectlyConnectionLimitChange(e: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <div>
      <FormControlLabel
        control={
          <Checkbox
            color="primary"
            checked={props.enableP2PStreamRelay}
            onChange={props.onEnableP2PStreamRelayChange}
          />
        }
        label="(Expermental) Enable P2P stream relay"
      />
      <TextField
        label="Directs"
        disabled={!props.enableP2PStreamRelay}
        value={
          !props.enableP2PStreamRelay
            ? '∞'
            : props.directlyConnectionLimit
        }
        onChange={props.onDirectlyConnectionLimitChange}
        type={
          !props.enableP2PStreamRelay
            ? 'string'
            : 'number'
        }
        inputProps={{
          min: 1,
        }}
        InputLabelProps={{
          shrink: true,
        }}
        style={{
          marginLeft: '2em',
        }}
      />
    </div>
  );
}
