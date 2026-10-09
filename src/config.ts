/**
 * Every address, tunable and wire-format detail lives here. Nothing else in the
 * app hardcodes a URL, a field name or a timing constant — change it here.
 */

/* ─────────────────────────────── devices ─────────────────────────────── */

/**
 * Robot control board (drive + telemetry). The ESP32 is its own Wi-Fi access
 * point, so the base address is the AP's address: http://192.168.4.1. Only the
 * host part is editable (settings drawer); the port and scheme are fixed.
 */
export const ROBOT_IP = '192.168.4.1';
export const ROBOT_PORT = 80;

/**
 * Camera module serving the MJPEG stream. Mock mode only: the rover has no
 * camera yet, so nothing requests this address while USE_MOCK is off.
 */
export const CAMERA_IP = '192.168.4.2';
export const CAMERA_PORT = 81;
export const CAMERA_STREAM_PATH = '/stream';

/** Port 80 is implied by the scheme, and that is the form the firmware documents. */
export const httpOrigin = (ip: string, port: number) => (port === 80 ? `http://${ip}` : `http://${ip}:${port}`);

/**
 * URLs are derived from the *live* IP in the settings store, not from the
 * defaults above, so editing an address takes effect without a restart.
 */
export const DRIVE_URL = (ip: string = ROBOT_IP) => `${httpOrigin(ip, ROBOT_PORT)}/drive`;
export const STOP_URL = (ip: string = ROBOT_IP) => `${httpOrigin(ip, ROBOT_PORT)}/stop`;
export const STATUS_URL = (ip: string = ROBOT_IP) => `${httpOrigin(ip, ROBOT_PORT)}/status`;
export const CAMERA_STREAM_URL = (ip: string = CAMERA_IP) =>
  `${httpOrigin(ip, CAMERA_PORT)}${CAMERA_STREAM_PATH}`;
/** Origin the stream document is served from, so its <img> is not cross-origin. */
export const CAMERA_ORIGIN = (ip: string = CAMERA_IP) => `${httpOrigin(ip, CAMERA_PORT)}/`;

/* ──────────────────────────────── mock ──────────────────────────────── */

/**
 * true  → no network at all; fake telemetry/camera so the UI can be exercised.
 * false → talk to the real rover at the address above.
 *
 * This is only the *default*: with a `true` value a first run works with no
 * hardware, and the live value is whatever the settings drawer holds.
 */
export const USE_MOCK = true;

/* ─────────────────────────────── driving ─────────────────────────────── */

/**
 * The slider's own units are the wire units: every /drive command sends one
 * axis of -MAX_SPEED..MAX_SPEED, so no conversion happens on the way out.
 */
export const MIN_SPEED = 0;
export const MAX_SPEED = 100;
export const DEFAULT_SPEED = 60;

/** While a direction button is held, the command is resent on this cadence. */
export const REPEAT_INTERVAL_MS = 100;
/** Bounds an in-flight command, so the de-duplication guard cannot stick to it. */
export const DRIVE_TIMEOUT_MS = 300;

/* ─────────────────────────────── telemetry ───────────────────────────── */

export const STATUS_POLL_MS = 500;
/** A request that has not answered within this window counts as a failure. */
export const STATUS_TIMEOUT_MS = 1500;
/** Consecutive failed /status calls that flip the link to "offline". */
export const FAILURES_BEFORE_OFFLINE = 2;

/** Distance (cm) at or below which the obstacle warning appears, even if /status has not set blocked. */
export const OBSTACLE_WARNING_CM = 15;
/** Temperature readings kept for the chart (mock mode only — the rover has no probe yet). */
export const HISTORY_SIZE = 60;

/* ──────────────────────────── wire format ───────────────────────────── */

/**
 * The rover's HTTP API — the only place its paths, query-parameter names and
 * status field names appear; the client, the parser and the mock all read it.
 *
 *   GET /drive?x=<-100..100>&y=<-100..100>    held on a 100 ms cadence
 *                                             x = turn (right positive)
 *                                             y = forward (up positive)
 *   GET /stop                                 on release, and after every safety event
 *   GET /status  -> {"distance":<cm|-1>,"blocked":<bool>,"left":<n>,"right":<n>}
 *                                             distance -1 = nothing detected
 */
export const STATUS_FIELDS = {
  distance: 'distance',
  blocked: 'blocked',
  left: 'left',
  right: 'right',
} as const;

/** Query-parameter names for GET /drive?x=..&y=.. */
export const DRIVE_PARAMS = { turn: 'x', forward: 'y' } as const;

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
