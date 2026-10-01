/**
 * Every address, tunable and wire-format detail lives here. Nothing else in the
 * app hardcodes a URL, a field name or a timing constant — change it here.
 */

/* ─────────────────────────────── devices ─────────────────────────────── */

/** Robot control board (drive + telemetry). */
export const ROBOT_IP = '192.168.4.1';
export const ROBOT_PORT = 80;

/** Camera module serving the MJPEG stream. */
export const CAMERA_IP = '192.168.4.2';
export const CAMERA_PORT = 81;
export const CAMERA_STREAM_PATH = '/stream';

/** Port 80 is implied by the scheme, and that is the form the firmware documents. */
const httpOrigin = (ip: string, port: number) => (port === 80 ? `http://${ip}` : `http://${ip}:${port}`);

export const API_BASE = httpOrigin(ROBOT_IP, ROBOT_PORT);
export const MOVE_URL = `${API_BASE}/move`;
export const STATUS_URL = `${API_BASE}/status`;
export const CAMERA_STREAM_URL = `${httpOrigin(CAMERA_IP, CAMERA_PORT)}${CAMERA_STREAM_PATH}`;
/** Origin the stream document is served from, so its <img> is not cross-origin. */
export const CAMERA_ORIGIN = `${httpOrigin(CAMERA_IP, CAMERA_PORT)}/`;

/* ──────────────────────────────── mock ──────────────────────────────── */

/**
 * true  → no network at all; fake status/camera so the UI can be exercised.
 * false → talk to the real car at the addresses above.
 *
 * Ships as true so a first run works with no hardware; the header shows a MOCK
 * badge whenever it is on. Set to false to drive the real car.
 */
export const USE_MOCK = true;

/* ─────────────────────────────── driving ─────────────────────────────── */

export const MIN_SPEED = 0;
export const MAX_SPEED = 255;
export const DEFAULT_SPEED = 150;

/** While a direction button is held, the command is resent on this cadence. */
export const REPEAT_INTERVAL_MS = 100;

/* ─────────────────────────────── telemetry ───────────────────────────── */

export const STATUS_POLL_MS = 1000;
/** A request that has not answered within this window counts as a failure. */
export const STATUS_TIMEOUT_MS = 2000;
/** A drive command is not worth waiting 2s for — drop it and let the next tick stand. */
export const MOVE_TIMEOUT_MS = 800;
/** Consecutive failed /status calls that flip the link to "offline". */
export const FAILURES_BEFORE_OFFLINE = 2;

/** Distance (cm) at or below which the obstacle banner appears. */
export const OBSTACLE_WARNING_CM = 15;
/** Temperature readings kept for the chart. */
export const HISTORY_SIZE = 60;

/* ──────────────────────────── wire format ───────────────────────────── */

/**
 * The only place status field names appear. If the firmware renames a field,
 * change it here — parsing, mocking and the UI all read this map.
 */
export const STATUS_FIELDS = {
  temperature: 'temp',
  humidity: 'humidity',
  distance: 'distance',
} as const;

/** Query-parameter names for GET /move?dir=..&speed=.. */
export const MOVE_PARAMS = { direction: 'dir', speed: 'speed' } as const;
