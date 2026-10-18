(function () {
  "use strict";

  var cv = document.getElementById("cv");
  var ctx = cv.getContext("2d");
  var W = cv.width;
  var H = cv.height;
  var cx = W / 2;
  var cy = H / 2;

  function toX(wx) {
    return cx + wx;
  }

  function toY(wy) {
    return cy - wy;
  }

  var C = {
    parent: "#9ece6a",
    accent: "#7aa2f7",
    grid: "#292e42",
    axis: "#414868",
    ink: "#c0caf5"
  };

  var shape = [
    [-64, -6],
    [-24, -6],
    [-24, -14],
    [0, 0],
    [-24, 14],
    [-24, 6],
    [-64, 6]
  ];
  var nose = [0, 0];
  var ORIGIN = [0, 0];

  var playing = false;
  var progress = 0;
  var raf = 0;
  var last = 0;
  var elapsed = 0;

  // Animation timing: tween each of the 2 steps, then hold before the next one.
  var STEPS = 2;
  var TWEEN = 700;
  var HOLD = 250;

  function totalMs() {
    return STEPS * (TWEEN + HOLD);
  }

  function progressAt(el) {
    var t = 0;
    var i;
    for (i = 0; i < STEPS; i++) {
      if (el < t + TWEEN) {
        return (i + (el - t) / TWEEN) / STEPS;
      }
      t += TWEEN;
      if (i < STEPS - 1) {
        if (el < t + HOLD) {
          return (i + 1) / STEPS;
        }
        t += HOLD;
      }
    }
    return 1;
  }

  var ids = ["pa", "ptx", "pty", "ca", "ctx", "cty"];
  var els = {};
  ids.forEach(function (id) {
    els[id] = document.getElementById(id);
  });

  var outs = {
    pa: "oPa",
    ptx: "oPtx",
    pty: "oPty",
    ca: "oCa",
    ctx: "oCtx",
    cty: "oCty"
  };
  var playBtn = document.getElementById("play");

  function num(id) {
    return parseFloat(els[id].value);
  }

  function deg(id) {
    return num(id) * Math.PI / 180;
  }

  function rot(p, a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    return [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  }

  function add(p, q) {
    return [p[0] + q[0], p[1] + q[1]];
  }

  // L: child-local -> parent space.  P: parent space -> world.
  function L(p) {
    return add(rot(p, deg("ca")), [num("ctx"), num("cty")]);
  }

  function P(p) {
    return add(rot(p, deg("pa")), [num("ptx"), num("pty")]);
  }

  function world(p) {
    return P(L(p));
  }

  // partial trip at a given progress: seg 0..1 = local->parent (L), 1..2 = parent->world (P)
  function partialAt(p, prog) {
    var seg = prog * 2;
    if (seg <= 1) {
      return add(rot(p, deg("ca") * seg), [num("ctx") * seg, num("cty") * seg]);
    }
    var q = L(p);
    var u = seg - 1;
    return add(rot(q, deg("pa") * u), [num("ptx") * u, num("pty") * u]);
  }

  function partial(p) {
    return partialAt(p, progress);
  }

  // Dotted blue trail tracing the shape's origin, with an arrowhead for flow.
  function trail() {
    ctx.save();
    ctx.strokeStyle = "#7aa2f7";
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    var N = 96;
    var i;
    var q;
    var X;
    var Y;
    for (i = 0; i <= N; i++) {
      q = partialAt(ORIGIN, progress * i / N);
      X = toX(q[0]);
      Y = toY(q[1]);
      if (i) {
        ctx.lineTo(X, Y);
      } else {
        ctx.moveTo(X, Y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (progress > 0.02) {
      var f = 0.7;
      var qa = partialAt(ORIGIN, progress * f);
      var qb = partialAt(ORIGIN, progress * (f - 1 / N));
      var TX = toX(qa[0]);
      var TY = toY(qa[1]);
      var PX = toX(qb[0]);
      var PY = toY(qb[1]);
      var dx = TX - PX;
      var dy = TY - PY;
      var L = Math.hypot(dx, dy) || 1;
      dx /= L;
      dy /= L;
      var nx = -dy;
      var ny = dx;
      var s = 8;
      ctx.fillStyle = "#7aa2f7";
      ctx.beginPath();
      ctx.moveTo(TX, TY);
      ctx.lineTo(TX - dx * s + nx * s * 0.5, TY - dy * s + ny * s * 0.5);
      ctx.lineTo(TX - dx * s - nx * s * 0.5, TY - dy * s - ny * s * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function grid() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid;

    var x;
    var y;
    for (x = toX(0) % 40; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (y = toY(0) % 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }

  function axes(origin, angle, color, len) {
    var xa = rot([len, 0], angle);
    var ya = rot([0, len], angle);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(origin[0]), toY(origin[1]));
    ctx.lineTo(toX(origin[0] + xa[0]), toY(origin[1] + xa[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(origin[0]), toY(origin[1]));
    ctx.lineTo(toX(origin[0] + ya[0]), toY(origin[1] + ya[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(toX(origin[0]), toY(origin[1]), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPoly(fn, color, alpha, width) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    shape.forEach(function (p, i) {
      var q = fn(p);
      var X = toX(q[0]);
      var Y = toY(q[1]);
      if (i) {
        ctx.lineTo(X, Y);
      } else {
        ctx.moveTo(X, Y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.stroke();
    ctx.restore();
  }

  function caption(text) {
    ctx.save();
    ctx.fillStyle = C.ink;
    ctx.font = "13px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(text, 14, 24);
    ctx.restore();
  }

  function draw() {
    ids.forEach(function (id) {
      var o = document.getElementById(outs[id]);
      o.innerHTML = els[id].value + (id === "pa" || id === "ca" ? "&deg;" : "");
    });
    grid();

    // parent frame
    axes([num("ptx"), num("pty")], deg("pa"), C.parent, 70);

    trail();
    drawPoly(partial, C.accent, 1, 2.5);
    var n = partial(nose);
    ctx.beginPath();
    ctx.arc(toX(n[0]), toY(n[1]), 3, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();

    if (progress >= 1) {
      caption("world = L then P   (Maya: local \u00B7 parent)");
    } else {
      caption(progress * 2 <= 1
        ? "1/2  local \u2192 parent   (multiply by L)"
        : "2/2  parent \u2192 world   (multiply by P)");
    }
  }

  function tick(ts) {
    if (!last) {
      last = ts;
    }
    var dt = ts - last;
    last = ts;
    elapsed = (elapsed + dt) % totalMs();
    progress = progressAt(elapsed);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (playing) {
      return;
    }
    playing = true;
    last = 0;
    raf = requestAnimationFrame(tick);
    playBtn.textContent = "Pause";
  }

  function pauseLoop() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    playBtn.textContent = "Play the trip";
  }

  ids.forEach(function (id) {
    els[id].addEventListener("input", draw);
  });

  playBtn.addEventListener("click", function () {
    playing ? pauseLoop() : startLoop();
  });

  draw();
  startLoop();
})();
