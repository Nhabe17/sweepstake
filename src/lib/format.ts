// Date/time helpers. "Now" is the real clock — correct while the tournament is live.

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function dayTimeLabel(iso: string): string {
  return `${dayLabel(iso)} · ${timeLabel(iso)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  return isSameDay(new Date(iso), now);
}
