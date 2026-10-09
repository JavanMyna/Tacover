import {
  DRIVE_PARAMS,
  DRIVE_TIMEOUT_MS,
  DRIVE_URL,
  REPEAT_INTERVAL_MS,
  ROBOT_IP,
  STATUS_TIMEOUT_MS,
  STATUS_URL,
  STOP_URL,
  USE_MOCK,
} from '../config';
import { mockDelay, mockDrive, mockShouldFail, mockStatus, mockStop } from './mock';
import { DriveDir, DriveVector, driveVector, parseStatus, RobotStatus } from './types';

export type StatusResult = { ok: true; status: RobotStatus } | { ok: false; error: string };

/**
 * The board this client is currently pointed at. Seeded from the config
 * defaults and replaced by the settings store whenever the user edits an
 * address or flips mock mode — no restart, no reload.
 */
const config = { useMock: USE_MOCK, robotIp: ROBOT_IP };

/**
 * GET returning parsed JSON, or a reason. Never throws and never rejects — a
 * dead robot must not be able to take the UI down with it.
 */
async function getJson(url: string, timeoutMs: number): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    try {
      return { ok: true, body: JSON.parse(text) };
    } catch {
      return { ok: false, error: 'Malformed JSON' };
    }
  } catch (err) {
    const timedOut = (err as Error | undefined)?.name === 'AbortError';
    return { ok: false, error: timedOut ? `No answer in ${timeoutMs / 1000}s` : 'Network unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatus(): Promise<StatusResult> {
  if (config.useMock) {
    await mockDelay();
    if (mockShouldFail()) return { ok: false, error: 'Mock link failure' };
    return { ok: true, status: mockStatus() };
  }

  const res = await getJson(STATUS_URL(config.robotIp), STATUS_TIMEOUT_MS);
  if (!res.ok) return res;

  const status = parseStatus(res.body);
  return status ? { ok: true, status } : { ok: false, error: 'Unexpected /status payload' };
}

/**
 * The command currently on the wire, as "x,y" (or "stop"). A repeat of a
 * command that is already in flight is skipped instead of queueing behind a
 * slow board, so the 100 ms cadence can never pile requests up; a *different*
 * command — notably the safety stop — always goes out immediately.
 */
let inFlight: string | null = null;

/**
 * Bumped by every command. Pending stop repeats capture the value at schedule
 * time and abandon themselves if it has moved on, so a stop that is followed
 * quickly by a new move cannot kill that new movement.
 */
let commandGeneration = 0;

/** Fire one GET and hold the de-duplication marker until it settles. */
function fire(url: string, key: string, timeoutMs: number): void {
  inFlight = key;
  // A silent board must not be able to pin the marker open, or repeats of this
  // command would be skipped forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  fetch(url, { method: 'GET', headers: { Accept: '*/*' }, signal: controller.signal })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(timer);
      if (inFlight === key) inFlight = null;
    });
}

/** Fire one GET /drive; the caller owns de-duplication. */
function dispatchDrive(vector: DriveVector): void {
  const key = `${vector.x},${vector.y}`;
  const url = `${DRIVE_URL(config.robotIp)}?${DRIVE_PARAMS.turn}=${vector.x}&${DRIVE_PARAMS.forward}=${vector.y}`;
  fire(url, key, DRIVE_TIMEOUT_MS);
}

/**
 * How the pad drives the rover: the held direction plus the speed slider become
 * x (turn) and y (forward). Repeated every REPEAT_INTERVAL_MS while held.
 */
export function sendDrive(dir: DriveDir, speed: number): void {
  const vector = driveVector(dir, speed);
  if (config.useMock) {
    mockDrive(vector);
    return;
  }
  // Any newer command invalidates stop repeats already queued.
  commandGeneration += 1;
  const key = `${vector.x},${vector.y}`;
  if (inFlight === key) return;
  dispatchDrive(vector);
}

/**
 * Safety stop. GET /stop goes out immediately and again after roughly 100 ms
 * and 200 ms, because a single lost GET would leave the car driving. Each
 * attempt bypasses the in-flight de-duplication, and the delayed repeats are
 * cancelled the moment any newer move command is sent.
 */
export function sendStop(): void {
  if (config.useMock) {
    mockStop();
    return;
  }
  commandGeneration += 1;
  const generation = commandGeneration;
  fire(STOP_URL(config.robotIp), 'stop', DRIVE_TIMEOUT_MS);
  for (const attempt of [1, 2]) {
    setTimeout(() => {
      if (commandGeneration !== generation) return;
      fire(STOP_URL(config.robotIp), 'stop', DRIVE_TIMEOUT_MS);
    }, attempt * REPEAT_INTERVAL_MS);
  }
}

/**
 * Re-point the client at another board / mock mode. Called by the settings
 * store before the UI mounts and on every change. Any request already on the
 * wire belonged to the old destination, so the de-duplication marker is
 * dropped rather than carried over.
 */
export function configureRobot(next: { useMock: boolean; robotIp: string }): void {
  config.useMock = next.useMock;
  config.robotIp = next.robotIp;
  inFlight = null;
}
