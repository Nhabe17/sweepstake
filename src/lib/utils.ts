import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix = 'p'): string {
  return `${prefix}-${uuidv4()}`;
}
