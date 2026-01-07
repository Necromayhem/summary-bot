export interface BufferMessage {
  chatId: string;
  userId: string | null;
  messageId: string;
  text: string;
  ts: number;
}

export interface MessageBufferPort {
  append(chatId: string, msg: BufferMessage): Promise<void>;
  getBatch(chatId: string, limit?: number): Promise<BufferMessage[]>;
  clear(chatId: string): Promise<void>;
}
