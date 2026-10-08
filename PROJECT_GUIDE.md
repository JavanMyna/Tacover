# Tacover — project guide

Reference notes for the repo in `C:/Users/User/Projects/Tacover`.
Everything below was read out of the source, not from memory. Line/file references are exact.

---

## 1. What this is

**Tacover** is a phone app that acts as the remote control + dashboard for a Wi-Fi robot car.
It is *only* the client — there is no ESP32 firmware in this repo, only the contract the
firmware must satisfy.

One screen, two layouts:

| Panel | What it does |
| --- | --- |
| Header row | menu button (opens the drawer) + connection dot (`useRobotStatus` link state) |
| Speed | 0–255 slider, `PanResponder` based, no dependency |
| D-pad | hold-to-drive; release / background / link loss / drawer open all stop the car |
| Camera (drawer) | `Show camera` switch for the floating feed — off on every launch |
| Telemetry (drawer) | temperature / humidity / obstacle distance |
| Temperature trend (drawer) | hand-drawn SVG line chart of the last 60 readings |
| Settings (drawer) | robot IP, camera IP, mock switch, reset to defaults — persisted |
| Floating camera | MJPEG feed over the controls (Android reliably, iOS hit-or-miss) |
| Edge glow | soft red band around the screen edges at ≤ 15 cm |

The default screen shows only the slider, the D-pad, the menu button and the dot, and never
scrolls. Landscape puts the slider on the left and the D-pad on the right; portrait stacks the
slider above the D-pad, which sits in the lower half (`App.tsx`). Everything else slides in from
the left in a drawer.

---

## 2. What it mainly uses

From `package.json`:

| Package | Version | Role |
| --- | --- | --- |
| `expo` | `~57.0.26` | Expo SDK 57 toolchain / Expo Go |
| `react-native` | `0.86.3` | native runtime |
| `react` | `19.2.3` | UI |
| `typescript` | `~6.0.3` | language; `tsc --noEmit` typechecks |
| `react-native-svg` | `15.15.4` | D-pad chevrons, temperature chart |
| `react-native-webview` | `13.16.1` | MJPEG camera feed |
| `react-native-safe-area-context` | `~5.7.0` | notches / gesture bars |
| `@react-native-async-storage/async-storage` | `2.2.0` | persists the settings store |
| `expo-build-properties` | `~57.0.22` | sets `usesCleartextTraffic: true` on Android |
| `expo-status-bar` | `~57.0.1` | light status bar |

Notes:

- **No navigation library.** `AGENTS.md` prescribes Expo Router, but this app is a single
  screen and does not use it — there is no `src/app/` directory and no `expo-router` dep. The
  drawer is a plain animated `View`, not a navigator.
- **No state library, no HTTP library, no slider/chart library.** State is `useState`/`useRef`
  in hooks plus one small context (`src/settings.tsx`) for the persisted settings; HTTP is
  `fetch` + `AbortController`; slider and chart are hand-rolled. Animations use React Native's
  own `Animated` (the drawer slide, the edge-glow fade) — Reanimated is not a dependency.
- **Web target is installed but has no WebView.** `react-dom`, `react-native-web` and
  `@expo/metro-runtime` are present, so `npm run web` runs the whole HUD in a browser;
  `react-native-webview` has no web implementation, so `src/components/CameraView.web.tsx`
  (a platform-specific module Metro picks on web) draws the stream with a plain `<img>`.
- Plain-HTTP to a local device: `app.json` sets the Android cleartext flag via
  `expo-build-properties` and an iOS `NSAppTransportSecurity` exception, plus
  `NSLocalNetworkUsageDescription` (iOS 14+ local-network prompt text).

---

## 3. Architecture / file map

```
index.ts                     registerRootComponent(App)
App.tsx                      minimal cockpit: header row, slider + D-pad, drawer wiring
app.json                     Expo config: orientation, cleartext, bundle ids, iOS ATS
eas.json                     EAS build profiles (preview = APK, production = AAB)
src/config.ts                *** every address, tunable, wire-format name, default setting ***
src/settings.tsx             live settings context: AsyncStorage load/save, IPv4 check
src/theme.ts                 palette, mono/sans fonts, glow() helper, eyebrow style

src/robot/
  types.ts                   MoveDir ('F'|'B'|'L'|'R'|'S'), RobotStatus, parseStatus()
  client.ts                  fetchStatus() / sendMove() / sendStop(); configureRobot()
  mock.ts                    random-walk fake telemetry, MOCK_FAILURE_RATE, latency
  camera.ts                  buildStreamHtml() — the page loaded into the WebView

src/hooks/
  useRobotStatus.ts          1 s /status poll, link state, 60-sample temp history
  useDrive.ts                hold-to-repeat driving + every safety stop

src/components/
  HamburgerButton.tsx  StatusDot.tsx  DPad.tsx  SpeedSlider.tsx
  Drawer.tsx  SettingsPanel.tsx  FloatingCamera.tsx  EdgeGlow.tsx
  CameraView.tsx  LivePanel.tsx  TempChart.tsx  Panel.tsx  StarField.tsx
  CameraView.web.tsx         web-only camera panel (Metro platform resolution)
```

Data flow:

```mermaid
graph LR
  S[settings.tsx: AsyncStorage] -->|configureRobot useMock/IP| F
  S -->|useMock, robotIp| A
  A[useRobotStatus: 1s poll] -->|link, status, history| B[StatusDot / Drawer: LivePanel, TempChart]
  A -->|link| C[useDrive]
  D[DPad press/release] --> C
  E[SpeedSlider] --> C
  M[Drawer opens] -->|stop| C
  C -->|sendMove F/B/L/R/S| F[client.ts fetch]
  A -->|fetchStatus| F
  F -->|useMock| G[mock.ts]
  F -->|useMock=false, live robotIp| H[ESP32]
  I[CameraView -> WebView img] --> J[cameraIp:81/stream]
  S -->|cameraIp, useMock| I
```

---

## 4. The hardware contract (what the ESP32 must speak)

All of this is defined in `src/config.ts` and nowhere else.

```
GET http://192.168.4.1/move?dir=F|B|L|R|S&speed=0-255     # port 80 implied
GET http://192.168.4.1/status
      -> {"temp":<number>,"humidity":<number>,"distance":<number>}   # °C, %, cm
GET http://192.168.4.2:81/stream                           # multipart/x-mixed-replace MJPEG
```

- `dir=F` forward, `B` back, `L` left, `R` right, `S` stop.
- While a button is held the command is **resent every 100 ms** (`REPEAT_INTERVAL_MS`);
  the firmware therefore only needs to latch the last command — it does not need a
  watchdog, though a dead-man timeout on the firmware side is still good practice.
- `/status` is polled every 1000 ms with a 2000 ms timeout; 2 consecutive failures flip the
  link to `offline` (`FAILURES_BEFORE_OFFLINE`), which locks out the D-pad and force-sends `S`.
- Field/param **names** are remappable without touching any other file: `STATUS_FIELDS` and
  `MOVE_PARAMS` in `src/config.ts`. Endpoint *paths* are built in the same file, as functions of
  the live IP (`MOVE_URL(ip)`, `STATUS_URL(ip)`, `CAMERA_STREAM_URL(ip)`, `CAMERA_STREAM_PATH`),
  so an address edited in the drawer takes effect on the next request.
- `parseStatus()` (`src/robot/types.ts:20-45`) accepts numbers **or numeric strings**, and
  returns `null` for a malformed payload so a firmware change shows as "Unexpected /status
  payload" instead of `NaN` on screen.

---

## 5. Configuration — every knob

`src/config.ts` is the single source of truth.

| Setting | Default | Meaning |
| --- | --- | --- |
| `USE_MOCK` | `true` | fake all robot I/O, no network (seed for the drawer switch) |
| `ROBOT_IP` / `ROBOT_PORT` | `192.168.4.1` / `80` | drive + telemetry board (seed for Settings) |
| `CAMERA_IP` / `CAMERA_PORT` | `192.168.4.2` / `81` | MJPEG host (seed for Settings) |
| `CAMERA_STREAM_PATH` | `/stream` | MJPEG path |
| `MIN_SPEED` / `MAX_SPEED` / `DEFAULT_SPEED` | 0 / 255 / 150 | slider range |
| `REPEAT_INTERVAL_MS` | `100` | resend cadence while held |
| `STATUS_POLL_MS` | `1000` | `/status` cadence |
| `STATUS_TIMEOUT_MS` | `2000` | slow answer = failure |
| `MOVE_TIMEOUT_MS` | `800` | bounds an in-flight `/move`, so the dedupe guard cannot stick |
| `FAILURES_BEFORE_OFFLINE` | `2` | failed polls before red link |
| `OBSTACLE_WARNING_CM` | `15` | edge-glow threshold |
| `HISTORY_SIZE` | `60` | chart samples |
| `CAMERA_BOX_DEFAULT_WIDTH` | `240` | floating camera width (4:3 aspect preserved) |
| `CAMERA_BOX_MIN_WIDTH` | `140` | smallest floating camera |
| `CAMERA_BOX_MAX_WIDTH_RATIO` / `..._HEIGHT_RATIO` | `0.5` / `0.45` | resize caps, as a share of the screen |
| `SETTINGS_STORAGE_KEY` | `tacover.settings.v1` | AsyncStorage key for the settings blob |
| `STATUS_FIELDS` | `temp` / `humidity` / `distance` | JSON key mapping |
| `MOVE_PARAMS` | `dir` / `speed` | query-param mapping |

**Runtime settings live in the drawer** (`src/settings.tsx`): robot IP, camera IP, mock mode,
plus the floating camera's size and size-lock. They are written to AsyncStorage on every change
and read back *before the first `/status` poll*, so a changed address or the mock switch applies
immediately without a restart; `Reset to defaults` restores everything above. `src/config.ts`
stays the single source of **default** values — changing a default there only affects a fresh
install (or a reset), not an install that has already saved settings. The remaining knobs
(speeds, timings, wire-format names, camera-box clamps) are still file-only: edit and restart
Metro with a cleared cache.

```bash
npx expo start -c        # PowerShell: npx.cmd expo start -c
```

---

## 6. Running it

```bash
npm install
npx expo start           # a = Android emulator, i = iOS simulator (macOS only), w = browser,
                         # QR = Expo Go on any number of physical phones
npx tsc --noEmit         # typecheck
```

`npx expo start` is the dev-server workflow: it serves the JS bundle to Expo Go / the browser /
an emulator, and one server can feed several devices at once. **`npx expo run` is a different
thing** — it asks for a platform because it compiles and installs a *local native build* of the
app, which needs a real toolchain (JDK, Android SDK, `adb` / Xcode). Picking Android there
without a toolchain is the source of the *"Failed to resolve the Android SDK path"* +
*"'adb' is not recognized"* errors; `expo run` is never needed for this project, since every
native module it uses already ships inside Expo Go.

### 6.1 Prerequisites by target

| Target | Install on the laptop |
| --- | --- |
| Browser (fastest) | nothing — `npm run web` |
| Android phone + Expo Go | nothing |
| iPhone + Expo Go | nothing (App Store → Expo Go) |
| Android **emulator** | JDK 17 + Android Studio + SDK Platform 36 (Android 16 "Baklava") + Build-Tools + Platform-Tools + Android Emulator, then `ANDROID_HOME` and `Path`, then an AVD |
| iOS simulator / local iOS build | impossible on Windows — macOS + Xcode only |
| Local native dev build (`expo run:*`) | JDK 17 + Android Studio SDK + `adb` (Windows); Xcode (macOS) |
| Installable APK / iOS build | nothing local — EAS cloud (`npx eas-cli@latest build`) |

Android emulator setup on Windows (per the Expo "set up your environment" docs):

```powershell
winget install Microsoft.OpenJDK.17          # or: choco install -y microsoft-openjdk17
```

then install [Android Studio](https://developer.android.com/studio) → *Standard* setup; in
**SDK Manager** add *Android SDK Platform 36*, *Build-Tools*, *Platform-Tools*, *Android
Emulator*; set a user env var `ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk` and add
`%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `Path`; reopen the terminal;
create an AVD in **Device Manager**. Then `npx expo start` → `a` (Expo CLI installs Expo Go into
the emulator itself). JDK 17 is only strictly needed for Gradle/`expo run` builds — the
emulator + Expo Go path needs the SDK/tools, but installing the JDK now avoids the next wall.

`npx expo lint` is not usable here: it self-installs `eslint` + `eslint-config-expo` into
`package.json` and writes `eslint.config.js`, then dies with *"Cannot find module 'eslint'"* in
this environment. The repo has no ESLint configured, so treat `tsc --noEmit` as the check.

Mock mode is on out of the box, so a first run needs no hardware. To exercise failure paths,
set `MOCK_FAILURE_RATE` in `src/robot/mock.ts` above `0`.

Release/field APK:

```bash
npx eas-cli@latest build -p android --profile preview   # eas.json: buildType "apk"
```

---

## 7. Can it connect to an iPhone?

**Yes.** `react-native-webview` is bundled inside Expo Go for iOS (`inExpoGo: true`,
platforms `android`/`ios`/`expo-go` — Expo SDK 57 docs), and every other dependency is either
JS-only or also bundled. So iOS *development* needs no custom dev build:

1. Install **Expo Go** from the App Store on the iPhone.
2. Start Metro on the laptop, scan the QR code.
3. iOS 14+ will show a **Local Network** permission prompt the first time the app talks to
   `192.168.4.x` — allow it. (In Expo Go the prompt text is Expo's; in an `eas build` of this
   repo it is the `NSLocalNetworkUsageDescription` string in `app.json`.)

iOS caveats that are real, not theoretical:

- **Camera feed.** MJPEG is `multipart/x-mixed-replace`. Chromium (Android) renders it
  reliably; **WKWebView on iOS is inconsistent** with multipart streams. `CameraView.tsx` +
  `src/robot/camera.ts` handle this: the stream goes into an `<img>` inside a WebView document
  (not the WebView's `source` URL, which cannot do multipart), and if no frame decodes within
  8 s the panel shows the stream URL plus a **Retry** button instead of a blank rectangle.
  Expect iOS to need Retry sometimes; the rest of the app (drive + telemetry) is unaffected.
- **Metro over the robot's AP.** The ESP32's AP has no internet. If the phone is joined to it,
  it cannot reach the Metro dev server (and `--tunnel` needs internet, so it will not help).
  Two workarounds: put the **laptop on the same ESP32 AP** and serve Metro over that LAN
  (`npx expo start --host lan`), or — better for field use — install a **baked-in build** so no
  dev server is needed at runtime.
- **Installing an iOS build on a real device** needs an Apple Developer account ($99/yr) and
  registered device UDIDs or TestFlight; an iOS Simulator needs a Mac. Android is the
  frictionless path (`preview` profile produces a directly installable APK).

Recommended field setup either way: `eas build` once, install, then the only network the phone
needs is the robot's AP.

---

## 8. Seeing / configuring it from the laptop

Three options:

**A. Android emulator.** Requires an Android SDK + AVD (`ANDROID_HOME`). Not installed on
this machine: `ANDROID_HOME` is unset, `%LOCALAPPDATA%\Android` does not exist, no Android
Studio — so `npx expo start` → `a` fails with *"Failed to resolve the Android SDK path"* and
*"'adb' is not recognized"*. See §6.1 for the exact install list; once the SDK exists:
`npx expo start` → `a`.
- Mock mode works fully.
- With `USE_MOCK = false` **and the laptop joined to the ESP32's AP**, the emulator reaches
  `192.168.4.1` through the host's network, so you can drive/test the real car from the laptop.
- The camera uses the emulator's WebView (Chromium), so MJPEG usually renders.

**B. Browser on the laptop (no SDK install needed).**
```bash
npm run web        # = npx expo start --web; opens http://localhost:8081
```
The web dependencies (`react-dom`, `react-native-web`, `@expo/metro-runtime`) and a web camera
panel (`src/components/CameraView.web.tsx`) are wired up, so the whole HUD runs in Chromium —
mock mode included. Verified on this machine: the default screen (menu button, link dot, slider,
D-pad, no page scroll, both orientations), the drawer (slide, backdrop tap, stop-on-open), the
settings form (invalid IPv4 rejected inline, valid one saved, mock switch taking the link red
and locking the D-pad without a restart, reset to defaults), the floating camera (show/hide,
corner resize with the 140 floor and the 50%/45% caps, size lock, persistence across reload), the
obstacle edge glow (fades in below the threshold, `pointerEvents: none` so the pad still drives,
lit with the drawer open), hold-to-drive (`dir=F` immediately then every 100 ms, `dir=S` on
release), and both camera states (`playing` with a live MJPEG source, `error` + Retry when it is
down).
Browser caveat when talking to the **real** robot: browsers enforce CORS, so `GET /status`
fails unless the firmware sends `Access-Control-Allow-Origin: *`; the `/move` request still
reaches the device (only its response is unreadable). [INFERENCE — cannot be tested without
hardware; mock mode has no network at all.] So use the browser for UI work and mock driving,
and a phone/emulator for real telemetry.

**C. Mirror the phone.** Run it on the real phone (Expo Go) and mirror the screen to the
laptop: `scrcpy` (Android, USB/Wi-Fi) or QuickTime "Movie Recording" (iPhone, Mac). Input is
still on the laptop.

**Configuring.** Addresses, mock mode and the floating camera box are changed at runtime in the
drawer's Settings section and persist across launches; `Reset to defaults` returns them to
`src/config.ts`. Everything else (speeds, timings, wire-format names, camera-box clamps) is still
editing `src/config.ts` (plus `src/robot/mock.ts` for failure injection) and restarting Metro
with `-c`.

---

## 9. Linking to the real ESP32 when the parts arrive

The app already speaks plain HTTP to two hosts on the robot's Wi-Fi network. `192.168.4.1` is
the ESP32 SoftAP default gateway address, so an AP-mode ESP32 firmware lands there by default
[INFERENCE from the address choice; verify against your firmware].

### Firmware must expose

1. HTTP server on port 80, endpoints `/move` and `/status` exactly as in §4, JSON body only.
2. MJPEG server on port 81 at `/stream` (a separate ESP32-CAM board, or another interface).
3. `Content-Type: multipart/x-mixed-replace; boundary=...` on the stream, and the usual
   `Content-Type: image/jpeg` parts.

### Steps

1. Flash the firmware; confirm the robot's AP SSID and the two IPs (serial monitor).
2. From a laptop **on that AP**, verify before touching the app:
   ```bash
   curl http://192.168.4.1/status
   curl "http://192.168.4.1/move?dir=F&speed=150"
   curl "http://192.168.4.1/move?dir=S&speed=0"
   curl -v http://192.168.4.2:81/stream     # expect multipart/x-mixed-replace
   ```
3. In the app's drawer set `Mock mode` off, and fix `Robot IP` / `Camera IP` if the firmware
   differs from the `192.168.4.x` defaults (or edit the defaults in `src/config.ts` for a fresh
   install).
4. If the firmware's JSON keys differ, change `STATUS_FIELDS` only
   (e.g. `temperature: 'temperature'`) and restart with `npx expo start -c`.
5. Watch the connection dot: `Syncing` (amber) → `Linked` (green) means `/status` is parsed and
   sane, and the dot turns red after two failed polls. The last error string is shown in the
   drawer's Telemetry panel (`Network unreachable`, `No answer in 2s`, `HTTP 404`,
   `Malformed JSON`, `Unexpected /status payload`) — that string is your debugging breadcrumb.
6. Drive: the D-pad is locked until the link is green (`drive.enabled`).

### Wiring notes

- Two IPs are assumed. A single board serving both control and camera still works: point both
  `ROBOT_IP` and `CAMERA_IP` at the same host and adjust ports/paths.
- `speed` is 0–255 and is clamped in `client.ts` before it hits the wire.
- Keep the firmware tolerant of a *stream* of identical `dir` values — that is what hold-to-drive
  produces (10 requests/second while held).
- Android release builds would block cleartext HTTP without the `expo-build-properties` plugin
  in `app.json`; it is already configured, so nothing to add.

---

## 10. Programming concepts used here

**Main one: cancellation tokens via a generation counter — cancelling an async loop without
`clearInterval`.**

`useDrive.ts` runs a repeating loop while a direction is held (resend every 100 ms). It never
stores a timer handle. Instead `loopRef` is an ever-increasing integer; each loop instance
captures the generation it started in and refuses to continue if the counter has moved on:

```ts
const stop = () => { loopRef.current += 1; ... };           // invalidates any running loop
const press = (dir) => {
  loopRef.current += 1;
  const generation = loopRef.current;
  const repeat = () => {
    if (loopRef.current !== generation) return;             // stale → die silently
    if (activeRef.current !== null) sendMove(activeRef.current, speedRef.current);
    setTimeout(repeat, REPEAT_INTERVAL_MS);
  };
  setTimeout(repeat, REPEAT_INTERVAL_MS);
};
```

Why it matters: a scheduled `setTimeout` callback cannot be "un-scheduled" from the future, and
a captured variable would be a *stale closure* (it would see the old `active`/`speed`). Bumping
a counter and re-reading `ref`s makes every stale tick a no-op instead of a race, and makes
stop/re-press idempotent. This is the same idea as a cancellation token / `AbortController`
generation in async code.

Related concepts also present, each with a concrete use:

- **Discriminated-union result types instead of exceptions.** `StatusResult = {ok:true;status} |
  {ok:false;error}` (`client.ts:16`). `getJson` catches everything — including `AbortError` from
  `AbortController` — and returns a reason, so a dead robot can never crash the UI.
- **Self-scheduling loop instead of `setInterval`.** `useRobotStatus.ts:37,53` schedules the next
  poll *after* the current one settles, so a hung robot cannot pile requests up; `cancelled`
  flags the unmount. The effect is keyed on `useMock`/`robotIp`, so editing a setting restarts
  the loop against the new destination.
- **Refs to bridge React state and callbacks.** `useDrive` mirrors `speed`/`link`/`active` into
  refs so the event handlers and loops always read current values without re-creating callbacks
  (`speedRef.current = speed` on every render).
- **Optimistic UI / safety stop as policy.** A stop is sent on release, on `AppState !== 'active'`,
  on link `offline`, on unmount, and when the drawer opens — five independent paths, so no single
  missed event can leave the car driving.
- **Backpressure / in-flight dedupe.** `client.ts:72` keeps a module-level `inFlight` direction
  and skips re-sending the same direction while the previous request is still open. The release
  is bounded: the request is aborted after `MOVE_TIMEOUT_MS`, so a silent robot cannot pin the
  guard open and swallow later presses of that direction.
- **WebView ↔ native `postMessage` bridge.** `src/robot/camera.ts` injects a page whose `<script>`
  polls `img.naturalWidth` and posts `{type:'playing'|'error'}` back to RN; also an 8-second
  watchdog. `CameraView.tsx` memoizes the `source` object so the WebView is not reloaded each
  render.
- **Deterministic PRNG for stable decoration.** `StarField.tsx` uses `mulberry32(0x5eed1a)` so
  the star map is identical across launches and platforms (no `Math.random()` in render).
- **Config-as-contract.** Addresses, timings, and wire-format names live in one module, so
  firmware renames never leak into parsing, mocking, or the UI.

---

## 11. Known rough edges

Factual notes from reading the source, worth knowing before the hardware arrives:

1. The camera on iOS may require tapping **Retry** (WKWebView + multipart MJPEG); Android is
   reliable. Telemetry and driving are unaffected.
2. No navigation — the repo's `AGENTS.md` routing guidance refers to a multi-screen structure
   this app does not have yet. Everything else that was once listed here now exists: runtime
   settings (drawer), persistence via AsyncStorage, and a floating camera. The one thing that
   still does **not** persist is the slider position: speed resets to `DEFAULT_SPEED` on relaunch,
   and the floating camera is off on every launch by design.
3. Mock mode is the default (`USE_MOCK = true`); forgetting to flip it looks exactly like a
   working robot, except every camera surface is labelled `mock` and the drawer's Settings
   section shows `Mock mode` on. Flip it there — no restart, no config edit.
4. `app.json` sets `userInterfaceStyle: "dark"`. A local `expo prebuild` / `expo run` warns
   *"Install expo-system-ui in your project to enable this feature"* — only native dev/release
   builds care (Expo Go and web ignore it, and the UI is dark anyway). Add it with
   `npx expo install expo-system-ui` if you ever build a dev client.

Previously item 1 in this list was a real bug: `MOVE_TIMEOUT_MS` was declared and imported but
never used, so `sendMove`'s `inFlight` guard could be pinned open forever by a `/move` request
that never answered — repeats of that one direction were then silently dropped while other
directions still worked. Fixed in `src/robot/client.ts` (AbortController bounded by
`MOVE_TIMEOUT_MS`, released in `finally`). Measured, against a local server: a silent robot gave
1 request per 2 s hold before and 3 after; a slow-but-answering robot gives 4, i.e. the
skip-while-in-flight behaviour is still intact.
