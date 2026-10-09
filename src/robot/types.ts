import { MAX_SPEED, MIN_SPEED, OBSTACLE_WARNING_CM, STATUS_FIELDS } from '../config';

/** Pad directions. The wire itself has no directions — only the x/y axes below. */
export type DriveDir = 'F' | 'B' | 'L' | 'R';

/** One /drive command: x = turn (right positive), y = forward (up positive). */
export type DriveVector = { x: number; y: number };

/** Pad direction → which way the command points, before the speed is applied. */
const DRIVE_VECTORS: Record<DriveDir, DriveVector> = {
  F: { x: 0, y: 1 },
  B: { x: 0, y: -1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};

/**
 * The speed slider is a magnitude, so the pressed direction turns it into the
 * signed x/y pair the rover expects. Held on a button, this is what goes out.
 */
export function driveVector(dir: DriveDir, speed: number): DriveVector {
  const magnitude = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(speed)));
  const axis = DRIVE_VECTORS[dir];
  return { x: axis.x * magnitude, y: axis.y * magnitude };
}

/**
 * Normalised, app-facing shape of GET /status. Never the raw JSON. The rover
 * reports one forward proximity sensor plus a blocked flag and two side
 * readings; temperature and humidity exist in mock mode only, so they are null
 * for anything that came off the wire.
 */
export type RobotStatus = {
  /** Forward distance in cm; -1 when nothing is detected. */
  distance: number;
  blocked: boolean;
  /** Raw side-sensor reading. */
  left: number;
  right: number;
  /** Mock-only sensor; null on the wire. */
  temperature: number | null;
  humidity: number | null;
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

  const distance = toNumber(body[STATUS_FIELDS.distance]);
  const left = toNumber(body[STATUS_FIELDS.left]);
  const right = toNumber(body[STATUS_FIELDS.right]);
  const blocked = body[STATUS_FIELDS.blocked];

  if (Number.isNaN(distance) || Number.isNaN(left) || Number.isNaN(right)) return null;
  if (typeof blocked !== 'boolean') return null;

  return { distance, blocked, left, right, temperature: null, humidity: null };
}

/**
 * The obstacle warning reads both signals the rover sends: `blocked` is the
 * decision, and a distance inside OBSTACLE_WARNING_CM raises it too, so a
 * firmware that only reports the range still lights the warning. A distance of
 * -1 carries no range, so it cannot trigger on distance alone.
 */
export function isObstacleNear(status: RobotStatus | null): boolean {
  if (status === null) return false;
  return status.blocked || (status.distance >= 0 && status.distance <= OBSTACLE_WARNING_CM);
}
