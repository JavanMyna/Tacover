import {
  MAX_SPEED,
  MIN_SPEED,
  MOVE_PARAMS,
  MOVE_TIMEOUT_MS,
  MOVE_URL,
  REPEAT_INTERVAL_MS,
  STATUS_TIMEOUT_MS,
  STATUS_URL,
  USE_MOCK,
} from '../config';
import { mockDelay, mockMove, mockShouldFail, mockStatus } from './mock';
import { MoveDir, parseStatus, RobotStatus } from './types';

export type StatusResult = { ok: true; status: RobotStatus } | { ok: false; error: string };

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
  if (USE_MOCK) {
    await mockDelay();
    if (mockShouldFail()) return { ok: false, error: 'Mock link failure' };
    return { ok: true, status: mockStatus() };
  }

  const res = await getJson(STATUS_URL, STATUS_TIMEOUT_MS);
  if (!res.ok) return res;

  const status = parseStatus(res.body);
  return status ? { ok: true, status } : { ok: false, error: 'Unexpected /status payload' };
}

/**
 * The direction currently on the wire. A repeat of a command that is already
 * in flight is skipped instead of queueing behind a slow robot; a *different*
 * command — notably the safety stop — always goes out immediately.
 */
let inFlight: MoveDir | null = null;

/**
 * Bumped by every command. Pending stop repeats capture the value at schedule
 * time and abandon themselves if it has moved on, so a stop that is followed
 * quickly by a new move cannot kill that new movement.
 */
let commandGeneration = 0;

/** Fire one GET /move and update inFlight; never de-duplicates. */
function dispatchMove(dir: MoveDir, speed: number): void {
  const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.round(speed)));
  const url = `${MOVE_URL}?${MOVE_PARAMS.direction}=${dir}&${MOVE_PARAMS.speed}=${clamped}`;

  inFlight = dir;
  // Same AbortController pattern as getJson: a silent robot must not be able to
  // pin `inFlight` open, or repeats of this direction would be skipped forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOVE_TIMEOUT_MS);
  fetch(url, { method: 'GET', headers: { Accept: '*/*' }, signal: controller.signal })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(timer);
      if (inFlight === dir) inFlight = null;
    });
}

export function sendMove(dir: MoveDir, speed: number): void {
  if (USE_MOCK) {
    mockMove(dir, speed);
    return;
  }
  // Any newer command invalidates stop repeats already queued.
  commandGeneration += 1;
  if (inFlight === dir) return;
  dispatchMove(dir, speed);
}

/**
 * Safety stop. dir=S goes out immediately and again after roughly 100 ms and
 * 200 ms, because a single lost GET would leave the car driving. Each attempt
 * bypasses the inFlight de-duplication, and the delayed repeats are cancelled
 * the moment any newer move command is sent.
 */
export function sendStop(speed: number): void {
  if (USE_MOCK) {
    mockMove('S', speed);
    return;
  }
  commandGeneration += 1;
  const generation = commandGeneration;
  dispatchMove('S', speed);
  for (const attempt of [1, 2]) {
    setTimeout(() => {
      if (commandGeneration !== generation) return;
      dispatchMove('S', speed);
    }, attempt * REPEAT_INTERVAL_MS);
  }
}
