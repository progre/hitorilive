import { t } from 'i18next';
import {
  FormControl,
  FormGroup,
  FormLabel,
  TextField,
} from 'material-ui';
import React, { CSSProperties } from 'react';
import Store from '../Store';

export default function Status(props: {
  styles: { container: CSSProperties };
  store: Store;
}) {
  return (
    <FormControl component="fieldset" style={props.styles.container}>
      <FormLabel component="legend">Status</FormLabel>
      <FormGroup>
        <TextField
          label={t('listeners')}
          value={props.store.listeners}
          inputProps={{
            readOnly: true,
          }}
          style={{ marginTop: 15 }}
        />
      </FormGroup>
    </FormControl>
  );
}
