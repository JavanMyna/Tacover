const CAMERA_BG = '#05060E';

/**
 * Document rendered inside the WebView. A multipart/x-mixed-replace stream
 * cannot be handed to <WebView source={{uri}}/> directly, so the stream URL is
 * loaded into an <img> and the page reports back through postMessage:
 *
 *   {type:'playing'} — a frame decoded (naturalWidth > 0)
 *   {type:'error'}   — the stream errored, or produced no frame within 8s
 */
export function buildStreamHtml(streamUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>
  html, body { margin:0; padding:0; height:100%; background:${CAMERA_BG}; overflow:hidden; }
  #wrap { position:fixed; left:0; top:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; }
  #stream { width:100%; height:100%; object-fit:contain; display:block; }
</style>
</head>
<body>
<div id="wrap"><img id="stream" alt=""/></div>
<script>
(function () {
  var img = document.getElementById('stream');
  var playingReported = false;
  var settled = false;
  var ticks = 0;

  function post(type) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: type })); } catch (e) {}
  }

  function markPlaying() {
    if (img.naturalWidth > 0 && !playingReported) {
      playingReported = true;
      settled = true;
      post('playing');
    }
  }

  img.onload = markPlaying;
  img.onerror = function () { settled = true; post('error'); };

  var timer = setInterval(function () {
    markPlaying();
    ticks += 1;
    if (settled || ticks > 8) {
      clearInterval(timer);
      if (!playingReported) post('error');
    }
  }, 1000);

  img.src = ${JSON.stringify(streamUrl)};
})();
</script>
</body>
</html>`;
}
