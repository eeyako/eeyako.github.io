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
    arm: "#9ece6a",
    hand: "#7dcfff",
    tip: "#bb9af7",
    accent: "#7aa2f7",
    grid: "#292e42",
    axis: "#414868",
    ink: "#c0caf5",
    muted: "#7982a9"
  };

  var ORIGIN = [0, 0];

  // Bone lengths. The chain base position comes from the arm X/Y sliders.
  var ARM = 92;
  var HAND = 70;

  // The carried point, drawn in tip space as a small pointer along +x.
  var shape = [
    [-20, -6],
    [-4, -6],
    [-4, -11],
    [16, 0],
    [-4, 11],
    [-4, 6],
    [-20, 6]
  ];
  var nose = [16, 0];

  var playing = false;
  var progress = 0;
  var raf = 0;
  var last = 0;
  var elapsed = 0;

  // Animation timing: tween each of the 3 multiplications, then hold a beat.
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
    sh: document.getElementById("sh"),
    el: document.getElementById("el"),
    wr: document.getElementById("wr"),
    bx: document.getElementById("bx"),
    by: document.getElementById("by"),
    oSh: document.getElementById("oSh"),
    oEl: document.getElementById("oEl"),
    oWr: document.getElementById("oWr"),
    oBx: document.getElementById("oBx"),
    oBy: document.getElementById("oBy"),
    play: document.getElementById("play")
  };

  function num(id) {
    return parseFloat(els[id].value);
  }

  function rad(id) {
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

  function scale(p, k) {
    return [p[0] * k, p[1] * k];
  }

  // The three matrices. Each one rotates, then shifts by its bone to map one
  // space into the next: tip -> hand -> arm -> world.
  function mats() {
    return {
      wrist: { a: rad("wr"), t: [HAND, 0] },
      elbow: { a: rad("el"), t: [ARM, 0] },
      shoulder: { a: rad("sh"), t: [num("bx"), num("by")] }
    };
  }

  function applyM(m, p) {
    return add(rot(p, m.a), m.t);
  }

  // Apply a single matrix only u of the way, so the tween reads as one multiply.
  function fracM(m, p, u) {
    return add(rot(p, m.a * u), scale(m.t, u));
  }

  function world(p) {
    var m = mats();
    return applyM(m.shoulder, applyM(m.elbow, applyM(m.wrist, p)));
  }

  // Partial trip: seg 0..1 multiply tipToHand, 1..2 handToArm, 2..3 armToWorld.
  function partialAt(p, prog) {
    var m = mats();
    var seg = prog * 3;
    if (seg <= 1) {
      return fracM(m.wrist, p, seg);
    }
    var q = applyM(m.wrist, p);
    if (seg <= 2) {
      return fracM(m.elbow, q, seg - 1);
    }
    return fracM(m.shoulder, applyM(m.elbow, q), seg - 2);
  }

  function partial(p) {
    return partialAt(p, progress);
  }

  // Settled world positions of each frame: arm, hand, tip.
  function frames() {
    var m = mats();
    return [
      {
        o: applyM(m.shoulder, ORIGIN),
        a: m.shoulder.a,
        c: C.arm,
        label: "arm"
      },
      {
        o: applyM(m.shoulder, applyM(m.elbow, ORIGIN)),
        a: m.shoulder.a + m.elbow.a,
        c: C.hand,
        label: "hand"
      },
      {
        o: applyM(m.shoulder, applyM(m.elbow, applyM(m.wrist, ORIGIN))),
        a: m.shoulder.a + m.elbow.a + m.wrist.a,
        c: C.tip,
        label: "tip"
      }
    ];
  }

  // The colour of the multiplication the point is passing through, keyed to
  // the space it is leaving: tip, then hand, then arm.
  function segColor(t) {
    if (t <= 1 / 3) {
      return C.tip;
    }
    if (t <= 2 / 3) {
      return C.hand;
    }
    return C.arm;
  }

  function trailSeg(a, b, color) {
    if (b <= a) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    var N = 64;
    var i;
    var q;
    for (i = 0; i <= N; i++) {
      q = partialAt(nose, a + (b - a) * i / N);
      if (i) {
        ctx.lineTo(toX(q[0]), toY(q[1]));
      } else {
        ctx.moveTo(toX(q[0]), toY(q[1]));
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function arrowHead(p, prev, color) {
    var TX = toX(p[0]);
    var TY = toY(p[1]);
    var dx = TX - toX(prev[0]);
    var dy = TY - toY(prev[1]);
    var L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    var nx = -dy;
    var ny = dx;
    var s = 8;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(TX, TY);
    ctx.lineTo(TX - dx * s + nx * s * 0.5, TY - dy * s + ny * s * 0.5);
    ctx.lineTo(TX - dx * s - nx * s * 0.5, TY - dy * s - ny * s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // A flow arrow sits at 70% of each section, once the point has reached it.
  function sectionArrow(a, b, color) {
    var at = a + 0.7 * (b - a);
    if (progress < at) {
      return;
    }
    var eps = (b - a) / 64;
    arrowHead(partialAt(nose, at), partialAt(nose, at - eps), color);
  }

  // Dotted trail tracing the pointer's nose through the trip, one colour per
  // multiply, with a flow arrow held at 70% of each section.
  function trail() {
    var p = progress;
    trailSeg(0, Math.min(p, 1 / 3), C.tip);
    trailSeg(1 / 3, Math.min(p, 2 / 3), C.hand);
    trailSeg(2 / 3, p, C.arm);
    sectionArrow(0, 1 / 3, C.tip);
    sectionArrow(1 / 3, 2 / 3, C.hand);
    sectionArrow(2 / 3, 1, C.arm);
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

  function bone(a, b) {
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(a[0]), toY(a[1]));
    ctx.lineTo(toX(b[0]), toY(b[1]));
    ctx.stroke();
    ctx.restore();
  }

  function axes(origin, angle, color, len, label) {
    var xa = rot([len, 0], angle);
    var ya = rot([0, len], angle);
    var X = toX(origin[0]);
    var Y = toY(origin[1]);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(toX(origin[0] + xa[0]), toY(origin[1] + xa[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(toX(origin[0] + ya[0]), toY(origin[1] + ya[1]));
    ctx.stroke();
    if (label) {
      ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(label, X + 6, Y - 6);
    }
    ctx.restore();
  }

  function drawPoly(fn, color, alpha, width, dash) {
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
    if (dash) {
      ctx.setLineDash([4, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function dot(p, color, r) {
    ctx.beginPath();
    ctx.arc(toX(p[0]), toY(p[1]), r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function caption(text, y, color) {
    ctx.save();
    ctx.fillStyle = color || C.ink;
    ctx.font = "13px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(text, 14, y);
    ctx.restore();
  }

  // Which space the point is heading into at a given progress.
  function spaceName(p) {
    if (p <= 1 / 3) {
      return "hand space";
    }
    if (p <= 2 / 3) {
      return "arm space";
    }
    return "world";
  }

  function draw() {
    els.oSh.innerHTML = els.sh.value + "&deg;";
    els.oEl.innerHTML = els.el.value + "&deg;";
    els.oWr.innerHTML = els.wr.value + "&deg;";
    els.oBx.innerHTML = els.bx.value;
    els.oBy.innerHTML = els.by.value;
    grid();

    var f = frames();
    bone(f[0].o, f[1].o);
    bone(f[1].o, f[2].o);

    // world frame, then each nest of the chain
    axes(ORIGIN, 0, C.axis, 44);
    f.forEach(function (fr) {
      axes(fr.o, fr.a, fr.c, 40, fr.label);
      dot(fr.o, fr.c, 4);
    });

    // ghost of the settled world pose, so the destination is visible up front
    drawPoly(function (p) { return partialAt(p, 1); }, C.muted, 0.3, 1.5, true);

    trail();
    drawPoly(partial, C.accent, 1, 2.5);
    var n = partial(nose);
    dot(n, C.accent, 3);

    // label the space the moving point is heading into
    ctx.save();
    ctx.fillStyle = progress >= 1 ? C.accent : segColor(progress);
    ctx.font = "12px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(progress >= 1 ? "world" : spaceName(progress), toX(n[0]) + 10, toY(n[1]) - 10);
    ctx.restore();

    var seg = progress * 3;
    if (progress >= 1) {
      caption("world = tipToHand \u00B7 handToArm \u00B7 armToWorld", 24);
    } else if (seg <= 1) {
      caption("1/3  tip \u2192 hand   (multiply by tipToHand)", 24);
    } else if (seg <= 2) {
      caption("2/3  hand \u2192 arm   (multiply by handToArm)", 24);
    } else {
      caption("3/3  arm \u2192 world   (multiply by armToWorld)", 24);
    }
    caption("point (" + n[0].toFixed(0) + ", " + n[1].toFixed(0) + ")", 44, C.muted);

    var zero = Math.abs(num("sh")) < 0.5 && Math.abs(num("el")) < 0.5 && Math.abs(num("wr")) < 0.5;
    if (zero) {
      caption("all angles 0: every matrix is a pure translation, so the point only slides", 64, C.muted);
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
    els.play.textContent = "Play the three multiplications";
  }

  [els.sh, els.el, els.wr, els.bx, els.by].forEach(function (el) {
    el.addEventListener("input", draw);
  });

  els.play.addEventListener("click", function () {
    playing ? pauseLoop() : startLoop();
  });

  draw();
  startLoop();
})();
