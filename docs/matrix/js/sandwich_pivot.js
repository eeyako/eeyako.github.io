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
    pivot: "#9ece6a",
    ghost: "#565f89",
    accent: "#7aa2f7",
    grid: "#292e42",
    axis: "#414868",
    ink: "#c0caf5"
  };

  // A compact arrow-shaped object, offset from the origin.
  var obj = [
    [-68, -5],
    [-20, -5],
    [-20, -12],
    [0, 0],
    [-20, 12],
    [-20, 5],
    [-68, 5]
  ];
  var nose = [0, 0];

  // "inv": C^-1 T C   |   "fwd": C T C^-1
  var dir = "inv";
  var P = { a: 0, p: [0, 0] };
  var playing = false;
  var progress = 0;
  var raf = 0;
  var last = 0;
  var elapsed = 0;

  // Animation timing: tween each of the 3 steps, then hold before the next one.
  var STEPS = 3;
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

  var els = {
    ang: document.getElementById("ang"),
    px: document.getElementById("px"),
    py: document.getElementById("py"),
    oAng: document.getElementById("oAng"),
    oPx: document.getElementById("oPx"),
    oPy: document.getElementById("oPy"),
    btnInv: document.getElementById("btnInv"),
    btnFwd: document.getElementById("btnFwd"),
    play: document.getElementById("play")
  };

  function params() {
    return {
      a: parseFloat(els.ang.value) * Math.PI / 180,
      p: [parseFloat(els.px.value), parseFloat(els.py.value)]
    };
  }

  function rot(p, a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    return [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  }

  function add(p, q) {
    return [p[0] + q[0], p[1] + q[1]];
  }

  function sub(p, q) {
    return [p[0] - q[0], p[1] - q[1]];
  }

  function scale(p, k) {
    return [p[0] * k, p[1] * k];
  }

  // s = -1 for C^-1 T C (translate by -P first), +1 for C T C^-1.
  function sgn() {
    return dir === "inv" ? -1 : 1;
  }

  // Full placement:  p -> R(p + s*P) - s*P.  For s=-1 this is rotation about P.
  function full(p) {
    var s = sgn();
    return sub(rot(add(p, scale(P.p, s)), P.a), scale(P.p, s));
  }

  // Three-step partial placement at a given progress.
  function partialAt(p, prog) {
    var s = sgn();
    var seg = prog * 3;
    var sp = scale(P.p, s);
    if (seg <= 1) {
      return add(p, scale(sp, seg)); // 1: multiply by C or C^-1
    }
    if (seg <= 2) {
      return rot(add(p, sp), P.a * (seg - 1)); // 2: apply T
    }
    return add(rot(add(p, sp), P.a), scale(sp, -(seg - 2))); // 3: multiply by the other
  }

  function partial(p) {
    return partialAt(p, progress);
  }

  // Faint blue trail tracing the arrow's nose through the trip.
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
      q = partialAt(nose, progress * i / N);
      X = toX(q[0]);
      Y = toY(q[1]);
      if (i) {
        ctx.lineTo(X, Y);
      } else {
        ctx.moveTo(X, Y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // The centre the result rotates about: P for C^-1 T C, -P for C T C^-1.
  function center() {
    return scale(P.p, -sgn());
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

  function drawPoly(fn, color, alpha, width) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    obj.forEach(function (p, i) {
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

  function dot(p, color, r, open) {
    ctx.beginPath();
    ctx.arc(toX(p[0]), toY(p[1]), r, 0, Math.PI * 2);
    if (open) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function marker(origin, label, faint) {
    var X = toX(origin[0]);
    var Y = toY(origin[1]);
    ctx.save();
    ctx.globalAlpha = faint ? 0.45 : 1;
    ctx.strokeStyle = C.pivot;
    ctx.fillStyle = C.pivot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X - 9, Y);
    ctx.lineTo(X + 9, Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X, Y - 9);
    ctx.lineTo(X, Y + 9);
    ctx.stroke();
    if (label) {
      ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(label, X + 12, Y + 4);
    }
    ctx.restore();
  }

  function arc(cxw, cyw, r, a0, a1, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    var steps = 48;
    var i;
    var a;
    var X;
    var Y;
    for (i = 0; i <= steps; i++) {
      a = a0 + (a1 - a0) * i / steps;
      X = toX(cxw + Math.cos(a) * r);
      Y = toY(cyw + Math.sin(a) * r);
      if (i) {
        ctx.lineTo(X, Y);
      } else {
        ctx.moveTo(X, Y);
      }
    }
    ctx.stroke();

    // arrowhead showing the direction of flow along the arc
    if (Math.abs(a1 - a0) > 0.05) {
      var f = 0.7;
      var fa = a0 + (a1 - a0) * f;
      var fb = a0 + (a1 - a0) * (f - 1 / steps);
      var TX = toX(cxw + Math.cos(fa) * r);
      var TY = toY(cyw + Math.sin(fa) * r);
      var PX = toX(cxw + Math.cos(fb) * r);
      var PY = toY(cyw + Math.sin(fb) * r);
      var dx = TX - PX;
      var dy = TY - PY;
      var L = Math.hypot(dx, dy) || 1;
      dx /= L;
      dy /= L;
      var nx = -dy;
      var ny = dx;
      var s = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(TX, TY);
      ctx.lineTo(TX - dx * s + nx * s * 0.5, TY - dy * s + ny * s * 0.5);
      ctx.lineTo(TX - dx * s - nx * s * 0.5, TY - dy * s - ny * s * 0.5);
      ctx.closePath();
      ctx.fill();
    }
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
    P = params();
    els.oAng.innerHTML = els.ang.value + "&deg;";
    els.oPx.textContent = els.px.value;
    els.oPy.textContent = els.py.value;
    grid();

    var c = center();

    // pivot frame C at P, plus the effective centre
    marker(P.p, "C");
    if (dir === "fwd") {
      marker(c, "centre used", true);
    }

    // original object
    drawPoly(function (p) { return p; }, C.ghost, 0.95, 2);

    // arc the nose travels
    var rr = Math.hypot(nose[0] - c[0], nose[1] - c[1]);
    var a0 = Math.atan2(nose[1] - c[1], nose[0] - c[0]);
    var a1 = a0 + P.a * Math.max(0, Math.min(1, progress * 3 - 1));
    arc(c[0], c[1], rr, a0, a1, C.accent);

    // transformed object
    trail();
    drawPoly(partial, C.accent, 1, 2.5);
    dot(partial(nose), C.accent, 3, false);

    if (progress >= 1) {
      caption(dir === "inv"
        ? "C\u207B\u00B9 \u00B7 T \u00B7 C   \u2192 rotation about C"
        : "C \u00B7 T \u00B7 C\u207B\u00B9   \u2192 rotation about the mirrored centre");
    } else {
      var seg = progress * 3;
      var first = dir === "inv" ? "C\u207B\u00B9" : "C";
      var lastM = dir === "inv" ? "C" : "C\u207B\u00B9";
      caption(seg <= 1 ? "1/3  multiply by " + first
        : seg <= 2 ? "2/3  apply T"
        : "3/3  multiply by " + lastM);
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
    els.play.textContent = "Pause";
  }

  function pauseLoop() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    els.play.textContent = "Play the three steps";
  }

  [els.ang, els.px, els.py].forEach(function (el) {
    el.addEventListener("input", draw);
  });

  els.btnInv.addEventListener("click", function () {
    dir = "inv";
    els.btnInv.classList.add("active");
    els.btnFwd.classList.remove("active");
    draw();
  });

  els.btnFwd.addEventListener("click", function () {
    dir = "fwd";
    els.btnFwd.classList.add("active");
    els.btnInv.classList.remove("active");
    draw();
  });

  els.play.addEventListener("click", function () {
    playing ? pauseLoop() : startLoop();
  });

  draw();
  startLoop();
})();
