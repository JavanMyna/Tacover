#!/usr/bin/env node
/*
 * Fake rover for testing esp32-ui/index.html without hardware.
 *
 * Serves, on one process:
 *   http://127.0.0.1:8080/          the real (minified) esp32-ui page
 *   http://127.0.0.1:8080/status    /drive, /stop, /status — same contract as the firmware
 *   http://127.0.0.1:81/stream      an MJPEG feed from esp32-ui/fake-cam/*.jpg
 *
 * Plus two dev-only helpers the page never calls:
 *   /_state                          what the page has sent so far
 *   /_set?distance=10&blocked=1      pin telemetry (e.g. to test the obstacle warning)
 *
 * Unlike the firmware, this fake also reports temperature and humidity, so the
 * trend chart is exercisable — the real /status has no temperature and the page
 * shows "No sensor" instead.
 *
 *   node esp32-ui/fake-rover.mjs [--port 8080] [--cam-port 81] [--no-camera]
 *
 * In the page's Settings, set Camera address to 127.0.0.1 (port 81 is fixed).
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "./build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── args ─────────────────────────────────────────────────────────────── */
function flag(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
}
const PORT = flag("port", 8080);
const CAM_PORT = flag("cam-port", 81);
const WITH_CAMERA = process.argv.indexOf("--no-camera") < 0;

/* ── state ────────────────────────────────────────────────────────────── */
const state = {
  targetX: 0,
  targetY: 0,
  distance: 120,
  left: 90,
  right: 90,
  temperature: 24.5,
  humidity: 51,
  blocked: false,
  drives: [],
  stops: 0,
  forced: null, // { distance?, blocked? } while /_set is in effect
};

const walk = (v, step, min, max) => Math.min(max, Math.max(min, v + (Math.random() - 0.5) * 2 * step));

setInterval(() => {
  state.temperature = walk(state.temperature, 0.35, 15, 38);
  state.humidity = walk(state.humidity, 1.2, 20, 85);
  state.distance = Math.round(walk(state.distance, 28, 6, 260));
  state.left = Math.round(walk(state.left, 12, 10, 220));
  state.right = Math.round(walk(state.right, 12, 10, 220));
  state.blocked = state.distance <= 20;
}, 500);

/* ── the page, exactly as it ships (minified), read fresh each request ── */
const page = () => minify(readFileSync(join(HERE, "index.html"), "utf8"));

/* ── fake camera frames ───────────────────────────────────────────────── */
const FRAMES = WITH_CAMERA
  ? readdirSync(join(HERE, "fake-cam"))
      .filter((f) => f.endsWith(".jpg"))
      .sort()
      .map((f) => readFileSync(join(HERE, "fake-cam", f)))
  : [];

/* ── rover server ─────────────────────────────────────────────────────── */
const rover = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const send = (code, type, body) => {
    res.writeHead(code, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
    res.end(body);
  };

  if (path === "/") return send(200, "text/html; charset=utf-8", page());
  if (path === "/favicon.ico") { res.writeHead(204); return res.end(); }

  if (path === "/drive") {
    state.targetX = Math.max(-100, Math.min(100, Number(url.searchParams.get("x")) || 0));
    state.targetY = Math.max(-100, Math.min(100, Number(url.searchParams.get("y")) || 0));
    state.drives.push({ t: Date.now(), x: state.targetX, y: state.targetY });
    if (state.drives.length > 200) state.drives.shift();
    return send(200, "text/plain", "ok");
  }
  if (path === "/stop") {
    state.targetX = 0; state.targetY = 0; state.stops += 1;
    return send(200, "text/plain", "ok");
  }
  if (path === "/status") {
    const forced = state.forced || {};
    const body = {
      distance: forced.distance !== undefined ? forced.distance : state.distance,
      blocked: forced.blocked !== undefined ? forced.blocked : state.blocked,
      left: state.left,
      right: state.right,
    };
    // The real firmware sends no temperature/humidity; this mirrors that.
    if (!forced.notemp) {
      body.temperature = Math.round(state.temperature * 10) / 10;
      body.humidity = Math.round(state.humidity);
    }
    return send(200, "application/json", JSON.stringify(body));
  }
  if (path === "/_state") {
    return send(200, "application/json", JSON.stringify({
      targetX: state.targetX, targetY: state.targetY, stops: state.stops,
      drives: state.drives.slice(-20), temperature: state.temperature, distance: state.distance,
    }));
  }
  if (path === "/_set") {
    state.forced = {};
    if (url.searchParams.has("distance")) state.forced.distance = Number(url.searchParams.get("distance"));
    if (url.searchParams.has("blocked")) state.forced.blocked = url.searchParams.get("blocked") === "1";
    if (url.searchParams.has("notemp")) state.forced.notemp = url.searchParams.get("notemp") === "1";
    if (url.searchParams.has("clear")) state.forced = null;
    return send(200, "application/json", JSON.stringify({ forced: state.forced }));
  }
  send(404, "text/plain", "not found");
});

/* ── camera server (MJPEG on /stream, port 81 like the CAM) ───────────── */
const camera = WITH_CAMERA
  ? createServer((req, res) => {
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/stream") {
        res.writeHead(200, {
          "Content-Type": "multipart/x-mixed-replace; boundary=frame",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        let i = 0;
        const tick = setInterval(() => {
          const frame = FRAMES[i++ % FRAMES.length];
          if (!res.write("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + frame.length + "\r\n\r\n")) return;
          res.write(frame);
          res.write("\r\n");
        }, 125);
        req.on("close", () => clearInterval(tick));
        return;
      }
      if (path === "/photo") {
        res.writeHead(200, { "Content-Type": "image/jpeg", "Access-Control-Allow-Origin": "*" });
        return res.end(FRAMES[0]);
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<body style='margin:0;background:#05060E'><img src='/stream' style='width:100%'></body>");
    })
  : null;

/* ── go ───────────────────────────────────────────────────────────────── */
rover.listen(PORT, "127.0.0.1", () => {
  console.log("fake rover   http://127.0.0.1:" + PORT + "/   (proxy this to the phone if needed)");
  console.log("  /drive /stop /status, plus /_state and /_set");
  if (WITH_CAMERA) {
    camera.listen(CAM_PORT, "127.0.0.1", () => {
      console.log("fake camera  http://127.0.0.1:" + CAM_PORT + "/stream   (set Camera address to 127.0.0.1)");
    });
  } else {
    console.log("fake camera  disabled (--no-camera)");
  }
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    rover.close();
    if (camera) camera.close();
    process.exit(0);
  });
}
