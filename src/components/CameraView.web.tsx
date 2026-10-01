import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CAMERA_STREAM_URL, USE_MOCK } from '../config';
import { colors, eyebrow, fonts, glow, radius } from '../theme';

type StreamState = 'loading' | 'playing' | 'error';

/** No frame within this window counts as a failure, same as the native watchdog. */
const FRAME_TIMEOUT_MS = 8000;

const IMG_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
} as const;

/**
 * Web counterpart of the native WebView panel. Browsers decode
 * multipart/x-mixed-replace natively in an <img>, so no WebView is needed here —
 * react-native-webview has no web implementation at all.
 */
export const CameraView = memo(function CameraView({ style }: { style?: StyleProp<ViewStyle> }) {
  const [state, setState] = useState<StreamState>('loading');
  const [attempt, setAttempt] = useState(0);
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    setState('loading');
    if (USE_MOCK) return;

    const timer = setTimeout(() => {
      if (!settled.current) setState('error');
    }, FRAME_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const label = USE_MOCK ? 'mock' : state;

  return (
    <View style={[styles.frame, style]}>
      <View style={styles.stage}>
        {USE_MOCK ? (
          <Placeholder title="Mock camera" detail={CAMERA_STREAM_URL} />
        ) : (
          <img
            key={attempt}
            src={CAMERA_STREAM_URL}
            alt=""
            style={IMG_STYLE}
            onLoad={() => {
              settled.current = true;
              setState('playing');
            }}
            onError={() => {
              settled.current = true;
              setState('error');
            }}
          />
        )}

        {!USE_MOCK && state !== 'playing' ? (
          <View style={styles.overlay}>
            <Placeholder
              title={state === 'error' ? 'Stream unavailable' : 'Connecting…'}
              detail={CAMERA_STREAM_URL}
              onRetry={state === 'error' ? retry : undefined}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.caption}>
        <Text style={eyebrow}>Camera feed</Text>
        <Text style={[eyebrow, state === 'error' && !USE_MOCK && { color: colors.danger }]}>{label}</Text>
      </View>
    </View>
  );
});

function Placeholder({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <View style={styles.placeholder}>
      <View style={styles.lens}>
        <View style={styles.lensInner} />
      </View>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderDetail} numberOfLines={1}>
        {detail}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, glow(colors.cyan, 12, 0.8), pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.bgDeep,
    overflow: 'hidden',
  },
  stage: { flex: 1, minHeight: 120, backgroundColor: colors.bgDeep },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bgDeep },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  lens: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.edgeBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cyan, opacity: 0.5 },
  placeholderTitle: { fontFamily: fonts.mono, fontSize: 12, color: colors.textDim, letterSpacing: 1 },
  placeholderDetail: { fontFamily: fonts.mono, fontSize: 10, color: colors.textFaint },
  retry: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: 'rgba(69,224,255,0.10)',
  },
  retryPressed: { backgroundColor: 'rgba(69,224,255,0.24)' },
  retryText: { fontFamily: fonts.mono, fontSize: 12, color: colors.cyan },
});
