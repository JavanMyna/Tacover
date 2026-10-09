import { OBSTACLE_WARNING_CM } from '../config';
import { DriveVector, RobotStatus } from './types';

/**
 * Stand-in for the rover when USE_MOCK is true: a slow random walk instead of
 * uniform noise, so the readouts and the obstacle warning look like real
 * driving rather than static. It answers the same four fields the ESP32 does —
 * plus the temperature and humidity the real rover does not have yet, which is
 * what keeps the chart and those readouts exercisable.
 */

/** 0..1 — raise this to exercise the red link indicator / safety stop. */
export const MOCK_FAILURE_RATE = 0;
/** Fake round-trip time, so the UI is tuned against something realistic. */
export const MOCK_LATENCY_MS = 120;

/** Put a few log lines behind this if you want to watch commands go out. */
export const MOCK_LOG_COMMANDS = true;

let temperature = 24.5;
let humidity = 51;
let distance = 120;
let left = 90;
let right = 90;

const walk = (value: number, step: number, min: number, max: number): number => {
  const next = value + (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, next));
};

export function mockStatus(): RobotStatus {
  temperature = walk(temperature, 0.35, 15, 38);
  humidity = walk(humidity, 1.2, 20, 85);
  // Wide steps so the rover sometimes drives within OBSTACLE_WARNING_CM.
  distance = walk(distance, 28, 6, 260);
  left = walk(left, 12, 10, 220);
  right = walk(right, 12, 10, 220);

  const cm = Math.round(distance);
  return {
    distance: cm,
    // The real board decides this itself; here it mirrors the range, which is
    // the only way the warning gets exercised without hardware.
    blocked: cm <= OBSTACLE_WARNING_CM,
    left: Math.round(left),
    right: Math.round(right),
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity),
  };
}

export function mockShouldFail(): boolean {
  return Math.random() < MOCK_FAILURE_RATE;
}

export function mockDelay(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

export function mockDrive(vector: DriveVector): void {
  if (!MOCK_LOG_COMMANDS) return;
  console.log(`[mock] /drive?x=${vector.x}&y=${vector.y}`);
}

export function mockStop(): void {
  if (!MOCK_LOG_COMMANDS) return;
  console.log('[mock] /stop');
}
