// tslint:disable-next-line:no-implicit-dependencies
import { ipcRenderer } from 'electron';
import { Checkbox, FormControlLabel, Snackbar, TextField } from 'material-ui';
import { configure } from 'mobx';
import { observer } from 'mobx-react';
import React, { ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import Store from './Store';

configure({ enforceActions: true });

const store = new Store(JSON.parse(location.hash.slice(1)), ipcRenderer);

@observer
class App extends React.Component<{ store: Store }> {
  constructor(props: any, context?: any) {
    super(props, context);

    this.onChangeRTMP = this.onChangeRTMP.bind(this);
    this.onChangeHTTP = this.onChangeHTTP.bind(this);
    this.onCloseError = this.onCloseError.bind(this);
    this.onCheckUpnp = this.onCheckUpnp.bind(this);
  }

  onChangeRTMP(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setRTMPPort(e.target.valueAsNumber);
  }

  onChangeHTTP(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setHTTPPort(e.target.valueAsNumber);
  }

  onCloseError(_: any, reason: string) {
    this.props.store.clearError();
  }

  onCheckUpnp(e: ChangeEvent<HTMLInputElement>) {
    this.props.store.setUseUpnpPortMapping(e.target.checked);
  }

  render() {
    return (
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
    );
  }
}

ReactDOM.render(<App store={store} />, document.getElementById('app'));
