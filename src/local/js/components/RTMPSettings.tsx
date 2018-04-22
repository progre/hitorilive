import { t } from 'i18next';
import { TextField } from 'material-ui';
import React, { ChangeEvent } from 'react';
import Store from '../Store';
import { grayBlock, verticalFlexStyle } from '../styles';
import Copy from './Copy';

export default function RTMPSettings(props: {
  store: Store;
  onRTMPChange(e: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <div style={{ ...verticalFlexStyle, marginTop: 15 }}>
      <TextField
        label={t('rtmp-port')}
        type="number"
        inputProps={{ min: 0, max: 65535 }}
        value={props.store.settings.rtmpPort}
        onChange={props.onRTMPChange}
      />
      <div style={{
        ...verticalFlexStyle,
        ...grayBlock,
        marginTop: 15,
      }}>
        <TextField
          label={t('set-to-obs')}
          value={`rtmp://localhost:${props.store.settings.rtmpPort}/live`}
          helperText={t('replace-localhost-with-your-ip')}
          disabled={true}
          inputProps={{ readOnly: true }}
          InputLabelProps={{ style: { width: '133%' } }}
          InputProps={{
            endAdornment: (
              <Copy text={`rtmp://localhost:${props.store.settings.rtmpPort}/live`} />
            ),
          }}
        />
      </div>
    </div>
  );
}
