// tslint:disable-next-line:no-implicit-dependencies
import { clipboard } from 'electron';
import { Button } from 'material-ui';
import React from 'react';

export default class Copy extends React.Component<{ text: string }> {
  constructor(props: any, context?: any) {
    super(props, context);
    this.onClick = this.onClick.bind(this);
  }

  private onClick() {
    clipboard.writeText(this.props.text);
  }

  render() {
    return <Button onClick={this.onClick}>📋 Copy</Button>;
  }
}
