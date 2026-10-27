/* Screenshot Frame — layout() does the geometry, render() draws it; preview and export share both. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var PREVIEW = 1100, MAX_SIDE = 8192;
  var BGS = [
    ["Ocean", "#3dd6d0", "#3b5bdb"], ["Sunset", "#ff9a6b", "#ff5e7e"], ["Grape", "#7b6cf6", "#e45fd6"], ["Peach", "#ffd59a", "#ff8a8a"],
    ["Mint", "#b8f5d0", "#3dd6d0"], ["Night", "#1d2b4f", "#5b3c88"], ["Sky", "#a1c4fd", "#c2e9fb"], ["Fire", "#f7b733", "#fc4a1a"],
    ["Forest", "#134e3a", "#3fa66b"], ["White", "#ffffff", "#ffffff"], ["Light grey", "#eef0f3", "#eef0f3"], ["Black", "#111418", "#111418"],
    ["Transparent", null, null]
  ];
  var DEF = { bg: 0, c1: "#3dd6d0", c2: "#3b5bdb", angle: 135, pad: 8, radius: 12, shadow: 55, frame: "none", title: "", aspect: "auto", scale: 2 };
  var st = Object.assign({}, DEF, S3.store("sf.settings") || {});
  var img = null, imgName = "screenshot";
  var cv = $("#cv");

  // ---------- geometry (base units = screenshot pixels) ----------
  function layout(w, h, s) {
    var u = Math.max(w, h) / 100, bar = s.frame === "none" ? 0 : Math.max(24, Math.round(u * 3.8));
    var ww = w, wh = h + bar, pad = Math.round(u * s.pad), cw = ww + 2 * pad, ch = wh + 2 * pad;
    if (s.aspect !== "auto") {
      var p = s.aspect.split(":"), R = p[0] / p[1];
      if (cw / ch < R) cw = Math.round(ch * R); else ch = Math.round(cw / R);
    }
    return { cw: cw, ch: ch, x: Math.round((cw - ww) / 2), y: Math.round((ch - wh) / 2), ww: ww, wh: wh, bar: bar, u: u, radius: s.radius * u / 10 };
  }
  // CSS linear-gradient geometry: 0deg points up, 90deg points right.
  function gradLine(W, H, deg) {
    var a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * dx) + Math.abs(H * dy);
    return [W / 2 - dx * len / 2, H / 2 - dy * len / 2, W / 2 + dx * len / 2, H / 2 + dy * len / 2];
  }
  function exportScale(L, s) { return Math.min(s.scale, MAX_SIDE / Math.max(L.cw, L.ch)); }
  function bgColors(s) { var b = BGS[s.bg]; return s.bg === -1 ? [s.c1, s.c2] : b ? [b[1], b[2]] : [null, null]; }

  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function render(canvas, source, s, k) {
    var w = source.naturalWidth || source.width, h = source.naturalHeight || source.height, L = layout(w, h, s);
    canvas.width = Math.max(1, Math.round(L.cw * k)); canvas.height = Math.max(1, Math.round(L.ch * k));
    var c = canvas.getContext("2d"), cols = bgColors(s);
    c.setTransform(canvas.width / L.cw, 0, 0, canvas.height / L.ch, 0, 0);
    if (cols[0]) {
      if (cols[0] === cols[1]) c.fillStyle = cols[0];
      else { var g = gradLine(L.cw, L.ch, s.angle), gr = c.createLinearGradient(g[0], g[1], g[2], g[3]); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); c.fillStyle = gr; }
      c.fillRect(0, 0, L.cw, L.ch);
    }
    var dark = s.frame === "dark", barCol = dark ? "#2a2d33" : "#eceef1";
    // Compose the window (bar + screenshot, rounded) on its own canvas so the shadow follows its real alpha.
    var win = document.createElement("canvas"), sx = canvas.width / L.cw;
    win.width = Math.max(1, Math.round(L.ww * sx)); win.height = Math.max(1, Math.round(L.wh * sx));
    var wc = win.getContext("2d");
    wc.setTransform(win.width / L.ww, 0, 0, win.height / L.wh, 0, 0);
    rr(wc, 0, 0, L.ww, L.wh, L.radius); wc.clip();
    if (L.bar) {
      wc.fillStyle = barCol; wc.fillRect(0, 0, L.ww, L.bar);
      var dr = L.bar * 0.13, cy = L.bar / 2;
      ["#ff5f57", "#febc2e", "#28c840"].forEach(function (col, i) { wc.fillStyle = col; wc.beginPath(); wc.arc(L.bar * 0.6 + i * dr * 3.3, cy, dr, 0, 7); wc.fill(); });
      if (s.title) {
        wc.fillStyle = dark ? "#a5adb9" : "#5b6370"; wc.font = "500 " + (L.bar * 0.36) + 'px Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
        wc.textAlign = "center"; wc.textBaseline = "middle";
        wc.fillText(s.title, L.ww / 2, cy, Math.max(10, L.ww - L.bar * 4));
      }
    }
    wc.imageSmoothingQuality = "high";
    wc.drawImage(source, 0, L.bar, w, h);
    c.save();
    if (s.shadow > 0) {
      var t = s.shadow / 100;
      c.shadowColor = "rgba(0,0,0," + (0.22 + t * 0.33).toFixed(3) + ")";
      c.shadowBlur = t * 7 * L.u * sx; c.shadowOffsetY = t * 2.2 * L.u * sx; // shadow units ignore the transform
    }
    c.drawImage(win, L.x, L.y, L.ww, L.wh);
    c.restore();
    if (L.bar) { // hairline edge so the window reads on similar backgrounds
      rr(c, L.x + 0.5, L.y + 0.5, L.ww - 1, L.wh - 1, L.radius); c.lineWidth = Math.max(1, L.u * 0.08);
      c.strokeStyle = dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.10)"; c.stroke();
    }
    return L;
  }

  // ---------- UI ----------
  function persist() { S3.store("sf.settings", st); }
  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === String(value)));
      b.addEventListener("click", function () { $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); onPick(b.dataset.v); });
    });
  }
  BGS.forEach(function (b, i) {
    var style = b[1] ? (b[1] === b[2] ? "background:" + b[1] : "background:linear-gradient(135deg," + b[1] + "," + b[2] + ")") : "";
    var btn = S3.h("button", { "class": "sf-bg" + (b[1] ? "" : " checker"), style: style, title: b[0], "aria-label": b[0], "aria-pressed": String(st.bg === i) });
    btn.addEventListener("click", function () { st.bg = i; if (b[1]) { st.c1 = b[1]; st.c2 = b[2]; $("#c1").value = b[1]; $("#c2").value = b[2]; } update(); });
    $("#bgs").appendChild(btn);
  });
  ["c1", "c2"].forEach(function (k) {
    $("#" + k).value = st[k];
    $("#" + k).addEventListener("input", function () { st[k] = this.value; st.bg = -1; update(); });
  });
  [["angle", "aLbl", "°"], ["pad", "pLbl", ""], ["radius", "rLbl", ""], ["shadow", "sLbl", ""]].forEach(function (p) {
    var el = $("#" + p[0]); el.value = st[p[0]];
    el.addEventListener("input", function () { st[p[0]] = +el.value; update(); });
  });
  $("#title").value = st.title;
  $("#title").addEventListener("input", function () { st.title = this.value; update(); });
  seg($("#frame"), st.frame, function (v) { st.frame = v; update(); });
  seg($("#aspect"), st.aspect, function (v) { st.aspect = v; update(); });
  seg($("#scale"), st.scale, function (v) { st.scale = +v; update(); });

  var queued = false;
  function update() {
    persist();
    $$(".sf-bg").forEach(function (b, i) { b.setAttribute("aria-pressed", String(st.bg === i)); });
    $("#aLbl").textContent = st.angle + "°"; $("#pLbl").textContent = st.pad + "%"; $("#rLbl").textContent = st.radius; $("#sLbl").textContent = st.shadow + "%";
    $("#titleWrap").hidden = st.frame === "none";
    if (!img || queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, L = layout(w, h, st);
      render(cv, img, st, Math.min(1, PREVIEW / Math.max(L.cw, L.ch)));
      var k = exportScale(L, st);
      $("#meta").textContent = "Export: " + Math.round(L.cw * k) + " × " + Math.round(L.ch * k) + " px PNG" + (k < st.scale ? " (capped at " + MAX_SIDE + " px)" : "");
    });
  }

  function setImage(source, name) {
    img = source; imgName = name || "screenshot";
    $("#drop").hidden = true; $("#editor").hidden = false; update();
  }
  var lastUrl = null;
  function openFile(f) {
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () { if (lastUrl) URL.revokeObjectURL(lastUrl); lastUrl = url; setImage(im, (f.name || "screenshot").replace(/\.[^.]+$/, "")); };
    im.onerror = function () { URL.revokeObjectURL(url); S3.toast("Couldn't read that image", "error"); };
    im.src = url;
  }
  var input = S3.drop($("#drop"), function (fs) { openFile(fs[0]); }, { accept: "image/*", multiple: false });
  $("#newImg").addEventListener("click", function () { input.click(); });
  document.addEventListener("paste", function (e) {
    var it = Array.prototype.slice.call((e.clipboardData && e.clipboardData.items) || []).filter(function (x) { return x.type.indexOf("image/") === 0; })[0];
    if (it) { e.preventDefault(); var f = it.getAsFile(); if (f) openFile(f); }
    else if (!/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) S3.toast("No image on the clipboard. Take a screenshot first, then paste.", "error");
  });
  var stage = $("#stage");
  stage.addEventListener("dragover", function (e) { e.preventDefault(); });
  stage.addEventListener("drop", function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) openFile(f); });

  function exportBlob() {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement("canvas");
    render(c, img, st, exportScale(layout(w, h, st), st));
    return new Promise(function (res, rej) { c.toBlob(function (b) { if (b) res(b); else rej(new Error("Your browser couldn't encode this size")); }, "image/png"); });
  }
  $("#dl").addEventListener("click", function () {
    if (!img) return;
    exportBlob().then(function (b) { S3.download(b, imgName + "-framed@" + st.scale + "x.png"); S3.done(); }, function (e) { S3.toast(e.message, "error"); });
  });
  $("#copy").addEventListener("click", function () {
    if (!img) return;
    if (!navigator.clipboard || !window.ClipboardItem || !window.isSecureContext) { S3.toast("Your browser can't copy images here. Use Download instead.", "error"); return; }
    // Passing the promise keeps Safari's user-gesture requirement happy.
    navigator.clipboard.write([new ClipboardItem({ "image/png": exportBlob() })])
      .then(function () { S3.toast("Image copied ✓"); S3.done(); }, function () { S3.toast("Copy was blocked by the browser. Use Download instead.", "error"); });
  });
  update();

  // ---------- sample screenshot, drawn locally ----------
  function sample() {
    var c = document.createElement("canvas"); c.width = 1280; c.height = 780;
    var x = c.getContext("2d"), i;
    x.fillStyle = "#f7f8fa"; x.fillRect(0, 0, 1280, 780);
    x.fillStyle = "#1c2230"; x.fillRect(0, 0, 230, 780);
    x.fillStyle = "#3dd6d0"; x.beginPath(); x.arc(42, 44, 14, 0, 7); x.fill();
    x.fillStyle = "#e9edf3"; x.font = "600 18px Inter, system-ui, sans-serif"; x.fillText("Acme Analytics", 66, 50);
    ["Overview", "Reports", "Customers", "Billing", "Settings"].forEach(function (t, j) {
      if (j === 0) { x.fillStyle = "rgba(61,214,208,.16)"; x.fillRect(14, 92, 202, 40); }
      x.fillStyle = j === 0 ? "#3dd6d0" : "#9aa4b5"; x.font = "500 15px Inter, system-ui, sans-serif"; x.fillText(t, 32, 118 + j * 48);
    });
    x.fillStyle = "#12161b"; x.font = "700 26px Inter, system-ui, sans-serif"; x.fillText("Overview", 270, 64);
    x.fillStyle = "#6b7482"; x.font = "400 15px Inter, system-ui, sans-serif"; x.fillText("Last 30 days", 270, 90);
    [["Revenue", "$48,210", "#0e9f9a"], ["Customers", "1,284", "#3b5bdb"], ["Churn", "2.1%", "#e8590c"]].forEach(function (k, j) {
      var bx = 270 + j * 330; x.fillStyle = "#fff"; x.fillRect(bx, 120, 305, 120); x.strokeStyle = "#e3e7ee"; x.strokeRect(bx + .5, 120.5, 305, 120);
      x.fillStyle = "#6b7482"; x.font = "500 14px Inter, system-ui, sans-serif"; x.fillText(k[0], bx + 22, 154);
      x.fillStyle = "#12161b"; x.font = "700 32px Inter, system-ui, sans-serif"; x.fillText(k[1], bx + 22, 200);
      x.fillStyle = k[2]; x.fillRect(bx + 22, 218, 80, 4);
    });
    x.fillStyle = "#fff"; x.fillRect(270, 266, 965, 470); x.strokeStyle = "#e3e7ee"; x.strokeRect(270.5, 266.5, 965, 470);
    x.fillStyle = "#12161b"; x.font = "600 17px Inter, system-ui, sans-serif"; x.fillText("Monthly revenue", 296, 304);
    for (i = 0; i < 12; i++) {
      var hh = 90 + Math.round(260 * (0.5 + 0.5 * Math.sin(i / 1.9 + 0.6)) * (0.6 + i / 30));
      var gr = x.createLinearGradient(0, 700 - hh, 0, 700); gr.addColorStop(0, "#3dd6d0"); gr.addColorStop(1, "#0e9f9a");
      x.fillStyle = gr; x.fillRect(306 + i * 76, 700 - hh, 46, hh);
    }
    return c;
  }
  window.S3_DEMO = function () {
    Object.assign(st, { bg: 2, angle: 135, pad: 8, radius: 14, shadow: 60, frame: "dark", title: "acme.example/overview", aspect: "auto", scale: 2 });
    $("#title").value = st.title; ["pad", "radius", "shadow", "angle"].forEach(function (k) { $("#" + k).value = st[k]; });
    $$("#frame button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === "dark")); });
    setImage(sample(), "sample");
  };

  window.S3_SELFTEST = function () {
    var a = layout(1000, 500, Object.assign({}, DEF, { pad: 10, frame: "none", aspect: "auto" }));
    var b = layout(1000, 500, Object.assign({}, DEF, { pad: 10, frame: "none", aspect: "1:1" }));
    var f = layout(1000, 500, Object.assign({}, DEF, { pad: 10, frame: "light", aspect: "auto" }));
    var p = layout(1000, 500, Object.assign({}, DEF, { pad: 0, aspect: "4:5" }));
    var g = gradLine(100, 50, 90), g0 = gradLine(100, 50, 180);
    var big = layout(6000, 3000, DEF);
    function solid(col, w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); x.fillStyle = col; x.fillRect(0, 0, w, h); return c; }
    var out = document.createElement("canvas"), src = solid("#00ff00", 100, 50);
    render(out, src, Object.assign({}, DEF, { bg: 11, pad: 10, shadow: 0, radius: 0 }), 1);
    var x = out.getContext("2d"), corner = x.getImageData(1, 1, 1, 1).data, mid = x.getImageData(60, 35, 1, 1).data;
    var tr = document.createElement("canvas");
    render(tr, src, Object.assign({}, DEF, { bg: 12, pad: 10, shadow: 0 }), 2);
    var tcorner = tr.getContext("2d").getImageData(0, 0, 1, 1).data;
    return a.cw === 1200 && a.ch === 700 && a.x === 100 && a.y === 100 &&
      b.cw === 1200 && b.ch === 1200 && b.y === 350 &&
      f.bar === 38 && f.ch === 738 && f.wh === 538 &&
      p.cw === 1000 && p.ch === 1250 &&
      Math.abs(g[0]) < 1e-9 && Math.abs(g[1] - 25) < 1e-9 && Math.abs(g[2] - 100) < 1e-9 && Math.abs(g0[1]) < 1e-9 && Math.abs(g0[3] - 50) < 1e-9 &&
      Math.max(big.cw, big.ch) * exportScale(big, DEF) <= MAX_SIDE + 1e-6 &&
      out.width === 120 && out.height === 70 && corner[0] === 17 && corner[1] === 20 && corner[2] === 24 &&
      mid[0] === 0 && mid[1] === 255 && mid[2] === 0 && tr.width === 240 && tcorner[3] === 0;
  };
})();
