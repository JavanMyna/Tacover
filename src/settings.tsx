import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CAMERA_BOX_ASPECT,
  CAMERA_BOX_DEFAULT_WIDTH,
  CAMERA_BOX_MIN_WIDTH,
  CAMERA_IP,
  ROBOT_IP,
  SETTINGS_STORAGE_KEY,
  USE_MOCK,
} from './config';
import { configureRobot } from './robot/client';

export type CameraBoxSize = { width: number; height: number };

export type Settings = {
  useMock: boolean;
  robotIp: string;
  cameraIp: string;
  cameraBoxSize: CameraBoxSize;
  cameraSizeLocked: boolean;
};

/** Camera box size derived from its width, so the aspect ratio is never stored twice. */
export const sizeFromWidth = (width: number): CameraBoxSize => ({
  width,
  height: Math.round(width / CAMERA_BOX_ASPECT),
});

/** src/config.ts is the single source of default values. */
export const DEFAULT_SETTINGS: Settings = {
  useMock: USE_MOCK,
  robotIp: ROBOT_IP,
  cameraIp: CAMERA_IP,
  cameraBoxSize: sizeFromWidth(CAMERA_BOX_DEFAULT_WIDTH),
  cameraSizeLocked: false,
};

/** Looks like a dotted-quad IPv4 address. Deliberately literal: no hostnames. */
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const isIpv4 = (value: string): boolean => IPV4.test(value.trim());

type SettingsApi = Settings & {
  /** Merge a patch; invalid IPs are rejected upstream, never stored. */
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

/**
 * Reads one stored field, falling back to its default when it is missing or
 * the wrong shape — a half-corrupt blob degrades to defaults per field rather
 * than resetting everything.
 */
function stored<T>(value: unknown, valid: (v: unknown) => v is T, fallback: T): T {
  return valid(value) ? (value as T) : fallback;
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isIp = (v: unknown): v is string => typeof v === 'string' && isIpv4(v);
const isSize = (v: unknown): v is CameraBoxSize => {
  if (v === null || typeof v !== 'object') return false;
  const size = v as Partial<CameraBoxSize>;
  return typeof size.width === 'number' && typeof size.height === 'number'
    && Number.isFinite(size.width) && Number.isFinite(size.height)
    && size.width >= CAMERA_BOX_MIN_WIDTH && size.height > 0;
};

function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (body === null || typeof body !== 'object') return DEFAULT_SETTINGS;
  const stored_ = body as Record<string, unknown>;
  return {
    useMock: stored(stored_.useMock, isBool, DEFAULT_SETTINGS.useMock),
    robotIp: stored(stored_.robotIp, isIp, DEFAULT_SETTINGS.robotIp),
    cameraIp: stored(stored_.cameraIp, isIp, DEFAULT_SETTINGS.cameraIp),
    cameraBoxSize: stored(stored_.cameraBoxSize, isSize, DEFAULT_SETTINGS.cameraBoxSize),
    cameraSizeLocked: stored(stored_.cameraSizeLocked, isBool, DEFAULT_SETTINGS.cameraSizeLocked),
  };
}

/**
 * Holds the live settings and persists every change. Children are not rendered
 * until the stored blob has been read, so the robot client is already pointed
 * at the right board when the first /status poll fires.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) setSettings(parseSettings(raw));
      })
      .catch(() => {
        if (!cancelled) setSettings(DEFAULT_SETTINGS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save on every change, including the normalised blob just loaded.
  useEffect(() => {
    if (settings === null) return;
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => (prev === null ? prev : { ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const api = useMemo<SettingsApi | null>(
    () => (settings === null ? null : { ...settings, update, reset }),
    [settings, update, reset],
  );

  // Point the client at the loaded settings synchronously — before children
  // mount and their effects start polling.
  if (settings !== null) {
    configureRobot({ useMock: settings.useMock, robotIp: settings.robotIp });
  }

  if (api === null) return null;

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const context = useContext(SettingsContext);
  if (context === null) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}
