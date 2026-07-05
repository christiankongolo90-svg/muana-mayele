import { Pool } from 'pg';

interface SettingsRow {
  time_limit: number;
  is_open: boolean;
  schedule_enabled: boolean;
  schedule_days: number[] | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_timezone: string;
  updated_at: string;
}

export async function getSettings(pool: Pool): Promise<SettingsRow> {
  const { rows } = await pool.query('SELECT * FROM quiz_settings WHERE id = 1');
  if (rows.length === 0) {
    return {
      time_limit: 1200, is_open: true, schedule_enabled: false,
      schedule_days: null, schedule_start_time: null, schedule_end_time: null,
      schedule_timezone: 'Africa/Kinshasa', updated_at: new Date().toISOString(),
    };
  }
  const s = rows[0];
  return {
    ...s,
    time_limit: Number(s.time_limit),
    is_open: Boolean(s.is_open),
    schedule_enabled: Boolean(s.schedule_enabled),
    schedule_days: s.schedule_days || null,
  };
}

function nowInTz(tz: string): Date {
  // Get current time in the target timezone
  const str = new Date().toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

export async function getAccessStatus(pool: Pool) {
  const settings = await getSettings(pool);

  if (!settings.is_open) {
    return { is_open: false, reason: 'manual', schedule: null, settings };
  }

  if (!settings.schedule_enabled) {
    return { is_open: true, reason: 'manual', schedule: null, settings };
  }

  const now = nowInTz(settings.schedule_timezone);
  const currentDay = now.getDay(); // 0=Sun
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  const days = settings.schedule_days;
  const startTime = settings.schedule_start_time;
  const endTime = settings.schedule_end_time;

  if (!days?.length || !startTime || !endTime) {
    return { is_open: true, reason: 'schedule_incomplete', schedule: null, settings };
  }

  const isScheduledDay = days.includes(currentDay);
  const isInTimeWindow = currentTime >= startTime && currentTime <= endTime;
  const isOpen = isScheduledDay && isInTimeWindow;

  let nextSession: any = null;
  if (!isOpen) {
    nextSession = calculateNextSession(now, days, startTime, endTime);
  }

  return {
    is_open: isOpen,
    reason: 'schedule',
    schedule: {
      enabled: true, days, start_time: startTime, end_time: endTime,
      timezone: settings.schedule_timezone, next_session: nextSession,
    },
    settings,
  };
}

function calculateNextSession(now: Date, days: number[], startTime: string, endTime: string) {
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 8);

  // Today but before start
  if (days.includes(currentDay) && currentTime < startTime) {
    const next = new Date(now);
    const [h, m] = startTime.split(':').map(Number);
    next.setHours(h, m, 0, 0);
    return { date: fmt(next), start: startTime, end: endTime, datetime: next.toISOString(), day_of_week: currentDay };
  }

  const sorted = [...days].sort((a, b) => a - b);
  let nextDay = sorted.find(d => d > currentDay) ?? sorted[0];
  let daysUntil = nextDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const next = new Date(now);
  next.setDate(next.getDate() + daysUntil);
  const [h, m] = startTime.split(':').map(Number);
  next.setHours(h, m, 0, 0);

  return { date: fmt(next), start: startTime, end: endTime, datetime: next.toISOString(), day_of_week: next.getDay() };
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
