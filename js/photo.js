/* ===== PhotoLab · bộ dựng ảnh thật =====
   Mỗi cảnh là một "gói" trong scenes/<id>/: ảnh gốc, bản đồ độ sâu, vùng chủ thể, (nền đã xóa chủ thể), scene.json.
   Ảnh gốc được coi là phơi sáng chuẩn của cảnh. Từ đó mô phỏng:
   – khung hình theo tiêu cự (cắt từ ảnh gốc), – vùng nét theo khẩu/khoảng lấy nét (làm mờ theo từng lớp độ sâu),
   – nhòe chuyển động của chủ thể hoặc của nền khi lia máy, – vùng sáng vượt trắng (đèn, mặt trời) thành đốm bokeh,
   – flash giảm theo bình phương khoảng cách. Phơi sáng, nhiễu, cân bằng trắng, méo ống kính do ENG.develop xử lý. */
'use strict';
const PH = (() => {
  let index = null, indexErr = null;
  const packs = {};
  const s2l = new Float32Array(256);
  for (let i = 0; i < 256; i++) s2l[i] = U.srgb2lin(i / 255);
  const L2S_N = 4096, l2s = new Uint8ClampedArray(L2S_N + 1);
  for (let i = 0; i <= L2S_N; i++) l2s[i] = Math.round(U.lin2srgb(i / L2S_N) * 255);
  const enc = v => l2s[(v <= 0 ? 0 : v >= 1 ? 1 : v) * L2S_N | 0];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctx2 = c => c.getContext('2d', { willReadFrequently: true });

  async function loadIndex() {
    if (index) return index;
    try {
      const r = await fetch('scenes/index.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      index = (await r.json()).scenes || [];
    } catch (e) { index = []; indexErr = e; }
    return index;
  }
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không tải được ' + src)); i.src = src; }); }

  // ảnh có lề kéo dài cạnh để khung cắt luôn nằm trong ảnh
  function padded(img, pad) {
    const w = img.naturalWidth, h = img.naturalHeight, c = mk(w + 2 * pad, h + 2 * pad), x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, pad, pad);
    x.drawImage(img, 0, 0, 1, h, 0, pad, pad, h); x.drawImage(img, w - 1, 0, 1, h, pad + w, pad, pad, h);
    x.drawImage(c, 0, pad, w + 2 * pad, 1, 0, 0, w + 2 * pad, pad); x.drawImage(c, 0, pad + h - 1, w + 2 * pad, 1, 0, pad + h, w + 2 * pad, pad);
    return c;
  }

  async function load(id) {
    if (packs[id] && packs[id].ready) return packs[id];
    if (packs[id] && packs[id].promise) return packs[id].promise;
    const base = 'scenes/' + id + '/';
    const p = (async () => {
      const meta = await (await fetch(base + 'scene.json', { cache: 'no-cache' })).json();
      const [photo, depth, mask, bg] = await Promise.all([loadImg(base + meta.files.photo), loadImg(base + meta.files.depth), loadImg(base + meta.files.mask), meta.files.bg ? loadImg(base + meta.files.bg) : Promise.resolve(null)]);
      const pad = Math.round(Math.max(photo.naturalWidth, photo.naturalHeight) * 0.12);
      const pk = { id, meta, pad, w: photo.naturalWidth, h: photo.naturalHeight, photo: padded(photo, pad), depth: padded(depth, pad), mask: padded(mask, pad), bg: bg ? padded(bg, pad) : null, ready: true, crop: null, comp: null };
      packs[id] = pk; return pk;
    })();
    packs[id] = { promise: p };
    return p.catch(e => { delete packs[id]; throw e; });
  }
  const get = id => packs[id] && packs[id].ready ? packs[id] : null;

  /* ---------- khung cắt theo tiêu cự ---------- */
  // tan(nửa góc ngang) của ảnh gốc, quy về tiêu cự tương đương 35 mm (theo đường chéo)
  function srcTanHalf(pk) {
    const m = pk.meta, diag = Math.hypot(pk.w, pk.h);
    const wEq = 43.27 * pk.w / diag; // bề ngang "tương đương" của ảnh gốc trên khung 35 mm
    return (wEq / 2) / (m.feq || 26);
  }
  function framing(pk, cam, W, H) {
    const want = (cam.sensorW / 2) / cam.fProj;      // tan nửa góc ngang của máy đang mô phỏng
    const have = srcTanHalf(pk);
    let fw = want / have;                            // bề ngang khung cắt / bề ngang ảnh gốc
    const asp = W / H;
    let tooWide = fw > 1.08;
    if (fw > 1) fw = 1;
    let cw = pk.w * fw, ch = cw / asp;
    if (ch > pk.h) { const k = pk.h / ch; ch = pk.h; cw = ch * asp; if (k < 0.92) tooWide = true; }
    // đặt khung quanh chủ thể (ưu tiên vùng mặt nếu là ảnh người), không vượt ra ngoài ảnh
    const sb = pk.meta.subject.box || [0.4, 0.3, 0.6, 0.7];
    const ppl = (pk.meta.kinds || []).some(k => /chan-dung|nguoi/.test(k));
    const land = (pk.meta.kinds || []).includes('phong-canh');
    let cx = (sb[0] + sb[2]) / 2 * pk.w, cy = (ppl ? sb[1] + (sb[3] - sb[1]) * 0.35 : (sb[1] + sb[3]) / 2) * pk.h;
    if (land) { cx = (cx + pk.w / 2) / 2; cy = (cy + pk.h / 2) / 2; } // phong cảnh: giữ bố cục gần với ảnh gốc
    cx = Math.min(pk.w - cw / 2, Math.max(cw / 2, cx)); cy = Math.min(pk.h - ch / 2, Math.max(ch / 2, cy));
    return { cw, ch, cx, cy, tooWide, frac: cw / pk.w, scale: W / cw };
  }

  /* ---------- chuẩn bị dữ liệu điểm ảnh cho một khung cắt ---------- */
  function prepare(pk, fr, W, H, M) {
    const key = [Math.round(fr.cw * 10), Math.round(fr.ch * 10), Math.round(fr.cx), Math.round(fr.cy), W, H].join('|');
    if (pk.crop && pk.crop.key === key) return pk.crop;
    const CW = W + 2 * M, CH = H + 2 * M, n = CW * CH;
    const sx = fr.cx - fr.cw / 2 - M / fr.scale + pk.pad, sy = fr.cy - fr.ch / 2 - M / fr.scale + pk.pad;
    const sw = CW / fr.scale, sh = CH / fr.scale;
    const tmp = mk(CW, CH), t = ctx2(tmp); t.imageSmoothingQuality = 'high';
    const grab = src => { t.clearRect(0, 0, CW, CH); t.drawImage(src, sx, sy, sw, sh, 0, 0, CW, CH); return t.getImageData(0, 0, CW, CH).data; };
    const ph = grab(pk.photo), dp = grab(pk.depth), mk_ = grab(pk.mask), bgd = pk.bg ? grab(pk.bg) : null;
    const m = pk.meta, hr = m.headroom || 1.5, al = m.depth.alpha, be = m.depth.beta, zmax = (m.depth.bgDist || 1000) * 4;
    const col = new Float32Array(n * 3), hi = new Float32Array(n * 3), Z = new Float32Array(n), A = new Float32Array(n);
    const bcol = bgd ? new Float32Array(n * 3) : null, bhi = bgd ? new Float32Array(n * 3) : null;
    let maxHi = 0;
    const split = (d8, o, outC, outH, i3) => {
      let r = s2l[d8[o]], g = s2l[d8[o + 1]], b = s2l[d8[o + 2]];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // vùng gần trắng trong ảnh gốc thực ra có thể sáng hơn nhiều (đèn, mặt trời) → kéo giãn lại
      if (L > 0.78) { const k = (L - 0.78) / 0.22; const e = 1 + hr * k * k * k; r *= e; g *= e; b *= e; }
      outC[i3] = Math.min(1, r); outC[i3 + 1] = Math.min(1, g); outC[i3 + 2] = Math.min(1, b);
      const hr_ = Math.max(0, r - 1), hg = Math.max(0, g - 1), hb = Math.max(0, b - 1);
      outH[i3] = hr_; outH[i3 + 1] = hg; outH[i3 + 2] = hb;
      return Math.max(hr_, hg, hb);
    };
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const i3 = i * 3;
      maxHi = Math.max(maxHi, split(ph, o, col, hi, i3));
      if (bgd) split(bgd, o, bcol, bhi, i3);
      const d = dp[o] / 255;
      Z[i] = d - be > 1e-4 ? Math.min(zmax, al / (d - be)) : zmax;
      A[i] = mk_[o] / 255;
    }
    pk.crop = { key, CW, CH, n, col, hi, Z, A, bcol, bhi, maxHi };
    pk.comp = null;
    return pk.crop;
  }

  /* ---------- dựng khung hình ---------- */
  let cvA, cvB, cvC;
  function canvases(CW, CH) {
    if (!cvA || cvA.width !== CW || cvA.height !== CH) { cvA = mk(CW, CH); cvB = mk(CW, CH); cvC = mk(CW, CH); }
  }
  // làm nhòe có hướng một lớp RGBA (giữ đúng alpha) bằng hàm của ENG, trả về dữ liệu đọc lại
  function dirBlurData(img, CW, CH, dx, dy) {
    const a = ctx2(cvA); a.putImageData(img, 0, 0);
    const out = ENG.dirBlur(cvA, dx, dy);
    const c = ctx2(cvC); c.globalCompositeOperation = 'copy'; c.drawImage(out, 0, 0); c.globalCompositeOperation = 'source-over';
    return c.getImageData(0, 0, CW, CH).data;
  }

  function render(id, cam, env) {
    const pk = get(id); if (!pk) return null;
    const B = ENG.bufs(), W = ENG.W, H = ENG.H, M = B.M, CW = B.CW, CH = B.CH;
    const fr = framing(pk, cam, W, H);
    const P = prepare(pk, fr, W, H, M);
    canvases(CW, CH);
    const m = pk.meta, n = P.n;
    const fpx = W / cam.sensorW * cam.fOpt;                 // tiêu cự tính bằng điểm ảnh
    const Zs = m.subject.Z;
    const mo = m.motion;
    const motionPx = mo ? mo.speed / Zs * cam.tMotion * fpx : 0;
    const ang = mo ? (mo.dir || 0) * Math.PI / 180 : 0;
    const key = [P.key, cam.Nview.toFixed(2), cam.s.toFixed(3), cam.fOpt.toFixed(2), cam.sensorW.toFixed(2), motionPx.toFixed(1), cam.pan ? 1 : 0, cam.portrait ? cam.portrait.N : 0].join('|');

    if (!pk.comp || pk.comp.key !== key) {
      // 1) chuyển động: chủ thể nhòe trên nền đã xóa chủ thể, hoặc nền nhòe khi lia máy
      let col = P.col, hi = P.hi, A = P.A;
      if (mo && motionPx > 0.8) {
        const dx = Math.cos(ang) * motionPx, dy = -Math.sin(ang) * motionPx;
        const bc = P.bcol || P.col, bh = P.bhi || P.hi;
        const c2 = new Float32Array(n * 3), h2 = new Float32Array(n * 3), A2 = new Float32Array(n);
        const imgS = new ImageData(CW, CH), dS = imgS.data, imgH = new ImageData(CW, CH), dH = imgH.data;
        const HS = Math.max(1, P.maxHi);
        if (!cam.pan) {
          for (let i = 0, o = 0; i < n; i++, o += 4) { const i3 = i * 3; dS[o] = enc(col[i3]); dS[o + 1] = enc(col[i3 + 1]); dS[o + 2] = enc(col[i3 + 2]); dS[o + 3] = A[i] * 255; dH[o] = hi[i3] * A[i] / HS * 255; dH[o + 1] = hi[i3 + 1] * A[i] / HS * 255; dH[o + 2] = hi[i3 + 2] * A[i] / HS * 255; dH[o + 3] = 255; }
          const sb = dirBlurData(imgS, CW, CH, dx, dy), hb = dirBlurData(imgH, CW, CH, dx, dy);
          for (let i = 0, o = 0; i < n; i++, o += 4) {
            const i3 = i * 3, a = sb[o + 3] / 255;
            c2[i3] = s2l[sb[o]] * a + bc[i3] * (1 - a); c2[i3 + 1] = s2l[sb[o + 1]] * a + bc[i3 + 1] * (1 - a); c2[i3 + 2] = s2l[sb[o + 2]] * a + bc[i3 + 2] * (1 - a);
            h2[i3] = hb[o] / 255 * HS + bh[i3] * (1 - a); h2[i3 + 1] = hb[o + 1] / 255 * HS + bh[i3 + 1] * (1 - a); h2[i3 + 2] = hb[o + 2] / 255 * HS + bh[i3 + 2] * (1 - a);
            A2[i] = a;
          }
        } else {
          for (let i = 0, o = 0; i < n; i++, o += 4) { const i3 = i * 3; dS[o] = enc(bc[i3]); dS[o + 1] = enc(bc[i3 + 1]); dS[o + 2] = enc(bc[i3 + 2]); dS[o + 3] = 255; dH[o] = bh[i3] / HS * 255; dH[o + 1] = bh[i3 + 1] / HS * 255; dH[o + 2] = bh[i3 + 2] / HS * 255; dH[o + 3] = 255; }
          const sb = dirBlurData(imgS, CW, CH, dx, dy), hb = dirBlurData(imgH, CW, CH, dx, dy);
          for (let i = 0, o = 0; i < n; i++, o += 4) {
            const i3 = i * 3, a = A[i];
            c2[i3] = col[i3] * a + s2l[sb[o]] * (1 - a); c2[i3 + 1] = col[i3 + 1] * a + s2l[sb[o + 1]] * (1 - a); c2[i3 + 2] = col[i3 + 2] * a + s2l[sb[o + 2]] * (1 - a);
            h2[i3] = hi[i3] * a + hb[o] / 255 * HS * (1 - a); h2[i3 + 1] = hi[i3 + 1] * a + hb[o + 1] / 255 * HS * (1 - a); h2[i3 + 2] = hi[i3 + 2] * a + hb[o + 2] / 255 * HS * (1 - a);
            A2[i] = a;
          }
        }
        col = c2; hi = h2; A = A2;
      }

      // 2) vòng mờ có dấu cho từng điểm: dương = trước điểm nét, âm = sau điểm nét
      const s = cam.s, f = cam.fOpt, N = cam.Nview;
      const K0 = f * f / (N * Math.max(1, s * 1000 - f)) * (W / cam.sensorW);   // px trên mỗi đơn vị |1 − s/Z|
      // vòng mờ sẵn có trong ảnh gốc (quy về khung hiện tại) – chỉ làm mờ thêm phần chênh lệch
      const src = m.src || {};
      let Ks = 0;
      if (src.N && src.f && (src.feq || m.feq)) {
        const feqS = src.feq || m.feq, diag = Math.hypot(pk.w, pk.h), wEq = 43.27 * pk.w / diag;
        const sensS = wEq * src.f / feqS;
        Ks = src.f * src.f / (src.N * Math.max(1, Zs * 1000 - src.f)) / sensS * W / fr.frac;
      }
      const pv = cam.portrait;
      const Kv = pv ? pv.f * pv.f / (pv.N * Math.max(1, s * 1000 - pv.f)) * (W / 36) : 0;
      const g = new Float32Array(n);
      let gmin = 0, gmax = 0;
      for (let i = 0; i < n; i++) {
        const z = P.Z[i];
        let c = K0 * Math.abs(1 - s / z);
        const cs = Ks * Math.abs(1 - Zs / z);
        c = c > cs ? Math.sqrt(c * c - cs * cs) : 0;
        if (pv && z > s * 1.1) { const v = Math.min(60, Kv * (1 - s / z)) * (1 - P.A[i]); c = Math.hypot(c, v); }
        c = Math.min(c, 80);
        const gi = z < s ? c : -c; g[i] = gi;
        if (gi < gmin) gmin = gi; if (gi > gmax) gmax = gi;
      }
      // 3) chia lớp theo vòng mờ, làm mờ từng lớp rồi gộp có chuẩn hóa
      const span = gmax - gmin;
      const K = span < 1.2 ? 1 : Math.min(7, Math.max(3, Math.ceil(span / 10) + 1));
      const centers = []; for (let k = 0; k < K; k++) centers.push(K === 1 ? (gmin + gmax) / 2 : gmin + span * k / (K - 1));
      const accC = new Float32Array(n * 3), accW = new Float32Array(n), accH = new Float32Array(n * 3), cover = new Float32Array(n);
      const HS = Math.max(1, P.maxHi);
      const wantHi = P.maxHi > 0.02;
      const imgC = new ImageData(CW, CH), dC = imgC.data, imgH2 = wantHi ? new ImageData(CW, CH) : null, dH2 = wantHi ? imgH2.data : null;
      const a = ctx2(cvA), b = ctx2(cvB);
      for (let kk = K - 1; kk >= 0; kk--) {           // từ gần đến xa (để che đốm sáng phía sau)
        const ck = centers[kk];
        const step = K > 1 ? span / (K - 1) : 1;
        let any = false;
        for (let i = 0, o = 0; i < n; i++, o += 4) {
          const w = K === 1 ? 1 : Math.max(0, 1 - Math.abs(g[i] - ck) / step);
          const i3 = i * 3;
          if (w > 0) any = true;
          dC[o] = enc(col[i3]); dC[o + 1] = enc(col[i3 + 1]); dC[o + 2] = enc(col[i3 + 2]); dC[o + 3] = w * 255;
          if (wantHi) { dH2[o] = hi[i3] * w / HS * 255; dH2[o + 1] = hi[i3 + 1] * w / HS * 255; dH2[o + 2] = hi[i3 + 2] * w / HS * 255; dH2[o + 3] = 255; }
        }
        if (!any) continue;
        const sigma = Math.abs(ck) / 3.4;
        a.putImageData(imgC, 0, 0);
        ENG.gaussBlur(cvA, sigma, cvB);
        const rc = b.getImageData(0, 0, CW, CH).data;
        let rh = null;
        if (wantHi) { a.putImageData(imgH2, 0, 0); ENG.gaussBlur(cvA, sigma, cvB); rh = b.getImageData(0, 0, CW, CH).data; }
        for (let i = 0, o = 0; i < n; i++, o += 4) {
          const w = rc[o + 3] / 255; if (w <= 0 && !rh) continue;
          const i3 = i * 3;
          if (w > 0) { accC[i3] += s2l[rc[o]] * w; accC[i3 + 1] += s2l[rc[o + 1]] * w; accC[i3 + 2] += s2l[rc[o + 2]] * w; accW[i] += w; }
          if (rh) { const vis = 1 - cover[i]; accH[i3] += rh[o] / 255 * HS * vis; accH[i3 + 1] += rh[o + 1] / 255 * HS * vis; accH[i3 + 2] += rh[o + 2] / 255 * HS * vis; }
          cover[i] = cover[i] + w * (1 - cover[i]);
        }
      }
      for (let i = 0; i < n; i++) { const w = accW[i]; if (w > 1e-4) { const i3 = i * 3; accC[i3] /= w; accC[i3 + 1] /= w; accC[i3 + 2] /= w; } }
      // thống kê cho phần phân tích
      const cocAt = z => { let c = K0 * Math.abs(1 - s / z); const cs = Ks * Math.abs(1 - Zs / z); return c > cs ? Math.sqrt(c * c - cs * cs) : 0; };
      const zb = Math.min(m.depth.bgDist || 1000, 1e4);
      pk.comp = { key, col: accC, hi: accH, K, stats: { subjCoc: cocAt(Zs), bgCoc: Math.min(80, cocAt(zb) + (pv ? Math.min(60, Kv) : 0)), fgCoc: (() => { let mx = 0; for (let i = 0; i < n; i += 37) if (P.Z[i] < Zs * 0.7) mx = Math.max(mx, Math.abs(g[i])); return mx; })() } };
    }

    // 4) ghi vào bộ đệm của ENG
    const C = pk.comp, bd = ctx2(B.base), ei = ctx2(B.emi), el = ctx2(B.emL), fl = ctx2(B.fla);
    const ib = bd.createImageData(CW, CH), ie = ei.createImageData(CW, CH), il = el.createImageData(CW, CH);
    const ifl = cam.flash ? fl.createImageData(CW, CH) : null;
    const db = ib.data, de = ie.data, dl = il.data, df = ifl ? ifl.data : null;
    const EMAX = ENG.EMAX, ELO = ENG.ELO, FMAX = ENG.FMAX;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const i3 = i * 3, r = C.col[i3], g = C.col[i3 + 1], b2 = C.col[i3 + 2];
      db[o] = enc(r); db[o + 1] = enc(g); db[o + 2] = enc(b2); db[o + 3] = 255;
      for (let c = 0; c < 3; c++) { const v = C.hi[i3 + c]; dl[o + c] = Math.min(v, ELO) / ELO * 255; de[o + c] = Math.max(0, v - ELO) / EMAX * 255; }
      dl[o + 3] = de[o + 3] = 255;
      if (df) { const k = Math.min(1, cam.flash.f(P.Z[i]) / FMAX), kk = Math.pow(k, 1 / 2.2); df[o] = enc(r) * kk; df[o + 1] = enc(g) * kk; df[o + 2] = enc(b2) * kk; df[o + 3] = 255; }
    }
    bd.putImageData(ib, 0, 0); ei.putImageData(ie, 0, 0); el.putImageData(il, 0, 0);
    if (ifl) fl.putImageData(ifl, 0, 0); else { fl.fillStyle = '#000'; fl.fillRect(0, 0, CW, CH); }
    // 5) rung tay và tilt-shift áp lên toàn khung
    if (cam.shake && cam.shake.len > 0.7) {
      const dx = Math.cos(cam.shake.a) * cam.shake.len, dy = Math.sin(cam.shake.a) * cam.shake.len;
      for (const cv of [B.base, B.emi, B.emL]) { const r = ENG.dirBlur(cv, dx, dy); const c = cv.getContext('2d'); c.globalCompositeOperation = 'copy'; c.drawImage(r, 0, 0); c.globalCompositeOperation = 'source-over'; }
    }
    if (cam.tilt) ENG.bandBlur(cam);
    const st = C.stats;
    const info = [
      { id: 'subject', hit: m.subject.name, subject: true, Z: Zs, coc: st.subjCoc, motion: cam.pan ? 0 : motionPx, sx: fpx / Zs },
      { id: 'bg', hit: 'Hậu cảnh', bg: true, Z: m.depth.bgDist, coc: st.bgCoc, motion: cam.pan ? motionPx : 0, sx: fpx / (m.depth.bgDist || 1000) },
      { id: 'fg', hit: 'Tiền cảnh', fg: true, Z: Zs * 0.5, coc: st.fgCoc, motion: 0, sx: 0 }
    ];
    return { info, subjZ: Zs, frame: fr, layers: C.K };
  }

  // khoảng cách tại một điểm trong khung (0..1) – dùng cho lấy nét chạm/điểm AF
  function depthAt(id, x, y) {
    const pk = get(id); if (!pk || !pk.crop) return null;
    const P = pk.crop, M = ENG.bufs().M;
    const px = Math.round(M + x * ENG.W), py = Math.round(M + y * ENG.H);
    let best = Infinity;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const i = Math.min(P.CH - 1, Math.max(0, py + dy)) * P.CW + Math.min(P.CW - 1, Math.max(0, px + dx)); best = Math.min(best, P.Z[i]); }
    return best;
  }
  // vị trí chủ thể/mắt trong khung hiện tại (0..1)
  function toFrame(id, pt) {
    const pk = get(id); if (!pk || !pk.crop) return null;
    const fr = framing(pk, lastCam || { sensorW: 36, fProj: 50 }, ENG.W, ENG.H);
    return { x: (pt[0] * pk.w - (fr.cx - fr.cw / 2)) / fr.cw, y: (pt[1] * pk.h - (fr.cy - fr.ch / 2)) / fr.ch };
  }
  let lastCam = null;
  function setCam(c) { lastCam = c; }
  function invalidate(id) { const pk = get(id); if (pk) pk.comp = null; }

  return { loadIndex, load, get, render, depthAt, toFrame, setCam, invalidate, framing, srcTanHalf, get index() { return index; }, get indexErr() { return indexErr; } };
})();
