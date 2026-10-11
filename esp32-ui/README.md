# esp32-ui

One self-contained page for the rover's ESP32 web server. `index.html` is the
readable source; everything it needs — styles, script, inline SVG icons, the
hand-drawn canvas chart — lives in that single file. No CDN, no web fonts, no
images, no framework, no bundler, no internet.

Ported from the Expo app in `../src` (theme colours/radii, D-pad, edge glow,
floating camera, drawer, chart, settings). Firmware contract: see
`Arduino/roverDraft2-sketch/roverDraft2-sketch.ino`.

## Build

Rebuild the embedded copy after editing `index.html`:

    node esp32-ui/build.mjs

The script strips comments/whitespace, gzips at level 9 with `node:zlib`, and
writes `index_html.h` (**raw 33816 B, gzip 9599 B**). Copy `index_html.h` next
to the Arduino `.ino`; the sketch just includes it:

    #include "index_html.h"
    ...
    server.sendHeader("Content-Encoding", "gzip");
    server.send_P(200, "text/html", (const char*)INDEX_HTML_GZ, INDEX_HTML_GZ_LEN);

Join the ESP32's own Wi-Fi and open its AP address (192.168.4.1) in the phone's
browser — everything is same-origin and works with no internet.

## Test without hardware

    node esp32-ui/fake-rover.mjs

Serves the real (minified) page at `http://127.0.0.1:8080/`, answers
`/drive`, `/stop` and `/status` with the same contract as the firmware, and
serves an MJPEG feed from `fake-cam/*.jpg` on port 81. Unlike the firmware, it
also reports `temperature` and `humidity`, so the trend chart is exercisable —
the real `/status` has neither and the page shows **No sensor** instead.

Flags: `--port`, `--cam-port`, `--no-camera`. Dev-only helpers the page never
calls: `/_state` (commands received) and `/_set?distance=10&blocked=1&notemp=1`
(pin telemetry, e.g. to force the obstacle warning or the no-sensor path).

In the page's Settings set **Camera address** to `127.0.0.1` (port 81 is fixed).

## Firmware pairing

| Device | Address | Notes |
| --- | --- | --- |
| Rover ESP32 | `192.168.4.1:80` | SoftAP `Rover-Planet`, serves this page |
| ESP32-CAM | `192.168.4.50:81` | fixed IP on the rover's subnet, `/stream` |
| Phone | ~`192.168.4.2` | DHCP; the CAM's `.50` cannot clash |

The CAM sketch may also be pointed at `host:port` from Settings, e.g. the fake
camera on another machine.

## Contract reminders

- `/drive?x=&y=` is resent every **150 ms** while a button is held; the firmware's
  failsafe is **500 ms** (`FAILSAFE_MS`), so it never cuts out mid-drive.
- The obstacle warning fires on `blocked` or `distance <= 20 cm` (`STOP_CM`).
- Request bodies are drained explicitly: the ESP32 `WebServer` handles one client
  at a time, so no socket is left half-read.
