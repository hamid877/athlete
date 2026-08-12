/**
 * Utility functions for timezone-aware date handling.
 */

export function getUserTimezone(req: Request): string {
  const tz = req.headers.get("x-timezone");
  return tz || "UTC";
}

/**
 * Returns a JS Date object whose UTC values (getUTCDay, getUTCFullYear, etc.)
 * correspond exactly to the user's local wall-clock time.
 * This allows using UTC methods to safely perform calendar arithmetic
 * without the server's timezone interfering.
 */
export function getLocalCalendarDate(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  const isoString = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}Z`;
  
  return new Date(isoString);
}
