import { randomBytes } from 'crypto';

export function generateUID(): string {
  const part1 = randomBytes(2).toString('hex').toUpperCase();
  const part2 = randomBytes(2).toString('hex').toUpperCase();
  return `EVP-${part1}-${part2}`;
}
