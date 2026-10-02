/* ===== PhotoLab · bộ dựng ảnh =====
   Cảnh gồm các lớp phẳng ở các độ sâu khác nhau, chiếu qua mô hình thấu kính mỏng.
   Mỗi lớp được làm mờ theo vòng mờ (DoF), chuyển động và rung tay; nguồn sáng vẽ riêng thành đốm bokeh/vệt.
   Bước "tráng" (develop) áp phơi sáng, cân bằng trắng, nhiễu, đường cong tông, méo ống kính. */
'use strict';
const ENG = (() => {
  const M = 48;               // lề vẽ thừa để vùng mờ ở mép ảnh không bị đen
  const EMAX = 64;            // lớp phát sáng mạnh: 255 = 64 lần trắng
  const ELO = 2;              // lớp phát sáng yếu: 255 = 2 lần trắng (giữ được vệt sáng mờ, đốm bokeh nhạt)
  const FMAX = 4;             // 1.0 trong lớp flash = 4 lần phơi sáng chuẩn
  const FILTER_OK = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
  let W = 900, H = 600, CW, CH;
  let base, emi, emL, fla, lay, sil, dbA, dbB, blr, bl2, hit, small, smallE, smallL;
  const s2l = new Float32Array(256);
  for (let i = 0; i < 256; i++) s2l[i] = U.srgb2lin(i / 255);
  const L2S_N = 4096; const l2s = new Uint8ClampedArray(L2S_N + 1);
  for (let i = 0; i <= L2S_N; i++) l2s[i] = Math.round(U.lin2srgb(i / L2S_N) * 255);
  // bảng nhiễu Gauss
  const NS = 512 * 512; const nz = new Float32Array(NS), nzc = new Float32Array(NS);
  (() => { const r = U.rng(99); for (let i = 0; i < NS; i++) { const u = r() || 1e-9, v = r(); const m = Math.sqrt(-2 * Math.log(u)); nz[i] = m * Math.cos(6.2832 * v); nzc[i] = m * Math.sin(6.2832 * v); } })();

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const X = c => c.getContext('2d', { willReadFrequently: true });

  function setSize(w, h) {
    if (w === W && h === H && base) return;
    W = w; H = h; CW = W + 2 * M; CH = H + 2 * M;
    [base, emi, emL, fla, lay, sil, dbA, dbB, blr, bl2] = Array.from({ length: 10 }, () => mk(CW, CH));
    hit = mk(1, 1); small = mk(96, Math.round(96 * H / W)); smallE = mk(small.width, small.height); smallL = mk(small.width, small.height);
  }
  setSize(900, 600);

  // ---------- làm mờ ----------
  // làm mờ có hướng (hộp) bằng cách cộng dồn lũy thừa 2 với chế độ 'lighter' (giữ đúng kênh alpha)
  function dirBlur(src, dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 1) return src;
    const ux = dx / len, uy = dy / len;
    let cur = src, s = len / 2, flip = 0;
    while (s >= 0.5) {
      const dst = flip ? dbB : dbA; flip ^= 1;
      const c = dst.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'copy'; c.globalAlpha = 1; c.clearRect(0, 0, CW, CH);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5;
      c.drawImage(cur, -ux * s / 2, -uy * s / 2); c.drawImage(cur, ux * s / 2, uy * s / 2);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      cur = dst; s /= 2;
    }
    return cur;
  }
  function gaussBlur(src, sigma, dst) {
    const c = dst.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'copy';
    if (sigma < 0.35) { c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-over'; return dst; }
    if (FILTER_OK) { c.filter = `blur(${sigma.toFixed(2)}px)`; c.drawImage(src, 0, 0); c.filter = 'none'; c.globalCompositeOperation = 'source-over'; return dst; }
    const w = sigma * 2.45;
    let r = dirBlur(src, w, 0); r = dirBlur(r, 0, w); r = dirBlur(r, w, 0); r = dirBlur(r, 0, w);
    c.drawImage(r, 0, 0); c.globalCompositeOperation = 'source-over'; return dst;
  }

  // ---------- hình học ----------
  function magAt(cam, Zm) { // độ phóng đại (mm cảm biến / mm vật)
    const v = cam.vImg; const d = Zm * 1000 - v;
    return d > 1 ? v / d : 0;
  }
  function cocPx(cam, Zm) {
    if (cam.N > 900) return 0;
    const c = U.coc(cam.fOpt, cam.Nview, cam.s * 1000, Zm * 1000);
    return c / cam.sensorW * W;
  }

  function layerZ(L, cam, env) {
    let zw = L.zw;
    if (L.subject && env.approach && L.motion) {
      zw = env.freeze ? 0 : 17 - ((7 * env.time) % 22);
    }
    return zw + cam.D;
  }
  function layerOffset(L, env) {
    if (!L.moving || !L.motion) return 0;
    const mo = L.motion(env); if (!mo.vx) return 0;
    if (L.subject && env.freeze) return 0;
    const P = L.period || 30;
    return ((mo.vx * env.time) % P + P * 1.5) % P - P / 2;
  }
  function layerTransform(L, cam, env, Zm) {
    const m = magAt(cam, Zm); if (!m) return null;
    const sx = m * 1000 * W / cam.sensorW;
    const off = layerOffset(L, env);
    return { sx, e: M + W / 2 + (off - cam.camX) * sx, f: M + H / 2 + cam.camY * sx, off };
  }

  // vẽ đốm sáng / vệt sáng vào lớp phát sáng (cH: dải mạnh, cL: dải yếu)
  function drawLights(cH, cL, lights, tf, cam, coc, mvx, mvy) {
    const stopped = cam.blades && cam.Nview > cam.Nwide * 1.35;
    const ml = Math.hypot(mvx, mvy);
    cH.globalCompositeOperation = cL.globalCompositeOperation = 'lighter';
    const rgb = (cc, v, sc) => `rgb(${Math.min(255, cc[0] * v * sc)},${Math.min(255, cc[1] * v * sc)},${Math.min(255, cc[2] * v * sc)})`;
    for (const li of lights) {
      const px = tf.e + li.x * tf.sx, py = tf.f - li.y * tf.sx;
      const rr = li.r * tf.sx * 2;
      const r2 = Math.max(0.5, rr);
      const d = Math.max(r2, coc, 1);
      if (px < -d - ml - 40 || px > CW + d + ml + 40 || py < -d - 40 || py > CH + d + 40) continue;
      if (li.soft) { // quầng sáng mềm: v(t) = V·(1−t)², tách thành phần yếu (≤ ELO) và phần mạnh
        const R = Math.max(2, rr / 2 + coc / 2), V = li.I * EMAX;
        const gL = cL.createRadialGradient(px, py, 0, px, py, R), gH = cH.createRadialGradient(px, py, 0, px, py, R);
        let hasH = false;
        for (let n = 0; n <= 10; n++) { const t = n / 10, v = V * (1 - t) * (1 - t); gL.addColorStop(t, rgb(li.c, Math.min(v, ELO), 255 / ELO)); if (v > ELO) hasH = true; gH.addColorStop(t, rgb(li.c, Math.max(0, v - ELO), 255 / EMAX)); }
        cL.fillStyle = gL; cL.beginPath(); cL.arc(px, py, R, 0, 6.2832); cL.fill();
        if (hasH) { cH.fillStyle = gH; cH.beginPath(); cH.arc(px, py, R, 0, 6.2832); cH.fill(); }
        continue;
      }
      let I = li.I * Math.min(1, (r2 / d) * (r2 / d)) * (rr < 0.5 ? (rr / 0.5) ** 2 : 1);
      if (ml > d * 0.6) I *= d / (ml + d);
      const V = I * EMAX; // độ sáng tuyến tính (1 = trắng)
      if (V * 255 / ELO < 0.5) continue;
      const lo = V <= ELO, c = lo ? cL : cH;
      const col = rgb(li.c, V, 255 / (lo ? ELO : EMAX));
      if (ml > d * 0.6) {
        c.strokeStyle = col; c.lineWidth = d; c.lineCap = 'round';
        c.beginPath(); c.moveTo(px - mvx / 2, py - mvy / 2); c.lineTo(px + mvx / 2, py + mvy / 2); c.stroke();
      } else if (stopped && d > 6) {
        const n = cam.blades; c.beginPath();
        for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + 0.3; const x = px + Math.cos(a) * d / 2, y = py + Math.sin(a) * d / 2; k ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.closePath(); c.fillStyle = col; c.fill();
      } else {
        c.beginPath(); c.arc(px, py, d / 2, 0, 6.2832); c.fillStyle = col; c.fill();
      }
    }
    cH.globalCompositeOperation = cL.globalCompositeOperation = 'source-over';
  }

  /* ---------- Bước 1: dựng các lớp ---------- */
  function composite(scene, cam, env) {
    const cb = base.getContext('2d'), ce = emi.getContext('2d'), cel = emL.getContext('2d'), cf = fla.getContext('2d');
    for (const c of [cb, ce, cel, cf]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, CW, CH); }
    const info = [];
    const items = scene.layers.map(L => ({ L, Z: layerZ(L, cam, env) })).filter(o => o.Z > 0.03).sort((a, b) => b.Z - a.Z);
    const subj = scene.layers.find(L => L.id === scene.subject);
    const subjZ = layerZ(subj, cam, env);
    const subjMo = subj.motion ? subj.motion(env) : { vx: 0 };
    const panW = cam.pan && subjMo.vx ? (subjMo.vx / subjZ) * cam.panAcc : 0; // tốc độ góc lia máy (rad/s)
    let bgBlurAcc = 0, bgN = 0;
    for (const { L, Z } of items) {
      const tf = layerTransform(L, cam, env, Z); if (!tf || tf.sx > 4e6) continue;
      const cl = lay.getContext('2d');
      cl.setTransform(1, 0, 0, 1, 0, 0); cl.globalCompositeOperation = 'source-over'; cl.globalAlpha = 1; cl.clearRect(0, 0, CW, CH);
      cl.setTransform(tf.sx, 0, 0, -tf.sx, tf.e, tf.f);
      const e2 = Object.assign({}, env, { px: 1 / tf.sx, sx: tf.sx });
      L.draw(cl, e2);
      cl.setTransform(1, 0, 0, 1, 0, 0);
      // chuyển động tương đối (px trong thời gian phơi sáng)
      const mo = L.motion ? L.motion(env) : { vx: 0 };
      const vxL = (mo.vx || 0) / Z;
      let mvx = (vxL - panW) * Z * cam.tMotion * tf.sx;
      let mvy = 0;
      if (mo.vz && !env.freeze) { /* tiến về máy: phóng to trong lúc phơi sáng – xấp xỉ bằng mờ nhẹ */ mvy = Math.abs(mo.vz) * cam.tMotion / Z * 60; }
      let src = lay;
      if (Math.hypot(mvx, mvy) > 0.7) src = dirBlur(lay, mvx, mvy);
      if (L.internal && cam.tMotion > 0) {
        const iv = L.internal, ivx = (iv.vx || 0) * cam.tMotion * tf.sx, ivy = -(iv.vy || 0) * cam.tMotion * tf.sx;
        if (Math.hypot(ivx, ivy) > 0.7) {
          if (src !== lay) { const t = sil.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'copy'; t.drawImage(src, 0, 0); t.globalCompositeOperation = 'source-over'; src = sil; }
          const blurredI = dirBlur(src, ivx, ivy);
          if (blurredI !== src) {
          const tgt = src.getContext('2d'); tgt.save();
          if (iv.x0 != null) { const x0 = tf.e + iv.x0 * tf.sx, x1 = tf.e + iv.x1 * tf.sx; tgt.beginPath(); tgt.rect(x0, 0, x1 - x0, CH); tgt.clip(); tgt.clearRect(x0, 0, x1 - x0, CH); }
          else tgt.clearRect(0, 0, CW, CH);
          tgt.drawImage(blurredI, 0, 0); tgt.restore();
          }
        }
      }
      // DoF
      let coc = cocPx(cam, Z);
      if (cam.portrait && !L.subject && Z > cam.s * 1.12) {
        const v = U.coc(cam.portrait.f, cam.portrait.N, cam.s * 1000, Z * 1000) / 36 * W;
        coc = Math.hypot(coc, Math.min(70, v));
      }
      if (cam.portrait && L.subject) { // quầng viền do tách nền bằng phần mềm
        const hal = gaussBlur(src, Math.max(1.5, (bgN ? bgBlurAcc / bgN : 8) / 7), bl2);
        cb.globalAlpha = 0.85; cb.drawImage(hal, 0, 0); cb.globalAlpha = 1;
      }
      const sig = Math.min(26, coc / 3.4);
      const out = gaussBlur(src, sig, blr);
      cb.drawImage(out, 0, 0);
      if (!L.subject && Z > subjZ * 1.15) { bgBlurAcc += coc; bgN++; }
      // che lớp phát sáng phía sau
      const sc = sil.getContext('2d'); sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'copy'; sc.drawImage(out, 0, 0);
      sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#000'; sc.fillRect(0, 0, CW, CH); sc.globalCompositeOperation = 'source-over';
      ce.drawImage(sil, 0, 0); cel.drawImage(sil, 0, 0);
      // nguồn sáng
      if (L.lights) {
        const lk = env.approach ? 1 : 0; if (L._lk !== lk) { L._lc = L.lights(env); L._lk = lk; } const ls = L._lc;
        drawLights(ce, cel, ls, tf, cam, coc, mvx, mvy);
      }
      // flash: vẽ lớp (không mờ chuyển động) nhân hệ số theo khoảng cách
      if (cam.flash) {
        const k = L.flash === false ? 0 : U.clamp(cam.flash.f(Z) / FMAX, 0, 1);
        const fsrc = gaussBlur(lay, sig, bl2);
        const sc2 = sil.getContext('2d'); sc2.globalCompositeOperation = 'copy'; sc2.drawImage(fsrc, 0, 0);
        sc2.globalCompositeOperation = 'source-atop'; // canvas lưu giá trị sRGB → hệ số k phải áp trong không gian tuyến tính
        sc2.fillStyle = `rgba(0,0,0,${1 - Math.pow(k, 1 / 2.2)})`; sc2.fillRect(0, 0, CW, CH); sc2.globalCompositeOperation = 'source-over';
        cf.drawImage(sil, 0, 0);
      }
      info.push({ id: L.id, hit: L.hit, Z, coc, motion: Math.hypot(mvx, mvy), sx: tf.sx, subject: !!L.subject, bg: (scene.bg || []).includes(L.id), fg: (scene.fg || []).includes(L.id), off: tf.off });
    }
    // rung tay
    if (cam.shake && cam.shake.len > 0.7) {
      const dx = Math.cos(cam.shake.a) * cam.shake.len, dy = Math.sin(cam.shake.a) * cam.shake.len;
      for (const cv of [base, emi, emL]) {
        const r = dirBlur(cv, dx, dy); const c = cv.getContext('2d'); c.globalCompositeOperation = 'copy'; c.drawImage(r, 0, 0); c.globalCompositeOperation = 'source-over';
      }
    }
    if (cam.tilt) bandBlur(cam);
    return { info, subjZ };
  }

  // hiệu ứng tilt-shift: dải nét nằm ngang, mờ tăng dần lên trên và xuống dưới
  function bandBlur(cam) {
    const rMax = Math.min(26, Math.abs(cam.tilt) * 2.4);
    for (const cv of [base, emi, emL]) {
      const a = gaussBlur(cv, rMax / 2, blr); const ca = sil.getContext('2d');
      ca.globalCompositeOperation = 'copy'; ca.drawImage(a, 0, 0); ca.globalCompositeOperation = 'source-over';
      const b = gaussBlur(cv, rMax, bl2);
      const cc = cv.getContext('2d');
      const yc = M + H * (0.5 + (cam.tiltPos || 0));
      // lớp mờ nhẹ
      const m1 = dbA.getContext('2d'); m1.setTransform(1, 0, 0, 1, 0, 0); m1.globalCompositeOperation = 'copy'; m1.drawImage(sil, 0, 0);
      m1.globalCompositeOperation = 'destination-in';
      let g = m1.createLinearGradient(0, yc - H * 0.45, 0, yc + H * 0.45);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.33, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(0.67, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      m1.fillStyle = g; m1.fillRect(0, 0, CW, CH); m1.globalCompositeOperation = 'source-over';
      const m2 = dbB.getContext('2d'); m2.setTransform(1, 0, 0, 1, 0, 0); m2.globalCompositeOperation = 'copy'; m2.drawImage(b, 0, 0);
      m2.globalCompositeOperation = 'destination-in';
      g = m2.createLinearGradient(0, yc - H * 0.6, 0, yc + H * 0.6);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.2, 'rgba(0,0,0,1)'); g.addColorStop(0.38, 'rgba(0,0,0,0)'); g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      m2.fillStyle = g; m2.fillRect(0, 0, CW, CH); m2.globalCompositeOperation = 'source-over';
      cc.drawImage(dbA, 0, 0); cc.drawImage(dbB, 0, 0);
    }
  }

  /* ---------- Đo sáng ---------- */
  function meter(spotX = 0.5, spotY = 0.5) {
    const sw = small.width, sh = small.height;
    const a = X(small), b = X(smallE), bl = X(smallL);
    a.drawImage(base, M, M, W, H, 0, 0, sw, sh); b.drawImage(emi, M, M, W, H, 0, 0, sw, sh); bl.drawImage(emL, M, M, W, H, 0, 0, sw, sh);
    const da = a.getImageData(0, 0, sw, sh).data, db = b.getImageData(0, 0, sw, sh).data, dl = bl.getImageData(0, 0, sw, sh).data;
    let ev = 0, ew = 0, cs = 0, cw = 0, ss = 0, sn = 0;
    const sr = 0.035 * Math.hypot(sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const Lb = 0.2126 * s2l[da[i]] + 0.7152 * s2l[da[i + 1]] + 0.0722 * s2l[da[i + 2]];
      const Le = (0.2126 * db[i] + 0.7152 * db[i + 1] + 0.0722 * db[i + 2]) / 255 * EMAX + (0.2126 * dl[i] + 0.7152 * dl[i + 1] + 0.0722 * dl[i + 2]) / 255 * ELO;
      const Lm = Lb + Le;
      const nx = x / sw - 0.5, ny = (y / sh - 0.5) * sh / sw, rr = Math.hypot(nx, ny);
      const wE = rr < 0.18 ? 1.6 : 1;
      ev += Math.log2(Math.min(Lm, 6) + 0.004) * wE; ew += wE;
      const wC = rr < 0.22 ? 3.2 : 1; cs += Math.min(Lm, 16) * wC; cw += wC;
      if (Math.hypot(x - spotX * sw, y - spotY * sh) < sr) { ss += Lm; sn++; }
    }
    return { evaluative: Math.pow(2, ev / ew), center: cs / cw, spot: sn ? ss / sn : cs / cw };
  }

  /* ---------- Chọn điểm lấy nét (dò lớp đầu tiên tại điểm ảnh) ---------- */
  function pick(scene, cam, env, px, py) {
    const items = scene.layers.map(L => ({ L, Z: layerZ(L, cam, env) })).filter(o => o.Z > 0.03).sort((a, b) => a.Z - b.Z);
    const c = X(hit);
    for (const { L, Z } of items) {
      const tf = layerTransform(L, cam, env, Z); if (!tf) continue;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1, 1);
      c.setTransform(tf.sx, 0, 0, -tf.sx, tf.e - (px + M), tf.f - (py + M));
      L.draw(c, Object.assign({}, env, { px: 1 / tf.sx, sx: tf.sx }));
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (c.getImageData(0, 0, 1, 1).data[3] > 100) return { L, Z };
    }
    return null;
  }
  function project(scene, cam, env, layerId, x, y) {
    const L = scene.layers.find(l => l.id === layerId); if (!L) return null;
    const Z = layerZ(L, cam, env); const tf = layerTransform(L, cam, env, Z); if (!tf) return null;
    return { x: tf.e - M + x * tf.sx, y: tf.f - M - y * tf.sx, sx: tf.sx, Z };
  }

  /* ---------- Bước 2: tráng ảnh ---------- */
  function develop(ctxOut, cam, opts = {}) {
    const bd = X(base).getImageData(M, M, W, H).data, ed = X(emi).getImageData(M, M, W, H).data, el = X(emL).getImageData(M, M, W, H).data;
    const fd = cam.flash ? X(fla).getImageData(M, M, W, H).data : null;
    const img = ctxOut.createImageData(W, H), od = img.data;
    const g = cam.gain, wa = cam.wbA, we = cam.wbE, wf = cam.wbF, fgain = FMAX;
    const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
    const k = cam.lensCorr ? 0 : cam.dist, fish = cam.fisheye, ca = cam.lensCorr ? 0 : cam.ca * 0.006, vig = cam.lensCorr ? cam.vig * 0.15 : cam.vig;
    const ic = cam.imageCircle || 0, gnd = cam.gnd || 0;
    const thMax = 1.25, tanTh = Math.tan(thMax);
    const A = cam.noiseA, B = cam.noiseB, chroma = cam.chroma || 0.35;
    const off = (opts.seed != null ? opts.seed : (Math.random() * NS) | 0);
    const st = cam.style, sat = st.s, con = st.c, mono = st.mono;
    const hdr = cam.hdr;
    const hist = new Uint32Array(64), hr = new Uint32Array(64), hg = new Uint32Array(64), hb = new Uint32Array(64);
    let hi = 0, lo = 0;
    const luma = new Uint8Array(W * H);
    const needWarp = fish || Math.abs(k) > 0.0015 || ca > 0;
    const hot = cam.hot || 0;
    let faceSum = 0, faceN = 0; const fr = opts.faceRect;
    function smp(data, x, y, ch, lin) {
      if (x < 0) x = 0; else if (x > W - 1.001) x = W - 1.001;
      if (y < 0) y = 0; else if (y > H - 1.001) y = H - 1.001;
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * W + x0) * 4 + ch;
      if (lin) return (s2l[data[i]] * (1 - fx) + s2l[data[i + 4]] * fx) * (1 - fy) + (s2l[data[i + W * 4]] * (1 - fx) + s2l[data[i + W * 4 + 4]] * fx) * fy;
      return ((data[i] * (1 - fx) + data[i + 4] * fx) * (1 - fy) + (data[i + W * 4] * (1 - fx) + data[i + W * 4 + 4] * fx) * fy) / 255;
    }
    for (let y = 0; y < H; y++) {
      const gy = gnd ? Math.pow(2, -gnd * U.clamp((0.56 - y / H) / 0.16, 0, 1)) : 1;
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy;
        let rb, gb, bb, re, ge, be, rf = 0, gf = 0, bf = 0;
        if (needWarp) {
          let sxp = x, syp = y;
          if (fish) { const rr = Math.sqrt(r2); if (rr > 1e-6) { const sc = Math.tan(rr * thMax) / tanTh / rr; sxp = cx + dx * sc * R; syp = cy + dy * sc * R; } }
          else if (k) { const sc = (1 + k * r2) / (1 + k); sxp = cx + dx * sc * R; syp = cy + dy * sc * R; }
          const cr = 1 + ca * r2, cbb = 1 - ca * r2;
          const xr = cx + (sxp - cx) * cr, yr = cy + (syp - cy) * cr, xb = cx + (sxp - cx) * cbb, yb = cy + (syp - cy) * cbb;
          rb = smp(bd, xr, yr, 0, 1); gb = smp(bd, sxp, syp, 1, 1); bb = smp(bd, xb, yb, 2, 1);
          re = smp(ed, xr, yr, 0, 0) * EMAX + smp(el, xr, yr, 0, 0) * ELO; ge = smp(ed, sxp, syp, 1, 0) * EMAX + smp(el, sxp, syp, 1, 0) * ELO; be = smp(ed, xb, yb, 2, 0) * EMAX + smp(el, xb, yb, 2, 0) * ELO;
          if (fd) { rf = smp(fd, xr, yr, 0, 1); gf = smp(fd, sxp, syp, 1, 1); bf = smp(fd, xb, yb, 2, 1); }
        } else {
          rb = s2l[bd[o]]; gb = s2l[bd[o + 1]]; bb = s2l[bd[o + 2]];
          re = (ed[o] * EMAX + el[o] * ELO) / 255; ge = (ed[o + 1] * EMAX + el[o + 1] * ELO) / 255; be = (ed[o + 2] * EMAX + el[o + 2] * ELO) / 255;
          if (fd) { rf = s2l[fd[o]]; gf = s2l[fd[o + 1]]; bf = s2l[fd[o + 2]]; }
        }
        let v = gy;
        if (vig) v *= 1 - vig * r2 * (0.6 + 0.4 * r2);
        if (ic) { const rr = Math.sqrt(r2); v *= U.clamp((ic - rr) / 0.04, 0, 1); }
        let r = ((rb * wa[0] + re * we[0]) * g + rf * fgain * wf[0]) * v;
        let gg = ((gb * wa[1] + ge * we[1]) * g + gf * fgain * wf[1]) * v;
        let b = ((bb * wa[2] + be * we[2]) * g + bf * fgain * wf[2]) * v;
        // nhiễu (photon + đọc), tăng theo ISO và giảm theo kích thước cảm biến
        const Y = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        const sd = Math.sqrt(A * (Y > 0 ? Y : 0) + B);
        const ni = (o / 4 + off) % NS, ni2 = (o / 4 * 7 + off * 3) % NS;
        const n = nz[ni] * sd;
        r += n + nzc[ni2] * sd * chroma; gg += n; b += n + nz[ni2] * sd * chroma;
        if (hot && ((ni * 2654435761) >>> 0) % 9973 < hot) { r += 0.8; gg += 0.5; b += 0.6; }
        if (hdr) { // nén vùng sáng kiểu HDR điện thoại
          r *= 1.25; gg *= 1.25; b *= 1.25;
          r = r * (1 + r / 16) / (1 + r); gg = gg * (1 + gg / 16) / (1 + gg); b = b * (1 + b / 16) / (1 + b);
        }
        if (st.warm) { r *= st.warm; b /= st.warm; }
        // sang sRGB
        let R8 = l2s[(r <= 0 ? 0 : r >= 1 ? 1 : r) * L2S_N | 0], G8 = l2s[(gg <= 0 ? 0 : gg >= 1 ? 1 : gg) * L2S_N | 0], B8 = l2s[(b <= 0 ? 0 : b >= 1 ? 1 : b) * L2S_N | 0];
        let fr2 = R8 / 255, fg2 = G8 / 255, fb2 = B8 / 255;
        if (mono) { const m = fr2 * mono[0] + fg2 * mono[1] + fb2 * mono[2]; fr2 = fg2 = fb2 = m; }
        else if (sat !== 1) { const m = 0.299 * fr2 + 0.587 * fg2 + 0.114 * fb2; fr2 = m + (fr2 - m) * sat; fg2 = m + (fg2 - m) * sat; fb2 = m + (fb2 - m) * sat; if (st.gb) { fg2 = m + (fg2 - m) * st.gb; fb2 = m + (fb2 - m) * st.gb; } }
        if (con) { fr2 = 0.5 + (fr2 - 0.5) * (1 + con); fg2 = 0.5 + (fg2 - 0.5) * (1 + con); fb2 = 0.5 + (fb2 - 0.5) * (1 + con); }
        R8 = fr2 * 255; G8 = fg2 * 255; B8 = fb2 * 255;
        od[o] = R8; od[o + 1] = G8; od[o + 2] = B8; od[o + 3] = 255;
        const Rc = od[o], Gc = od[o + 1], Bc = od[o + 2];
        const Lm = (0.2126 * Rc + 0.7152 * Gc + 0.0722 * Bc) | 0;
        luma[y * W + x] = Lm;
        hist[Lm >> 2]++; hr[Rc >> 2]++; hg[Gc >> 2]++; hb[Bc >> 2]++;
        if (Rc >= 254 || Gc >= 254 || Bc >= 254) hi++;
        if (Lm <= 3) lo++;
        if (fr && x >= fr[0] && x < fr[2] && y >= fr[1] && y < fr[3]) { faceSum += Lm; faceN++; }
      }
    }
    ctxOut.putImageData(img, 0, 0);
    return { hist, hr, hg, hb, clipHi: hi / (W * H), clipLo: lo / (W * H), luma, face: faceN ? faceSum / faceN : null };
  }

  // lớp phủ: cảnh báo cháy sáng, zebra, focus peaking
  function overlayMasks(luma, ctxOut, opts) {
    const img = ctxOut.createImageData(W, H), d = img.data;
    if (opts.peaking) {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = Math.abs(luma[i + 1] - luma[i - 1]), gy = Math.abs(luma[i + W] - luma[i - W]);
        if (gx + gy > 70) { const o = i * 4; d[o] = 255; d[o + 1] = 40; d[o + 2] = 40; d[o + 3] = 230; }
      }
    }
    if (opts.zebra) {
      for (let i = 0; i < W * H; i++) if (luma[i] >= 245) { const x = i % W, y = (i / W) | 0; if (((x + y) >> 2) & 1) { const o = i * 4; d[o] = d[o + 1] = d[o + 2] = 20; d[o + 3] = 200; } }
    }
    if (opts.clip) {
      for (let i = 0; i < W * H; i++) if (luma[i] >= 252) { const o = i * 4; d[o] = 255; d[o + 1] = 40; d[o + 2] = 140; d[o + 3] = 255; }
    }
    return img;
  }

  return { bufs: () => ({ base, emi, emL, fla, M, CW, CH }), dirBlur, gaussBlur, bandBlur, setSize, composite, develop, meter, pick, project, overlayMasks, get W() { return W; }, get H() { return H; }, FILTER_OK, EMAX, ELO, FMAX };
})();
