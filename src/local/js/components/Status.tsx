import { t } from 'i18next';
import {
  FormControl,
  FormGroup,
  FormLabel,
  TextField,
} from 'material-ui';
import React, { CSSProperties } from 'react';

export default function Status(props: {
  styles: { container: CSSProperties };
  bps: number;
  listeners: number;
}) {
  return (
    <FormControl component="fieldset" style={props.styles.container}>
      <FormLabel component="legend">Status</FormLabel>
      <FormGroup style={{ flexDirection: 'row' }}>
        <TextField
          label={t('bitrate')}
          value={
            props.bps === 0
              ? '---'
              : `${Math.floor(props.bps / 1000 / 1000 * 10) / 10} Mbps`
          }
          inputProps={{
            readOnly: true,
          }}
          style={{ marginTop: 15 }}
        />
        <TextField
          label={t('listeners')}
          value={props.listeners}
          inputProps={{
            readOnly: true,
          }}
          style={{ marginTop: 15, marginLeft: 15 }}
        />
      </FormGroup>
    </FormControl>
  );
}
