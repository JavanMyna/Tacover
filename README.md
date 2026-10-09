# Tacover

React Native (Expo + TypeScript) remote for a Wi-Fi robot car: hold-to-drive D-pad plus live
telemetry (obstacle distance, blocked flag, side sensors) in a dark neon HUD that works in
either orientation.

The default screen is just the controls: the speed slider, the D-pad, a menu button and a
link dot. Everything else — telemetry, settings, and (in mock mode) the camera and the
temperature chart — lives in a drawer that slides in from the left.

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

The phone must be on the same network as the car: the rover answers at `192.168.4.1` (its own
SoftAP). The camera address `192.168.4.2:81` is mock-only — the rover has no camera yet.

## Switch off mock mode

Mock mode is on by default. The live switch is in the app: open the drawer
(menu button, top-left) and flip **Mock mode** in the Settings section. It takes effect
immediately — the client is re-pointed at the real board or back at the fake one
on the spot, with no restart — and the choice is remembered on the next launch.

That switch swaps every robot call for a local fake (random-walk distance, blocked flag and
side sensors, plus temperature and humidity the real rover does not have, and a placeholder
instead of the camera) so the whole UI can be exercised with no hardware. `USE_MOCK` in
**`src/config.ts`** is only the seed value used the first time the
app runs (or after **Reset to defaults**). Set `MOCK_FAILURE_RATE`
in `src/robot/mock.ts` to a value above `0` to watch the red link dot and the safety stop
fire on their own.

With mock mode **off** the app talks to the real rover: `/drive` + `/stop` to move, `/status`
for telemetry, and everything the rover does not have is hidden — the **Show camera** switch,
the floating feed, the temperature and humidity rows, the trend chart and the **Camera IP**
field. What is left is `distance`, `blocked`, `left` and `right`.

## Build an installable Android APK

Cleartext HTTP is already configured for both platforms in `app.json`
(`expo-build-properties` sets `usesCleartextTraffic: true` for Android, and iOS gets an
`NSAppTransportSecurity` exception). Nothing extra is needed to talk to a plain-HTTP device.
Expo Go and dev builds allow cleartext already, but a release APK blocks it by default
without that configuration.

**Cloud build (no Android SDK needed):**

```bash
npx eas-cli@latest login
npm run build:apk                     # = npx eas-cli@latest build -p android --profile preview
```

The `preview` profile in `eas.json` is `"distribution": "internal"` with
`"android": { "buildType": "apk" }` and **no** `developmentClient`, so the result is a
standalone release APK: sideload it and launch — no Metro dev server and no Expo Go. EAS
prints a download link when the build finishes. The first `eas build` also offers to
create/link the EAS project for you (it asks which Expo account to use, then stores the
project id), because `app.json` does not carry one yet.

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
| `USE_MOCK` | `true` | Fake all robot I/O (seed for the drawer switch) |
| `ROBOT_IP` / `ROBOT_PORT` | `192.168.4.1` / `80` | Drive + telemetry board (seed for Settings) |
| `CAMERA_IP` / `CAMERA_PORT` | `192.168.4.2` / `81` | MJPEG stream host (seed for Settings) |
| `MIN_SPEED` / `MAX_SPEED` / `DEFAULT_SPEED` | `0` / `100` / `60` | Slider range — the same units the wire takes |
| `REPEAT_INTERVAL_MS` | `100` | `/drive` resend cadence while a direction is held |
| `DRIVE_TIMEOUT_MS` | `300` | Bounds an in-flight command, so the dedupe guard cannot stick |
| `STATUS_POLL_MS` | `500` | `/status` poll period |
| `STATUS_TIMEOUT_MS` | `1500` | A slower answer counts as a failure |
| `FAILURES_BEFORE_OFFLINE` | `2` | Consecutive failures before the link reads red |
| `OBSTACLE_WARNING_CM` | `15` | Range at which the red edge glow also appears |
| `HISTORY_SIZE` | `60` | Temperature readings kept for the chart (mock mode only) |
| `CAMERA_BOX_DEFAULT_WIDTH` | `240` | Floating camera width, `4:3` aspect preserved |
| `CAMERA_BOX_MIN_WIDTH` / `..._MAX_*_RATIO` | `140` / `0.5` / `0.45` | Resize clamps |
| `STATUS_FIELDS` | `distance` / `blocked` / `left` / `right` | JSON keys of the `/status` response |
| `DRIVE_PARAMS` | `x` / `y` | Query parameters of `/drive` |

The addresses above are only defaults: `ROBOT_IP` and `CAMERA_IP` can be edited while the app
runs, and `DRIVE_URL`, `STOP_URL`, `STATUS_URL`, `CAMERA_STREAM_URL` and `CAMERA_ORIGIN` are
functions of the live IP, so nothing hardcodes a destination outside this file.

Everything is a GET request:

```
GET http://192.168.4.1/drive?x=<-100..100>&y=<-100..100>   x = turn (right +), y = forward (up +)
GET http://192.168.4.1/stop                                on release, and on every safety stop
GET http://192.168.4.1/status -> {"distance":<cm|-1>,"blocked":<bool>,"left":<n>,"right":<n>}
GET http://192.168.4.2:81/stream                           MJPEG — mock mode only
```

`/drive` is resent every `REPEAT_INTERVAL_MS` (100 ms) while a button is held; both axes carry
the speed slider's value, so `x` and `y` are never larger than `MAX_SPEED` (100). A
`distance` of `-1` means nothing was detected. The rover has no camera, temperature or
humidity, so those surfaces render only in mock mode.

## Layout

```
App.tsx                      minimal cockpit: menu button, link dot, slider, D-pad
src/settings.tsx             live settings store (AsyncStorage), defaults, IPv4 check
src/config.ts                addresses, tunables, wire format, default settings
src/theme.ts                 palette, fonts, glow helper
src/robot/client.ts          GET helpers with timeouts, never throws, live destination
src/robot/types.ts           DriveDir / RobotStatus, driveVector(), parseStatus(), isObstacleNear()
src/robot/mock.ts            fake telemetry and commands
src/robot/camera.ts          stream document embedded in the WebView
src/hooks/useRobotStatus.ts  500 ms polling, link state, temperature history
src/hooks/useDrive.ts        hold-to-repeat driving + every safety stop
src/components/              DPad, SpeedSlider, HamburgerButton, StatusDot, EdgeGlow,
                             Drawer, SettingsPanel, FloatingCamera, CameraView,
                             LivePanel, TempChart, Panel, StarField
```

The controls themselves — `DPad`, `SpeedSlider` and the hold-to-repeat loop in `useDrive` —
are unchanged; `App.tsx` only decides where they sit.

## Notes

- **Stopping is unconditional.** Releasing a button, backgrounding the app, leaving the
  screen, losing the link, or opening the drawer all send `GET /stop` immediately — three
  times, 100 ms apart, so one lost request cannot leave the car driving. The D-pad
  locks out while the link is dead, and every failure path is swallowed so a missing robot
  can never crash the app.
- **Settings are live and persisted.** `useMock`, `robotIp`, `cameraIp`, the floating camera
  size and its lock live in `src/settings.tsx`, are written to AsyncStorage on every change
  and read back before the first `/status` poll. Editing an address or the mock switch
  re-points the client and restarts polling without a restart; `Reset to defaults` returns
  everything to `src/config.ts`. An address that is not a dotted-quad IPv4 shows an inline
  error and is not saved.
- **The default screen never scrolls.** It is only the slider, the D-pad and the two top
  corner controls. Landscape puts the slider on the left and the D-pad on the right;
  portrait stacks the slider above the D-pad, which sits in the lower half. Both are sized
  from the window so the whole pad stays on screen.
- **Obstacle warning.** The rover's `blocked` flag — or a reported range at or below
  `OBSTACLE_WARNING_CM` — fades in a soft red band around the screen edges; a `distance` of
  `-1` (nothing detected) cannot raise it on its own. Three stacked rims, no flashing. It is
  `pointerEvents="none"`, so it never blocks a touch, and it stays lit whether the drawer is
  open or closed. It replaces the old red banner.
- **The camera is a floating box.** Mock mode only — the rover has no camera. The **Show
  camera** switch in the drawer shows the feed
  over the controls, pinned top-right, off on every launch. Drag its bottom-left corner to
  resize (aspect locked, min `140`, capped at 50% of the screen width and 45% of the height);
  the padlock freezes the size. Both the size and the lock persist. The box is `box-none`, so
  the controls around it stay usable.
- **The drawer** slides in from the left at 80% width (max 360), dims the screen behind it,
  and closes on a backdrop tap or the Android back button (`BackHandler`). It scrolls when
  its sections do not fit.
- **The camera feed is platform-dependent.** MJPEG is a multipart stream, so it is loaded into
  an `<img>` inside a WebView rather than handed to the WebView as a URL. Chromium (Android)
  renders this reliably; WKWebView (iOS) is inconsistent with multipart streams. If no frame
  decodes within 8 seconds the box shows the stream URL and a Retry button instead of
  hanging on a blank rectangle.
