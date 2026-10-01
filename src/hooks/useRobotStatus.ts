import { useEffect, useState } from 'react';
import { FAILURES_BEFORE_OFFLINE, HISTORY_SIZE, STATUS_POLL_MS } from '../config';
import { fetchStatus } from '../robot/client';
import { RobotStatus } from '../robot/types';

/** connecting = nothing heard yet, online = last poll succeeded, offline = 2+ failures. */
export type LinkState = 'connecting' | 'online' | 'offline';

export type RobotLink = {
  link: LinkState;
  status: RobotStatus | null;
  history: number[];
  lastError: string | null;
};

/**
 * Polls GET /status on a 1s cadence. The next tick is scheduled after the
 * current one settles, so a hung robot can never pile requests up; a request
 * that exceeds STATUS_TIMEOUT_MS is aborted and counted as a failure.
 */
export function useRobotStatus(): RobotLink {
  const [link, setLink] = useState<LinkState>('connecting');
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let failures = 0;

    const poll = async () => {
      const result = await fetchStatus();
      if (cancelled) return;

      if (result.ok) {
        failures = 0;
        setStatus(result.status);
        setLastError(null);
        setLink('online');
        setHistory((prev) => [...prev, result.status.temperature].slice(-HISTORY_SIZE));
      } else {
        failures += 1;
        setLastError(result.error);
        if (failures >= FAILURES_BEFORE_OFFLINE) setLink('offline');
      }

      setTimeout(poll, STATUS_POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return { link, status, history, lastError };
}
