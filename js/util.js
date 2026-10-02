/* ===== PhotoLab · tiện ích chung ===== */
'use strict';
const U = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const log2 = Math.log2;

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Dãy giá trị 1/3 stop chuẩn trên máy ảnh
  const APERTURES = [1, 1.1, 1.2, 1.4, 1.48, 1.6, 1.8, 2, 2.2, 2.4, 2.5, 2.8, 2.9, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45];
  const APERTURE_STEPS = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32, 36, 40, 45];
  const SHUTTERS = [30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5, 0.4, 0.3,
    1 / 4, 1 / 5, 1 / 6, 1 / 8, 1 / 10, 1 / 13, 1 / 15, 1 / 20, 1 / 25, 1 / 30, 1 / 40, 1 / 50, 1 / 60, 1 / 80, 1 / 100,
    1 / 125, 1 / 160, 1 / 200, 1 / 250, 1 / 320, 1 / 400, 1 / 500, 1 / 640, 1 / 800, 1 / 1000, 1 / 1250, 1 / 1600,
    1 / 2000, 1 / 2500, 1 / 3200, 1 / 4000, 1 / 5000, 1 / 6400, 1 / 8000, 1 / 10000, 1 / 12000];
  const ISOS = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000,
    2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200];

  function nearest(list, v, logScale = true) {
    let best = list[0], bd = Infinity;
    for (const x of list) {
      const d = logScale ? Math.abs(Math.log(x) - Math.log(v)) : Math.abs(x - v);
      if (d < bd) { bd = d; best = x; }
    }
    return best;
  }
  const fmtN = n => 'f/' + (n >= 10 ? Math.round(n) : (Math.round(n * 10) / 10)).toString().replace(/\.0$/, '');
  function fmtT(t) {
    if (t >= 0.3) { const r = Math.round(t * 10) / 10; return (r % 1 === 0 ? r.toFixed(0) : r.toString()) + '″'; }
    return '1/' + Math.round(1 / t);
  }
  const fmtT_s = t => t >= 0.3 ? fmtT(t).replace('″', ' giây') : fmtT(t) + ' giây';
  const fmtEV = v => (v > 0.04 ? '+' : v < -0.04 ? '−' : '±') + Math.abs(Math.round(v * 10) / 10).toFixed(1);
  const fmtDist = m => !isFinite(m) || m > 9999 ? '∞' : m >= 10 ? m.toFixed(0) + ' m' : m >= 1 ? m.toFixed(2) + ' m' : (m * 100).toFixed(m < 0.1 ? 1 : 0) + ' cm';
  const fmtSigned = (v, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);

  // EV100 của bộ thông số
  const evOf = (N, t, iso) => log2(N * N / t) - log2(iso / 100);

  // ---- Quang học (thấu kính mỏng) ----
  // s: khoảng lấy nét tính từ cảm biến (mm), f: tiêu cự (mm)
  function lensSolve(f, s) {
    if (s <= 4 * f) s = 4 * f + 0.001; // không lấy nét gần hơn 1:1 với mô hình mỏng
    const u = (s + Math.sqrt(s * s - 4 * s * f)) / 2;
    return { u, v: s - u };
  }
  // đường kính vòng mờ trên cảm biến (mm) cho vật ở khoảng cách Z (mm từ cảm biến)
  function coc(f, N, sFocus, Z) {
    const fs = lensSolve(f, sFocus);
    const uz = Math.max(Z - fs.v, f * 1.0001);
    const vz = f * uz / (uz - f);
    return (f / N) * Math.abs(vz - fs.v) / vz;
  }
  function dofLimits(f, N, s, c) { // f,s,c mm → mm
    const H = f * f / (N * c) + f;
    const near = s * (H - f) / (H + s - 2 * f);
    const far = s < H ? s * (H - f) / (H - s) : Infinity;
    return { near, far, H };
  }

  // ---- Màu: Kelvin → RGB (xấp xỉ Tanner Helland) ----
  const srgb2lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lin2srgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  function k2rgb(K) {
    const t = K / 100; let r, g, b;
    if (t <= 66) {
      r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661;
      b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    } else {
      r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255;
    }
    return [r, g, b].map(x => srgb2lin(clamp(x, 1, 255) / 255));
  }
  // hệ số nhân kênh: ánh sáng Klight, máy đặt cân bằng trắng Kcam
  function wbRatio(Klight, Kcam) {
    const a = k2rgb(Klight), b = k2rgb(Kcam);
    const r = [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
    const l = 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2];
    return r.map(x => x / l);
  }
  const k2css = K => { const c = k2rgb(K).map(x => Math.round(lin2srgb(x) * 255)); return `rgb(${c[0]},${c[1]},${c[2]})`; };

  // DOM nhỏ gọn
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const store = {
    get(k, d) { try { const v = localStorage.getItem('photolab:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('photolab:' + k, JSON.stringify(v)); } catch (e) { } }
  };

  return { clamp, lerp, log2, rng, APERTURES, APERTURE_STEPS, SHUTTERS, ISOS, nearest, fmtN, fmtT, fmtT_s, fmtEV, fmtDist, fmtSigned,
    evOf, lensSolve, coc, dofLimits, srgb2lin, lin2srgb, k2rgb, wbRatio, k2css, h, $, $$, store };
})();
