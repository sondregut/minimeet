/**
 * Parse a time string (e.g., "10.52" or "1:45.67") to milliseconds
 */
export function parseTimeToMs(timeStr: string): number | null {
  if (!timeStr || timeStr.trim() === '') return null;

  const cleaned = timeStr.trim();

  // Format: MM:SS.ss or M:SS.ss
  if (cleaned.includes(':')) {
    const [minutes, seconds] = cleaned.split(':');
    const mins = parseInt(minutes, 10);
    const secs = parseFloat(seconds);
    if (isNaN(mins) || isNaN(secs)) return null;
    return Math.round((mins * 60 + secs) * 1000);
  }

  // Format: SS.ss
  const secs = parseFloat(cleaned);
  if (isNaN(secs)) return null;
  return Math.round(secs * 1000);
}

/**
 * Format milliseconds to display string (e.g., 10520 -> "10.52" or 105670 -> "1:45.67")
 */
export function formatMsToTime(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }

  return totalSeconds.toFixed(2);
}
