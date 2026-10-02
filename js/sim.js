/* ===== PhotoLab · bộ mô phỏng (trạng thái, logic máy, giao diện Lab) ===== */
'use strict';
const SIM = (() => {
  const { h, $, $$, clamp, fmtN, fmtT, fmtEV, fmtDist } = U;
  // Hằng hiệu chuẩn đồng hồ đo sáng (độ chói trung bình của một cảnh "bình thường" khi phơi sáng đúng)
  const REF = { evaluative: 0.155, center: 0.2, spot: 0.18 };

  const S = {
    device: 'ml_ff', lens: 'p85', focal: 85, scene: 'portrait',
    mode: 'A', N: 5.6, t: 1 / 250, iso: 100, isoAuto: true, ec: 0, pshift: 0,
    wb: 'auto', wbK: 5200, metering: 'evaluative', style: 'std',
    afMode: 'S', afArea: 'eye', afPoint: [0.5, 0.45], mf: 3, focus: 2.5,
    support: 'hand', is: true, filter: 'none', flash: 'off', speedlite: false,
    D: 2.5, keepSize: false, pan: false, panAcc: 1, approach: false, freeze: true,
    lensCorr: true, cropAuto: true, tilt: 0, vf: 'ovf', dofPreview: false,
    disp: { hist: true, grid: false, zebra: false, peaking: false, clip: true, af: true },
    phone: { cam: 'w', mode: 'photo', vN: 2, isoAuto: true, tAuto: true },
    mute: false
  };
  let clock = 0, lastMeter = null, lastStats = null, lastRig = null, lastExp = null, lastInfo = null, review = null, dirty = true;
  const shots = [];
  let cv, ctx, ov, octx, hcv, hctx;

  /* ---------- tra cứu ---------- */
  const isPhone = () => S.device.length < 6 && !!D.PHONES.find(p => p.id === S.device);
  const dev = () => D.BODIES.find(b => b.id === S.device) || D.PHONES.find(p => p.id === S.device);
  const lensObj = () => D.LENSES.find(l => l.id === S.lens);
  const isPhoto = () => S.scene.startsWith('p:');
  const photoId = () => S.scene.slice(2);
  const PLACE = { trong: 'Trong nhà', ngoai: 'Ngoài trời' }, LIGHT = { thieu: 'thiếu sáng', du: 'đủ sáng', thua: 'thừa sáng' };
  function photoMeta() {
    const pk = PH.get(photoId());
    const ix = (PH.index || []).find(x => x.id === photoId()) || {};
    const m = pk ? pk.meta : null;
    const Z = m ? m.subject.Z : 3;
    const trim = m ? (m.meterTrim || 0) : 0;
    return { id: S.scene, photo: true, loading: !m, name: (m || ix).title || 'Ảnh thật', place: `${PLACE[(m || ix).place] || ''} · ${LIGHT[(m || ix).light] || ''}`,
      ev: m ? m.ev : 12, K: m ? m.K : 5500, D: Z, Drange: [Z, Z], camY: 0, moving: !!(m && m.motion), week: 4, trim: { evaluative: trim, center: trim, spot: 0 }, meta: m };
  }
  const sceneMeta = () => isPhoto() ? photoMeta() : D.SCENES_META.find(s => s.id === S.scene);
  const scene = () => isPhoto() ? null : SC.get(S.scene);
  const pcam = () => { const p = dev(); return p.cams.find(c => c.id === S.phone.cam) || p.cams.find(c => c.main); };
  function proSpec() { const p = dev(); if (!p.cams) return null; if (S.phone.mode === 'pro') return p.pro; if (S.phone.mode === 'third') return p.third; return null; }
  const snapUp = (list, v) => list.find(x => x >= v - 0.04) || list[list.length - 1];

  /* ---------- thông số quang học hiện tại ---------- */
  function rig() {
    const d = dev(); const r = { dev: d, phone: !!d.cams };
    if (r.phone) {
      const c = pcam(); let sen = Object.assign({}, D.SENSORS[c.sensor]);
      const crop = c.crop || 1;
      const fOpt = c.feq * sen.diag / D.FF_DIAG;
      if (crop > 1) { sen = Object.assign({}, sen, { w: sen.w / crop, h: sen.h / crop, diag: sen.diag / crop, area: sen.area / crop / crop }); sen.crop = D.FF_DIAG / sen.diag; }
      Object.assign(r, { sensor: sen, fOpt, feq: c.feq, Nwide: c.Ns ? c.Ns[0] : c.N, Nmin: c.Ns ? c.Ns[c.Ns.length - 1] : c.N, Ns: c.Ns || null, mfd: c.mfd, mag: c.mag,
        isStops: c.ois, blades: c.Ns ? 6 : 0, dist: 0, vig: 0.08, ca: 0, fisheye: false, fixedFocus: c.fixedFocus || (!c.af ? 'hyper' : null), cam: c, mfOnly: false, tilt: false });
    } else {
      const L = lensObj(); let sen = Object.assign({}, D.SENSORS[d.sensor]);
      let ic = 0;
      if (L.format === 'APSC' && d.sensor === 'FF') { if (S.cropAuto) sen = Object.assign({}, D.SENSORS.APSC); else ic = 0.66; }
      const f = clamp(S.focal, L.fr[0], L.fr[1]);
      const tt = L.fr[0] === L.fr[1] ? 0 : Math.log(f / L.fr[0]) / Math.log(L.fr[1] / L.fr[0]);
      const Nw = snapUp(U.APERTURE_STEPS, L.nw[0] * Math.pow(L.nw[1] / L.nw[0], tt));
      const Nmin = U.nearest(U.APERTURE_STEPS, U.lerp(L.nmin[0], L.nmin[1], tt));
      Object.assign(r, { sensor: sen, fOpt: f, feq: f * sen.crop, Nwide: Nw, Nmin, Ns: null, mfd: L.mfd, mag: L.mag * f / L.fr[1],
        isStops: (S.is ? Math.max(L.is, d.ibis) + (L.is && d.ibis ? 0.5 : 0) : 0), blades: L.blades, dist: U.lerp(L.dist[0], L.dist[1], tt),
        vig: L.vig, ca: L.ca, fisheye: !!L.fisheye, imageCircle: ic, lens: L, mfOnly: !!L.mfOnly, tilt: !!L.tilt });
    }
    if (S.vertical) r.sensor = Object.assign({}, r.sensor, { w: r.sensor.h, h: r.sensor.w });
    r.crop = r.sensor.crop;
    return r;
  }

  /* ---------- lấy nét ---------- */
  function fEffAt(r, s) {
    const fClose = r.mfd * 1000 * r.mag / ((1 + r.mag) * (1 + r.mag));
    const fc = Math.min(r.fOpt, fClose);
    return r.fOpt - (r.fOpt - fc) * Math.pow(r.mfd / s, 2);
  }
  function camFor(r, sFocus) {
    const s = Math.max(sFocus, r.mfd);
    const fEff = fEffAt(r, s);
    const sol = U.lensSolve(fEff, s * 1000);
    let fProj = fEff, vImg = sol.v;
    if (r.fisheye) { fProj = (r.sensor.diag / 2) / Math.tan(1.25); vImg = U.lensSolve(fProj, s * 1000).v; }
    return { fEff, fProj, vImg, mag: sol.v / sol.u, s };
  }
  function hyperfocal(r, N) { const c = r.sensor.diag / 1500; return (r.fOpt * r.fOpt / (N * c) + r.fOpt) / 1000; }
  function env() { return { time: clock, cpl: S.filter === 'cpl', approach: S.scene === 'street' && S.approach, freeze: S.freeze }; }
  function baseCam(r, s) {
    const g = camFor(r, s), sm = sceneMeta();
    return { sensorW: r.sensor.w, fOpt: g.fEff, vImg: g.vImg, s: g.s, D: S.D, camY: sm.camY, camX: 0, N: 2, Nview: 2, Nwide: r.Nwide, blades: r.blades };
  }
  function autoFocus(r, kind) {
    const sc = scene(), e = env();
    if (r.fixedFocus) { S.focus = r.fixedFocus === 'hyper' ? hyperfocal(r, r.Nwide) : r.fixedFocus; return; }
    if (S.afMode === 'M' || r.mfOnly) { S.focus = Math.max(S.mf, r.mfd); return; }
    const W = ENG.W, Hh = ENG.H;
    let target = null;
    const area = kind === 'track' || (r.phone && S.afArea === 'auto') ? 'eye' : S.afArea;
    if (isPhoto()) {
      const m = sceneMeta().meta; if (!m) return;
      const id = photoId();
      if (area === 'eye') target = { Z: m.subject.Z, name: m.subject.name };
      else if (area === 'point') { const z = PH.depthAt(id, S.afPoint[0], S.afPoint[1]); target = { Z: z || m.subject.Z, name: z ? 'điểm bạn chọn' : m.subject.name }; }
      else {
        let best = null;
        for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 5; ix++) { const z = PH.depthAt(id, 0.3 + ix * 0.1, 0.35 + iy * 0.15); if (z && (!best || z < best.Z)) best = { Z: z, name: 'vật gần nhất trong vùng AF' }; }
        target = best || { Z: m.subject.Z, name: m.subject.name };
      }
      if (target) { S.focus = Math.max(target.Z, r.mfd); S.focusName = target.name; if (target.Z < r.mfd) S.focusName = (target.name || '') + ' (quá gần – dưới khoảng lấy nét tối thiểu)'; }
      return;
    }
    const cam = baseCam(r, S.focus);
    if (area === 'eye') {
      const L = sc.layers.find(l => l.id === sc.subject);
      const Z = L.zw + S.D + (e.approach ? (e.freeze ? 0 : 17 - ((7 * e.time) % 22)) : 0);
      target = { Z, name: L.hit };
    } else if (area === 'point') {
      const p = ENG.pick(sc, cam, e, S.afPoint[0] * W, S.afPoint[1] * Hh);
      if (p) target = { Z: p.Z, name: p.L.hit };
    } else { // tự chọn: máy ưu tiên vật gần nhất trong vùng điểm AF
      let best = null;
      for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 5; ix++) {
        const px = W * (0.3 + ix * 0.1), py = Hh * (0.35 + iy * 0.15);
        const p = ENG.pick(sc, cam, e, px, py);
        if (p && p.Z < 900 && (!best || p.Z < best.Z)) best = { Z: p.Z, name: p.L.hit };
      }
      target = best;
    }
    if (target) { S.focus = Math.max(target.Z, r.mfd); S.focusName = target.name; if (target.Z < r.mfd) S.focusName = (target.name || '') + ' (quá gần – dưới khoảng lấy nét tối thiểu)'; }
  }

  /* ---------- phơi sáng ---------- */
  function filterStops() { const f = D.FILTERS.find(x => x.id === S.filter); return f ? f.stops : 0; }
  function meterLum(m) { return m ? m[S.metering] : REF[S.metering]; }
  function expose(r, m, magAtFocus) {
    const sm = sceneMeta(), d = r.dev;
    const nd = filterStops();
    const EVtrue = sm.ev;
    const lum = meterLum(m);
    const EVmeter = EVtrue + Math.log2(lum / REF[S.metering]) + (sm.trim ? sm.trim[S.metering] : 0);
    const bell = magAtFocus > 0.1 ? 2 * Math.log2(1 + magAtFocus) : 0; // ống kính dài ra khi chụp macro → mất sáng
    const isoR = r.phone ? (proSpec() || { iso: [r.cam.feq > 60 ? 50 : 32, 6400] }).iso : d.iso;
    const tR = r.phone ? (proSpec() || { shutter: [1 / 8000, 1] }).shutter : d.shutter;
    const tFast = tR[0], tSlow = tR[1];
    let N = S.N, t = S.t, iso = S.iso, flags = {}, hdr = false, nr = 1, night = false, tMotion = null, isoAuto = S.isoAuto;
    const evAt = (N, t, iso) => U.evOf(N, t, iso) + bell;
    const tFor = (N, iso, ev) => clamp(N * N / Math.pow(2, ev - bell + Math.log2(iso / 100)), tFast, tSlow);
    const snapT = t => U.nearest(U.SHUTTERS.filter(x => x >= tFast * 0.99 && x <= tSlow * 1.01), t);
    const snapI = i => U.nearest(U.ISOS.filter(x => x >= isoR[0] && x <= isoR[1]), i);
    const safeT = 1 / Math.max(30, r.feq * 1.0) * Math.pow(2, Math.min(r.isStops, 3));
    let target = EVmeter - nd - S.ec;
    const mode = r.phone ? S.phone.mode : S.mode;

    if (r.phone && (mode === 'photo' || mode === 'portrait')) {
      // điện thoại tự động: đo sáng thông minh + HDR ghép khung
      target = EVtrue - nd + 0.3 * (EVmeter - EVtrue) - S.ec;
      N = r.Ns ? (EVtrue < 8 ? r.Ns[0] : 1.8) : r.Nwide;
      iso = isoR[0]; t = tFor(N, iso, target);
      const tMax = 1 / 30;
      if (t > tMax) { t = tMax; iso = clamp(100 * Math.pow(2, Math.log2(N * N / t) - (target - bell)), isoR[0], 3200); }
      if (U.evOf(N, t, iso) + bell > target + 0.4) { night = true; const need = Math.pow(2, U.evOf(N, t, iso) + bell - target); t = Math.min(1, t * need); }
      t = snapT(t); iso = snapI(iso); hdr = true; nr = night ? 0.22 : 0.35; tMotion = night ? 1 / 15 : t;
      isoAuto = true;
    } else if (r.phone) {
      const ps = proSpec();
      N = ps.apMode === 'list' && r.Ns ? clamp(S.N, r.Ns[0], r.Ns[r.Ns.length - 1]) : r.Nwide;
      if (ps.apMode === 'list' && r.Ns) N = U.nearest(r.Ns, N);
      let tAuto = S.phone.tAuto, iAuto = ps.isoManual ? S.phone.isoAuto : true;
      if (ps.samsungRule && !tAuto) iAuto = false; // Samsung: tốc độ chỉnh tay thì ISO cũng phải chỉnh tay
      if (S.phone.mode === 'third') { tAuto = false; iAuto = false; }
      if (tAuto && iAuto) { iso = isoR[0]; t = tFor(N, iso, target); if (t > 1 / 30) { t = 1 / 30; iso = clamp(100 * Math.pow(2, Math.log2(N * N / t) - (target - bell)), isoR[0], isoR[1]); } }
      else if (tAuto) { iso = S.iso; t = tFor(N, iso, target); }
      else if (iAuto) { t = S.t; iso = clamp(100 * Math.pow(2, Math.log2(N * N / t) - (target - bell)), isoR[0], isoR[1]); }
      else { t = S.t; iso = S.iso; }
      t = snapT(clamp(t, tFast, tSlow)); iso = snapI(iso); nr = 0.6; isoAuto = iAuto; flags.tAuto = tAuto; flags.iAuto = iAuto;
    } else {
      N = clamp(S.N, r.Nwide, r.Nmin);
      const maxAutoIso = Math.min(d.iso[1], 12800);
      const raiseIso = (needT) => { // ISO tự động: giữ tốc độ an toàn
        const evIso = Math.log2(N * N / needT) - (target - bell);
        return clamp(100 * Math.pow(2, evIso), d.iso[0], maxAutoIso);
      };
      if (mode === 'auto' || mode === 'P') {
        isoAuto = mode === 'auto' ? true : S.isoAuto;
        const iso0 = isoAuto ? d.iso[0] : S.iso;
        const t0 = 1 / Math.max(60, 2 * r.feq / Math.pow(2, Math.min(r.isStops, 2)));
        const evIso = target + Math.log2(iso0 / 100);
        const excess = evIso - bell - Math.log2(r.Nwide * r.Nwide / t0);
        let stopsA = excess > 0 ? excess / 2 : 0;
        stopsA = clamp(stopsA + S.pshift, 0, 2 * Math.log2(r.Nmin / r.Nwide));
        N = U.nearest(U.APERTURE_STEPS, r.Nwide * Math.pow(2, stopsA / 2));
        N = clamp(N, r.Nwide, r.Nmin);
        iso = iso0; t = tFor(N, iso, target);
        if (isoAuto && t > t0) { iso = raiseIso(t0); t = tFor(N, iso, target); }
      } else if (mode === 'A') {
        iso = S.iso; t = N * N / Math.pow(2, target - bell + Math.log2(iso / 100));
        if (isoAuto) { iso = d.iso[0]; t = N * N / Math.pow(2, target - bell); if (t > safeT) { iso = raiseIso(safeT); t = N * N / Math.pow(2, target - bell + Math.log2(iso / 100)); } }
        if (S.flash !== 'off' && t < d.sync) t = d.sync; // giới hạn tốc độ đồng bộ flash
        if (t > tSlow || t < tFast) flags.blinkT = true;
        t = clamp(t, tFast, tSlow);
      } else if (mode === 'S') {
        t = S.t; iso = S.iso;
        let Nn = Math.sqrt(t * Math.pow(2, target - bell + Math.log2(iso / 100)));
        if (isoAuto) { iso = d.iso[0]; Nn = Math.sqrt(t * Math.pow(2, target - bell)); if (Nn < r.Nwide) { iso = clamp(100 * Math.pow(2, 2 * Math.log2(r.Nwide) - Math.log2(t) - (target - bell)), d.iso[0], maxAutoIso); Nn = Math.sqrt(t * Math.pow(2, target - bell + Math.log2(iso / 100))); } }
        if (Nn < r.Nwide * 0.97 || Nn > r.Nmin * 1.03) flags.blinkN = true;
        N = clamp(U.nearest(U.APERTURE_STEPS, Nn), r.Nwide, r.Nmin);
      } else { // M
        t = S.t; iso = S.iso;
        if (isoAuto) { iso = clamp(100 * Math.pow(2, Math.log2(N * N / t) - (target - bell)), d.iso[0], maxAutoIso); }
      }
      t = snapT(t); iso = snapI(iso);
    }
    const EVset = evAt(N, t, iso);
    const delta = EVtrue - nd - EVset; // + = dư sáng
    const meterDev = (EVmeter - nd) - EVset;  // kim đo sáng (so với gợi ý của máy)
    return { N, t, iso, delta, meterDev, EVmeter, EVtrue, nd, flags, hdr, nr, night, tMotion: tMotion != null ? tMotion : t, isoAuto, bell, mode };
  }

  /* ---------- cân bằng trắng ---------- */
  function wbKelvin(r) {
    const Ks = sceneMeta().K;
    if (r.phone && (S.phone.mode === 'photo' || S.phone.mode === 'portrait')) return Ks + (5600 - Ks) * (Ks < 3500 ? 0.2 : 0.05);
    if (S.wb === 'auto') return Ks + (5500 - Ks) * (Ks < 3500 ? 0.32 : 0.08);
    if (S.wb === 'k') return S.wbK;
    return D.WB_PRESETS.find(w => w.id === S.wb).K;
  }

  /* ---------- dựng khung hình ---------- */
  function buildCam(r, ex, preview) {
    const sm = sceneMeta(), d = r.dev;
    const g = camFor(r, S.focus);
    const ovf = preview && !r.phone && d.kind === 'dslr' && S.vf === 'ovf';
    const Nview = ovf && !S.dofPreview ? r.Nwide : ex.N;
    const Kc = wbKelvin(r);
    const sen = r.sensor;
    const P = 6000 * sen.area / 864;
    const nr = ex.nr;
    const A = nr * nr * (ex.iso / 100) / P, B = nr * nr * Math.pow(3 * (ex.iso / 100) / P, 2);
    // rung tay
    let shakeLen = 0;
    if (S.support === 'hand' && !ex.night) shakeLen = 1.5 * ex.t * r.feq / Math.pow(2, r.isStops) * (ENG.W / 900);
    else if (S.support === 'tripod' && r.isStops > 0 && !r.phone && S.is && r.lens && r.lens.is) shakeLen = 0.9;
    let gain = Math.pow(2, ex.delta);
    let wbA = U.wbRatio(sm.K, Kc), wbE = U.wbRatio(5500, Kc), wbF = U.wbRatio(5500, Kc);
    let style = D.STYLES.find(s => s.id === S.style) || D.STYLES[0];
    let A2 = A, B2 = B, hdr = ex.hdr;
    if (ovf) { // kính ngắm quang học: mắt tự thích nghi, không có nhiễu, không thấy cân bằng trắng
      const ad = lastMeter ? Math.log2(REF.evaluative / lastMeter.evaluative) * 0.6 : 0;
      gain = Math.pow(2, ad) * (S.dofPreview ? Math.pow(r.Nwide / ex.N, 2) : 1);
      A2 = 0; B2 = 0; hdr = true; style = { s: 1, c: 0 };
      wbA = U.wbRatio(sm.K, sm.K * 0.75 + 5500 * 0.25); wbE = U.wbRatio(5500, sm.K * 0.75 + 5500 * 0.25); wbF = wbE;
    }
    let flash = null;
    if (S.flash !== 'off' && !ovf) {
      const GN = r.phone ? 2 : (S.speedlite || !d.popup ? 40 : d.popup);
      const subjZ = (lastInfo && lastInfo.subjZ) || S.D;
      const ndK = Math.pow(2, -ex.nd);
      const fAt = (Z, p) => Math.pow(GN * Math.sqrt(ex.iso / 100) * Math.sqrt(p) / (ex.N * Z), 2) * ndK;
      const tgt = S.flash === 'fill' ? 0.42 : 1.0;
      const full = fAt(subjZ, 1);
      const p = clamp(tgt / full, 1 / 128, 1);
      const syncCut = !r.phone && ex.t < d.sync * 0.97 ? 0.45 : 1;
      flash = { f: Z => fAt(Z, p) * syncCut, power: p, GN, limited: full < tgt, syncCut: syncCut < 1, subjZ };
    }
    const lensCorr = r.phone ? true : S.lensCorr;
    const stopsDown = 2 * Math.log2(ex.N / r.Nwide);
    const vig = r.vig * clamp(1 - stopsDown / 2.2, 0.08, 1);
    const portrait = r.phone && S.phone.mode === 'portrait' ? { f: Math.max(52, r.feq), N: S.phone.vN } : null;
    return {
      sensorW: sen.w, fOpt: g.fEff, fProj: r.fisheye ? g.fEff : g.fEff, vImg: g.vImg, s: g.s, mag: g.mag, D: S.D, camY: sm.camY, camX: 0,
      N: ex.N, Nview, Nwide: r.Nwide, blades: r.blades, tMotion: ovf ? 0 : ex.tMotion, pan: S.pan && sm.moving, panAcc: S.panAcc,
      shake: ovf ? null : { len: shakeLen, a: 0.7 }, gain, wbA, wbE, wbF, style, hdr, noiseA: A2, noiseB: B2, chroma: r.phone ? 0.15 : 0.35,
      hot: !ovf && ex.t > 2 ? Math.min(30, ex.t * 1.2) : 0, flash, dist: r.dist, fisheye: r.fisheye, ca: r.ca, vig: r.phone ? 0.08 : vig,
      lensCorr, imageCircle: r.imageCircle || 0, gnd: S.filter === 'gnd' ? 3 : 0, tilt: r.tilt ? S.tilt : 0, portrait, ovf, Kc
    };
  }

  /* ---------- vòng dựng ---------- */
  let rendering = false, lastRenderMs = 0, lastPanel = 0;
  function render(opts = {}) {
    if (!cv) return;
    rendering = true;
    const t0 = performance.now();
    const r = rig(); lastRig = r;
    const sc = scene(), e = env();
    if (S.afMode === 'M' || r.mfOnly || r.fixedFocus) autoFocus(r);
    else if (r.phone && S.afArea === 'eye') autoFocus(r);
    else if (S.afMode === 'C') { if (S.afArea === 'point') autoFocus(r); else autoFocus(r, 'track'); }
    const g0 = camFor(r, S.focus);
    let ex = expose(r, lastMeter, g0.mag);
    let cam = buildCam(r, ex, !opts.capture);
    const photo = isPhoto();
    if (photo && !PH.get(photoId())) { showLoading(true); rendering = false; return null; }
    const compose = c => { if (photo) { PH.setCam(c); return PH.render(photoId(), c, e); } return ENG.composite(sc, c, e); };
    let res = compose(cam);
    lastInfo = res;
    const sp = S.metering === 'spot' && S.afArea === 'point' ? S.afPoint : [0.5, 0.5];
    const m = ENG.meter(sp[0], sp[1]);
    const first = !lastMeter; lastMeter = m;
    const ex2 = expose(r, m, g0.mag);
    if (first || opts.capture || Math.abs(Math.log2(ex2.t / ex.t)) > 0.3) { ex = ex2; cam = buildCam(r, ex, !opts.capture); res = compose(cam); lastInfo = res; }
    else ex = ex2;
    lastExp = ex;
    let faceRect = null;
    if (photo) {
      const mm = sceneMeta().meta, fb = mm.subject.face, b = fb || mm.subject.box, ppl = !fb && (mm.kinds || []).some(k => /chan-dung|nguoi/.test(k));
      const a = PH.toFrame(photoId(), [b[0], b[1]]), c = PH.toFrame(photoId(), [b[2], ppl ? b[1] + (b[3] - b[1]) * 0.3 : b[3]]);
      if (a && c) faceRect = [a.x * ENG.W, a.y * ENG.H, c.x * ENG.W, c.y * ENG.H];
    } else {
      const L = sc.layers.find(l => l.id === sc.subject);
      if (L.face) { const p = ENG.project(sc, cam, e, sc.subject, L.face[0], L.face[1]); if (p) { const rr = Math.max(2, L.face[2] * p.sx * 0.6); faceRect = [p.x - rr, p.y - rr, p.x + rr, p.y + rr]; } }
    }
    showLoading(false);
    const wide = $('#lab-wide');
    if (wide) { const tw = photo && res && res.frame && res.frame.tooWide; wide.hidden = !tw; if (tw) wide.textContent = `Ảnh gốc chỉ rộng khoảng ${Math.round(sceneMeta().meta.feq)} mm tương đương – không thể rộng hơn.`; }
    const st = ENG.develop(ctx, cam, { seed: opts.seed, faceRect });
    lastStats = st; lastStats.cam = cam;
    drawOverlay(r, cam, st);
    drawHist(st);
    lastRenderMs = performance.now() - t0;
    if (opts.capture || performance.now() - lastPanel > 160) { updateReadouts(r, ex, cam, st); lastPanel = performance.now(); }
    rendering = false; dirty = false;
    return { r, ex, cam, st, res };
  }
  const needsAnim = () => !isPhoto() && (!S.freeze || S.scene === 'landscape' || (S.scene === 'street' && S.approach && !S.freeze));
  let lastTick = performance.now(), lastFrame = 0, running = true;
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTick) / 1000); lastTick = now;
    if (running && document.visibilityState === 'visible' && SIM.active) {
      const anim = needsAnim();
      if (anim) clock += dt;
      const minGap = Math.max(50, lastRenderMs * 1.4);
      if ((dirty || anim) && now - lastFrame > minGap && !review) { lastFrame = now; render(); }
      if (review && now > review.until) { review = null; dirty = true; $('#lab-review') && $('#lab-review').classList.remove('on'); }
      if (S.disp.clip && lastStats && (review || (!lastStats.cam.ovf && (S.disp.zebra || S.disp.peaking)))) blinkTick(now);
    }
    requestAnimationFrame(loop);
  }
  const touch = () => { dirty = true; };

  /* ---------- lớp phủ kính ngắm ---------- */
  let maskImg = null, maskShown = false;
  function drawOverlay(r, cam, st) {
    const W = ENG.W, Hh = ENG.H;
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, Hh);
    const wantMask = !cam.ovf && (S.disp.zebra && r.dev.kind !== 'dslr' || S.disp.peaking && (r.dev.kind !== 'dslr' || S.vf === 'lv'));
    maskImg = wantMask ? ENG.overlayMasks(st.luma, octx, { zebra: S.disp.zebra, peaking: S.disp.peaking }) : null;
    if (maskImg) octx.putImageData(maskImg, 0, 0);
    octx.lineWidth = 1.5;
    if (S.disp.grid) { octx.strokeStyle = 'rgba(255,255,255,.45)'; octx.beginPath(); for (const f of [1 / 3, 2 / 3]) { octx.moveTo(W * f, 0); octx.lineTo(W * f, Hh); octx.moveTo(0, Hh * f); octx.lineTo(W, Hh * f); } octx.stroke(); }
    if (S.disp.af && !r.fixedFocus && S.afMode !== 'M') {
      if (S.afArea === 'point') { const x = S.afPoint[0] * W, y = S.afPoint[1] * Hh; octx.strokeStyle = '#f2b544'; octx.lineWidth = 2.5; octx.strokeRect(x - 16, y - 12, 32, 24); }
      else if (S.afArea === 'auto' && r.dev.kind === 'dslr') {
        octx.strokeStyle = 'rgba(255,255,255,.55)'; for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 5; ix++) { if ((ix === 0 || ix === 4) && iy !== 1) continue; octx.strokeRect(W * (0.3 + ix * 0.1) - 7, Hh * (0.35 + iy * 0.15) - 6, 14, 12); }
      } else if ((S.afArea === 'eye' || r.phone) && isPhoto()) {
        const mm = sceneMeta().meta;
        if (mm) { const p = PH.toFrame(photoId(), mm.subject.eye), b0 = PH.toFrame(photoId(), [mm.subject.box[0], mm.subject.box[1]]), b1 = PH.toFrame(photoId(), [mm.subject.box[2], mm.subject.box[3]]);
          if (p && b0 && b1) { const fw = mm.subject.face ? (mm.subject.face[2] - mm.subject.face[0]) / (mm.subject.box[2] - mm.subject.box[0]) * 0.6 : 0.18; const s = clamp((b1.x - b0.x) * W * fw, 12, 110); const x = p.x * W, y = p.y * Hh; if (x > 0 && x < W && y > 0 && y < Hh) { octx.strokeStyle = '#8fe3a6'; octx.lineWidth = 2; octx.strokeRect(x - s, y - s * 0.8, s * 2, s * 1.6); } } }
      } else if (S.afArea === 'eye' || r.phone) {
        const sc = scene(), L = sc.layers.find(l => l.id === sc.subject);
        if (L.eye) { const p = ENG.project(sc, { sensorW: cam.sensorW, vImg: cam.vImg, D: S.D, camY: cam.camY, camX: 0 }, env(), sc.subject, L.eye[0], L.eye[1]); if (p && p.x > 0 && p.x < W && p.y > 0 && p.y < Hh) { const s = clamp(p.sx * (S.scene === 'macro' ? 0.006 : S.scene === 'portrait' ? 0.05 : 0.5), 10, 120); octx.strokeStyle = '#8fe3a6'; octx.lineWidth = 2; octx.strokeRect(p.x - s, p.y - s * 0.8, s * 2, s * 1.6); } }
      }
    }
    if (S.metering === 'spot') { octx.strokeStyle = 'rgba(255,255,255,.5)'; octx.beginPath(); const sp = S.afArea === 'point' ? S.afPoint : [0.5, 0.5]; octx.arc(sp[0] * W, sp[1] * Hh, 0.035 * Math.hypot(W, Hh), 0, 6.283); octx.stroke(); }
    if (r.dev.kind === 'dslr' && S.vf === 'ovf') { octx.strokeStyle = 'rgba(0,0,0,.35)'; octx.lineWidth = 2; octx.strokeRect(W * 0.02, Hh * 0.02, W * 0.96, Hh * 0.96); }
  }
  function blinkTick(now) {
    const on = Math.floor(now / 380) % 2 === 0;
    if (on === maskShown) return; maskShown = on;
    if (review && review.mask) { review.octx.clearRect(0, 0, ENG.W, ENG.H); if (on) review.octx.putImageData(review.mask, 0, 0); }
  }
  function drawHist(st) {
    if (!hctx) return;
    const w = hcv.width, hh = hcv.height; hctx.clearRect(0, 0, w, hh);
    let mx = 1; for (let i = 1; i < 63; i++) mx = Math.max(mx, st.hist[i]);
    const ch = [[st.hr, 'rgba(255,80,80,.55)'], [st.hg, 'rgba(80,220,110,.5)'], [st.hb, 'rgba(90,140,255,.55)'], [st.hist, 'rgba(235,235,235,.75)']];
    hctx.globalCompositeOperation = 'lighter';
    for (const [arr, col] of ch) { hctx.fillStyle = col; hctx.beginPath(); hctx.moveTo(0, hh); for (let i = 0; i < 64; i++) hctx.lineTo(i / 63 * w, hh - Math.min(1, arr[i] / mx) * (hh - 2)); hctx.lineTo(w, hh); hctx.fill(); }
    hctx.globalCompositeOperation = 'source-over';
    if (st.clipHi > 0.003) { hctx.fillStyle = '#ff3d8b'; hctx.fillRect(w - 4, 0, 4, hh); }
    if (st.clipLo > 0.01) { hctx.fillStyle = '#4da3ff'; hctx.fillRect(0, 0, 4, hh); }
  }

  /* ---------- phân tích "vì sao ảnh trông thế này" ---------- */
  function analyze(r, ex, cam, st) {
    const out = [];
    const info = lastInfo.info, subj = info.find(i => i.subject);
    const bgs = info.filter(i => i.bg); const bgBlur = bgs.length ? bgs.reduce((a, b) => a + b.coc, 0) / bgs.length : 0;
    const fgs = info.filter(i => i.fg);
    const c = r.sensor.diag / 1500;
    const dl = U.dofLimits(cam.fOpt, ex.N, cam.s * 1000, c);
    const Hf = dl.H / 1000;
    const subjBlur = subj ? Math.hypot(subj.coc, subj.motion, cam.shake ? cam.shake.len : 0) : 0;
    const aov = 2 * Math.atan(r.sensor.w / (2 * cam.fOpt)) * 180 / Math.PI;
    // phơi sáng
    let expTxt = Math.abs(ex.delta) < 0.35 ? 'Phơi sáng chuẩn cho chủ thể.' : ex.delta > 0 ? `Dư sáng ${fmtEV(ex.delta)} stop so với mức chuẩn của chủ thể.` : `Thiếu sáng ${fmtEV(ex.delta)} stop so với mức chuẩn của chủ thể.`;
    const meterErr = ex.EVtrue - ex.EVmeter;
    if (Math.abs(meterErr) > 0.6 && (ex.mode !== 'M' && ex.mode !== 'third')) expTxt += ` Đồng hồ đo sáng (${({ evaluative: 'đánh giá', center: 'ưu tiên trung tâm', spot: 'điểm' })[S.metering]}) đang ${meterErr > 0 ? 'bị cảnh tối đánh lừa nên cho phơi sáng quá nhiều' : 'bị vùng sáng đánh lừa nên cho phơi sáng quá ít'} khoảng ${Math.abs(meterErr).toFixed(1)} stop – hãy bù sáng ${meterErr > 0 ? 'âm' : 'dương'} hoặc đổi chế độ đo sáng.`;
    if (st.clipHi > 0.01) expTxt += ` ${(st.clipHi * 100).toFixed(1)}% điểm ảnh bị cháy trắng.`;
    if (st.clipLo > 0.04) expTxt += ` ${(st.clipLo * 100).toFixed(0)}% điểm ảnh tối đen mất chi tiết.`;
    if (ex.bell > 0.3) expTxt += ` Ở độ phóng đại ${cam.mag.toFixed(2)}×, ánh sáng tới cảm biến giảm ${ex.bell.toFixed(1)} stop (khẩu hiệu dụng ≈ ${fmtN(ex.N * (1 + cam.mag))}).`;
    if (ex.night) expTxt += ' Điện thoại tự bật chế độ ban đêm: ghép nhiều khung hình để giảm nhiễu, chống rung bằng phần mềm.';
    if (ex.hdr && !ex.night) expTxt += ' HDR ghép nhiều khung đang nén vùng sáng và nâng vùng tối – thứ máy ảnh phải làm bằng kính GND hoặc chụp bù trừ.';
    out.push(['Phơi sáng', expTxt, 4]);
    // độ sâu trường ảnh
    let dof = `Lấy nét ở ${fmtDist(cam.s)}${S.focusName && S.afMode !== 'M' ? ' (' + S.focusName + ')' : ''}. Vùng nét chấp nhận được: ${fmtDist(dl.near / 1000)} → ${fmtDist(dl.far / 1000)}`;
    dof += isFinite(dl.far) ? ` (sâu ${fmtDist((dl.far - dl.near) / 1000)}).` : '.';
    dof += ` Khoảng siêu tiêu ở ${fmtN(ex.N)}: ${fmtDist(Hf)}.`;
    if (subj && subj.coc > 2.5) dof += ` Chủ thể đang mờ nét (vòng mờ ${subj.coc.toFixed(1)} px).`;
    if (bgBlur > 18) dof += ' Hậu cảnh tan thành mảng màu – chủ thể tách nền rất mạnh.'; else if (bgBlur > 6) dof += ' Hậu cảnh mờ nhưng vẫn nhận ra – còn kể được bối cảnh.'; else dof += ' Hậu cảnh gần như nét.';
    if (r.phone && !cam.portrait) dof += ` Khẩu ${fmtN(ex.N)} trên cảm biến ${r.sensor.name} cho độ xóa phông tương đương khoảng ${fmtN(ex.N * r.crop)} trên full-frame.`;
    if (cam.portrait) dof += ' Xóa phông này do phần mềm tạo ra – để ý quầng viền quanh tóc và vai.';
    if (!r.phone && r.dev.kind === 'dslr' && S.vf === 'ovf' && ex.N > r.Nwide * 1.2) dof += ' Lưu ý: kính ngắm quang học luôn hiển thị ở khẩu mở lớn nhất – bấm “Xem trước DoF” để thấy vùng nét thật.';
    out.push(['Độ sâu trường ảnh', dof, 6]);
    // ống kính
    let ln = `Tiêu cự ${r.fOpt.toFixed(r.fOpt < 10 ? 1 : 0)} mm${r.crop > 1.05 ? ` × hệ số ${r.crop.toFixed(r.crop > 3 ? 1 : 2)} = tương đương ${Math.round(r.feq)} mm full-frame` : ''}; góc nhìn ngang ${aov.toFixed(0)}°.`;
    if (r.fisheye) ln += ' Ống mắt cá: méo hình cầu là đặc tính, không phải lỗi.';
    else if (!cam.lensCorr && Math.abs(r.dist) > 0.02) ln += r.dist > 0 ? ' Méo thùng (barrel) đang làm các đường thẳng cong phình ra ở rìa.' : ' Méo gối (pincushion) làm đường thẳng cong vào trong.';
    if (!cam.lensCorr && r.ca > 0.4) ln += ' Viền màu (quang sai màu ngang) xuất hiện ở các góc ảnh.';
    if (cam.vig > 0.3 && !cam.lensCorr) ln += ' Góc ảnh tối do mở khẩu lớn nhất – khép 1–2 stop sẽ đỡ.';
    if (cam.imageCircle) ln += ' Ống kính APS-C trên thân full-frame: vòng tròn ảnh không phủ hết cảm biến.';
    if (r.lens && r.lens.format === 'APSC' && r.dev.sensor === 'FF' && S.cropAuto) ln += ' Máy tự cắt về APS-C vì ống kính dành cho cảm biến nhỏ.';
    if (lastInfo && lastInfo.frame && lastInfo.frame.tooWide) ln += ` Ảnh gốc chỉ rộng khoảng ${Math.round(sceneMeta().meta.feq)} mm tương đương nên khung hình dừng ở đó.`;
    if (isPhoto()) ln += ' Với ảnh thật, đổi tiêu cự chỉ cắt khung – phối cảnh giữ nguyên vì vị trí chụp không đổi.';
    if (r.feq <= 24) ln += ' Góc rộng: tiền cảnh trông to, hậu cảnh lùi xa.';
    if (r.feq >= 135) ln += ' Tele: hậu cảnh bị “kéo” sát lại phía chủ thể.';
    if (!isPhoto()) ln += ` Bạn đứng cách chủ thể ${fmtDist(S.D)} – chính vị trí đứng (không phải tiêu cự) quyết định phối cảnh.`;
    out.push(['Ống kính & phối cảnh', ln, 7]);
    // chuyển động
    const safe = 1 / Math.max(1, r.feq) * Math.pow(2, r.isStops);
    let mv = `Tốc độ ${U.fmtT_s(ex.t)}.`;
    if (subj && subj.motion > 0.8) mv += ` Chủ thể dịch chuyển ${subj.motion.toFixed(0)} px trong lúc màn trập mở → ${subj.motion > 12 ? 'nhòe rõ' : 'hơi nhòe'}.`;
    else if (sceneMeta().moving) mv += ' Chủ thể được “đóng băng”.';
    if (cam.pan) { const bgm = bgs.length ? Math.max(...bgs.map(b => b.motion)) : 0; mv += ` Đang lia máy theo chủ thể: hậu cảnh nhòe vệt ${bgm.toFixed(0)} px.`; }
    if (cam.shake && cam.shake.len > 1.2) mv += ` Rung tay làm nhòe ${cam.shake.len.toFixed(1)} px – cầm tay an toàn khoảng ${fmtT(Math.min(1, safe))} (quy tắc 1/tiêu cự tương đương${r.isStops ? `, đã tính ${r.isStops} stop chống rung` : ''}). Dùng tripod hoặc tăng tốc độ.`;
    else if (S.support === 'hand') mv += ` Cầm tay ổn ở tốc độ này (ngưỡng an toàn ≈ ${fmtT(Math.min(1, safe))}).`;
    if (cam.shake && S.support === 'tripod' && cam.shake.len > 0.5) mv += ' Chống rung ống kính vẫn bật khi dùng tripod – nên tắt.';
    if (S.scene === 'landscape') mv += ex.t >= 1 / 8 ? ' Nước thác chảy thành dải mượt.' : ex.t <= 1 / 500 ? ' Từng giọt nước bị đóng băng.' : '';
    if (S.scene === 'night' && ex.t >= 1) mv += ' Đèn xe kéo thành vệt sáng; ô tô gần như biến mất vì chỉ đi qua mỗi điểm trong khoảnh khắc ngắn.';
    if (st && cam.hot) mv += ' Phơi sáng dài sinh vài điểm ảnh nóng (hot pixel).';
    out.push(['Chuyển động & rung máy', mv, 11]);
    // nhiễu & màu
    const nlev = Math.sqrt(cam.noiseA * 0.18 + cam.noiseB) * 255;
    let nc = `ISO ${ex.iso}${ex.isoAuto ? ' (tự động)' : ''} trên cảm biến ${r.sensor.name} (${r.sensor.w}×${r.sensor.h} mm): nhiễu ${nlev < 2 ? 'gần như không thấy' : nlev < 5 ? 'nhẹ' : nlev < 10 ? 'thấy rõ ở vùng tối' : 'nặng, chi tiết bị hạt che lấp'}.`;
    const Ks = sceneMeta().K, Kc = cam.Kc;
    nc += ` Ánh sáng cảnh ≈ ${Ks} K, máy đặt ${Math.round(Kc / 50) * 50} K → ${Math.abs(Kc - Ks) < 350 ? 'màu trung tính' : Kc > Ks ? 'ảnh ám vàng cam (máy tưởng ánh sáng xanh hơn thực tế)' : 'ảnh ám xanh lạnh'}.`;
    if (cam.flash) nc += ` Flash GN ${cam.flash.GN} ở mức ${cam.flash.power >= 0.99 ? 'tối đa' : '1/' + Math.round(1 / cam.flash.power)}${cam.flash.limited ? ' – không đủ mạnh cho khoảng cách này' : ''}${cam.flash.syncCut ? '; tốc độ vượt tốc độ đồng bộ nên flash chỉ phủ một phần' : ''}.`;
    out.push(['Nhiễu & màu sắc', nc, 15]);
    return { out, bgBlur, subjBlur, dl, aov, fgs, subj };
  }

  /* ---------- giao diện ---------- */
  const R = {};
  function dial(key, label, opts) {
    const wrap = h('div', { class: 'dial', 'data-key': key });
    const val = h('output', { class: 'dial-val' });
    const range = h('input', { type: 'range', min: 0, max: 1, step: 1, 'aria-label': label });
    const minus = h('button', { class: 'dial-btn', type: 'button', 'aria-label': 'Giảm ' + label }, '−');
    const plus = h('button', { class: 'dial-btn', type: 'button', 'aria-label': 'Tăng ' + label }, '+');
    const auto = opts.auto ? h('button', { class: 'chip sm', type: 'button', 'aria-pressed': 'false' }, 'Tự động') : null;
    wrap.append(h('div', { class: 'dial-top' }, h('span', { class: 'dial-label' }, label), auto, val), h('div', { class: 'dial-row' }, minus, range, plus));
    const step = d => { const l = opts.list(); const i = clamp(opts.idx(l) + d, 0, l.length - 1); opts.set(l[i]); touch(); };
    minus.onclick = () => step(-1); plus.onclick = () => step(1);
    range.oninput = () => { const l = opts.list(); opts.set(l[+range.value]); touch(); };
    val.addEventListener('wheel', ev => { ev.preventDefault(); step(ev.deltaY > 0 ? -1 : 1); }, { passive: false });
    if (auto) auto.onclick = () => { opts.toggleAuto(); touch(); rebuildPanel(); };
    R[key] = { wrap, val, range, minus, plus, auto, opts };
    return wrap;
  }
  function syncDial(key, display, isAuto, disabled) {
    const d = R[key]; if (!d) return;
    const l = d.opts.list(); d.range.max = l.length - 1; d.range.value = d.opts.idx(l);
    d.val.textContent = display;
    d.wrap.classList.toggle('is-auto', !!isAuto); d.wrap.classList.toggle('is-off', !!disabled);
    d.range.disabled = d.minus.disabled = d.plus.disabled = !!disabled;
    if (d.auto) d.auto.setAttribute('aria-pressed', isAuto ? 'true' : 'false');
  }
  function seg(key, label, items, get, set, opts = {}) {
    const g = h('div', { class: 'seg' + (opts.wrap ? ' wrap' : ''), role: 'radiogroup', 'aria-label': label });
    for (const [v, txt, title] of items) {
      const b = h('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': get() === v ? 'true' : 'false', title: title || null }, txt);
      b.onclick = () => { set(v); $$('.seg-b', g).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); touch(); if (opts.rebuild) rebuildPanel(); };
      g.append(b);
    }
    return h('div', { class: 'field' }, label ? h('div', { class: 'field-label' }, label) : null, g);
  }
  function toggle(label, get, set, opts = {}) {
    const b = h('button', { type: 'button', class: 'tog', 'aria-pressed': get() ? 'true' : 'false', title: opts.title || null }, h('span', { class: 'tog-dot' }), label);
    b.onclick = () => { set(!get()); b.setAttribute('aria-pressed', get() ? 'true' : 'false'); touch(); if (opts.rebuild) rebuildPanel(); };
    return b;
  }
  function slider(key, label, min, max, step, get, set, fmt, opts = {}) {
    const out = h('output', { class: 'sl-val' });
    const inp = h('input', { type: 'range', min, max, step, value: get(), 'aria-label': label });
    inp.oninput = () => { set(+inp.value); out.textContent = fmt(get()); touch(); if (opts.after) opts.after(); };
    out.textContent = fmt(get());
    R[key] = { inp, out, get, fmt };
    return h('div', { class: 'field' }, h('div', { class: 'field-label' }, label, out), inp, opts.hint ? h('div', { class: 'hint' }, opts.hint) : null);
  }
  const group = (title, ...kids) => h('section', { class: 'grp' }, h('h3', { class: 'grp-t' }, title), ...kids);

  function rebuildPanel() {
    const host = $('#lab-controls'); if (!host) return;
    for (const k in R) delete R[k];
    host.innerHTML = ''; lastPanel = 0;
    const r = rig(), d = r.dev;
    if (!r.phone) {
      host.append(group('Chế độ chụp',
        seg('mode', null, [['auto', 'Auto', 'Máy tự quyết mọi thứ'], ['P', 'P', 'Chương trình: máy chọn khẩu và tốc độ, bạn chọn ISO'], ['A', d.id.startsWith('dslr') ? 'Av' : 'A', 'Ưu tiên khẩu độ'], ['S', d.id.startsWith('dslr') ? 'Tv' : 'S', 'Ưu tiên tốc độ'], ['M', 'M', 'Chỉnh tay hoàn toàn']], () => S.mode, v => { S.mode = v; }, { rebuild: true }),
        h('p', { class: 'hint' }, ({ auto: 'Máy tự chọn khẩu, tốc độ và ISO.', P: 'Máy chọn cặp khẩu–tốc độ; xoay để dịch chương trình (Program shift) mà phơi sáng không đổi.', A: 'Bạn chọn khẩu (độ sâu trường ảnh), máy chọn tốc độ.', S: 'Bạn chọn tốc độ (chuyển động), máy chọn khẩu.', M: 'Bạn chọn cả khẩu và tốc độ; máy chỉ báo kim đo sáng.' })[S.mode])
      ));
      const exg = group('Phơi sáng');
      exg.append(dial('N', 'Khẩu độ', { list: () => U.APERTURE_STEPS.filter(x => x >= r.Nwide - 0.01 && x <= r.Nmin + 0.01), idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.N : S.N)), set: v => { S.N = v; } }));
      exg.append(dial('t', 'Tốc độ màn trập', { list: () => U.SHUTTERS.filter(x => x >= d.shutter[0] * 0.99 && x <= d.shutter[1]), idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.t : S.t)), set: v => { S.t = v; } }));
      exg.append(dial('iso', 'ISO', { auto: true, list: () => U.ISOS.filter(x => x >= d.iso[0] && x <= d.iso[1]), idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.iso : S.iso)), set: v => { S.iso = v; S.isoAuto = false; }, toggleAuto: () => { S.isoAuto = !S.isoAuto; } }));
      exg.append(dial('ec', 'Bù sáng', { list: () => Array.from({ length: 19 }, (_, i) => (i - 9) / 3), idx: l => l.findIndex(x => Math.abs(x - S.ec) < 0.01), set: v => { S.ec = v; } }));
      if (S.mode === 'P') exg.append(dial('ps', 'Dịch chương trình', { list: () => [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], idx: l => l.indexOf(S.pshift), set: v => { S.pshift = v; } }));
      exg.append(seg('met', 'Đo sáng', [['evaluative', 'Đánh giá'], ['center', 'Trung tâm'], ['spot', 'Điểm']], () => S.metering, v => { S.metering = v; }));
      host.append(exg);
      // ống kính
      const lg = group('Ống kính');
      const sel = h('select', { class: 'sel', 'aria-label': 'Chọn ống kính' }, ...D.LENSES.map(L => h('option', { value: L.id, selected: L.id === S.lens ? true : null }, L.name + (L.format === 'APSC' ? ' · APS-C' : ''))));
      sel.onchange = () => setLens(sel.value);
      lg.append(h('div', { class: 'field' }, sel, h('div', { class: 'hint' }, r.lens.about)));
      if (r.lens.fr[0] !== r.lens.fr[1]) lg.append(slider('focal', 'Vòng zoom', r.lens.fr[0], r.lens.fr[1], 1, () => S.focal, v => setFocal(v, true), v => `${v} mm`, { after: () => { } }));
      if (r.tilt) lg.append(slider('tilt', 'Độ nghiêng (tilt)', -8, 8, 0.5, () => S.tilt, v => { S.tilt = v; }, v => `${v}°`, { hint: 'Nghiêng thân ống kính làm mặt phẳng nét bị nghiêng: cảnh trông như mô hình thu nhỏ.' }));
      lg.append(h('div', { class: 'togs' },
        r.lens.is || d.ibis ? toggle('Chống rung', () => S.is, v => { S.is = v; }) : null,
        toggle('Hiệu chỉnh ống kính', () => S.lensCorr, v => { S.lensCorr = v; }, { title: 'Máy tự sửa méo, tối góc và viền màu' }),
        r.lens.format === 'APSC' && d.sensor === 'FF' ? toggle('Tự cắt APS-C', () => S.cropAuto, v => { S.cropAuto = v; }) : null));
      host.append(lg);
      // lấy nét
      const fg = group('Lấy nét');
      if (!r.mfOnly) {
        fg.append(seg('af', 'Chế độ AF', [['S', 'AF-S'], ['C', 'AF-C'], ['M', 'MF']], () => S.afMode, v => { S.afMode = v; if (v !== 'M') autoFocus(rig()); }, { rebuild: true }));
        if (S.afMode !== 'M') fg.append(seg('afa', 'Vùng AF', [['auto', 'Máy tự chọn'], ['point', 'Một điểm'], ...(d.kind === 'ml' || S.vf === 'lv' ? [['eye', 'Nhận diện mắt']] : [])], () => S.afArea, v => { S.afArea = v; autoFocus(rig()); }, { rebuild: true }));
        if (S.afArea === 'point' && S.afMode !== 'M') fg.append(h('p', { class: 'hint' }, 'Bấm vào khung hình để đặt điểm lấy nét.'));
      }
      if (S.afMode === 'M' || r.mfOnly) fg.append(slider('mf', 'Vòng lấy nét', 0, 1000, 1, () => mfToSlider(S.mf, r), v => { S.mf = sliderToMf(v, r); }, v => fmtDist(sliderToMf(v, r)), { hint: d.kind === 'ml' || S.vf === 'lv' ? 'Bật Focus peaking để thấy viền đỏ ở vùng nét.' : 'Nhìn qua kính ngắm và vặn tới khi chủ thể nét.' }));
      else fg.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => { autoFocus(rig()); touch(); } }, 'Lấy nét lại (nhấn nửa nút chụp)'));
      host.append(fg);
      host.append(colorGroup(r));
      host.append(accessoryGroup(r));
    } else {
      const p = d;
      host.append(group('Chế độ', seg('pm', null, [['photo', 'Ảnh'], ['portrait', 'Chân dung'], ...(p.pro ? [['pro', p.pro.label]] : []), ...(p.third ? [['third', p.third.label]] : [])], () => S.phone.mode, v => { S.phone.mode = v; const ps = proSpec(); if (ps && !ps.proCams.includes(S.phone.cam)) S.phone.cam = 'w'; }, { rebuild: true, wrap: true }),
        h('p', { class: 'hint' }, ({ photo: 'Máy tự xử lý: đo sáng thông minh, HDR ghép nhiều khung, giảm nhiễu mạnh.', portrait: 'Xóa phông bằng phần mềm dựa trên bản đồ độ sâu. Kéo “Khẩu độ ảo” để đổi độ mờ.', pro: 'Chỉnh tay như máy ảnh. Khẩu độ ' + (r.Ns ? 'có 4 nấc cố định.' : 'cố định trên điện thoại này.'), third: 'App bên thứ ba truy cập trực tiếp cảm biến: ISO, tốc độ, cân bằng trắng, lấy nét tay.' })[S.phone.mode])));
      const ps = proSpec();
      const camsAvail = p.cams.filter(c => !ps || ps.proCams.includes(c.id));
      host.append(group('Camera', seg('pc', null, camsAvail.map(c => [c.id, c.label === 'Macro' ? 'Macro' : c.label + '×', `${c.feq} mm tương đương · ${fmtN(c.N)} · ${c.mp} MP · ${D.SENSORS[c.sensor].name}`]), () => S.phone.cam, v => setPhoneCam(v), { rebuild: true }),
        h('p', { class: 'hint' }, `${r.cam.mp} MP · cảm biến ${D.SENSORS[r.cam.sensor].name}${r.cam.crop ? ' (cắt giữa cảm biến)' : ''} · tiêu cự thật ${r.fOpt.toFixed(1)} mm (≈ ${r.feq} mm FF) · ${r.Ns ? r.Ns.map(fmtN).join(' / ') : fmtN(r.Nwide)}${r.fixedFocus ? ' · lấy nét cố định' : ''}`)));
      if (S.phone.mode === 'portrait') host.append(group('Xóa phông ảo', dial('vN', 'Khẩu độ ảo', { list: () => [1.4, 2, 2.8, 4, 5.6, 8, 11, 16], idx: l => l.indexOf(U.nearest(l, S.phone.vN)), set: v => { S.phone.vN = v; } })));
      if (ps) {
        const exg = group('Thông số chụp');
        if (r.Ns && ps.apMode === 'list') exg.append(dial('N', 'Khẩu độ', { list: () => r.Ns, idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.N : S.N)), set: v => { S.N = v; } }));
        const tAutoAllowed = S.phone.mode !== 'third';
        exg.append(dial('t', 'Tốc độ (S)', { auto: tAutoAllowed, list: () => U.SHUTTERS.filter(x => x >= ps.shutter[0] * 0.99 && x <= ps.shutter[1] * 1.01), idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.t : S.t)), set: v => { S.t = v; S.phone.tAuto = false; if (ps.samsungRule) { S.phone.isoAuto = false; S.iso = lastExp ? lastExp.iso : S.iso; } }, toggleAuto: () => { S.phone.tAuto = !S.phone.tAuto; } }));
        if (ps.isoManual) exg.append(dial('iso', 'ISO', { auto: S.phone.mode !== 'third', list: () => U.ISOS.filter(x => x >= ps.iso[0] && x <= ps.iso[1]), idx: l => l.indexOf(U.nearest(l, lastExp ? lastExp.iso : S.iso)), set: v => { S.iso = v; S.phone.isoAuto = false; }, toggleAuto: () => { S.phone.isoAuto = !S.phone.isoAuto; if (ps.samsungRule && S.phone.isoAuto) S.phone.tAuto = true; } }));
        else exg.append(h('p', { class: 'hint' }, 'ISO do máy tự chọn theo khẩu và tốc độ bạn đặt.'));
        if (ps.ev) exg.append(dial('ec', 'Bù sáng (EV)', { list: () => Array.from({ length: 13 }, (_, i) => (i - 6) / 3), idx: l => l.findIndex(x => Math.abs(x - S.ec) < 0.01), set: v => { S.ec = v; } }));
        if (ps.samsungRule) exg.append(h('p', { class: 'hint' }, 'Trên Samsung: khi chỉnh tốc độ bằng tay, ISO cũng chuyển sang chỉnh tay và EV bị khóa.'));
        exg.append(seg('met', 'Đo sáng', [['evaluative', 'Ma trận'], ['center', 'Trung tâm'], ['spot', 'Điểm']], () => S.metering, v => { S.metering = v; }));
        host.append(exg);
        const fg = group('Lấy nét');
        if (!r.fixedFocus) {
          fg.append(seg('af', null, [['S', 'Tự động'], ['M', 'Lấy nét tay (MF)']], () => S.afMode === 'M' ? 'M' : 'S', v => { S.afMode = v; if (v === 'S') S.afArea = 'eye'; }, { rebuild: true }));
          if (S.afMode === 'M') fg.append(slider('mf', 'Khoảng lấy nét', 0, 1000, 1, () => mfToSlider(S.mf, r), v => { S.mf = sliderToMf(v, r); }, v => fmtDist(sliderToMf(v, r)), { hint: 'Bật Focus peaking để thấy vùng nét.' }));
          else fg.append(h('p', { class: 'hint' }, 'Chạm vào màn hình để chọn điểm lấy nét.'));
        } else fg.append(h('p', { class: 'hint' }, 'Camera này lấy nét cố định.'));
        host.append(fg);
      } else {
        const exg = group('Điều chỉnh', dial('ec', 'Bù sáng', { list: () => Array.from({ length: 13 }, (_, i) => (i - 6) / 3), idx: l => l.findIndex(x => Math.abs(x - S.ec) < 0.01), set: v => { S.ec = v; } }), h('p', { class: 'hint' }, 'Chạm vào màn hình để chọn điểm lấy nét.'));
        host.append(exg);
      }
      host.append(colorGroup(r));
      host.append(accessoryGroup(r));
    }
    if (isPhoto()) {
      const mm = sceneMeta();
      host.append(group('Vị trí chụp',
        h('p', { class: 'hint' }, `Ảnh thật nên vị trí đứng cố định: chủ thể cách máy khoảng ${fmtDist(mm.D)}. Đổi tiêu cự chỉ là cắt khung (zoom), phối cảnh không đổi – muốn học phối cảnh, dùng nhóm cảnh dựng 2.5D.`),
        h('div', { class: 'togs' }, toggle('Cầm máy dọc', () => !!S.vertical, v => { S.vertical = v; resizeViewer(); }, { title: 'Xoay máy 90° để chụp khung dọc' }), mm.moving ? toggle('Lia máy theo chủ thể', () => S.pan, v => { S.pan = v; }) : null)));
    } else host.append(group('Vị trí chụp',
      slider('D', 'Khoảng cách tới chủ thể', 0, 1000, 1, () => dToSlider(S.D), v => { S.D = sliderToD(v); if (S.afMode !== 'M') autoFocus(rig()); }, v => fmtDist(sliderToD(v)), { hint: 'Đổi vị trí đứng làm thay đổi phối cảnh.' }),
      h('div', { class: 'togs' },
        toggle('Giữ cỡ chủ thể khi zoom', () => S.keepSize, v => { S.keepSize = v; }, { title: 'Tự lùi/tiến khi đổi tiêu cự – bài tập Tuần 7' }),
        sceneMeta().moving ? toggle('Lia máy theo chủ thể', () => S.pan, v => { S.pan = v; }) : null,
        S.scene === 'street' ? toggle('Xe chạy về phía máy', () => S.approach, v => { S.approach = v; if (v) S.freeze = false; }, { rebuild: true }) : null,
        sceneMeta().moving ? toggle('Chủ thể đứng giữa khung', () => S.freeze, v => { S.freeze = v; }, { title: 'Tắt để chủ thể chạy qua khung hình – bạn phải canh khoảnh khắc' }) : null)));
    const dg = group('Hiển thị');
    if (!r.phone && d.kind === 'dslr') dg.append(seg('vf', 'Ngắm qua', [['ovf', 'Kính ngắm quang'], ['lv', 'Live View']], () => S.vf, v => { S.vf = v; }, { rebuild: true }));
    dg.append(h('div', { class: 'togs' },
      toggle('Histogram', () => S.disp.hist, v => { S.disp.hist = v; $('#lab-hist').hidden = !v; }),
      toggle('Lưới 1/3', () => S.disp.grid, v => { S.disp.grid = v; }),
      r.phone || d.kind === 'ml' ? toggle('Zebra', () => S.disp.zebra, v => { S.disp.zebra = v; }, { title: 'Sọc chéo ở vùng sắp cháy sáng' }) : null,
      r.phone || d.kind === 'ml' || S.vf === 'lv' ? toggle('Focus peaking', () => S.disp.peaking, v => { S.disp.peaking = v; }) : null,
      toggle('Nháy vùng cháy khi xem lại', () => S.disp.clip, v => { S.disp.clip = v; })));
    if (!r.phone && d.kind === 'dslr' && S.vf === 'ovf') {
      const b = h('button', { class: 'btn ghost', type: 'button' }, 'Giữ để xem trước độ sâu trường ảnh');
      const on = () => { S.dofPreview = true; touch(); }, off = () => { S.dofPreview = false; touch(); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
      b.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } });
      b.addEventListener('keyup', off);
      dg.append(b);
    }
    host.append(dg);
    updateDevChrome();
  }
  function colorGroup(r) {
    const auto = r.phone && (S.phone.mode === 'photo' || S.phone.mode === 'portrait');
    const g = group('Màu sắc');
    if (auto) { g.append(h('p', { class: 'hint' }, 'Chế độ tự động: cân bằng trắng do máy chọn.')); return g; }
    const presets = r.phone ? D.WB_PRESETS.filter(w => ['auto', 'k'].includes(w.id)) : D.WB_PRESETS;
    g.append(seg('wb', 'Cân bằng trắng', presets.map(w => [w.id, w.name]), () => S.wb, v => { S.wb = v; if (v !== 'k' && v !== 'auto') S.wbK = D.WB_PRESETS.find(w => w.id === v).K; }, { rebuild: true, wrap: true }));
    if (S.wb === 'k') g.append(slider('wbK', 'Nhiệt độ màu', 2300, 10000, 100, () => S.wbK, v => { S.wbK = v; }, v => `${v} K`, { hint: 'Đặt số K bằng nhiệt độ màu của nguồn sáng để màu trắng trung tính.' }));
    if (!r.phone) { const s = h('select', { class: 'sel', 'aria-label': 'Picture Style' }, ...D.STYLES.map(st => h('option', { value: st.id, selected: st.id === S.style ? true : null }, st.name))); s.onchange = () => { S.style = s.value; touch(); }; g.append(h('div', { class: 'field' }, h('div', { class: 'field-label' }, 'Chế độ ảnh (Picture Style)'), s)); }
    return g;
  }
  function accessoryGroup(r) {
    const g = group('Phụ kiện & ánh sáng');
    g.append(seg('sup', 'Giữ máy', [['hand', 'Cầm tay'], ['tripod', 'Tripod']], () => S.support, v => { S.support = v; }));
    if (!r.phone) {
      const fs = h('select', { class: 'sel', 'aria-label': 'Kính lọc' }, ...D.FILTERS.map(f => h('option', { value: f.id, selected: f.id === S.filter ? true : null }, f.name)));
      fs.onchange = () => { S.filter = fs.value; touch(); };
      g.append(h('div', { class: 'field' }, h('div', { class: 'field-label' }, 'Kính lọc'), fs));
    }
    const fl = [['off', 'Tắt'], ['fill', 'Bù sáng (fill)'], ['on', 'Chính']];
    g.append(seg('fl', r.phone ? 'Đèn LED' : (r.dev.popup ? 'Flash' : 'Flash rời GN 40'), fl, () => S.flash, v => { S.flash = v; }));
    if (!r.phone && r.dev.popup) g.append(h('div', { class: 'togs' }, toggle('Dùng flash rời GN 40', () => S.speedlite, v => { S.speedlite = v; })));
    return g;
  }
  // thang trượt log cho khoảng cách
  function mfToSlider(m, r) { const a = Math.log(r.mfd), b = Math.log(200); if (m >= 199) return 1000; return clamp((Math.log(m) - a) / (b - a) * 1000, 0, 1000); }
  function sliderToMf(v, r) { if (v >= 999) return 1e4; const a = Math.log(r.mfd), b = Math.log(200); return Math.exp(a + (b - a) * v / 1000); }
  function dToSlider(d) { const sm = sceneMeta(); return (Math.log(d) - Math.log(sm.Drange[0])) / (Math.log(sm.Drange[1]) - Math.log(sm.Drange[0])) * 1000; }
  function sliderToD(v) { const sm = sceneMeta(); return Math.exp(Math.log(sm.Drange[0]) + (Math.log(sm.Drange[1]) - Math.log(sm.Drange[0])) * v / 1000); }

  /* ---------- thao tác ---------- */
  function setFocal(v, fromUser) {
    const r0 = rig(); const feq0 = r0.feq;
    S.focal = v;
    if (S.keepSize && fromUser) { const r1 = rig(); const sm = sceneMeta(); S.D = clamp(S.D * r1.feq / feq0, sm.Drange[0], sm.Drange[1]); const rd = R.D; if (rd) { rd.inp.value = dToSlider(S.D); rd.out.textContent = fmtDist(S.D); } }
    if (S.afMode !== 'M') autoFocus(rig());
  }
  function setLens(id) {
    const L = D.LENSES.find(l => l.id === id); S.lens = id;
    S.focal = clamp(S.focal, L.fr[0], L.fr[1]); if (L.fr[0] === L.fr[1]) S.focal = L.fr[0];
    if (L.mfOnly) { S.afMode = 'M'; S.mf = S.D; } else if (S.afMode === 'M' && !L.mfOnly && S._prevAf) S.afMode = S._prevAf;
    S.tilt = 0; autoFocus(rig()); rebuildPanel(); touch();
  }
  function setPhoneCam(id) {
    const r0 = rig(); const feq0 = r0.feq; S.phone.cam = id;
    if (S.keepSize) { const r1 = rig(); const sm = sceneMeta(); S.D = clamp(S.D * r1.feq / feq0, sm.Drange[0], sm.Drange[1]); }
    autoFocus(rig()); touch();
  }
  function setDevice(id) {
    S.device = id;
    const r = rig();
    if (r.phone) { S.phone.cam = 'w'; if (S.phone.mode === 'pro' && !r.dev.pro) S.phone.mode = 'photo'; if (S.phone.mode === 'third' && !r.dev.third) S.phone.mode = 'photo'; S.afArea = 'eye'; if (S.afMode === 'C') S.afMode = 'S'; S.wb = 'auto'; S.filter = 'none'; S.N = r.Ns ? 1.8 : r.Nwide; }
    else { if (r.dev.kind === 'dslr' && S.afArea === 'eye' && S.vf === 'ovf') S.afArea = 'auto'; if (r.dev.kind === 'ml' && S.afArea === 'auto') S.afArea = 'eye'; }
    lastMeter = null; autoFocus(rig()); rebuildPanel(); buildDevicePicker(); touch(); resizeViewer();
  }
  function setScene(id) {
    S._userScene = true; S.scene = id; lastMeter = null; clock = 0;
    S.pan = false; S.approach = false; S.freeze = true; S.focusName = '';
    if (isPhoto()) {
      const pid = photoId();
      showLoading(true); buildScenePicker(); updateCredit();
      PH.load(pid).then(pk => { if (S.scene !== id) return; const sm = sceneMeta(); S.D = sm.D; S.mf = sm.D; lastMeter = null; const v = pk.h > pk.w * 1.05; if (v !== !!S.vertical) { S.vertical = v; resizeViewer(); } fitPhoto(sm.meta); render(); autoFocus(rig()); rebuildPanel(); updateCredit(); touch(); })
        .catch(err => { showLoading(true, 'Không tải được gói cảnh: ' + err.message); });
      return;
    }
    const sm = sceneMeta(); S.D = sm.D; S.mf = sm.D;
    if (S.vertical) { S.vertical = false; resizeViewer(); }
    autoFocus(rig()); rebuildPanel(); buildScenePicker(); updateCredit(); touch();
  }
  // Khi mở một ảnh thật mà tiêu cự đang dùng hẹp hơn nhiều so với ảnh gốc, đổi sang ống zoom phù hợp để thấy trọn ảnh
  function fitPhoto(meta) {
    if (!meta) return;
    const r = rig(), src = meta.feq || 26;
    if (r.phone) {
      if (r.feq > src * 1.6) { const main = r.dev.cams.find(c => c.main) || r.dev.cams[0]; S.phone.cam = main.id; }
      return;
    }
    const want = src / r.crop;                       // tiêu cự thật cho góc nhìn bằng ảnh gốc
    const L0 = r.lens;
    if (L0 && L0.fr[0] !== L0.fr[1] && !L0.tilt && want >= L0.fr[0] * 0.9 && want <= L0.fr[1] * 1.1) { S.focal = Math.round(clamp(want, L0.fr[0], L0.fr[1])); return; }
    if (r.feq <= src * 1.6 && r.feq >= src * 0.7) return;
    const ff = r.dev.sensor === 'FF';
    const id = ff ? (src < 24 ? 'z1635' : src <= 70 ? 'z2470' : src <= 200 ? 'z70200' : 'z100400') : (want < 18 ? 'uw1018' : want <= 55 ? 'kit' : 'tele55250');
    const L = D.LENSES.find(l => l.id === id);
    S.lens = id; S.focal = Math.round(clamp(want, L.fr[0], L.fr[1])); S.tilt = 0;
    if (S.afMode === 'M') S.afMode = 'S';
  }
  function showLoading(on, msg) {
    const el = $('#lab-loading'); if (!el) return;
    el.hidden = !on; if (on) el.textContent = msg || 'Đang tải ảnh…';
  }
  function updateCredit() {
    const el = $('#lab-credit'); if (!el) return;
    el.innerHTML = '';
    if (!isPhoto()) { el.append('Cảnh dựng 2.5D bằng mô hình vector – vị trí đứng và chuyển động thay đổi được.'); return; }
    const mm = sceneMeta().meta; if (!mm) return;
    const c = mm.credit || {};
    el.append(mm.desc ? mm.desc + ' ' : '', 'Ảnh: ', c.author ? c.author + ' · ' : '', c.license || '', c.page ? ' · ' : '', c.page ? h('a', { href: c.page, target: '_blank', rel: 'noopener' }, 'trang gốc') : '');
    if (mm.src && mm.src.N) el.append(` · Ảnh gốc chụp ${fmtN(mm.src.N)}${mm.src.t ? ', ' + fmtT(mm.src.t) : ''}${mm.src.iso ? ', ISO ' + Math.round(mm.src.iso) : ''}, ${Math.round(mm.feq)} mm tđ.`);
  }
  function applyPreset(p) {
    if (p.device) { S.device = p.device; }
    const isPh = !!D.PHONES.find(x => x.id === S.device);
    if (p.scene) { S.vertical = false; S.scene = p.scene; const sm = sceneMeta(); S.D = sm.D; S.mf = sm.D; clock = 0; S.pan = false; S.approach = false; S.freeze = true; }
    if (!isPh) {
      if (p.lens) { S.lens = p.lens; const L = lensObj(); S.focal = p.focal || (L.fr[0] === L.fr[1] ? L.fr[0] : Math.round(Math.sqrt(L.fr[0] * L.fr[1]))); if (L.mfOnly) { S.afMode = 'M'; S.mf = S.D; } }
      else if (p.focal) S.focal = p.focal;
      S.mode = p.mode || S.mode; if (p.N) S.N = p.N; if (p.t) S.t = p.t; if (p.iso) { S.iso = p.iso; S.isoAuto = false; } if (p.isoAuto != null) S.isoAuto = p.isoAuto;
      const dv = dev(); if (dv.kind === 'dslr') { S.vf = p.vf || 'ovf'; S.afArea = p.afArea || 'auto'; } else S.afArea = p.afArea || 'eye';
      if (p.afMode) S.afMode = p.afMode; else if (!lensObj().mfOnly) S.afMode = 'S';
    } else { S.phone.cam = p.cam || 'w'; S.phone.mode = p.phoneMode || 'photo'; S.afArea = 'eye'; S.afMode = 'S'; S.phone.tAuto = p.t ? false : true; S.phone.isoAuto = p.iso ? false : true; if (p.t) S.t = p.t; if (p.iso) S.iso = p.iso; const pc0 = dev().cams.find(c => c.id === S.phone.cam); S.N = p.N || (pc0 && pc0.Ns ? 1.8 : 2); }
    S.ec = p.ec || 0; S.pshift = 0;
    S.support = p.support || 'hand'; S.filter = p.filter || 'none'; S.flash = p.flash || 'off';
    S.wb = p.wb || 'auto'; if (S.wb !== 'auto' && S.wb !== 'k') S.wbK = D.WB_PRESETS.find(w => w.id === S.wb).K;
    S.style = p.style || 'std'; S.tilt = p.tilt || 0; S.is = p.is !== false; S.pan = false; S.keepSize = !!p.keepSize; S.disp.grid = !!p.grid;
    if (p.D) S.D = p.D; if (p.pan) S.pan = true; if (p.approach) { S.approach = true; S.freeze = false; }
    S.lensCorr = p.lensCorr === false ? false : true; S.cropAuto = p.cropAuto === false ? false : true; S.focusName = '';
    lastMeter = null; autoFocus(rig());
    S._userScene = true; buildDevicePicker(); buildScenePicker(); rebuildPanel(); resizeViewer(); updateCredit(); touch();
    APP.go('lab');
  }

  /* ---------- chụp ---------- */
  let audio = null;
  function shutterSound(kind, t) {
    if (S.mute) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const click = (when, dur, freq, gainV) => {
        const n = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate), d = n.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const s = audio.createBufferSource(); s.buffer = n;
        const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
        const g = audio.createGain(); g.gain.value = gainV;
        s.connect(f); f.connect(g); g.connect(audio.destination); s.start(audio.currentTime + when);
      };
      if (kind === 'dslr') { click(0, 0.05, 1800, 0.9); click(Math.min(0.6, t) + 0.05, 0.06, 1200, 0.8); }
      else if (kind === 'ml') { click(0, 0.03, 2600, 0.6); click(Math.min(0.6, t) + 0.03, 0.03, 2200, 0.5); }
      else click(0, 0.04, 3000, 0.5);
    } catch (e) { }
  }
  function capture() {
    if (!cv || review) return;
    const r = rig();
    const kind = r.phone ? 'phone' : r.dev.kind;
    const res = render({ capture: true, seed: (Math.random() * 1e6) | 0 });
    const an = analyze(res.r, res.ex, res.cam, res.st);
    const thumb = mkThumb();
    const sc = scene(); const sref = sc ? sc.sizeRef : null;
    const subjInfo = res.res.info.find(i => i.subject), refInfo = res.res.info.find(i => i.id === (sref && sref.layer));
    const shot = {
      id: Date.now(), img: cv.toDataURL('image/jpeg', 0.88), thumb,
      device: r.dev.name, phone: r.phone, devId: S.device, kind, lens: r.phone ? `${r.cam.label}× · ${r.cam.feq} mm tđ` : r.lens.name, feq: r.feq, f: r.fOpt, crop: r.crop,
      N: res.ex.N, t: res.ex.t, iso: res.ex.iso, ec: S.ec, mode: res.ex.mode, scene: S.scene, wbK: res.cam.Kc, sceneK: sceneMeta().K,
      delta: res.ex.delta, clipHi: res.st.clipHi, clipLo: res.st.clipLo, bgBlur: an.bgBlur, subjBlur: an.subjBlur,
      subjCoc: subjInfo ? subjInfo.coc : 0, subjMotion: subjInfo ? subjInfo.motion : 0, shake: res.cam.shake ? res.cam.shake.len : 0,
      fgBlur: an.fgs.length ? Math.max(...an.fgs.map(f => f.coc)) : 0, maxCoc: Math.max(...res.res.info.filter(i => i.Z < 1000 || i.id === 'hills').map(i => i.coc)),
      bgMotion: Math.max(0, ...res.res.info.filter(i => i.bg).map(i => i.motion)),
      mag: res.cam.mag, D: S.D, support: S.support, pan: res.cam.pan, flash: S.flash, face: res.st.face,
      subjPx: subjInfo ? subjInfo.sx : 0, refPx: refInfo ? refInfo.sx * sref.h : 0, refScale: refInfo && subjInfo ? refInfo.sx / subjInfo.sx : 0,
      portraitMode: !!res.cam.portrait, night: res.ex.night, hdr: res.ex.hdr, phoneMode: r.phone ? S.phone.mode : null, style: S.style, filter: S.filter
    };
    shots.unshift(shot); if (shots.length > 24) shots.pop();
    shutterSound(kind, res.ex.t);
    // màn trập
    const vfEl = $('#lab-vf'); vfEl.classList.remove('snap'); void vfEl.offsetWidth; vfEl.classList.add('snap', 'snap-' + kind);
    // xem lại
    const rv = $('#lab-review');
    if (rv) {
      const rc = $('#lab-review-cv'); const rx = rc.getContext('2d'); rc.width = ENG.W; rc.height = ENG.H;
      const im = new Image(); im.onload = () => rx.drawImage(im, 0, 0); im.src = shot.img;
      const rov = $('#lab-review-ov'); rov.width = ENG.W; rov.height = ENG.H;
      const mask = S.disp.clip ? ENG.overlayMasks(res.st.luma, rov.getContext('2d'), { clip: true }) : null;
      $('#lab-review-meta').textContent = `${fmtN(shot.N)}   ${fmtT(shot.t)}   ISO ${shot.iso}   ${Math.round(shot.feq)} mm tđ`;
      const longT = shot.t >= 0.5 ? Math.min(2.2, 0.6 + shot.t * 0.06) : 0;
      review = { until: performance.now() + 2200 + longT * 1000, mask, octx: rov.getContext('2d') };
      rov.getContext('2d').clearRect(0, 0, ENG.W, ENG.H);
      rv.classList.add('on'); rv.style.setProperty('--expo', longT + 's');
      rv.classList.toggle('long', longT > 0);
    }
    renderStrip();
    document.dispatchEvent(new CustomEvent('photolab:shot', { detail: shot }));
  }
  function mkThumb() { const c = document.createElement('canvas'); c.width = 240; c.height = Math.round(240 * ENG.H / ENG.W); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8); }
  let compareSel = [];
  function renderStrip() {
    const host = $('#lab-strip'); if (!host) return;
    host.innerHTML = '';
    if (!shots.length) { host.append(h('p', { class: 'strip-empty' }, 'Ảnh bạn chụp sẽ nằm ở đây kèm thông số. Chọn hai ảnh để so sánh cạnh nhau.')); return; }
    shots.forEach(s => {
      const sel = compareSel.includes(s.id);
      const b = h('button', { type: 'button', class: 'frame' + (sel ? ' sel' : ''), 'aria-pressed': sel ? 'true' : 'false', title: 'Chọn để so sánh' },
        h('img', { src: s.thumb, alt: `${s.device}, ${fmtN(s.N)}, ${fmtT(s.t)}, ISO ${s.iso}` }),
        h('span', { class: 'frame-meta' }, `${fmtN(s.N)} · ${fmtT(s.t)} · ISO ${s.iso}`),
        h('span', { class: 'frame-dev' }, `${s.device} · ${Math.round(s.feq)} mm`));
      b.onclick = () => { if (sel) compareSel = compareSel.filter(x => x !== s.id); else { compareSel.push(s.id); if (compareSel.length > 2) compareSel.shift(); } renderStrip(); if (compareSel.length === 2) openCompare(); };
      host.append(b);
    });
  }
  function openCompare() {
    const a = shots.find(s => s.id === compareSel[0]), b = shots.find(s => s.id === compareSel[1]); if (!a || !b) return;
    const rows = [['Thiết bị', s => s.device], ['Ống kính / camera', s => s.lens], ['Tiêu cự tương đương', s => Math.round(s.feq) + ' mm'], ['Khẩu', s => fmtN(s.N)], ['Tốc độ', s => fmtT(s.t)], ['ISO', s => s.iso], ['Khoảng cách', s => fmtDist(s.D)], ['Phơi sáng so với chuẩn', s => fmtEV(s.delta) + ' stop'], ['Nền mờ (vòng mờ TB)', s => s.bgBlur.toFixed(1) + ' px'], ['Chủ thể nhòe', s => s.subjBlur.toFixed(1) + ' px'], ['Cháy sáng', s => (s.clipHi * 100).toFixed(1) + '%']];
    const dlg = $('#cmp');
    $('#cmp-body').innerHTML = '';
    $('#cmp-body').append(
      h('div', { class: 'cmp-imgs' }, h('figure', null, h('img', { src: a.img, alt: 'Ảnh A' }), h('figcaption', null, 'A')), h('figure', null, h('img', { src: b.img, alt: 'Ảnh B' }), h('figcaption', null, 'B'))),
      h('table', { class: 'cmp-tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'A'), h('th', null, 'B'))), h('tbody', null, ...rows.map(([k, f]) => { const va = String(f(a)), vb = String(f(b)); return h('tr', { class: va !== vb ? 'diff' : '' }, h('th', null, k), h('td', null, va), h('td', null, vb)); }))));
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  /* ---------- hiển thị số liệu ---------- */
  function updateReadouts(r, ex, cam, st) {
    const d = r.dev;
    const modeKey = r.phone ? S.phone.mode : S.mode;
    if (!r.phone) {
      syncDial('N', fmtN(ex.N), modeKey === 'auto' || modeKey === 'P' || modeKey === 'S', modeKey === 'auto' || modeKey === 'P' || modeKey === 'S');
      syncDial('t', fmtT(ex.t), modeKey === 'auto' || modeKey === 'P' || modeKey === 'A', modeKey === 'auto' || modeKey === 'P' || modeKey === 'A');
      syncDial('iso', 'ISO ' + ex.iso, ex.isoAuto, modeKey === 'auto');
      syncDial('ec', fmtEV(S.ec), false, modeKey === 'M' && !S.isoAuto);
      if (R.ps) syncDial('ps', S.pshift > 0 ? '+' + S.pshift : String(S.pshift), false, false);
      if (R.N) R.N.wrap.classList.toggle('blink', !!ex.flags.blinkN);
      if (R.t) R.t.wrap.classList.toggle('blink', !!ex.flags.blinkT);
    } else {
      const ps = proSpec();
      if (R.N) syncDial('N', fmtN(ex.N), false, false);
      if (R.t) syncDial('t', fmtT(ex.t), ex.flags.tAuto, false);
      if (R.iso) syncDial('iso', 'ISO ' + ex.iso, ex.flags.iAuto, false);
      if (R.ec) syncDial('ec', fmtEV(S.ec), false, ps && ps.samsungRule && ex.flags.tAuto === false);
      if (R.vN) syncDial('vN', fmtN(S.phone.vN), false, false);
    }
    // thanh thông tin
    const bar = $('#lab-bar'); if (bar) {
      bar.innerHTML = '';
      bar.append(
        h('span', { class: 'rd' + (ex.flags.blinkT ? ' blink' : '') }, fmtT(ex.t)),
        h('span', { class: 'rd' + (ex.flags.blinkN ? ' blink' : '') }, fmtN(ex.N)),
        meterScale(-ex.meterDev),
        h('span', { class: 'rd' }, 'ISO ' + ex.iso),
        h('span', { class: 'rd dim' }, S.ec ? 'EV ' + fmtEV(S.ec) : ''),
        h('span', { class: 'rd dim' }, Math.round(r.feq) + ' mm'),
        h('span', { class: 'rd dim' }, cam.flash ? 'Flash' : ''),
        h('span', { class: 'rd dim' }, ex.night ? 'Ban đêm' : ex.hdr ? 'HDR' : ''));
    }
    const an = analyze(r, ex, cam, st);
    const host = $('#lab-why'); if (host) {
      host.innerHTML = '';
      for (const [t, txt, wk] of an.out) host.append(h('article', { class: 'why' }, h('h4', null, t, h('button', { class: 'wk', type: 'button', title: 'Mở tuần học tương ứng trong lộ trình', onclick: () => APP.go('road', wk) }, 'Tuần ' + wk)), h('p', null, txt)));
    }
    const fs = $('#lab-focusname'); if (fs) fs.textContent = '';
  }
  function meterScale(v) {
    const w = h('span', { class: 'meter', title: 'Kim đo sáng: lệch so với mức máy đo gợi ý' });
    for (let i = -3; i <= 3; i++) w.append(h('i', { class: i === 0 ? 'z' : '' }));
    const pos = clamp(v, -3.3, 3.3);
    const n = h('b', { style: { left: `calc(${(pos + 3.3) / 6.6 * 100}% - 2px)` } }); if (Math.abs(v) > 3) n.classList.add('blink');
    w.append(n); return w;
  }

  /* ---------- bộ chọn thiết bị và cảnh ---------- */
  function buildDevicePicker() {
    const host = $('#lab-devices'); if (!host) return; host.innerHTML = '';
    const mkBtn = (o, sub) => { const b = h('button', { type: 'button', class: 'dev', 'aria-pressed': S.device === o.id ? 'true' : 'false' }, h('span', { class: 'dev-n' }, o.name), h('span', { class: 'dev-s' }, sub)); b.onclick = () => setDevice(o.id); return b; };
    host.append(h('div', { class: 'dev-g' }, h('span', { class: 'dev-gl' }, 'Máy ảnh'), ...D.BODIES.map(b => mkBtn(b, D.SENSORS[b.sensor].name + (b.kind === 'dslr' ? ' · gương lật' : ' · không gương')))));
    host.append(h('div', { class: 'dev-g' }, h('span', { class: 'dev-gl' }, 'Điện thoại'), ...D.PHONES.map(p => mkBtn(p, p.ref.split(' · ').slice(1).join(' · ')))));
  }
  const pf = { place: 'all', light: 'all' };
  function buildScenePicker() {
    const host = $('#lab-scenes'); if (!host) return; host.innerHTML = '';
    const list = PH.index || [];
    const mkF = (key, opts) => h('div', { class: 'seg sm', role: 'radiogroup' }, ...opts.map(([v, t]) => { const b = h('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': pf[key] === v ? 'true' : 'false' }, t); b.onclick = () => { pf[key] = v; buildScenePicker(); }; return b; }));
    const strip = h('div', { class: 'ph-strip' });
    if (list.length) {
      const shown = list.filter(s => (pf.place === 'all' || s.place === pf.place) && (pf.light === 'all' || s.light === pf.light));
      for (const s of shown) {
        const on = S.scene === 'p:' + s.id;
        const b = h('button', { type: 'button', class: 'ph-card', 'aria-pressed': on ? 'true' : 'false', title: s.title },
          s.thumb ? h('img', { src: `scenes/${s.id}/${s.thumb}`, alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'ph-noimg' }),
          h('span', { class: 'ph-t' }, s.title), h('span', { class: 'ph-s' }, `${PLACE[s.place] || ''} · ${LIGHT[s.light] || ''}`));
        b.onclick = () => setScene('p:' + s.id); strip.append(b);
      }
      if (!shown.length) strip.append(h('span', { class: 'hint' }, 'Không có ảnh nào khớp bộ lọc.'));
    } else strip.append(h('span', { class: 'hint' }, PH.indexErr ? 'Chưa đọc được scenes/index.json. Ảnh thật cần chạy qua máy chủ web (GitHub Pages hoặc python3 -m http.server) – mở file trực tiếp sẽ không tải được.' : 'Đang tải danh sách ảnh…'));
    const vecOn = !isPhoto();
    const det = h('details', { class: 'vec-scenes', open: vecOn ? true : null },
      h('summary', null, h('span', { class: 'dev-gl' }, 'Cảnh vẽ 2.5D'), h('span', { class: 'hint' }, ` (${D.SCENES_META.length}) – không phải ảnh thật; dùng cho bài đổi vị trí đứng, vệt đèn xe, chủ thể chạy liên tục`)),
      h('div', { class: 'scn-row' }, ...D.SCENES_META.map(s => { const b = h('button', { type: 'button', class: 'scn', 'aria-pressed': S.scene === s.id ? 'true' : 'false', title: s.teach }, h('span', { class: 'scn-n' }, s.name), h('span', { class: 'scn-s' }, s.place)); b.onclick = () => setScene(s.id); return b; })));
    host.append(
      h('div', { class: 'scn-g' }, h('div', { class: 'scn-head' }, h('span', { class: 'dev-gl' }, `Ảnh thật${list.length ? ' (' + list.length + ')' : ''}`), mkF('place', [['all', 'Tất cả'], ['ngoai', 'Ngoài trời'], ['trong', 'Trong nhà']]), mkF('light', [['all', 'Mọi mức sáng'], ['thieu', 'Thiếu sáng'], ['du', 'Đủ sáng'], ['thua', 'Thừa sáng']])), strip),
      det);
    const act = strip.querySelector('[aria-pressed="true"]');
    if (act) requestAnimationFrame(() => { strip.scrollLeft = act.offsetLeft - strip.clientWidth / 2 + act.offsetWidth / 2; });
    const badge = $('#lab-kind'); if (badge) { badge.textContent = isPhoto() ? 'Ảnh thật' : 'Cảnh vẽ 2.5D'; badge.className = 'vf-kind ' + (isPhoto() ? 'real' : 'drawn'); }
  }
  function updateDevChrome() {
    const r = rig(); const vf = $('#lab-vf'); if (!vf) return;
    vf.dataset.kind = r.phone ? 'phone' : r.dev.kind === 'dslr' ? (S.vf === 'ovf' ? 'ovf' : 'lv') : 'evf';
    $('#lab-devnote').textContent = r.dev.note || '';
    $('#lab-devref').textContent = r.dev.ref || '';
    // nút trên màn hình điện thoại
    const pc = $('#lab-phonectl'); pc.innerHTML = '';
    if (r.phone) {
      const ps = proSpec();
      const cams = r.dev.cams.filter(c => !ps || ps.proCams.includes(c.id));
      pc.append(h('div', { class: 'ph-lens' }, ...cams.map(c => { const b = h('button', { type: 'button', class: 'ph-l', 'aria-pressed': S.phone.cam === c.id ? 'true' : 'false' }, c.label === 'Macro' ? '✿' : c.label); b.onclick = () => { setPhoneCam(c.id); rebuildPanel(); }; return b; })));
    }
  }
  function resizeViewer() {
    const r = rig(); const asp = r.sensor.w / r.sensor.h;
    const W = asp >= 1 ? 900 : Math.round(900 * asp), Hh = asp >= 1 ? Math.round(900 / asp) : 900;
    $('#lab-vf').classList.toggle('vertical', asp < 1);
    if (ENG.W !== W || ENG.H !== Hh) { ENG.setSize(W, Hh); lastMeter = null; }
    for (const c of [cv, ov]) { c.width = W; c.height = Hh; }
    $('#lab-vf').style.setProperty('--asp', `${W} / ${Hh}`);
    touch();
  }

  /* ---------- khởi tạo trang Lab ---------- */
  function mount(root) {
    root.append(
      h('div', { class: 'lab-pick' },
        h('div', { id: 'lab-devices', class: 'devs' }),
        h('div', { id: 'lab-scenes', class: 'scns' })),
      h('div', { class: 'lab-main' },
        h('div', { class: 'lab-view' },
          h('div', { id: 'lab-vf', class: 'vf', 'data-kind': 'evf' },
            h('div', { class: 'vf-screen' },
              h('canvas', { id: 'lab-cv', 'aria-label': 'Khung ngắm mô phỏng – bấm để chọn điểm lấy nét' }),
              h('canvas', { id: 'lab-ov', class: 'ov', 'aria-hidden': 'true' }),
              h('canvas', { id: 'lab-hist', width: 160, height: 70, class: 'hist', 'aria-label': 'Biểu đồ histogram' }),
              h('div', { id: 'lab-review', class: 'review' }, h('canvas', { id: 'lab-review-cv' }), h('canvas', { id: 'lab-review-ov' }), h('div', { class: 'expo' }), h('div', { id: 'lab-review-meta', class: 'review-meta' })),
              h('div', { id: 'lab-phonectl', class: 'phonectl' }),
              h('div', { id: 'lab-loading', class: 'vf-loading', hidden: true }, 'Đang tải ảnh…'),
              h('div', { id: 'lab-kind', class: 'vf-kind' }),
              h('div', { id: 'lab-wide', class: 'vf-note', hidden: true })),
            h('div', { id: 'lab-bar', class: 'vf-bar', 'aria-live': 'off' })),
          h('div', { class: 'shoot' },
            h('button', { id: 'lab-shutter', class: 'shutter', type: 'button', 'aria-label': 'Chụp (phím cách)' }, h('span', null)),
            h('div', { class: 'shoot-txt' }, h('div', { id: 'lab-devref', class: 'devref' }), h('p', { id: 'lab-devnote', class: 'devnote' }))),
          h('p', { id: 'lab-credit', class: 'credit' })),
        h('aside', { id: 'lab-controls', class: 'ctrls', 'aria-label': 'Điều khiển máy' }),
        h('div', { class: 'lab-info' },
          h('section', { class: 'whys' }, h('h2', { class: 'sec-t' }, 'Vì sao ảnh trông như vậy'), h('div', { id: 'lab-why', class: 'why-grid' })),
          h('section', { class: 'stripw' }, h('h2', { class: 'sec-t' }, 'Cuộn phim'), h('div', { id: 'lab-strip', class: 'strip' })))),
      h('button', { id: 'lab-fab', class: 'fab', type: 'button', 'aria-label': 'Chụp' }, h('span', null)));
    cv = $('#lab-cv'); ctx = cv.getContext('2d', { willReadFrequently: true }); ov = $('#lab-ov'); octx = ov.getContext('2d', { willReadFrequently: true });
    hcv = $('#lab-hist'); hctx = hcv.getContext('2d');
    $('#lab-shutter').onclick = capture; $('#lab-fab').onclick = capture;
    $('#lab-review').onclick = () => { review = null; $('#lab-review').classList.remove('on'); touch(); };
    cv.addEventListener('click', ev => {
      const rc = cv.getBoundingClientRect(); const x = (ev.clientX - rc.left) / rc.width, y = (ev.clientY - rc.top) / rc.height;
      const r = rig(); if (r.fixedFocus || S.afMode === 'M' || r.mfOnly) return;
      S.afPoint = [x, y]; S.afArea = 'point'; if (r.phone) S.afArea = 'point';
      autoFocus(rig()); rebuildPanel(); touch();
    });
    document.addEventListener('keydown', ev => {
      if (!SIM.active) return;
      if (ev.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) { ev.preventDefault(); capture(); }
    });
    buildDevicePicker(); buildScenePicker();
    resizeViewer(); autoFocus(rig()); rebuildPanel(); renderStrip(); updateCredit();
    PH.loadIndex().then(list => { buildScenePicker(); if (list.length && !S._userScene && !isPhoto()) { setScene('p:' + list[0].id); S._userScene = false; } });
    requestAnimationFrame(loop);
  }

  return { mount, S, applyPreset, refocus: () => autoFocus(rig()), render, capture, shots, rig, get lastExp() { return lastExp; }, touch, active: false, REF, setDevice, setScene,
    _dbg: () => ({ lastMeter, lastExp, lastInfo, lastStats }) };
})();
