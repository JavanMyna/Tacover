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
export const httpOrigin = (ip: string, port: number) => (port === 80 ? `http://${ip}` : `http://${ip}:${port}`);

/**
 * URLs are derived from the *live* IP in the settings store, not from the
 * defaults above, so editing an address takes effect without a restart.
 */
export const MOVE_URL = (ip: string = ROBOT_IP) => `${httpOrigin(ip, ROBOT_PORT)}/move`;
export const STATUS_URL = (ip: string = ROBOT_IP) => `${httpOrigin(ip, ROBOT_PORT)}/status`;
export const CAMERA_STREAM_URL = (ip: string = CAMERA_IP) =>
  `${httpOrigin(ip, CAMERA_PORT)}${CAMERA_STREAM_PATH}`;
/** Origin the stream document is served from, so its <img> is not cross-origin. */
export const CAMERA_ORIGIN = (ip: string = CAMERA_IP) => `${httpOrigin(ip, CAMERA_PORT)}/`;

/* ──────────────────────────────── mock ──────────────────────────────── */

/**
 * true  → no network at all; fake status/camera so the UI can be exercised.
 * false → talk to the real car at the addresses above.
 *
 * This is only the *default*: with a `true` value a first run works with no
 * hardware, and the live value is whatever the settings drawer holds.
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

/* ────────────────────────────── settings ────────────────────────────── */

/** Single AsyncStorage key holding the whole persisted settings blob. */
export const SETTINGS_STORAGE_KEY = 'tacover.settings.v1';

/** Floating camera box, in logical pixels, and the clamps applied while resizing. */
export const CAMERA_BOX_DEFAULT_WIDTH = 240;
/** width / height. The MJPEG frames are 4:3, so the box keeps that ratio. */
export const CAMERA_BOX_ASPECT = 4 / 3;
export const CAMERA_BOX_MIN_WIDTH = 140;
/** Caps so the box can never cover the D-pad or the speed slider. */
export const CAMERA_BOX_MAX_WIDTH_RATIO = 0.5;
export const CAMERA_BOX_MAX_HEIGHT_RATIO = 0.45;
