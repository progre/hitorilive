import React, { CSSProperties } from 'react';

export interface Props {
  styles: {
    container: CSSProperties;
  };
  messages: ReadonlyArray<{
    id: string;
    index: number;
    message: string;
  }>;

  onPost(event: { message: string }): void;
}

export default class Chat extends React.Component<Props> {
  private previousScrollHeight = 0;

  constructor(props: any, context?: any) {
    super(props, context);
    this.onSubmit = this.onSubmit.bind(this);
  }

  private onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const messageInput = this.refs.message as HTMLInputElement;
    const message = messageInput.value;
    messageInput.value = '';
    this.props.onPost({ message });
  }

  componentDidUpdate() {
    const scroll = this.refs.scroll as HTMLDivElement;
    const scrollGap = scroll.scrollHeight - this.previousScrollHeight;
    scrollToBottomIfTight(scroll, scrollGap);
    this.previousScrollHeight = scroll.scrollHeight;
  }

  render() {
    return (
      <article style={{
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        margin: 20,
        marginRight: 0,
        ...this.props.styles.container,
      }}>
        <section ref="scroll" style={{
          height: '100%',
          overflowY: 'scroll',
          paddingRight: 20,
        }}>
          {this.props.messages.map(x => (
            <div style={{ display: 'flex', marginBottom: '0.5em' }} key={x.id}>
              <div style={{
                marginRight: '0.5em',
                lineHeight: '1em',
              }}>
                {x.index + 1}:
              </div>
              <div className="message" style={{
                overflowWrap: 'break-word',
                lineHeight: '1em',
              }}>{x.message}</div>
            </div>
          ))}
        </section>
        <form onSubmit={this.onSubmit} style={{
          flexShrink: 0,
          marginRight: 20,
          textAlign: 'right',
        }}>
          <input type="text" ref="message" style={{
            boxSizing: 'border-box',
            height: '2em',
            marginBottom: 5,
            width: '100%',
          }} />
          <input type="submit" value="Post" style={{
            height: '2em',
            padding: '0 20px',
          }} />
        </form>
      </article>
    );
  }
}

function scrollToBottomIfTight(scroll: HTMLElement, scrollGap: number) {
  const bottomGap = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
  if (bottomGap < scrollGap * 2) {
    scroll.scrollTop = scroll.scrollHeight;
  }
}
