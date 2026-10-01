import { STATUS_FIELDS } from '../config';

/** F=forward, B=back, L=left, R=right, S=stop. */
export type MoveDir = 'F' | 'B' | 'L' | 'R' | 'S';
export type DriveDir = Exclude<MoveDir, 'S'>;

/** Normalised, app-facing shape. Never the raw JSON. */
export type RobotStatus = {
  temperature: number;
  humidity: number;
  distance: number;
};

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : NaN;
}

/**
 * Maps the raw /status body onto RobotStatus using STATUS_FIELDS.
 * Returns null when the payload is not the expected shape, so a firmware
 * change shows up as "bad payload" instead of NaN rendered on screen.
 */
export function parseStatus(raw: unknown): RobotStatus | null {
  if (raw === null || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;

  const temperature = toNumber(body[STATUS_FIELDS.temperature]);
  const humidity = toNumber(body[STATUS_FIELDS.humidity]);
  const distance = toNumber(body[STATUS_FIELDS.distance]);

  if (Number.isNaN(temperature) || Number.isNaN(humidity) || Number.isNaN(distance)) return null;

  return { temperature, humidity, distance };
}
