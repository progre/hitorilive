import { t } from 'i18next';
import {
  Checkbox,
  FormControlLabel,
  TextField,
} from 'material-ui';
import React, { ChangeEvent } from 'react';
import Store from '../Store';
import { grayBlock, verticalFlexStyle } from '../styles';

export default function HTTPSettings(props: {
  store: Store;
  onHTTPChange(e: ChangeEvent<HTMLInputElement>): void;
  onUpnpCheck(e: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <div style={{ ...verticalFlexStyle, marginTop: 30 }}>
      <TextField
        label={t('http-port')}
        type="number"
        inputProps={{ min: 0, max: 65535 }}
        value={props.store.settings.httpPort}
        onChange={props.onHTTPChange}
      />
      <FormControlLabel
        control={
          <Checkbox
            color="primary"
            checked={props.store.settings.useUpnp}
            onChange={props.onUpnpCheck}
          />
        }
        label={t('use-upnp-port-mapping')}
      />
      <div style={{
        ...verticalFlexStyle,
        ...grayBlock,
      }}>
        <TextField
          label={t('public-url')}
          value={`http://[${t('your-ip')}]:${props.store.settings.httpPort}/`}
          inputProps={{ readOnly: true }}
          disabled={true}
          InputLabelProps={{ style: { width: '133%' } }}
        />
      </div>
    </div>
  );
}
