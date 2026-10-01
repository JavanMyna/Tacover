# Tacover

React Native (Expo + TypeScript) remote for a Wi-Fi robot car: hold-to-drive D-pad, live
telemetry, an MJPEG camera feed and a temperature chart, in a dark neon HUD that works in
either orientation.

## Run it

```bash
npm install
npx expo start
```

Then press `a` for an Android emulator, `i` for an iOS simulator, or scan the QR code with
Expo Go. Every native module here ships inside Expo Go, so no custom dev build is needed to
develop. `npx tsc --noEmit` typechecks.

Press `w` (or run `npm run web`) to drive the whole HUD from a browser on
<http://localhost:8081> — handy for working without a phone or emulator. Web has no
`react-native-webview`, so `src/components/CameraView.web.tsx` renders the MJPEG stream in a
plain `<img>` instead.

On Windows PowerShell, `npx expo start` may fail with "running scripts is disabled". Use
`npx.cmd expo start` instead, or allow signed local scripts once with
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

The phone must be on the same network as the car: the robot answers at `192.168.4.1` and the
camera at `192.168.4.2:81`.

## Switch off mock mode

Mock mode is on by default. Turn it off in **`src/config.ts`**:
4
```ts
export const USE_MOCK = false; // true = no network, faked status + placeholder camera
```

Then restart Metro with `npx expo start -c` so the change is picked up.

That single flag swaps every robot call for a local fake (random-walk temperature, humidity
and distance, and a placeholder instead of the camera) so the whole UI can be exercised with
no hardware. Set `MOCK_FAILURE_RATE` in `src/robot/mock.ts` to a value above `0` to watch the
red link indicator and the safety stop fire on their own.

## Build an installable Android APK

Cleartext HTTP is already configured for both platforms in `app.json`
(`expo-build-properties` sets `usesCleartextTraffic: true` for Android, and iOS gets an
`NSAppTransportSecurity` exception). Nothing extra is needed to talk to a plain-HTTP device.
Expo Go and dev builds allow cleartext already, but a release APK blocks it by default
without that configuration.

**Cloud build (no Android SDK needed):**

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

The `preview` profile in `eas.json` is set to `"buildType": "apk"`. EAS prints a download
link when the build finishes, and that file installs directly on a phone.

**Local build (with Android Studio / SDK installed):**

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk
```

Shipping to the Play Store instead:
`npx eas-cli@latest build -p android --profile production` produces an AAB.

## Configuration

Everything the app talks to lives in `src/config.ts`. Nothing else hardcodes an address, a
field name or a timing.

| Setting | Default | Purpose |
| --- | --- | --- |
| `USE_MOCK` | `true` | Fake all robot I/O |
| `ROBOT_IP` / `ROBOT_PORT` | `192.168.4.1` / `80` | Drive + telemetry board |
| `CAMERA_IP` / `CAMERA_PORT` | `192.168.4.2` / `81` | MJPEG stream host |
| `DEFAULT_SPEED` | `150` | Initial slider value |
| `REPEAT_INTERVAL_MS` | `100` | Resend cadence while a direction is held |
| `STATUS_POLL_MS` | `1000` | `/status` poll period |
| `STATUS_TIMEOUT_MS` | `2000` | A slower answer counts as a failure |
| `FAILURES_BEFORE_OFFLINE` | `2` | Consecutive failures before the link reads red |
| `OBSTACLE_WARNING_CM` | `15` | Distance at which the red banner appears |
| `HISTORY_SIZE` | `60` | Temperature readings kept for the chart |
| `STATUS_FIELDS` | `temp` / `humidity` / `distance` | JSON keys of the `/status` response |
| `MOVE_PARAMS` | `dir` / `speed` | Query parameters of `/move` |

The robot is driven entirely with GET requests:

```
GET http://192.168.4.1/move?dir=F|B|L|R|S&speed=0-255
GET http://192.168.4.1/status      -> {"temp":<num>,"humidity":<num>,"distance":<num>}  (cm)
GET http://192.168.4.2:81/stream   -> multipart/x-mixed-replace MJPEG
```

## Layout

```
App.tsx                      orientation-aware layout, header, wiring
src/config.ts                addresses, tunables, wire format
src/theme.ts                 palette, fonts, glow helper
src/robot/client.ts          GET helpers with timeouts, never throws
src/robot/types.ts           MoveDir / RobotStatus + payload parsing
src/robot/mock.ts            fake telemetry and commands
src/robot/camera.ts          stream document embedded in the WebView
src/hooks/useRobotStatus.ts  1s polling, link state, temperature history
src/hooks/useDrive.ts        hold-to-repeat driving + every safety stop
src/components/              DPad, SpeedSlider, LivePanel, WarningBanner,
                             TempChart, CameraView, ConnectionIndicator, StarField
```

## Notes

- **Stopping is unconditional.** Releasing a button, backgrounding the app, leaving the
  screen, or losing the link all send `dir=S` immediately. The D-pad locks out while the link
  is dead, and every failure path is swallowed so a missing robot can never crash the app.
- **The camera is platform-dependent.** MJPEG is a multipart stream, so it is loaded into an
  `<img>` inside a WebView rather than handed to the WebView as a URL. Chromium (Android)
  renders this reliably; WKWebView (iOS) is inconsistent with multipart streams. If no frame
  decodes within 8 seconds the panel shows the stream URL and a Retry button instead of
  hanging on a blank rectangle.
- **Landscape** is the intended way to fly: camera and speed on the left, telemetry in the
  middle, D-pad on the right. Portrait stacks the same panels in a scrolling column.
