import {
  FormControl,
  FormGroup,
  FormLabel,
  Snackbar,
} from 'material-ui';
import { observer } from 'mobx-react';
import React, { ChangeEvent } from 'react';
import HTTPSettings from '../components/HTTPSettings';
import P2PSettings from '../components/P2PSettings';
import RTMPSettings from '../components/RTMPSettings';
import Status from '../components/Status';
import Store from '../Store';
import { verticalFlexStyle } from '../styles';

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
        ...verticalFlexStyle,
        boxSizing: 'border-box',
        cursor: 'default',
        height: '100%',
        padding: 8,
        userSelect: 'none',
      }}>
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
        <Status {...this.props.store} styles={{ container: {} }} />
        <FormControl component="fieldset" style={{ marginTop: 30 }}>
          <FormLabel component="legend">Settings</FormLabel>
          <FormGroup>
            <RTMPSettings
              store={this.props.store}
              onRTMPChange={this.onChangeRTMP}
            />
            <HTTPSettings
              store={this.props.store}
              onHTTPChange={this.onChangeHTTP}
              onUpnpCheck={this.onCheckUpnp}
            />
            <P2PSettings
              styles={{
                container: {
                  marginTop: 15,
                },
              }}
              enableP2PStreamRelay={this.props.store.settings.enableP2PStreamRelay}
              directlyConnectionLimit={this.props.store.settings.directlyConnectionLimit}
              onEnableP2PStreamRelayChange={this.onEnableP2PStreamRelayChange}
              onDirectlyConnectionLimitChange={this.onDirectlyConnectionLimitChange}
            />
          </FormGroup>
        </FormControl>
      </div >
    );
  }
}
