import crypto from 'crypto';

export default function createHash(input) {
  return crypto.createHash('md5').update(JSON.stringify(input)).digest('hex');
}
