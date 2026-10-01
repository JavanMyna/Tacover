import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { REPEAT_INTERVAL_MS } from '../config';
import { sendMove } from '../robot/client';
import { DriveDir } from '../robot/types';
import { LinkState } from './useRobotStatus';

export type Drive = {
  /** Direction currently held down, or null. */
  active: DriveDir | null;
  press: (dir: DriveDir) => void;
  release: () => void;
  /** False while the telemetry link is known dead — the pad is locked out. */
  enabled: boolean;
};

/**
 * Hold-to-drive. Pressing sends the command immediately and then resends it
 * every REPEAT_INTERVAL_MS; releasing, backgrounding the app, leaving the
 * screen, or losing the link all send dir=S right away.
 *
 * The repeat loop is cancelled by bumping a generation counter rather than by
 * clearing a stored interval handle: whatever tick is already scheduled sees a
 * stale generation, sends nothing, and does not reschedule itself.
 */
export function useDrive(speed: number, link: LinkState): Drive {
  const [active, setActive] = useState<DriveDir | null>(null);
  const activeRef = useRef<DriveDir | null>(null);
  const loopRef = useRef(0);
  const speedRef = useRef(speed);
  const enabledRef = useRef(true);

  const enabled = link !== 'offline';
  speedRef.current = speed;
  enabledRef.current = enabled;

  const stop = useCallback(() => {
    loopRef.current += 1;
    activeRef.current = null;
    setActive(null);
    sendMove('S', speedRef.current);
  }, []);

  const press = useCallback((dir: DriveDir) => {
    if (!enabledRef.current || activeRef.current === dir) return;

    activeRef.current = dir;
    setActive(dir);
    sendMove(dir, speedRef.current);

    loopRef.current += 1;
    const generation = loopRef.current;
    const repeat = () => {
      if (loopRef.current !== generation) return;
      const held = activeRef.current;
      if (held !== null) sendMove(held, speedRef.current);
      setTimeout(repeat, REPEAT_INTERVAL_MS);
    };
    setTimeout(repeat, REPEAT_INTERVAL_MS);
  }, []);

  const release = useCallback(() => {
    if (activeRef.current === null) return;
    stop();
  }, [stop]);

  // Safety: leaving the foreground stops the car, whatever the reason.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') stop();
    });
    return () => sub.remove();
  }, [stop]);

  // Safety: two missed polls means we no longer know the car is listening.
  useEffect(() => {
    if (link === 'offline') stop();
  }, [link, stop]);

  // Safety: unmount — i.e. any screen change away from the controls.
  useEffect(
    () => () => {
      loopRef.current += 1;
      activeRef.current = null;
      sendMove('S', speedRef.current);
    },
    [],
  );

  return { active, press, release, enabled };
}
