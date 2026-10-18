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
    ghost: "#565f89",
    accent: "#7aa2f7",
    other: "#f7768e",
    grid: "#292e42",
    axis: "#414868"
  };

  // Asymmetric shape defined in world/local coordinates.
  var shape = [
    [-18, -10],
    [18, -10],
    [18, 10],
    [0, 26],
    [-18, 10]
  ];

  // "AB": A applied first (Maya A * B); "BA": B applied first (Maya B * A)
  var order = "AB";
  var P = { a: 0, tx: 0, ty: 0 };

  var els = {
    ang: document.getElementById("ang"),
    tx: document.getElementById("tx"),
    ty: document.getElementById("ty"),
    oAng: document.getElementById("oAng"),
    oTx: document.getElementById("oTx"),
    oTy: document.getElementById("oTy"),
    btnAB: document.getElementById("btnAB"),
    btnBA: document.getElementById("btnBA")
  };

  function params() {
    return {
      a: parseFloat(els.ang.value) * Math.PI / 180,
      tx: parseFloat(els.tx.value),
      ty: parseFloat(els.ty.value)
    };
  }

  function rot(p, a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    return [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  }

  function trans(p, t) {
    return [p[0] + t[0], p[1] + t[1]];
  }

  // Maya row-vector: A = rotation, B = translation.
  // A applied first  (Maya A * B): p -> translate(rotate(p))
  // B applied first  (Maya B * A): p -> rotate(translate(p))
  function aFirst(p) {
    return trans(rot(p, P.a), [P.tx, P.ty]);
  }

  function bFirst(p) {
    return rot(trans(p, [P.tx, P.ty]), P.a);
  }

  function pick(which) {
    return which === "AB" ? aFirst : bFirst;
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

  function drawShape(fn, color, alpha) {
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
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function pivotDot(pt, color, alpha) {
    if (!pt) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toX(pt[0]), toY(pt[1]), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(toX(pt[0]), toY(pt[1]), 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    P = params();
    els.oAng.innerHTML = els.ang.value + "&deg;";
    els.oTx.textContent = els.tx.value;
    els.oTy.textContent = els.ty.value;
    grid();

    var selected = pick(order);
    var other = pick(order === "AB" ? "BA" : "AB");

    drawShape(function (p) { return p; }, C.ghost, 0.9);
    drawShape(other, C.other, 0.4);
    drawShape(selected, C.accent, 1);

    // Where each order pivots. A-first rotates and only then slides, so its
    // rotation centre rides along to the slide point; B-first slides first, so
    // it still pivots about the origin.
    var abPivot = [P.tx, P.ty];
    var baPivot = [0, 0];
    pivotDot(order === "AB" ? baPivot : abPivot, C.other, 0.4);
    pivotDot(order === "AB" ? abPivot : baPivot, C.accent, 1);
  }

  [els.ang, els.tx, els.ty].forEach(function (el) {
    el.addEventListener("input", draw);
    el.addEventListener("change", draw);
  });

  els.btnAB.addEventListener("click", function () {
    order = "AB";
    els.btnAB.classList.add("active");
    els.btnBA.classList.remove("active");
    draw();
  });

  els.btnBA.addEventListener("click", function () {
    order = "BA";
    els.btnBA.classList.add("active");
    els.btnAB.classList.remove("active");
    draw();
  });

  draw();
})();
