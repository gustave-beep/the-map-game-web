(function () {
  var boot = document.getElementById("boot").dataset;
  var canvas = document.getElementById("game");
  var screen = document.getElementById("screen");
  var bar = document.getElementById("bar");
  var note = document.getElementById("note");
  var CACHE = "map-game-files";

  function fail(title, text) {
    screen.className = "screen failed";
    screen.getElementsByTagName("h1")[0].textContent = title;
    note.textContent = text;
  }

  var touch = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (touch) {
    fail("Open this on a computer", "The game is played with a keyboard and mouse, so it does not run on phones or tablets.");
    return;
  }
  if (!navigator.gpu) {
    fail("This browser cannot run the game", "The game needs WebGPU. Use a current version of Chrome or Edge, or Safari 26 or newer.");
    return;
  }

  navigator.gpu.requestAdapter().then(function (adapter) {
    if (!adapter) {
      fail("No usable graphics card was found", "The browser could not reach a graphics adapter that supports WebGPU. Updating the graphics driver or the browser may help.");
      return;
    }
    start();
  }, function () {
    fail("No usable graphics card was found", "The browser could not reach a graphics adapter that supports WebGPU.");
  });

  // The game's data is cut into pieces small enough for any static host. Each piece is kept in the browser's cache,
  // so the next visit starts without downloading anything.
  function downloadPiece(url, size, cache, onBytes) {
    return (cache ? cache.match(url) : Promise.resolve(undefined)).then(function (hit) {
      if (hit) return hit.blob().then(function (blob) {
        if (blob.size !== size) return cache.delete(url).then(function () { return downloadPiece(url, size, cache, onBytes); });
        onBytes(blob.size); return blob;
      });
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
        var reader = response.body.getReader(), parts = [];
        function pump() {
          return reader.read().then(function (step) {
            if (step.done) return new Blob(parts);
            parts.push(step.value); onBytes(step.value.length);
            return pump();
          });
        }
        return pump().then(function (blob) {
          if (blob.size !== size) throw new Error("Incomplete download of " + url);
          if (cache) return cache.put(url, new Response(blob)).catch(function () {}).then(function () { return blob; });
          return blob;
        });
      });
    });
  }

  function loadData() {
    return fetch(boot.data + ".parts.json").then(function (response) {
      if (!response.ok) return { url: boot.data, revoke: false };
      return response.json().then(function (manifest) {
        var opened = window.caches ? caches.open(CACHE).catch(function () { return null; }) : Promise.resolve(null);
        return opened.then(function (cache) {
          var done = 0, names = manifest.parts.map(function (part) { return part.file; });
          function onBytes(count) {
            done += count;
            bar.style.width = Math.min(100, Math.round(done / manifest.size * 100)) + "%";
          }
          // Two pieces at a time keeps a fast connection busy without swamping a slow one.
          var blobs = new Array(manifest.parts.length), next = 0;
          function worker() {
            if (next >= manifest.parts.length) return Promise.resolve();
            var index = next++, part = manifest.parts[index];
            return downloadPiece("Build/" + part.file, part.size, cache, onBytes).then(function (blob) { blobs[index] = blob; return worker(); });
          }
          return Promise.all([worker(), worker()]).then(function () {
            if (cache) cache.keys().then(function (keys) {
              keys.forEach(function (key) {
                if (names.indexOf(key.url.split("/").pop()) < 0) cache.delete(key);
              });
            });
            return { url: URL.createObjectURL(new Blob(blobs)), revoke: true };
          });
        });
      });
    });
  }

  function start() {
    // The game uses the right mouse button for orders and camera movement.
    canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    // Keep the tutorial shortcut in the game instead of opening browser help.
    window.addEventListener("keydown", function (event) { if (event.key === "F1") event.preventDefault(); });
    loadData().then(function (data) {
      note.textContent = "Starting up...";
      bar.style.width = "100%";
      var config = {
        arguments: [],
        dataUrl: data.url,
        frameworkUrl: boot.framework,
        streamingAssetsUrl: "StreamingAssets",
        companyName: boot.company,
        productName: boot.product,
        productVersion: boot.version,
        autoSyncPersistentDataPath: true,
        // The data is already cached piece by piece above; a one-off object URL must not be cached again.
        cacheControl: function () { return "no-store"; },
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5)
      };
      if (boot.code) config.codeUrl = boot.code;
      return createUnityInstance(canvas, config).then(function () {
        if (data.revoke) URL.revokeObjectURL(data.url);
        screen.style.display = "none";
        canvas.focus();
      });
    }).catch(function (error) {
      fail("The game could not start", "Check your connection and reload the page. (" + String(error) + ")");
    });
  }
})();
