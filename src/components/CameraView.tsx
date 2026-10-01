import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { CAMERA_ORIGIN, CAMERA_STREAM_URL, USE_MOCK } from '../config';
import { buildStreamHtml } from '../robot/camera';
import { colors, eyebrow, fonts, glow, radius } from '../theme';

type StreamState = 'loading' | 'playing' | 'error';

/** MJPEG lives in a WebView; in mock mode the frame is replaced outright. */
export const CameraView = memo(function CameraView({ style }: { style?: StyleProp<ViewStyle> }) {
  const [state, setState] = useState<StreamState>('loading');
  const [attempt, setAttempt] = useState(0);

  // Stable identity — a fresh source object would reload the WebView every render.
  const source = useMemo(() => ({ html: buildStreamHtml(CAMERA_STREAM_URL), baseUrl: CAMERA_ORIGIN }), []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (message.type === 'playing') setState('playing');
      else if (message.type === 'error') setState('error');
    } catch {
      // The page only ever sends the two messages above; ignore anything else.
    }
  }, []);

  const retry = useCallback(() => {
    setState('loading');
    setAttempt((n) => n + 1);
  }, []);

  const label = USE_MOCK ? 'mock' : state;

  return (
    <View style={[styles.frame, style]}>
      <View style={styles.stage}>
        {USE_MOCK ? (
          <Placeholder title="Mock camera" detail={CAMERA_STREAM_URL} />
        ) : (
          <WebView
            key={attempt}
            source={source}
            originWhitelist={['*']}
            mixedContentMode="always"
            javaScriptEnabled
            scrollEnabled={false}
            setBuiltInZoomControls={false}
            allowsInlineMediaPlayback
            onMessage={onMessage}
            onError={() => setState('error')}
            onHttpError={() => setState('error')}
            style={styles.web}
            containerStyle={styles.web}
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
  stage: { flex: 1, minHeight: 120 },
  web: { flex: 1, backgroundColor: colors.bgDeep },
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
