export function newId(): string {
  // Node 18+/modern browsers support crypto.randomUUID().
  return crypto.randomUUID();
}

