import type { Player } from '@/lib/types';

const TS = '2026-01-01T00:00:00.000Z';

// 8 players, each owns 6 teams. The first player is the admin.
export const SEED_PLAYERS: Player[] = [
  { id: 'p-yiannis', name: 'Yiannis', displayCode: 'Y', email: 'yiannist89@gmail.com', isAdmin: true, createdAt: TS, updatedAt: TS },
  { id: 'p-aiza', name: 'Aiza', displayCode: 'A', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-dad', name: 'Dad', displayCode: 'D', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-mum', name: 'Mum', displayCode: 'M', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-sarah', name: 'Sarah', displayCode: 'S', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-alex', name: 'Alex', displayCode: 'Al', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-tom', name: 'Tom', displayCode: 'T', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
  { id: 'p-nan', name: 'Nan', displayCode: 'N', email: null, isAdmin: false, createdAt: TS, updatedAt: TS },
];
