import { t } from 'i18next';
import { Checkbox, FormControlLabel, TextField } from 'material-ui';
import React, { ChangeEvent, CSSProperties } from 'react';

export default function P2PSettings(props: {
  styles: {
    container: CSSProperties;
  };
  enableP2PStreamRelay: boolean;
  directlyConnectionLimit: number;

  onEnableP2PStreamRelayChange(e: ChangeEvent<HTMLInputElement>): void;
  onDirectlyConnectionLimitChange(e: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <div style={props.styles.container}>
      <FormControlLabel
        control={
          <Checkbox
            color="primary"
            checked={props.enableP2PStreamRelay}
            onChange={props.onEnableP2PStreamRelayChange}
          />
        }
        label={t('enable-p2p-stream-relay')}
      />
      <br />
      <TextField
        label={t('directs')}
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
