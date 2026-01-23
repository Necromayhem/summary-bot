export interface BufferMessage {
  chatId: string;
  userId: string | null;
  messageId: string;
  text: string;
  ts: number;
}

// сообщение из буфера + внутренний id строки в БД
export interface BufferedMessage extends BufferMessage {
  bufferId: number;
}

export interface MessageBufferPort {
  append(chatId: string, msg: BufferMessage): Promise<void>;
  getBatch(chatId: string, limit?: number): Promise<BufferedMessage[]>;
  getForPeriod(params: {
    chatId: string;
    fromTsMs: number;
    toTsMs: number;
    maxChars: number;
  }): Promise<BufferedMessage[]>;
  // ✅ NEW
  getLastByChars(params: {
    chatId: string;
    maxChars: number; // например 10_000
    maxRows?: number; // страховка, например 2000
  }): Promise<BufferedMessage[]>;
  clear(chatId: string): Promise<void>;
  clearUpTo(chatId: string, maxBufferId: number): Promise<void>;
  count(chatId: string): Promise<number>;
}
