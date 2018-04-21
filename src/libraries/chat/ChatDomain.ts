import { Subject } from 'rxjs';
import { Message } from './types';

export default class ChatServer {
  messages: ReadonlyArray<Message> = [];

  onMessage = new Subject<Message>();

  addMessage(message: { id: string; message: string }) {
    const newMessage = {
      ...message,
      message: message.message.replace(/\r/g, ''),
      index: (
        this.messages.length === 0
          ? 0
          : this.messages[this.messages.length - 1].index + 1
      ),
    };
    this.messages = [...this.messages, newMessage].slice(-1000); // limit 1000
    this.onMessage.next(newMessage);
  }
}
