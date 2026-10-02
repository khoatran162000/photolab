/* ===== PhotoLab · cảnh vẽ thủ tục (tọa độ thế giới: mét, trục Y hướng lên) ===== */
'use strict';
const SC = (() => {
  const P = (c, pts, fill) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  const R = (c, x, y, w, h, fill) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
  const C = (c, x, y, r, fill) => { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fillStyle = fill; c.fill(); };
  const E = (c, x, y, rx, ry, fill, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.2832); c.fillStyle = fill; c.fill(); };
  const L = (c, pts, stroke, w) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); };
  function T(c, s, x, y, size, fill, weight = 800) {
    c.save(); c.translate(x, y); c.scale(size / 100, -size / 100);
    c.font = `${weight} 100px "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fill; c.fillText(s, 0, 0); c.restore();
  }
  const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

  function blobTree(c, rng, x, y, h, cols, trunk) {
    R(c, x - h * 0.03, y, h * 0.06, h * 0.45, trunk);
    for (let i = 0; i < 9; i++) {
      const a = rng() * 6.28, rr = h * (0.12 + rng() * 0.12);
      C(c, x + Math.cos(a) * h * 0.18, y + h * 0.62 + Math.sin(a) * h * 0.16, rr, cols[i % cols.length]);
    }
  }
  function sky(c, stops, top = 3000) { c.fillStyle = lg(c, 0, -50, 0, top, stops); c.fillRect(-60000, -2000, 120000, top + 60000); }
  function ground(c, col, x0 = -400, x1 = 400) { R(c, x0, -60, x1 - x0, 60, col); }

  /* ---------- 1. Chân dung ngược sáng ---------- */
  function person(c, env, opts = {}) {
    const skin = '#d9a07c', skinS = '#b97c5c', hair = '#1d1714';
    // tóc phía sau
    P(c, [-0.12, 1.66, -0.15, 1.42, -0.2, 1.12, -0.1, 1.16, -0.09, 1.45, 0.09, 1.45, 0.1, 1.16, 0.2, 1.12, 0.15, 1.42, 0.12, 1.66], hair);
    c.globalAlpha = 0.5; for (let i = 0; i < 6; i++) { L(c, [-0.1 - i * 0.01, 1.6, -0.14 - i * 0.011, 1.16], '#4a3a30', 0.0022); L(c, [0.1 + i * 0.01, 1.6, 0.14 + i * 0.011, 1.16], '#4a3a30', 0.0022); } c.globalAlpha = 1;
    // áo dài
    P(c, [-0.2, 1.40, -0.22, 1.2, -0.17, 1.0, -0.26, 0.45, 0.26, 0.45, 0.17, 1.0, 0.22, 1.2, 0.2, 1.40, 0.05, 1.44, -0.05, 1.44], '#e9eef4');
    P(c, [-0.17, 1.0, -0.26, 0.45, -0.05, 0.45, -0.03, 1.0], '#dfe6ee');
    // tay
    P(c, [-0.2, 1.39, -0.27, 1.1, -0.25, 0.86, -0.2, 0.86, -0.19, 1.1, -0.15, 1.3], '#e3e9f0');
    P(c, [0.2, 1.39, 0.27, 1.1, 0.25, 0.86, 0.2, 0.86, 0.19, 1.1, 0.15, 1.3], '#e3e9f0');
    E(c, -0.226, 0.83, 0.028, 0.04, skin); E(c, 0.226, 0.83, 0.028, 0.04, skin);
    // quần
    P(c, [-0.17, 0.45, -0.15, 0, -0.02, 0, 0, 0.45], '#f6f6f2'); P(c, [0.17, 0.45, 0.15, 0, 0.02, 0, 0, 0.45], '#f1f1ec');
    // hoa văn áo
    for (let i = 0; i < 7; i++) C(c, -0.08 + (i % 3) * 0.08, 1.25 - Math.floor(i / 3) * 0.12, 0.012, '#c4577a');
    // cổ, mặt
    R(c, -0.035, 1.40, 0.07, 0.08, skinS);
    E(c, 0, 1.565, 0.086, 0.114, skin);
    c.fillStyle = 'rgba(214,120,110,.22)'; C(c, -0.05, 1.53, 0.022, c.fillStyle); C(c, 0.05, 1.53, 0.022, c.fillStyle);
    // mắt, mày, mũi, môi
    E(c, -0.034, 1.578, 0.014, 0.0075, '#fbf3ee'); E(c, 0.034, 1.578, 0.014, 0.0075, '#fbf3ee');
    C(c, -0.034, 1.578, 0.0062, '#2a1a14'); C(c, 0.034, 1.578, 0.0062, '#2a1a14');
    C(c, -0.032, 1.58, 0.0018, '#fff'); C(c, 0.036, 1.58, 0.0018, '#fff');
    L(c, [-0.052, 1.6, -0.034, 1.607, -0.017, 1.602], '#3b2a22', 0.004); L(c, [0.017, 1.602, 0.034, 1.607, 0.052, 1.6], '#3b2a22', 0.004);
    P(c, [0, 1.575, -0.008, 1.535, 0.008, 1.535], skinS);
    E(c, 0, 1.507, 0.02, 0.008, '#b0505a');
    // tóc mái
    P(c, [-0.095, 1.57, -0.09, 1.66, -0.03, 1.69, 0.06, 1.685, 0.1, 1.62, 0.092, 1.57, 0.06, 1.64, -0.02, 1.645, -0.07, 1.62], hair);
    // nón lá cầm tay
    if (opts.hat) P(c, [0.22, 0.95, 0.5, 0.78, 0.22, 0.72], '#e6cf8f');
  }
  function stringLights(rng, z0, x0, x1, yA, sag, step, I, col) {
    const out = [];
    for (let x = x0; x <= x1; x += step) {
      const u = (x - x0) / (x1 - x0); const y = yA - sag * 4 * u * (1 - u);
      out.push({ x, y, r: 0.028, I: I * (0.75 + rng() * 0.5), c: col });
    }
    return out;
  }
  function portrait() {
    const gold = [1, 0.55, 0.16];
    const layers = [
      { id: 'sky', zw: 3000, flash: false, draw(c, env) {
        sky(c, [[0, '#ffd9a0'], [0.03, '#ffe6bd'], [0.09, '#f4d2c4'], [0.25, '#b9c4dc'], [1, '#7f9cc9']], 2000);
        c.fillStyle = rg(c, -420, 360, 5, 900, [[0, 'rgba(255,248,220,1)'], [0.3, 'rgba(255,230,180,.55)'], [1, 'rgba(255,220,170,0)']]);
        c.fillRect(-2000, -100, 3000, 1600);
      }, lights: () => [{ x: -420, y: 360, r: 13, I: 1, c: [1, 0.93, 0.78] }, { x: -420, y: 360, r: 400, I: 0.1, c: [1, 0.88, 0.66], soft: true }] },
      { id: 'far', zw: 60, flash: false, draw(c, env) {
        const r = U.rng(11); ground(c, '#2d3a2a');
        for (let x = -140; x < 140; x += 5 + r() * 6) {
          if (x > -17 && x < -2) continue; // khe trời cho mặt trời ló
          blobTree(c, r, x, 0, 9 + r() * 7, ['#2f4433', '#3a5038', '#283b2c'], '#2a2420');
        }
      } },
      { id: 'wall', zw: 9, draw(c, env) {
        const r = U.rng(5);
        R(c, -40, 0, 80, 1.1, '#9c8f7f');
        for (let x = -40; x < 40; x += 0.9) R(c, x, 1.1, 0.06, 0.07, '#8a7e70');
        for (let i = 0; i < 70; i++) { const x = -30 + r() * 60, y = 0.9 + r() * 1.6; C(c, x, y, 0.25 + r() * 0.35, ['#4f6b3d', '#5d7a44', '#3f5a33'][i % 3]); }
        for (let i = 0; i < 160; i++) { const x = -30 + r() * 60, y = 1.0 + r() * 1.5; C(c, x, y, 0.05 + r() * 0.05, ['#c2457f', '#d4609a', '#a8336a'][i % 3]); }
      }, lights: (env) => stringLights(U.rng(21), 0, -12, 12, 3.1, 0.6, 0.45, 0.09, gold) },
      { id: 'cafe', zw: 4, draw(c, env) {
        for (const ux of [-3.2, 2.9]) {
          R(c, ux - 0.025, 0, 0.05, 2.3, '#5b4a3b');
          P(c, [ux - 1.4, 2.1, ux, 2.65, ux + 1.4, 2.1], '#c9b48d'); P(c, [ux - 1.4, 2.1, ux, 2.65, ux - 0.45, 2.1], '#b7a17a');
          R(c, ux - 0.5, 0.72, 1.0, 0.05, '#6b5847'); R(c, ux - 0.03, 0, 0.06, 0.72, '#5b4a3b');
          R(c, ux - 0.85, 0, 0.04, 0.45, '#4a6b8a'); R(c, ux - 0.95, 0.42, 0.25, 0.04, '#4a6b8a');
          R(c, ux + 0.75, 0, 0.04, 0.45, '#b9473f'); R(c, ux + 0.68, 0.42, 0.25, 0.04, '#b9473f');
          C(c, ux - 0.2, 0.84, 0.05, '#e8e2d6'); C(c, ux + 0.15, 0.82, 0.04, '#d8cfb8');
        }
        const r = U.rng(9); for (const px of [-1.6, 1.4]) { R(c, px - 0.2, 0, 0.4, 0.45, '#7a4a32'); for (let i = 0; i < 16; i++) C(c, px + (r() - 0.5) * 0.6, 0.6 + r() * 0.7, 0.12 + r() * 0.08, ['#4d7040', '#5f8a4b'][i % 2]); }
      }, lights: () => [{ x: -3.2, y: 1.9, r: 0.06, I: 0.06, c: [1, 0.7, 0.35] }, { x: 2.9, y: 1.9, r: 0.06, I: 0.06, c: [1, 0.7, 0.35] }, ...stringLights(U.rng(4), 0, -5, 5, 2.55, 0.25, 0.32, 0.06, [1, 0.62, 0.25])] },
      { id: 'floor2', zw: 1.5, draw(c) { ground(c, '#a2674b'); for (let x = -30; x < 30; x += 0.4) R(c, x, -0.02, 0.02, 0.02, '#8e5940'); } },
      { id: 'subject', zw: 0, subject: true, eye: [0.034, 1.578], face: [0, 1.56, 0.09], hit: 'Người mẫu', draw(c, env) { person(c, env); },
      },
      { id: 'floor1', zw: -0.6, draw(c) { ground(c, '#9a6046'); } },
      { id: 'fg', zw: -1.6, hit: 'Hoa giấy tiền cảnh', draw(c, env) {
        const r = U.rng(31);
        for (let i = 0; i < 26; i++) E(c, -0.5 + r() * 0.35, 0.95 + r() * 0.4, 0.045, 0.02, ['#4f7a3c', '#3f6a33'][i % 2], r() * 3);
        for (let i = 0; i < 34; i++) C(c, -0.48 + r() * 0.33, 1.0 + r() * 0.32, 0.016 + r() * 0.01, ['#d4307a', '#e54b8f', '#b8246a'][i % 3]);
      } }
    ];
    return { layers, subject: 'subject', bg: ['wall', 'cafe'], sizeRef: { layer: 'cafe', h: 2.65 } };
  }

  /* ---------- 2. Xe máy trên phố ---------- */
  function shophouse(c, r, x, w, h, col, sign) {
    R(c, x, 0, w, h, col);
    R(c, x, h, w, 0.25, '#7a6a5a');
    for (let fl = 1; fl < Math.floor(h / 3.2); fl++) {
      const y = fl * 3.2;
      R(c, x + 0.15, y - 0.1, w - 0.3, 0.12, '#e8e2d6');
      for (let k = 0; k < 7; k++) R(c, x + 0.2 + k * (w - 0.4) / 6, y, 0.03, 0.85, '#3f4a44');
      R(c, x + 0.15, y + 0.85, w - 0.3, 0.05, '#3f4a44');
      const ww = (w - 1) / 2; R(c, x + 0.35, y + 0.4, ww, 1.8, '#3c6b5a'); R(c, x + 0.65 + ww, y + 0.4, ww, 1.8, '#3c6b5a');
      R(c, x + 0.35 + ww * 0.48, y + 0.4, ww * 0.04, 1.8, '#2c4f42');
      if (r() > 0.4) for (let k = 0; k < 3; k++) C(c, x + 0.6 + k * 0.5, y + 0.95, 0.18, ['#4f8a46', '#6aa152', '#d6556d'][k]);
    }
    R(c, x + 0.3, 0, w - 0.6, 2.6, '#2b2b2b');
    R(c, x + 0.4, 0, w - 0.8, 2.4, '#5a4636');
    if (sign) { R(c, x + 0.25, 2.75, w - 0.5, 0.75, sign[1]); T(c, sign[0], x + w / 2, 3.12, 0.42, sign[2]); }
    P(c, [x + 0.1, 2.65, x + w - 0.1, 2.65, x + w + 0.3, 2.2, x - 0.3, 2.2], 'rgba(0,0,0,0)');
  }
  function motorbike(c, front = false) {
    if (!front) {
      for (const wx of [-0.62, 0.62]) { C(c, wx, 0.31, 0.31, '#1b1b1b'); C(c, wx, 0.31, 0.2, '#6b6b6b'); C(c, wx, 0.31, 0.06, '#cfcfcf'); }
      P(c, [-0.75, 0.55, -0.35, 0.72, 0.15, 0.62, 0.45, 0.62, 0.7, 0.95, 0.82, 0.92, 0.55, 0.5, 0.0, 0.42, -0.6, 0.45], '#b5232e');
      P(c, [-0.55, 0.72, 0.15, 0.72, 0.18, 0.8, -0.5, 0.82], '#1e1e1e');
      L(c, [0.62, 0.31, 0.78, 0.98], '#9a9a9a', 0.04); L(c, [0.72, 1.05, 0.95, 1.08], '#2a2a2a', 0.035);
      P(c, [0.82, 1.0, 0.95, 0.98, 0.97, 0.88, 0.84, 0.86], '#d9d9d9');
      L(c, [-0.7, 0.42, -0.95, 0.4], '#888', 0.05);
      // người lái
      P(c, [-0.25, 0.82, 0.05, 0.82, 0.32, 0.55, 0.42, 0.58, 0.18, 0.92, 0.2, 1.35, -0.18, 1.38, -0.3, 1.0], '#2f4f7a');
      P(c, [-0.18, 1.36, 0.2, 1.36, 0.28, 1.0, 0.75, 1.02, 0.74, 1.1, 0.3, 1.14, 0.2, 1.42, -0.2, 1.42], '#e2a33b');
      E(c, 0.02, 1.58, 0.13, 0.14, '#e4e4e4'); P(c, [0.04, 1.6, 0.16, 1.62, 0.15, 1.5, 0.05, 1.5], '#2c3e50');
      E(c, 0.02, 1.47, 0.08, 0.05, '#c98d6a');
      P(c, [0.3, 0.55, 0.45, 0.55, 0.47, 0.42, 0.28, 0.42], '#2a2a2a');
    } else {
      C(c, 0, 0.31, 0.31, '#1b1b1b'); R(c, -0.06, 0, 0.12, 0.62, '#1b1b1b');
      P(c, [-0.32, 0.55, 0.32, 0.55, 0.26, 1.05, -0.26, 1.05], '#b5232e');
      L(c, [-0.45, 1.08, 0.45, 1.08], '#2a2a2a', 0.04);
      P(c, [-0.28, 1.0, 0.28, 1.0, 0.24, 1.45, -0.24, 1.45], '#e2a33b');
      P(c, [-0.3, 1.05, -0.45, 1.06, -0.42, 1.12, -0.26, 1.2], '#e2a33b'); P(c, [0.3, 1.05, 0.45, 1.06, 0.42, 1.12, 0.26, 1.2], '#e2a33b');
      E(c, 0, 1.6, 0.14, 0.15, '#e4e4e4'); P(c, [-0.1, 1.62, 0.1, 1.62, 0.09, 1.52, -0.09, 1.52], '#2c3e50');
      E(c, 0, 1.48, 0.08, 0.05, '#c98d6a');
    }
  }
  function street() {
    const signs = [['PHỞ BÒ', '#c0392b', '#ffe9a8'], ['CÀ PHÊ', '#f1c40f', '#3b2a1a'], ['BÁNH MÌ', '#e67e22', '#fff'], null, ['TẠP HÓA', '#2e86c1', '#fff'], ['SỬA XE', '#27ae60', '#fff'], null, ['BÚN CHẢ', '#a93226', '#fff3c4']];
    const cols = ['#e7c66b', '#8fc1b5', '#e9a7a0', '#f2ead8', '#d9b48f', '#a9c8e3', '#efd9a5', '#c7b3d6'];
    const layers = [
      { id: 'sky', zw: 3000, flash: false, draw(c, env) {
        sky(c, env.cpl ? [[0, '#a9c3e0'], [0.2, '#5d8cc8'], [1, '#2f5fa8']] : [[0, '#dfe9f2'], [0.2, '#b6cde6'], [1, '#86a9d6']], 2400);
        c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, s] of [[-600, 420, 90], [300, 700, 140], [900, 380, 70], [-1500, 900, 160]]) { C(c, x, y, s, c.fillStyle); C(c, x + s, y - s * 0.2, s * 0.8, c.fillStyle); C(c, x - s, y - s * 0.3, s * 0.7, c.fillStyle); }
      } },
      { id: 'far', zw: 120, flash: false, draw(c) { const r = U.rng(3); for (let x = -260; x < 260; x += 8 + r() * 10) R(c, x, 0, 8 + r() * 8, 14 + r() * 26, ['#b9bfc6', '#aab2ba', '#c6cbd0'][Math.floor(r() * 3)]); } },
      { id: 'houses', zw: 9, hit: 'Dãy nhà phố', draw(c) {
        const r = U.rng(8); let x = -70, i = 0;
        while (x < 70) { const w = 3.6 + r() * 1.6, hgt = 7 + r() * 8; shophouse(c, r, x, w, hgt, cols[i % cols.length], signs[i % signs.length]); x += w; i++; }
        R(c, -80, 0, 160, 0.18, '#9a9590');
      } },
      { id: 'sidewalk', zw: 7.2, draw(c) {
        ground(c, '#b8b1a6', -80, 80);
        const r = U.rng(14);
        for (let x = -60; x < 60; x += 1.4 + r() * 2) { if (r() < 0.55) { const col = ['#3a3a3a', '#8e1f2a', '#1f3f6b', '#d7d2c4'][Math.floor(r() * 4)]; C(c, x - 0.5, 0.25, 0.25, '#222'); C(c, x + 0.5, 0.25, 0.25, '#222'); P(c, [x - 0.6, 0.45, x + 0.55, 0.45, x + 0.6, 0.8, x - 0.3, 0.75], col); } else { R(c, x, 0, 0.3, 0.42, ['#d63b3b', '#2d7fc1'][Math.floor(r() * 2)]); } }
      } },
      { id: 'poles', zw: 5.6, draw(c, env) {
        for (let x = -60; x < 60; x += 14) { R(c, x - 0.12, 0, 0.24, 8.5, '#8d8d8d'); R(c, x - 0.6, 7.6, 1.2, 0.1, '#6d6d6d'); }
        c.lineWidth = Math.max(0.012, env.px * 0.8); c.strokeStyle = '#2b2b2b';
        for (let k = 0; k < 9; k++) { c.beginPath(); for (let x = -60; x <= 60; x += 14) { c.moveTo(x, 7.65 - k * 0.07); c.quadraticCurveTo(x + 7, 6.6 - k * 0.12, x + 14, 7.65 - k * 0.07); } c.stroke(); }
      } },
      { id: 'road2', zw: 3, draw(c) { ground(c, '#6c6c6a'); } },
      { id: 'subject', zw: 0, subject: true, moving: true, hit: 'Người lái xe máy', eye: [0.1, 1.58], face: [0.05, 1.5, 0.12],
        motion: (env) => env.approach ? { vx: 0, vz: -7 } : { vx: 8 },
        draw(c, env) { motorbike(c, env.approach); },
        lights: (env) => env.approach ? [{ x: 0, y: 0.95, r: 0.06, I: 0.5, c: [1, 0.97, 0.88] }] : [{ x: 0.95, y: 0.93, r: 0.035, I: 0.08, c: [1, 0.97, 0.88] }] },
      { id: 'road1', zw: -2, draw(c) { ground(c, '#727270'); for (let x = -40; x < 40; x += 4) R(c, x, -0.02, 2, 0.02, '#e9e6dc'); } }
    ];
    return { layers, subject: 'subject', bg: ['houses', 'sidewalk'], sizeRef: { layer: 'houses', h: 3.5 } };
  }

  /* ---------- 3. Thác nước ---------- */
  function landscape() {
    const layers = [
      { id: 'sky', zw: 5000, flash: false, draw(c, env) {
        if (env.cpl) sky(c, [[0, '#d7e3ee'], [0.08, '#8fb2d8'], [0.4, '#3f6fb0'], [1, '#294f8f']], 4000);
        else sky(c, [[0, '#e2e7ec'], [0.15, '#d3dce6'], [1, '#aabdd3']], 4000);
        const r = U.rng(2); for (let i = 0; i < 40; i++) { const x = -9000 + r() * 18000, y = 200 + r() * 2600, s = 120 + r() * 380; c.fillStyle = env.cpl ? 'rgba(246,247,250,.95)' : 'rgba(236,239,243,.85)'; C(c, x, y, s, c.fillStyle); C(c, x + s * 0.9, y - s * 0.1, s * 0.7, c.fillStyle); C(c, x - s * 0.8, y - s * 0.15, s * 0.6, c.fillStyle); }
      }, lights: () => [{ x: 2600, y: 2500, r: 1400, I: 0.004, c: [1, 1, 1], soft: true }] },
      { id: 'mtfar', zw: 4000, flash: false, draw(c) { P(c, [-9000, 0, -5000, 500, -2600, 300, -600, 820, 900, 420, 2400, 980, 4300, 520, 7000, 760, 9000, 300, 9000, 0], '#a9b8c8'); } },
      { id: 'mtmid', zw: 900, flash: false, draw(c) { P(c, [-3000, 0, -1400, 120, -500, 70, 100, 190, 700, 110, 1300, 260, 2200, 120, 3000, 0], '#7f9a8f'); } },
      { id: 'hills', zw: 160, flash: false, draw(c) {
        const r = U.rng(6); P(c, [-700, 0, -300, 22, -60, 14, 80, 30, 260, 18, 700, 26, 700, 0], '#46684b');
        for (let i = 0; i < 260; i++) { const x = -400 + r() * 800; C(c, x, 6 + r() * 14, 2 + r() * 3, ['#3d5f43', '#4f7553', '#355539'][i % 3]); }
      } },
      { id: 'cliff', zw: 0, subject: true, hit: 'Thác nước', eye: [0, 6], draw(c, env) {
        const r = U.rng(12);
        P(c, [-60, 0, -60, 9, -30, 11, -16, 12.6, -6, 12.2, -2.6, 11.4, 2.6, 11.6, 6, 12.4, 10, 11.4, 13, 7, 16, 3, 20, 0], '#6e675d');
        for (let i = 0; i < 90; i++) { const x = -40 + r() * 52, y = r() * 11; if (Math.abs(x) < 3.4) continue; P(c, [x, y, x + 1.5 + r() * 2, y + 0.3, x + 1.2, y + 1 + r() * 1.5, x - 0.5, y + 0.8], ['#5d574e', '#7d766a', '#57514a', '#8a8275'][i % 4]); }
        for (let i = 0; i < 60; i++) { const x = -30 + r() * 42; if (Math.abs(x) < 3) continue; C(c, x, 11.6 + r() * 1.6, 0.8 + r() * 1.2, ['#3f6a3d', '#50804a', '#2f5531'][i % 3]); }
        // dòng thác: vân nước dọc, có chuyển động
        const ph = (env.t * 5) % 2;
        R(c, -2.6, 0.6, 5.2, 11.0, '#b9c8d0');
        for (let i = 0; i < 70; i++) {
          const x = -2.5 + ((i * 0.37) % 5), y = ((i * 1.73 + ph * 3) % 11) + 0.6;
          R(c, x, y, 0.12 + (i % 3) * 0.06, 0.9 + (i % 4) * 0.5, i % 3 ? '#e3ebef' : '#93abb6');
        }
        c.fillStyle = rg(c, 0, 0.8, 0.2, 4.5, [[0, 'rgba(236,241,244,.9)'], [1, 'rgba(236,241,244,0)']]); c.fillRect(-6, -1, 12, 6);
      }, internal: { vy: -5, x0: -2.7, x1: 2.7 } },
      { id: 'pool', zw: -9, hit: 'Hồ nước', draw(c, env) {
        R(c, -60, -40, 120, 40, '#3f5f66');
        const ph = env.t * 0.6;
        for (let i = 0; i < 140; i++) { const x = -40 + ((i * 7.3 + ph) % 80), y = -0.05 - (i % 7) * 0.02; R(c, x, y, 1.2 + (i % 5) * 0.4, 0.012, i % 2 ? '#8fb3bb' : '#2f4a50'); }
      }, internal: { vx: 0.6 } },
      { id: 'rocks', zw: -17, hit: 'Đá giữa suối', draw(c) {
        const r = U.rng(19); ground(c, '#4e5a4c');
        for (let i = 0; i < 26; i++) { const x = -18 + r() * 36, s = 0.4 + r() * 1.1; if (Math.abs(x) < 1.5) continue; E(c, x, s * 0.35, s, s * 0.55, ['#6a645a', '#7b7468', '#5a554c'][i % 3]); }
      } },
      { id: 'fg', zw: -22, hit: 'Đá tiền cảnh', draw(c) {
        const r = U.rng(23); ground(c, '#56604f');
        P(c, [-6, -1, -5.5, 0.9, -3.8, 1.25, -2.6, 0.8, -1.8, 0.2, -1.6, -1], '#7b7468');
        P(c, [-5.2, 0.8, -4.0, 1.2, -3.2, 1.0], '#8f887b');
        for (let i = 0; i < 26; i++) { const x = 1.4 + r() * 4, a = r(); L(c, [x, 0, x + (a - 0.5) * 0.6, 0.35 + r() * 0.45], ['#5d8a43', '#76a352'][i % 2], 0.03); }
      } },
      { id: 'near', zw: -23.7, hit: 'Đá rất gần', draw(c) { P(c, [0.3, -1, 0.5, 0.25, 0.95, 0.42, 1.6, 0.3, 2.0, -1], '#6e695f'); P(c, [0.6, 0.25, 0.95, 0.4, 1.3, 0.33], '#8a8478'); } }
    ];
    return { layers, subject: 'cliff', bg: ['hills', 'mtmid'], fg: ['fg', 'near'], sizeRef: { layer: 'hills', h: 20 } };
  }

  /* ---------- 4. Phố đêm ---------- */
  function night() {
    const layers = [
      { id: 'sky', zw: 3000, flash: false, draw(c) { sky(c, [[0, '#1b2236'], [0.2, '#0f1424'], [1, '#070a14']], 2000); },
        lights: () => { const r = U.rng(42), o = []; for (let i = 0; i < 70; i++) o.push({ x: -3000 + r() * 6000, y: 250 + r() * 1700, r: 1.2, I: 0.004 + r() * 0.01, c: [0.9, 0.93, 1] }); return o; } },
      { id: 'bld', zw: 30, flash: false, draw(c) {
        const r = U.rng(7); let x = -120;
        while (x < 120) { const w = 6 + r() * 9, hh = 12 + r() * 30; R(c, x, 0, w, hh, ['#191b22', '#1f2129', '#15171d'][Math.floor(r() * 3)]); x += w + 0.4; }
        R(c, -14, 9, 9, 2.2, '#1c0a14'); T(c, 'KARAOKE', -9.5, 10.1, 1.4, '#ff5aa8'); R(c, 6, 7, 7, 2, '#0a1c1e'); T(c, 'PHỞ 24H', 9.5, 8, 1.3, '#5cf2dd');
      }, lights: () => {
        const r = U.rng(7), o = []; let x = -120;
        while (x < 120) { const w = 6 + r() * 9, hh = 12 + r() * 30; r();
          for (let fy = 3; fy < hh - 1; fy += 3) for (let fx = x + 1; fx < x + w - 1; fx += 2) if (r() < 0.32) o.push({ x: fx, y: fy, r: 0.45, I: 0.012 + r() * 0.02, c: r() < 0.7 ? [1, 0.8, 0.55] : [0.8, 0.9, 1] });
          x += w + 0.4; }
        for (let i = 0; i < 18; i++) o.push({ x: -13.4 + i * 0.5, y: 9.6 + (i % 3) * 0.35, r: 0.12, I: 0.02, c: [1, 0.25, 0.65] });
        for (let i = 0; i < 12; i++) o.push({ x: 6.6 + i * 0.5, y: 7.7 + (i % 3) * 0.3, r: 0.11, I: 0.018, c: [0.25, 1, 0.9] });
        return o; } },
      { id: 'trees', zw: 14, flash: false, draw(c) { const r = U.rng(17); for (let x = -50; x < 50; x += 7 + r() * 4) blobTree(c, r, x, 0, 6 + r() * 2, ['#0f1a14', '#132019', '#0c1510'], '#0d0d0d'); } },
      { id: 'walk', zw: 7, draw(c) { ground(c, '#2a2a2c', -80, 80); for (let x = -60; x < 60; x += 9) { R(c, x - 0.07, 0, 0.14, 6, '#3a3a3a'); R(c, x - 0.05, 5.9, 0.9, 0.08, '#3a3a3a'); } },
        lights: () => { const o = []; for (let x = -60; x < 60; x += 9) { o.push({ x: x + 0.8, y: 5.85, r: 0.18, I: 0.3, c: x % 18 === 0 ? [1, 0.6, 0.25] : [1, 0.88, 0.7] }); } return o; } },
      { id: 'carsfar', zw: 3.5, moving: true, motion: () => ({ vx: -10 }), draw(c) { car(c, -1); }, lights: () => carLights(-1), period: 24 },
      { id: 'road', zw: 1.5, draw(c) { ground(c, '#1d1e22'); for (let x = -40; x < 40; x += 4) R(c, x, -0.02, 2, 0.02, '#8f8a73'); } },
      { id: 'cars', zw: 0, subject: true, moving: true, hit: 'Ô tô', eye: [0, 0.8], motion: () => ({ vx: 12 }), draw(c) { car(c, 1); }, lights: () => carLights(1), period: 30 },
      { id: 'ped', zw: -3, moving: true, hit: 'Người đi bộ', motion: () => ({ vx: 1.2 }), draw(c) {
        E(c, 0, 1.62, 0.1, 0.12, '#6b5040'); P(c, [-0.2, 1.45, 0.2, 1.45, 0.17, 0.85, -0.17, 0.85], '#3c4a5e'); P(c, [-0.15, 0.85, -0.02, 0.85, -0.05, 0, -0.17, 0], '#26262c'); P(c, [0.15, 0.85, 0.02, 0.85, 0.08, 0, 0.19, 0], '#26262c');
      }, period: 0 }
    ];
    return { layers, subject: 'cars', bg: ['bld', 'trees'], sizeRef: { layer: 'bld', h: 20 } };
  }
  function car(c, dir) {
    for (let k = -3; k <= 3; k++) {
      const x = k * (dir > 0 ? 30 : 24) / 1;
      P(c, [x - 2.1, 0.35, x + 2.1, 0.35, x + 2.15, 0.85, x + 1.2, 0.95, x + 0.7, 1.4, x - 1.0, 1.4, x - 1.6, 0.95, x - 2.15, 0.85], ['#30343c', '#4a2228', '#222831', '#3a3d44'][(k + 7) % 4]);
      P(c, [x + 0.6, 1.35, x + 1.05, 0.98, x - 0.15, 0.98, x - 0.15, 1.35], '#141820'); P(c, [x - 0.25, 1.35, x - 0.25, 0.98, x - 1.45, 0.98, x - 0.95, 1.35], '#141820');
      C(c, x - 1.3, 0.33, 0.33, '#0c0c0c'); C(c, x + 1.3, 0.33, 0.33, '#0c0c0c');
    }
  }
  function carLights(dir) {
    const o = [];
    for (let k = -3; k <= 3; k++) {
      const x = k * (dir > 0 ? 30 : 24);
      if (dir > 0) { o.push({ x: x + 2.1, y: 0.7, r: 0.09, I: 0.9, c: [1, 0.86, 0.62] }); o.push({ x: x - 2.12, y: 0.8, r: 0.07, I: 0.12, c: [1, 0.1, 0.06] }); }
      else { o.push({ x: x + 2.12, y: 0.78, r: 0.08, I: 0.65, c: [1, 0.08, 0.05] }); o.push({ x: x - 2.1, y: 0.7, r: 0.07, I: 0.12, c: [1, 0.86, 0.66] }); }
    }
    return o;
  }

  /* ---------- 5. Tĩnh vật đèn sợi đốt ---------- */
  const CHECKER = ['#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa', '#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e', '#383d96', '#469449', '#af363c', '#e7c71f', '#bb5695', '#0885a1', '#f3f3f2', '#c8c8c8', '#a0a0a0', '#7a7a79', '#555555', '#343434'];
  function indoor() {
    const layers = [
      { id: 'wall', zw: 1.2, flash: true, hit: 'Bức tường', draw(c) {
        R(c, -20, 0, 40, 20, '#a89d8c');
        c.fillStyle = rg(c, -0.7, 1.3, 0.05, 2.2, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.25)']]); c.fillRect(-6, 0, 12, 5);
        R(c, 0.05, 1.18, 0.62, 0.46, '#5b4636'); R(c, 0.09, 1.22, 0.54, 0.38, '#efe9de');
        C(c, 0.28, 1.43, 0.09, '#2e6f8e'); R(c, 0.38, 1.27, 0.18, 0.2, '#d9a441'); P(c, [0.14, 1.26, 0.3, 1.26, 0.22, 1.38], '#b8483a');
      } },
      { id: 'lamp', zw: 0.45, hit: 'Đèn bàn', draw(c) {
        E(c, -0.62, 0.765, 0.09, 0.02, '#3a2f28'); R(c, -0.63, 0.77, 0.02, 0.36, '#4a3e34');
        P(c, [-0.78, 1.12, -0.46, 1.12, -0.52, 1.32, -0.72, 1.32], '#f2d7a2');
        P(c, [-0.78, 1.12, -0.46, 1.12, -0.5, 1.16, -0.74, 1.16], '#e8c38a');
      }, lights: () => [{ x: -0.62, y: 1.1, r: 0.035, I: 0.35, c: [1, 0.86, 0.66] }, { x: -0.62, y: 1.22, r: 0.16, I: 0.012, c: [1, 0.85, 0.6], soft: true }] },
      { id: 'tableB', zw: 0.3, draw(c) { R(c, -10, 0, 20, 0.75, '#6a4a33'); R(c, -10, 0.73, 20, 0.02, '#7d5a40'); } },
      { id: 'objects', zw: 0, subject: true, hit: 'Bình gốm và bảng màu', eye: [-0.06, 0.95], draw(c) {
        // bình gốm trắng
        P(c, [-0.14, 0.75, -0.02, 0.75, 0.0, 0.86, -0.03, 0.98, -0.045, 1.08, -0.115, 1.08, -0.13, 0.98, -0.16, 0.86], '#f1efea');
        P(c, [-0.14, 0.75, -0.09, 0.75, -0.11, 0.86, -0.1, 1.0, -0.115, 1.08, -0.13, 0.98, -0.16, 0.86], '#dcd9d2');
        for (let i = 0; i < 5; i++) { L(c, [-0.08, 1.07, -0.14 + i * 0.03, 1.2 + (i % 2) * 0.04], '#3f6a33', 0.005); C(c, -0.14 + i * 0.03, 1.2 + (i % 2) * 0.04, 0.022, ['#e8e2d0', '#f0c9d6', '#f6e7a8'][i % 3]); }
        // cam, táo
        C(c, 0.06, 0.79, 0.04, '#e3802b'); C(c, 0.12, 0.785, 0.037, '#ea8c32'); C(c, 0.09, 0.84, 0.037, '#e17a26'); C(c, -0.22, 0.79, 0.042, '#8fbf3a');
        // tách trà
        P(c, [-0.36, 0.75, -0.28, 0.75, -0.27, 0.83, -0.37, 0.83], '#f4f1ea'); E(c, -0.32, 0.832, 0.05, 0.008, '#a8742c');
        // bảng màu
        R(c, 0.2, 0.75, 0.3, 0.215, '#1b1b1b');
        for (let i = 0; i < 24; i++) { const col = i % 6, row = Math.floor(i / 6); R(c, 0.212 + col * 0.0465, 0.92 - row * 0.05, 0.04, 0.04, CHECKER[i]); }
      } },
      { id: 'tableF', zw: -0.45, draw(c) { R(c, -10, -2, 20, 2.75, '#734f36'); for (let i = 0; i < 30; i++) R(c, -6, 0.1 + i * 0.022, 12, 0.003, 'rgba(60,35,20,.25)'); } }
    ];
    return { layers, subject: 'objects', bg: ['wall'], sizeRef: { layer: 'wall', h: 0.46 } };
  }

  /* ---------- 6. Macro ---------- */
  function macro() {
    const layers = [
      { id: 'garden', zw: 1.4, hit: 'Vườn phía sau', draw(c) {
        R(c, -20, -20, 40, 40, '#5d7f3c'); const r = U.rng(51);
        for (let i = 0; i < 120; i++) C(c, -3 + r() * 6, -2 + r() * 4, 0.08 + r() * 0.22, ['#7aa04a', '#4c6d2f', '#9cbc55', '#3d5a27', '#c9c45a'][i % 5]);
      }, lights: () => { const r = U.rng(77), o = []; for (let i = 0; i < 26; i++) o.push({ x: -1.2 + r() * 2.4, y: -0.6 + r() * 1.3, r: 0.006, I: 0.05 + r() * 0.08, c: [1, 1, 0.9] }); return o; } },
      { id: 'leaves', zw: 0.12, hit: 'Lá phía sau', draw(c) {
        E(c, -0.06, -0.03, 0.06, 0.022, '#4f7d2f', 0.5); E(c, 0.07, 0.035, 0.05, 0.018, '#5f8f37', -0.4); E(c, 0.03, -0.06, 0.05, 0.02, '#46702a', 0.2);
      } },
      { id: 'flower', zw: 0, subject: true, hit: 'Bọ rùa', eye: [0.007, 0.006], draw(c) {
        L(c, [0, -0.01, 0.004, -0.2], '#4e7a2c', 0.004);
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; E(c, Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0.02, 0.0065, i % 2 ? '#fbf6f4' : '#f3e6ea', a); }
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; L(c, [Math.cos(a) * 0.01, Math.sin(a) * 0.01, Math.cos(a) * 0.036, Math.sin(a) * 0.036], 'rgba(200,170,180,.5)', 0.0004); }
        C(c, 0, 0, 0.009, '#e9b52c');
        for (let i = 0; i < 40; i++) { const a = i * 2.4, rr = 0.0013 * Math.sqrt(i); C(c, Math.cos(a) * rr, Math.sin(a) * rr, 0.0006, i % 2 ? '#c98d1b' : '#f2c84a'); }
        // bọ rùa
        c.save(); c.translate(0.007, 0.006); c.rotate(-0.5);
        for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) L(c, [k * 0.002, -0.0012 + j * 0.0016, k * 0.0045, -0.002 + j * 0.0022], '#111', 0.00035);
        E(c, 0, 0, 0.0034, 0.0042, '#c4161c'); L(c, [0, -0.0042, 0, 0.0034], '#3a0a0a', 0.0003);
        E(c, 0, 0.0036, 0.0022, 0.0013, '#111'); C(c, -0.0009, 0.0039, 0.0004, '#f2f2f2'); C(c, 0.0009, 0.0039, 0.0004, '#f2f2f2');
        for (const [sx, sy] of [[-0.0016, 0.0016], [0.0016, 0.0016], [-0.0019, -0.0008], [0.0019, -0.0008], [-0.0009, -0.0025], [0.0009, -0.0025]]) C(c, sx, sy, 0.0006, '#140606');
        c.restore();
        C(c, -0.016, -0.008, 0.0016, 'rgba(220,235,245,.9)');
      }, lights: () => [{ x: -0.0165, y: -0.0075, r: 0.0004, I: 0.15, c: [1, 1, 1] }, { x: 0.0062, y: 0.0078, r: 0.0003, I: 0.04, c: [1, 1, 1] }] },
      { id: 'grass', zw: -0.06, hit: 'Cọng cỏ tiền cảnh', draw(c) { P(c, [-0.05, -0.08, -0.044, -0.08, -0.03, 0.06, -0.033, 0.062], '#6b9a3a'); } }
    ];
    return { layers, subject: 'flower', bg: ['garden', 'leaves'], sizeRef: { layer: 'flower', h: 0.008 } };
  }

  const BUILD = { portrait, street, landscape, night, indoor, macro };
  const cache = {};
  function get(id) { return cache[id] || (cache[id] = BUILD[id]()); }
  return { get, CHECKER };
})();
