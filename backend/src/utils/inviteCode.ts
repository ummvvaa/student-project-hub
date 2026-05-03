import { randomBytes } from 'crypto';

// 32 chars: no ambiguous symbols (0/O, 1/I/L)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// 256 / 32 === 8 exactly → no modulo bias
export function generateInviteCode(): string {
  return Array.from(randomBytes(8), (b) => CHARS[b % CHARS.length]).join('');
}
