export const DIGEST_QUEUE = 'digest_queue';
export const DIGEST_JOB = 'digest_job';

export type DigestMode = '12h' | '24h' | 'last10k';

export interface DigestJobPayload {
  chatId: string;
  mode: DigestMode;
  requestedByUserId: string; // telegram user id
}
