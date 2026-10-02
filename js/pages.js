/* ===== PhotoLab · các trang: Ống kính, Lý thuyết, Thử thách, Lộ trình, Ôn tập ===== */
'use strict';
const APP = (() => {
  const { h, $, $$, clamp, fmtN, fmtT, fmtDist, store } = U;
  const PAGES = [['lab', 'Lab mô phỏng'], ['lens', 'Ống kính'], ['theory', 'Lý thuyết'], ['chal', 'Thử thách'], ['road', 'Lộ trình 20 tuần'], ['quiz', 'Ôn tập']];
  const mounted = {};
  let current = null;

  function go(id, arg) {
    current = id;
    $$('.nav-b').forEach(b => b.setAttribute('aria-current', b.dataset.p === id ? 'page' : 'false'));
    $$('.page').forEach(p => p.hidden = p.id !== 'p-' + id);
    const root = $('#p-' + id);
    if (!mounted[id]) { mounted[id] = true; ({ lab: SIM.mount, lens: mountLens, theory: mountTheory, chal: mountChal, road: mountRoad, quiz: mountQuiz })[id](root); }
    SIM.active = id === 'lab'; if (id === 'lab') SIM.touch();
    if (id === 'road' && arg) { const el = $('#wk-' + arg); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); } }
    else window.scrollTo({ top: 0 });
    if (id === 'chal') renderChal();
    if (id === 'road') renderRoad();
    try { history.replaceState(null, '', '#' + id); } catch (e) { }
  }

  /* ============ ỐNG KÍNH ============ */
  const ANAT = [
    { id: 'front', x: 40, y: 110, t: 'Thấu kính trước & ren kính lọc', d: 'Ký hiệu ø58 (hoặc Φ58) là đường kính ren trước tính bằng mm – mua kính lọc UV, CPL, ND đúng cỡ này. Loa che nắng gắn vào ngàm lưỡi lê ngay ngoài cùng.' },
    { id: 'name', x: 110, y: 30, t: 'Dải tiêu cự', d: '18–55mm: tiêu cự ngắn nhất và dài nhất. Một số duy nhất (50mm) là ống prime – tiêu cự cố định.' },
    { id: 'ap', x: 215, y: 30, t: 'Khẩu độ lớn nhất', d: '1:3.5–5.6 nghĩa là f/3.5 ở 18 mm và f/5.6 ở 55 mm (ống “khẩu thay đổi”). Ống chuyên nghiệp ghi 1:2.8 – giữ nguyên khẩu suốt dải zoom.' },
    { id: 'focus', x: 120, y: 168, t: 'Vòng lấy nét', d: 'Xoay để lấy nét tay. Nhiều ống có thang khoảng cách (m/ft) và ký hiệu ∞ – vị trí lấy nét vô cực.' },
    { id: 'scale', x: 210, y: 96, t: 'Thang khoảng cách', d: 'Số nhỏ nhất (vd 0.25 m) là khoảng lấy nét tối thiểu, đo từ mặt phẳng cảm biến (ký hiệu ⦶ trên thân máy) chứ không phải từ đầu ống kính.' },
    { id: 'zoom', x: 300, y: 168, t: 'Vòng zoom và vạch tiêu cự', d: 'Các vạch 18 – 24 – 35 – 55 cho biết tiêu cự đang dùng. Trên APS-C, nhân thêm 1.5 (Canon 1.6) để ra góc nhìn tương đương full-frame.' },
    { id: 'sw', x: 364, y: 128, t: 'Công tắc AF/MF và chống rung', d: 'AF/MF chuyển lấy nét tự động/tay. STABILIZER (IS, VR, OSS, OS, VC…) bật/tắt chống rung – tắt khi đặt máy trên tripod. Ống tele còn có công tắc giới hạn khoảng lấy nét (focus limiter).' },
    { id: 'mount', x: 445, y: 110, t: 'Ngàm và chấu tiếp xúc', d: 'Chấm đỏ/trắng để căn khi lắp. Chấu điện truyền lệnh khẩu và lấy nét. Ống kính phải đúng ngàm với thân máy (EF, RF, Z, E, X…); DSLR sang mirrorless dùng ngàm chuyển được, chiều ngược lại thì không.' }
  ];
  function lensSVG() {
    const s = `<svg viewBox="0 0 500 220" class="lens-svg" role="img" aria-label="Sơ đồ ống kính zoom nhìn ngang">
      <defs><linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".5" stop-color="#2b2b2b"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
      <pattern id="rib" width="6" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="#262626"/><rect width="3" height="10" fill="#333"/></pattern></defs>
      <rect x="20" y="40" width="40" height="140" rx="6" fill="url(#lb)"/>
      <ellipse cx="22" cy="110" rx="10" ry="66" fill="#5b6f86" opacity=".55"/>
      <rect x="60" y="45" width="330" height="130" fill="url(#lb)"/>
      <rect x="80" y="140" width="90" height="35" fill="url(#rib)"/>
      <rect x="255" y="140" width="110" height="35" fill="url(#rib)"/>
      <rect x="180" y="108" width="60" height="22" rx="3" fill="#111" stroke="#555"/>
      <text x="186" y="123" font-size="10" fill="#ddd">0.25  1  ∞ m</text>
      <text x="262" y="134" font-size="10" fill="#cfcfcf">18  24  35  55</text>
      <text x="75" y="62" font-size="12" fill="#e9e9e9" font-weight="600">18-55mm  1:3.5-5.6  IS     ø58mm</text>
      <rect x="345" y="78" width="38" height="14" rx="2" fill="#111"/><text x="349" y="89" font-size="8.5" fill="#ddd">AF  MF</text>
      <rect x="345" y="98" width="38" height="14" rx="2" fill="#111"/><text x="347" y="109" font-size="7" fill="#ddd">IS ON OFF</text>
      <rect x="390" y="55" width="50" height="110" fill="#1e1e1e"/>
      <rect x="440" y="50" width="22" height="120" fill="#9a9a9a"/>
      <circle cx="430" cy="62" r="4" fill="#d33"/>
      <rect x="462" y="85" width="6" height="50" fill="#d9b44a"/>
    </svg>`;
    const wrap = h('div', { class: 'anat' }); wrap.innerHTML = s;
    const note = h('div', { class: 'anat-note', 'aria-live': 'polite' }, h('h4', null, 'Chọn một điểm trên ống kính'), h('p', null, 'Mỗi ký hiệu cho bạn biết ống kính làm được gì: tiêu cự, độ sáng, cỡ kính lọc, có chống rung hay không.'));
    for (const a of ANAT) {
      const b = h('button', { class: 'hot', type: 'button', style: { left: (a.x / 500 * 100) + '%', top: (a.y / 220 * 100) + '%' }, 'aria-label': a.t });
      b.onclick = () => { $$('.hot', wrap).forEach(x => x.classList.remove('on')); b.classList.add('on'); note.innerHTML = ''; note.append(h('h4', null, a.t), h('p', null, a.d)); };
      wrap.append(b);
    }
    return h('div', { class: 'anat-wrap' }, wrap, note);
  }
  function parseLens(str) {
    const brand = D.BRANDS.find(b => b.re.test(str));
    const toks = [];
    let rest = ' ' + str.replace(/[,]/g, ' ') + ' ';
    const fl = str.match(/(\d+(?:\.\d+)?)\s*(?:-|–|~)\s*(\d+(?:\.\d+)?)\s*mm/i) || str.match(/(\d+(?:\.\d+)?)\s*mm/i);
    let f1 = null, f2 = null, n1 = null, n2 = null;
    if (fl) { f1 = +fl[1]; f2 = fl[2] ? +fl[2] : f1; toks.push([fl[0], f1 === f2 ? `Ống prime – tiêu cự cố định ${f1} mm.` : `Ống zoom từ ${f1} đến ${f2} mm (zoom ${(f2 / f1).toFixed(1)}×).`]); rest = rest.replace(fl[0], ' '); }
    const ap = str.match(/(?<![A-Za-z])[fF]\/?\s*(\d+(?:\.\d+)?)(?:\s*(?:-|–)\s*(\d+(?:\.\d+)?))?\s*([A-Z])?/) || str.match(/(?<![\d.])1:\s*(\d+\.\d+|[2-9]\d*)(?:\s*(?:-|–)\s*(\d+(?:\.\d+)?))?\s*([A-Z])?/);
    if (ap) {
      n1 = +ap[1]; n2 = ap[2] ? +ap[2] : n1;
      const desc = n1 <= 1.4 ? 'rất sáng – xóa phông mạnh, chụp tối tốt' : n1 <= 2 ? 'sáng – hợp chân dung và thiếu sáng' : n1 <= 2.8 ? 'khá sáng – chuẩn của ống chuyên nghiệp' : n1 <= 4 ? 'trung bình' : 'tối – cần nhiều ánh sáng';
      toks.push([ap[0].replace(/[A-Z]$/, '').trim(), n1 === n2 ? `Khẩu lớn nhất f/${n1}${f1 && f1 !== f2 ? ', không đổi khi zoom' : ''} – ${desc}.` : `Khẩu lớn nhất f/${n1} ở đầu rộng, f/${n2} ở đầu tele (khẩu thay đổi) – ${desc}.`]);
      rest = rest.replace(ap[0].replace(/[A-Z]$/, ''), ' ');
      if (ap[3] && ap[3] === 'L' && brand && brand.id === 'canon') rest += ' L ';
      if (ap[3] && ap[3] === 'G' && brand && brand.id === 'nikon') rest += ' G ';
    }
    const fm = str.match(/[øΦ]\s*(\d+)/); if (fm) { toks.push([fm[0], `Ren kính lọc ${fm[1]} mm.`]); rest = rest.replace(fm[0], ' '); }
    const mg = str.match(/(?<![\d.])1:[12](?![\d.])/); if (mg) { toks.push([mg[0], mg[0] === '1:1' ? 'Phóng đại 1:1 – macro thật.' : 'Phóng đại tối đa 1:2 (nửa kích thước thật).']); }
    const words = rest.split(/\s+/).filter(Boolean);
    const used = new Set();
    for (let i = 0; i < words.length; i++) {
      let w = words[i].toUpperCase().replace(/[()]/g, '');
      if (D.BRANDS.some(b => b.re.test(words[i]))) { if (!/nikkor|zuiko|lumix/i.test(words[i])) continue; }
      const two = (w + ' ' + (words[i + 1] || '').toUpperCase());
      let hit = D.CODES.find(c => c[0] === two && (!c[1] || (brand && c[1] === brand.id)));
      if (hit) { i++; } else {
        const cands = D.CODES.filter(c => c[0] === w);
        hit = cands.find(c => brand && c[1] === brand.id) || cands.find(c => !c[1]) || cands[0];
        if (!hit && /^G\d$/.test(w)) hit = D.CODES.find(c => c[0] === 'G2');
        if (!hit && w === 'MACRO') hit = D.CODES.find(c => c[0] === 'MACRO');
      }
      if (hit && !used.has(hit[0] + hit[1])) { used.add(hit[0] + hit[1]); toks.push([words[i].replace(/[()]/g, '') + (hit[0].includes(' ') ? '' : ''), hit[2] + (hit[1] && (!brand || hit[1] !== brand.id) ? ` (ký hiệu của ${D.BRANDS.find(b => b.id === hit[1]).name})` : '')]); }
      else if (!hit && w.length > 1 && !/^(DIGITAL|LENS|ZOOM)$/.test(w)) toks.push([words[i], 'Chưa có trong từ điển – tra trang của hãng.']);
    }
    return { brand, toks, f1, f2, n1, n2 };
  }
  function lensTypeFor(feq, fish) { return fish ? 'Mắt cá' : feq < 14 ? 'Siêu rộng cực đại' : feq < 24 ? 'Siêu rộng' : feq < 36 ? 'Góc rộng' : feq < 60 ? 'Tiêu chuẩn' : feq <= 130 ? 'Tele ngắn' : feq <= 300 ? 'Tele vừa' : 'Siêu tele'; }
  function decoder() {
    const inp = h('input', { class: 'txt', type: 'text', value: D.LENS_EXAMPLES[0], 'aria-label': 'Tên ống kính', spellcheck: 'false' });
    const out = h('div', { class: 'dec-out', 'aria-live': 'polite' });
    const run = () => {
      const p = parseLens(inp.value); out.innerHTML = '';
      const apsc = /EF-S|RF-S|\bDX\b|\bDC\b|DI II|DI III-A|\bXF\b|\bXC\b|\bE\s(?!-)/i.test(inp.value) && !/\bFE\b/i.test(inp.value);
      const mft = /zuiko|lumix|\bM\.?\s?ZUIKO/i.test(inp.value);
      const crop = mft ? 2 : apsc ? 1.5 : 1;
      if (p.brand) out.append(h('p', { class: 'dec-brand' }, 'Hãng: ' + p.brand.name));
      out.append(h('ul', { class: 'dec-list' }, ...p.toks.map(([k, v]) => h('li', null, h('code', null, k), h('span', null, v)))));
      if (p.f1) {
        const fa = Math.round(p.f1 * crop), fb = Math.round(p.f2 * crop);
        out.append(h('p', { class: 'dec-sum' }, `Thiết kế cho cảm biến ${mft ? 'Micro Four Thirds (×2)' : apsc ? 'APS-C (×1.5)' : 'full-frame'} → góc nhìn tương đương ${fa === fb ? fa : fa + '–' + fb} mm: ${lensTypeFor(fa, /fish/i.test(inp.value))}${fa !== fb ? ' đến ' + lensTypeFor(fb).toLowerCase() : ''}.`));
        const best = D.LENSES.filter(L => !L.tilt && !L.fisheye).map(L => ({ L, d: Math.abs(Math.log(L.fr[0] / p.f1)) + Math.abs(Math.log(L.fr[1] / p.f2)) + (p.n1 ? Math.abs(Math.log(L.nw[0] / p.n1)) : 0) * 0.6 })).sort((a, b) => a.d - b.d)[0].L;
        out.append(h('button', { class: 'btn', type: 'button', onclick: () => SIM.applyPreset({ device: apsc || mft ? 'ml_apsc' : 'ml_ff', lens: best.id, focal: clamp(p.f1, best.fr[0], best.fr[1]), scene: p.f2 >= 90 && /macro|micro|1:1/i.test(inp.value) ? 'macro' : p.f2 >= 70 ? 'portrait' : p.f1 <= 24 ? 'landscape' : 'street', mode: 'A', N: p.n1 ? U.nearest(U.APERTURE_STEPS, Math.max(p.n1, best.nw[0])) : 5.6 }) }, `Thử ống tương tự (${best.name}) trong Lab`));
      }
    };
    inp.oninput = run;
    const ex = h('div', { class: 'chips' }, ...D.LENS_EXAMPLES.map(e => h('button', { class: 'chip', type: 'button', onclick: () => { inp.value = e; run(); } }, e)));
    run();
    return h('div', { class: 'dec' }, h('label', { class: 'field-label' }, 'Gõ hoặc dán tên ống kính'), inp, ex, out);
  }
  function fovTool() {
    const sens = ['FF', 'APSC', 'MFT', 'ONE', 'P13'];
    let f = 50, sid = 'FF';
    const svg = h('div', { class: 'fov-svg' });
    const txt = h('div', { class: 'fov-txt', 'aria-live': 'polite' });
    const draw = () => {
      const s = D.SENSORS[sid];
      const hA = 2 * Math.atan(s.w / (2 * f)), dA = 2 * Math.atan(s.diag / (2 * f));
      const feq = f * s.crop;
      const R = 170, cx = 200, cy = 190;
      const a = Math.min(hA, 3.1) / 2;
      const marks = [14, 24, 35, 50, 85, 135, 200, 400];
      let lines = '';
      for (const [mi, m] of marks.entries()) { const am = Math.atan(36 / (2 * m)) * (mi % 2 ? -1 : 1); lines += `<line x1="${cx}" y1="${cy}" x2="${cx - Math.sin(am) * R}" y2="${cy - Math.cos(am) * R}" stroke="#555" stroke-dasharray="2 4"/><text x="${cx - Math.sin(am) * (R + 12)}" y="${cy - Math.cos(am) * (R + 12)}" font-size="10" fill="#8f8f8f" text-anchor="middle">${m}</text>`; }
      svg.innerHTML = `<svg viewBox="0 0 400 210" role="img" aria-label="Góc nhìn ngang ${(hA * 180 / Math.PI).toFixed(0)} độ">
        ${lines}
        <path d="M${cx} ${cy} L${cx - Math.sin(a) * R} ${cy - Math.cos(a) * R} A${R} ${R} 0 0 1 ${cx + Math.sin(a) * R} ${cy - Math.cos(a) * R} Z" fill="rgba(242,181,68,.22)" stroke="#f2b544"/>
        <rect x="${cx - 9}" y="${cy - 4}" width="18" height="12" fill="#ddd"/></svg>`;
      txt.innerHTML = '';
      txt.append(h('p', null, h('strong', null, `${f} mm trên ${s.name}`), ` ≈ ${Math.round(feq)} mm tương đương full-frame (hệ số ${s.crop.toFixed(2)}).`),
        h('p', null, `Góc nhìn ngang ${(hA * 180 / Math.PI).toFixed(1)}°, góc chéo ${(dA * 180 / Math.PI).toFixed(1)}° → ${lensTypeFor(feq)}.`),
        h('p', { class: 'hint' }, `Ống “tiêu chuẩn” cho cảm biến này ≈ ${s.diag.toFixed(0)} mm (bằng đường chéo cảm biến). Nét đứt là góc nhìn các tiêu cự phổ biến trên full-frame.`));
    };
    const fs = h('input', { type: 'range', min: 0, max: 1000, value: 500, 'aria-label': 'Tiêu cự' });
    const toF = v => Math.round(Math.exp(Math.log(4) + (Math.log(800) - Math.log(4)) * v / 1000));
    fs.value = (Math.log(50) - Math.log(4)) / (Math.log(800) - Math.log(4)) * 1000;
    fs.oninput = () => { f = toF(+fs.value); draw(); };
    const sel = h('select', { class: 'sel', 'aria-label': 'Cảm biến' }, ...sens.map(k => h('option', { value: k }, D.SENSORS[k].name)));
    sel.onchange = () => { sid = sel.value; draw(); };
    draw();
    return h('div', { class: 'fov' }, h('div', { class: 'fov-ctl' }, h('label', { class: 'field-label' }, 'Tiêu cự thật'), fs, h('label', { class: 'field-label' }, 'Cảm biến'), sel), svg, txt);
  }
  function mountLens(root) {
    const types = h('div', { class: 'ltypes' }, ...D.LENS_TYPES.map(t => h('article', { class: 'ltype' },
      h('header', null, h('h4', null, t.name), h('span', { class: 'lt-f' }, t.feq + ' · ' + t.aov)),
      h('p', null, t.look), h('dl', null, h('dt', null, 'Hợp với'), h('dd', null, t.use), h('dt', null, 'Tránh'), h('dd', null, t.avoid)),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => SIM.applyPreset(Object.assign({ mode: 'A', N: 8 }, t.preset)) }, 'Thử trong Lab'))));
    const flaws = h('div', { class: 'flaws' },
      flaw('Méo thùng & méo gối', 'Góc rộng làm đường thẳng phình ra (thùng), tele làm đường thẳng cong vào (gối). Superzoom bị cả hai ở hai đầu dải zoom.', { device: 'dslr_apsc', lens: 'super18200', focal: 18, scene: 'street', lensCorr: false, mode: 'A', N: 8 }),
      flaw('Tối góc (vignetting)', 'Góc ảnh tối hơn tâm khi mở khẩu lớn nhất. Khép 1–2 stop là hết. Ống APS-C trên thân full-frame còn tạo viền đen tròn.', { device: 'ml_ff', lens: 'kit', focal: 18, scene: 'landscape', lensCorr: false, cropAuto: false, mode: 'A', N: 3.5 }),
      flaw('Quang sai màu (viền màu)', 'Viền xanh/tím ở cạnh tương phản, rõ nhất ở góc ảnh. Kính ED/APO và hiệu chỉnh trong máy giúp giảm.', { device: 'dslr_apsc', lens: 'super18200', focal: 200, scene: 'night', lensCorr: false, mode: 'A', N: 6.3, isoAuto: true }),
      flaw('Bokeh và số lá khẩu', 'Khép khẩu làm đốm sáng nền thành hình đa giác theo số lá khẩu; ống 9 lá cho đốm tròn hơn ống 7 lá.', { device: 'ml_ff', lens: 'p85', scene: 'portrait', mode: 'A', N: 2.8 }));
    root.append(
      h('header', { class: 'page-h' }, h('h1', null, 'Ống kính'), h('p', null, 'Cách đọc ký hiệu trên ống kính, góc nhìn theo tiêu cự và cảm biến, mỗi loại ống dùng cho việc gì – và thử ngay trong Lab.')),
      h('section', { class: 'blk' }, h('h2', null, 'Đọc thông số trên thân ống kính'), lensSVG()),
      h('section', { class: 'blk' }, h('h2', null, 'Giải mã tên ống kính các hãng'), decoder()),
      h('section', { class: 'blk' }, h('h2', null, 'Tiêu cự, cảm biến và góc nhìn'), fovTool()),
      h('section', { class: 'blk' }, h('h2', null, 'Mỗi loại ống kính dùng khi nào'), types),
      h('section', { class: 'blk' }, h('h2', null, 'Prime hay zoom'), h('div', { class: 'two' },
        h('div', null, h('h4', null, 'Prime (tiêu cự cố định)'), h('ul', { class: 'bul' }, h('li', null, 'Nhẹ, nhỏ, khẩu lớn hơn (f/1.4 – f/1.8) với giá tương đương.'), h('li', null, 'Thường nét hơn, ít méo và ít viền màu hơn.'), h('li', null, 'Buộc bạn di chuyển để bố cục – dần “thấy” khung hình của tiêu cự đó.'))),
        h('div', null, h('h4', null, 'Zoom (tiêu cự thay đổi)'), h('ul', { class: 'bul' }, h('li', null, 'Linh hoạt: 16–35 rộng, 24–70/24–105 tầm trung, 70–200 tele.'), h('li', null, 'Ống kit thường có khẩu nhỏ; superzoom 18–200 tiện nhưng giảm chất lượng.'), h('li', null, 'Dễ thành thói quen đứng yên và xoay zoom thay vì tìm góc chụp.'))))),
      h('section', { class: 'blk' }, h('h2', null, 'Khiếm khuyết của ống kính – xem tận mắt'), flaws),
      h('section', { class: 'blk' }, h('h2', null, 'Chọn ống kính cho tình huống'), lensQuiz()));
  }
  function flaw(t, d, preset) { return h('article', { class: 'flaw' }, h('h4', null, t), h('p', null, d), h('button', { class: 'btn ghost', type: 'button', onclick: () => SIM.applyPreset(preset) }, 'Mở cảnh minh họa')); }
  function lensQuiz() {
    const Q = [
      ['Chụp chân dung bán thân, muốn khuôn mặt cân đối và nền mờ mịn.', 'shorttele'], ['Phòng khách nhỏ, cần lấy trọn căn phòng cho một tin rao nhà.', 'uw'],
      ['Chim bói cá đậu cách 40 m bên hồ.', 'supertele'], ['Giọt sương trên cánh chuồn chuồn, cần phóng đại 1:1.', 'macro'],
      ['Trận bóng đá sân trường, đứng ngoài đường biên.', 'tele'], ['Chuyến du lịch 10 ngày, chỉ muốn mang một ống kính.', 'superzoom'],
      ['Ảnh đường phố đời thường, gần với cách mắt nhìn.', 'normal'], ['Biến khu phố thành “mô hình đồ chơi” nhìn từ trên cao.', 'ts']
    ];
    const host = h('div', { class: 'lq' });
    Q.forEach(([q, ans], qi) => {
      const fb = h('p', { class: 'lq-fb', 'aria-live': 'polite' });
      const others = D.LENS_TYPES.filter(t => t.id !== ans), pick = [];
      for (let k = 0; pick.length < 3; k++) { const o = others[(qi * 3 + k * 4) % others.length]; if (!pick.includes(o)) pick.push(o); }
      const opts = [...pick]; opts.splice(qi % 4, 0, D.LENS_TYPES.find(t => t.id === ans));
      host.append(h('div', { class: 'lq-i' }, h('p', null, q), h('div', { class: 'chips' }, ...opts.map(o => h('button', { class: 'chip', type: 'button', onclick: e => { const ok = o.id === ans; e.target.classList.add(ok ? 'ok' : 'no'); fb.textContent = ok ? 'Đúng. ' + D.LENS_TYPES.find(t => t.id === ans).use : 'Chưa đúng – thử lại.'; } }, o.name))), fb));
    });
    return host;
  }

  /* ============ LÝ THUYẾT ============ */
  function mountTheory(root) {
    root.append(
      h('header', { class: 'page-h' }, h('h1', null, 'Lý thuyết tương tác'), h('p', null, 'Những khái niệm nền của giáo trình, mỗi khái niệm một công cụ nhỏ để kéo thả và quan sát.')),
      h('section', { class: 'blk' }, h('h2', null, 'Máy ảnh “nhìn” thế nào'), sensorBlock()),
      h('section', { class: 'blk' }, h('h2', null, 'Tam giác phơi sáng'), triangle()),
      h('section', { class: 'blk' }, h('h2', null, 'Đo sáng và xám 18%'), meterTool()),
      h('section', { class: 'blk' }, h('h2', null, 'Đọc histogram'), histTool()),
      h('section', { class: 'blk' }, h('h2', null, 'Tính độ sâu trường ảnh'), dofTool()),
      h('section', { class: 'blk' }, h('h2', null, 'Nhiệt độ màu và cân bằng trắng'), kelvinTool()),
      h('section', { class: 'blk' }, h('h2', null, 'Tốc độ màn trập cho chuyển động'), motionTable()),
      h('section', { class: 'blk' }, h('h2', null, 'Kích thước cảm biến'), sensorSizes()),
      h('section', { class: 'blk' }, h('h2', null, 'Đèn flash: Guide Number'), gnTool()));
  }
  function sensorBlock() {
    const grid = h('div', { class: 'bayer', 'aria-hidden': 'true' });
    for (let i = 0; i < 64; i++) { const r = Math.floor(i / 8), c = i % 8; grid.append(h('i', { class: (r % 2 === 0 ? (c % 2 === 0 ? 'r' : 'g') : (c % 2 === 0 ? 'g' : 'b')) })); }
    return h('div', { class: 'two' }, grid, h('div', null,
      h('p', null, 'Cảm biến phủ hàng triệu “giếng” nhỏ (photosite) hứng photon khi màn trập mở. Giếng nào nhận ít photon thành vùng tối; giếng đầy tràn thành trắng cháy.'),
      h('p', null, 'Mỗi giếng chỉ đo độ sáng, nên phía trên có kính lọc đỏ, lục hoặc lam xếp theo mẫu Bayer: cứ 4 giếng có 2 lục, 1 đỏ, 1 lam – giống mắt người nhạy với màu lục hơn. Máy ghép lại thành điểm ảnh RGB, mỗi kênh từ 0 (không có) đến 255 (cực đại).'),
      h('p', null, 'Lượng sáng tới cảm biến được điều khiển bởi khẩu độ (lỗ mở trong ống kính) và màn trập (thời gian mở). ISO quyết định tín hiệu được khuếch đại bao nhiêu.')));
  }
  function triangle() {
    const st = { N: 5.6, t: 1 / 125, iso: 400, lock: 'iso' };
    const ev0 = U.evOf(st.N, st.t, st.iso);
    const out = h('div', { class: 'tri-out', 'aria-live': 'polite' });
    const iris = h('div', { class: 'tri-v' }), streak = h('div', { class: 'tri-v' }), grain = h('canvas', { width: 120, height: 80, class: 'tri-grain' });
    const mk = (key, label, list, fmt) => {
      const o = h('output', { class: 'tri-val' });
      const inp = h('input', { type: 'range', min: 0, max: list.length - 1, step: 1, 'aria-label': label });
      inp.oninput = () => { const old = st[key]; st[key] = list[+inp.value]; compensate(key, old); draw(); };
      return { el: h('div', { class: 'tri-c' }, h('div', { class: 'field-label' }, label, o), inp), inp, o, list, fmt };
    };
    const ctl = { N: mk('N', 'Khẩu độ', U.APERTURE_STEPS.filter(x => x >= 1.4 && x <= 22), fmtN), t: mk('t', 'Tốc độ', U.SHUTTERS.filter(x => x <= 4 && x >= 1 / 4000), fmtT), iso: mk('iso', 'ISO', U.ISOS.filter(x => x >= 100 && x <= 25600), v => 'ISO ' + v) };
    const lockSel = h('select', { class: 'sel', 'aria-label': 'Thông số tự bù' }, h('option', { value: 'none' }, 'Không bù – thấy phơi sáng thay đổi'), h('option', { value: 't' }, 'Tốc độ tự bù (như chế độ A)'), h('option', { value: 'N' }, 'Khẩu tự bù (như chế độ S)'), h('option', { value: 'iso', selected: true }, 'ISO tự bù (ISO tự động)'));
    lockSel.onchange = () => { st.lock = lockSel.value; };
    function compensate(changed) {
      if (st.lock === 'none' || st.lock === changed) return;
      const need = ev0 + 0;
      if (st.lock === 't') st.t = U.nearest(ctl.t.list, st.N * st.N / Math.pow(2, need + Math.log2(st.iso / 100)));
      if (st.lock === 'N') st.N = U.nearest(ctl.N.list, Math.sqrt(st.t * Math.pow(2, need + Math.log2(st.iso / 100))));
      if (st.lock === 'iso') st.iso = U.nearest(ctl.iso.list, 100 * Math.pow(2, Math.log2(st.N * st.N / st.t) - need));
    }
    function draw() {
      for (const k of ['N', 't', 'iso']) { const c = ctl[k]; c.inp.value = c.list.indexOf(U.nearest(c.list, st[k])); c.o.textContent = c.fmt(st[k]); }
      const d = ev0 - U.evOf(st.N, st.t, st.iso);
      const rr = 34 * 1.4 / st.N + 4; let pts = ''; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; pts += `${50 + Math.cos(a) * rr},${40 + Math.sin(a) * rr} `; }
      iris.innerHTML = `<svg viewBox="0 0 100 80" aria-hidden="true"><circle cx="50" cy="40" r="38" fill="#1b1b1b"/><polygon points="${pts}" fill="#d9e3ea"/></svg><span>Lỗ mở ${fmtN(st.N)}</span>`;
      const L = clamp(Math.log2(st.t * 4000) / Math.log2(16000) * 90, 2, 90);
      streak.innerHTML = `<svg viewBox="0 0 100 80" aria-hidden="true"><rect x="5" y="34" width="${L}" height="12" rx="6" fill="#f2b544" opacity=".35"/><circle cx="${5 + L}" cy="40" r="6" fill="#f2b544"/></svg><span>Vệt chuyển động</span>`;
      const gc = grain.getContext('2d'); const im = gc.createImageData(120, 80); const amp = Math.sqrt(st.iso / 100) * 5; const rnd = U.rng(5);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * amp * 2; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      gc.putImageData(im, 0, 0);
      out.innerHTML = '';
      out.append(h('p', { class: 'tri-ev' + (Math.abs(d) > 0.2 ? ' off' : '') }, Math.abs(d) < 0.2 ? 'Phơi sáng giữ nguyên' : (d > 0 ? `Sáng hơn ${d.toFixed(1)} stop` : `Tối hơn ${(-d).toFixed(1)} stop`)),
        h('p', { class: 'hint' }, `Khẩu ${fmtN(st.N)}: ${st.N <= 2.8 ? 'vùng nét mỏng' : st.N >= 11 ? 'vùng nét sâu' : 'vùng nét vừa'}. Tốc độ ${fmtT(st.t)}: ${st.t >= 1 / 30 ? 'dễ nhòe, cần tripod' : st.t <= 1 / 500 ? 'đóng băng chuyển động nhanh' : 'đủ cho cầm tay thông thường'}. ISO ${st.iso}: ${st.iso >= 3200 ? 'nhiễu rõ' : st.iso >= 800 ? 'hơi nhiễu' : 'sạch'}.`));
    }
    draw();
    return h('div', { class: 'tri' }, h('div', { class: 'tri-ctl' }, ctl.N.el, ctl.t.el, ctl.iso.el, h('div', { class: 'field-label' }, 'Khi kéo một thông số'), lockSel, h('p', { class: 'hint' }, 'Mỗi stop là gấp đôi hoặc giảm nửa lượng sáng. Dãy khẩu f/2.8 – 4 – 5.6 – 8 – 11 – 16; giữa f/4 và f/5.6 có hai nấc 1/3 stop là f/4.5 và f/5.')),
      h('div', { class: 'tri-vis' }, iris, streak, h('div', { class: 'tri-v' }, grain, h('span', null, 'Hạt nhiễu'))), out);
  }
  function meterTool() {
    const items = [['Tuyết trắng', 0.85], ['Cát sáng', 0.4], ['Cỏ, lá cây', 0.18], ['Áo jeans', 0.1], ['Mèo đen', 0.04]];
    let refl = 0.85;
    const v = h('div', { class: 'met-v' });
    const draw = () => {
      const ec = Math.log2(refl / 0.18);
      const sw = r => `rgb(${Array(3).fill(Math.round(U.lin2srgb(Math.min(1, r)) * 255)).join(',')})`;
      v.innerHTML = '';
      v.append(h('div', { class: 'met-row' }, h('figure', null, h('div', { class: 'sw', style: { background: sw(refl) } }), h('figcaption', null, 'Thực tế')), h('figure', null, h('div', { class: 'sw', style: { background: sw(0.18) } }), h('figcaption', null, 'Máy đo sáng cho ra')), h('figure', null, h('div', { class: 'sw', style: { background: sw(refl) } }), h('figcaption', null, `Sau khi bù ${ec >= 0 ? '+' : '−'}${Math.abs(ec).toFixed(1)} EV`))),
        h('p', null, `Đồng hồ trong máy đo ánh sáng phản xạ và luôn cố biến chủ thể thành xám trung tính 18%. Bề mặt phản xạ ${Math.round(refl * 100)}% sẽ bị ${ec > 0.2 ? 'tối đi (thiếu sáng) – cần bù sáng dương' : ec < -0.2 ? 'sáng lên (dư sáng) – cần bù sáng âm' : 'đo đúng'}.`));
    };
    const chips = h('div', { class: 'chips' }, ...items.map(([n, r]) => h('button', { class: 'chip', type: 'button', onclick: () => { refl = r; draw(); } }, n)));
    draw();
    return h('div', null, chips, v, h('div', { class: 'two' },
      h('div', null, h('h4', null, 'Ba chế độ đo sáng'), h('ul', { class: 'bul' }, h('li', null, 'Đánh giá / Ma trận: chia khung thành nhiều vùng rồi tổng hợp – dùng hằng ngày.'), h('li', null, 'Ưu tiên trung tâm: dồn khoảng 60–80% trọng số vào giữa khung – hợp chân dung.'), h('li', null, 'Điểm: chỉ đo 1–5% khung (đo vùng 10–15% gọi là partial) – chủ thể nhỏ trên nền rất sáng/tối.'))),
      h('div', null, h('h4', null, 'Bù sáng'), h('p', null, 'Thường được ±3 stop theo bước 1/3 hoặc 1/2. Dương làm sáng, âm làm tối. Có tác dụng ở P, A, S, Auto – và ở M khi bật ISO tự động.'), h('button', { class: 'btn ghost', type: 'button', onclick: () => SIM.applyPreset({ device: 'dslr_apsc', lens: 'kit', focal: 55, scene: 'portrait', mode: 'A', N: 5.6, isoAuto: true }) }, 'Thử với cảnh ngược sáng'))));
  }
  function histTool() {
    const cvs = h('canvas', { width: 360, height: 90, class: 'ht-img' }), hc = h('canvas', { width: 360, height: 90, class: 'ht-h' });
    const out = h('p', { class: 'hint', 'aria-live': 'polite' });
    let ev = 0;
    const draw = () => {
      const c = cvs.getContext('2d'), im = c.createImageData(360, 90), hist = new Uint32Array(64); const r = U.rng(3);
      for (let y = 0; y < 90; y++) for (let x = 0; x < 360; x++) {
        const base = Math.pow(x / 359, 1.3) * 0.9 + 0.01 + (Math.sin(y / 9 + x / 40) * 0.05);
        const v = Math.round(U.lin2srgb(clamp(base * Math.pow(2, ev) * (0.95 + r() * 0.1), 0, 1)) * 255);
        const i = (y * 360 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; hist[v >> 2]++;
      }
      c.putImageData(im, 0, 0);
      const g = hc.getContext('2d'); g.clearRect(0, 0, 360, 90); let mx = 1; for (let i = 0; i < 64; i++) mx = Math.max(mx, hist[i]);
      g.fillStyle = '#d8d8d8'; for (let i = 0; i < 64; i++) { const hh = Math.min(1, hist[i] / mx * 1.4) * 86; g.fillRect(i * 5.625, 90 - hh, 5, hh); }
      const lo = hist[0] / (360 * 90), hi = hist[63] / (360 * 90);
      out.textContent = `Trái là đen, phải là trắng, giữa là tông trung tính. ${hi > 0.04 ? 'Cột dựng sát mép phải: vùng sáng đã cháy, mất chi tiết – bù sáng âm.' : lo > 0.04 ? 'Dữ liệu dồn sát mép trái: vùng tối bị bệt đen – bù sáng dương.' : 'Không bị cắt ở hai đầu: giữ được chi tiết cả vùng sáng và tối.'} Không có hình dạng histogram “chuẩn” – cảnh tuyết sẽ lệch phải, cảnh đêm lệch trái.`;
    };
    const s = h('input', { type: 'range', min: -3, max: 3, step: 1 / 3, value: 0, 'aria-label': 'Bù sáng' }); s.oninput = () => { ev = +s.value; draw(); };
    draw();
    return h('div', { class: 'ht' }, h('div', { class: 'field-label' }, 'Kéo để thay đổi phơi sáng'), s, cvs, hc, out);
  }
  function dofTool() {
    const st = { sid: 'FF', f: 50, N: 2.8, d: 3 };
    const out = h('div', { class: 'dof-out', 'aria-live': 'polite' }), bar = h('div', { class: 'dof-bar' });
    const draw = () => {
      const s = D.SENSORS[st.sid], c = s.diag / 1500;
      const r = U.dofLimits(st.f, st.N, st.d * 1000, c);
      const near = r.near / 1000, far = r.far / 1000, H = r.H / 1000;
      const max = Math.max(st.d * 3, 5); const px = m => clamp(Math.log(1 + m) / Math.log(1 + max) * 100, 0, 100);
      bar.innerHTML = `<div class="dof-zone" style="left:${px(near)}%;width:${(isFinite(far) ? px(far) : 100) - px(near)}%"></div><div class="dof-focus" style="left:${px(st.d)}%"></div><span class="dof-cam">máy</span>`;
      out.innerHTML = '';
      out.append(h('p', null, h('strong', null, `Nét từ ${fmtDist(near)} đến ${fmtDist(far)}`), isFinite(far) ? ` – sâu ${fmtDist(far - near)}; phía trước điểm nét ${fmtDist(st.d - near)}, phía sau ${fmtDist(far - st.d)}.` : ' – tới vô cực.'),
        h('p', null, `Khoảng siêu tiêu: ${fmtDist(H)}. Lấy nét ở đó thì mọi thứ từ ${fmtDist(H / 2)} đến vô cực đều nét.`),
        h('p', { class: 'hint' }, `Vòng mờ cho phép (CoC) ≈ ${c.toFixed(3)} mm – đường chéo cảm biến chia 1500. Tương đương full-frame: ${Math.round(st.f * s.crop)} mm ở ${fmtN(st.N * s.crop)}.`));
    };
    const row = (lab, el) => h('div', { class: 'field' }, h('div', { class: 'field-label' }, lab), el);
    const sel = h('select', { class: 'sel' }, ...['FF', 'APSC', 'MFT', 'ONE', 'P13'].map(k => h('option', { value: k }, D.SENSORS[k].name))); sel.onchange = () => { st.sid = sel.value; draw(); };
    const num = (v, min, max, step, key) => { const i = h('input', { type: 'number', class: 'txt num', value: v, min, max, step }); i.oninput = () => { st[key] = clamp(+i.value || v, min, max); draw(); }; return i; };
    draw();
    return h('div', { class: 'dof' }, h('div', { class: 'dof-ctl' }, row('Cảm biến', sel), row('Tiêu cự thật (mm)', num(50, 4, 800, 1, 'f')), row('Khẩu (f/)', num(2.8, 1, 32, 0.1, 'N')), row('Khoảng lấy nét (m)', num(3, 0.1, 500, 0.1, 'd'))), bar, out,
      h('p', { class: 'hint' }, 'Ba yếu tố: khẩu lớn, đứng gần, tiêu cự dài → vùng nét mỏng. Vùng nét trải khoảng 1/3 phía trước và 2/3 phía sau điểm lấy nét (ở khoảng gần thì cân hơn).'));
  }
  function kelvinTool() {
    let light = 3000, cam = 5200;
    const strip = h('div', { class: 'k-strip' });
    for (let k = 1800; k <= 10000; k += 400) strip.append(h('i', { style: { background: U.k2css(k) } }));
    const marks = h('div', { class: 'k-marks' }, ...D.KELVIN_POINTS.map(p => { const x = (p.K - 1800) / 8200 * 100; return h('span', { style: { left: x + '%', transform: `translateX(${x < 6 ? 0 : x > 94 ? -100 : -50}%)`, textAlign: x < 6 ? 'left' : x > 94 ? 'right' : 'center' } }, p.name, h('b', null, p.K + ' K')); }));
    const card = h('div', { class: 'k-card' }); const out = h('p', { class: 'hint', 'aria-live': 'polite' });
    const draw = () => {
      const r = U.wbRatio(light, cam); const c = r.map(x => Math.round(U.lin2srgb(clamp(0.8 * x, 0, 1)) * 255));
      card.style.background = `rgb(${c.join(',')})`; card.textContent = 'Tờ giấy trắng';
      out.textContent = `Ánh sáng ${light} K, máy đặt ${cam} K → ${Math.abs(light - cam) < 300 ? 'trắng ra trắng.' : cam > light ? 'ảnh ám cam: máy tưởng ánh sáng xanh hơn nên thêm màu ấm.' : 'ảnh ám xanh: máy tưởng ánh sáng ấm hơn nên thêm màu lạnh.'} Muốn sửa ám cam thì thêm xanh lam; ám lục (đèn huỳnh quang) thì thêm hồng tím.`;
    };
    const sl = (lab, v, set) => { const i = h('input', { type: 'range', min: 1800, max: 10000, step: 100, value: v }); const o = h('output', null, v + ' K'); i.oninput = () => { set(+i.value); o.textContent = i.value + ' K'; draw(); }; return h('div', { class: 'field' }, h('div', { class: 'field-label' }, lab, o), i); };
    draw();
    return h('div', { class: 'kel' }, strip, marks, h('div', { class: 'two' }, h('div', null, sl('Nguồn sáng thực tế', light, v => light = v), sl('Máy đặt cân bằng trắng', cam, v => cam = v)), h('div', null, card, out)),
      h('p', { class: 'hint' }, 'Không phải lúc nào cũng nên “sửa” màu: nắng hoàng hôn hay ánh nến đẹp chính vì màu ấm. Đặt cân bằng trắng Ánh nắng để giữ nguyên màu đó.'));
  }
  function motionTable() {
    const rows = [['Thể thao nhanh (bóng đá, chạy)', '1/500 giây trở lên', 'Đua xe còn cần nhanh hơn'], ['Động vật hoang dã (lông, cánh)', '1/2000 giây trở lên', 'Muốn nhòe nghệ thuật: 1/125 trở xuống'], ['Cỏ lay, mây trôi', '1/1000 giây để đóng băng', 'Từ 1/8 giây: nước thành dải lụa'], ['Lia máy theo xe/người', '1/30 – 1/60 giây, khẩu khoảng f/8', '1/15: chủ thể cũng nhòe gần hết'], ['Nhòe có chủ đích', '1/60 giây trở xuống', 'Cần tripod nếu muốn nền nét']];
    return h('div', null, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Chủ thể'), h('th', null, 'Tốc độ gợi ý'), h('th', null, 'Ghi chú'))), h('tbody', null, ...rows.map(r => h('tr', null, ...r.map(c => h('td', null, c)))))),
      h('p', { class: 'hint' }, 'Màn trập gồm hai rèm: rèm thứ nhất mở để bắt đầu phơi sáng, rèm thứ hai đi theo để kết thúc. Thời gian giữa hai lần đó là tốc độ màn trập.'),
      h('div', { class: 'chips' }, h('button', { class: 'chip', type: 'button', onclick: () => SIM.applyPreset({ device: 'ml_apsc', lens: 'kit', focal: 35, scene: 'street', mode: 'S', t: 1 / 1000, isoAuto: true }) }, 'Đóng băng xe máy'), h('button', { class: 'chip', type: 'button', onclick: () => SIM.applyPreset({ device: 'ml_apsc', lens: 'kit', focal: 35, scene: 'street', mode: 'S', t: 1 / 30, pan: true, isoAuto: true }) }, 'Lia máy'), h('button', { class: 'chip', type: 'button', onclick: () => SIM.applyPreset({ device: 'dslr_ff', lens: 'z2470', focal: 35, scene: 'landscape', mode: 'S', t: 1, filter: 'nd6', support: 'tripod', iso: 100 }) }, 'Nước mượt + ND')));
  }
  function sensorSizes() {
    const ks = ['FF', 'APSC', 'MFT', 'ONE', 'P13', 'P156', 'P255'];
    const sc = 8; let svg = `<svg viewBox="0 0 320 210" role="img" aria-label="Các kích thước cảm biến vẽ theo tỉ lệ">`;
    const cols = ['#f2b544', '#8fc1b5', '#9db8e6', '#c7b3d6', '#e9a7a0', '#d9d9a0', '#b5b5b5'];
    ks.forEach((k, i) => { const s = D.SENSORS[k]; svg += `<rect x="10" y="${200 - s.h * sc}" width="${s.w * sc}" height="${s.h * sc}" fill="none" stroke="${cols[i]}" stroke-width="2"/>`; });
    svg += '</svg>';
    const d = h('div', { class: 'ss-svg' }); d.innerHTML = svg;
    return h('div', { class: 'two' }, d, h('div', null, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Cảm biến'), h('th', null, 'Kích thước'), h('th', null, 'Hệ số'), h('th', null, 'Diện tích so FF'))), h('tbody', null, ...ks.map((k, i) => { const s = D.SENSORS[k]; return h('tr', null, h('td', null, h('i', { class: 'dot', style: { background: cols[i] } }), s.name), h('td', null, `${s.w}×${s.h} mm`), h('td', null, '×' + s.crop.toFixed(1)), h('td', null, Math.round(s.area / 8.64) + '%')); }))),
      h('p', { class: 'hint' }, 'Cảm biến lớn thu nhiều ánh sáng hơn ở cùng góc nhìn và khẩu: ít nhiễu, dải tương phản động rộng, dễ xóa phông. Điện thoại bù lại bằng xử lý ghép nhiều khung hình.')));
  }
  function gnTool() {
    const st = { gn: 40, d: 5, iso: 100 };
    const out = h('p', { class: 'tri-ev', 'aria-live': 'polite' });
    const draw = () => { const N = st.gn * Math.sqrt(st.iso / 100) / st.d; out.textContent = `Khẩu cần dùng ≈ ${fmtN(U.nearest(U.APERTURE_STEPS, N))}  (GN ${st.gn} × √(ISO/100) ÷ ${st.d} m)`; };
    const num = (lab, v, key, min, max) => { const i = h('input', { type: 'number', class: 'txt num', value: v, min, max }); i.oninput = () => { st[key] = clamp(+i.value || v, min, max); draw(); }; return h('div', { class: 'field' }, h('div', { class: 'field-label' }, lab), i); };
    draw();
    return h('div', null, h('div', { class: 'dof-ctl' }, num('Guide Number (m, ISO 100)', 40, 'gn', 2, 80), num('Khoảng cách tới chủ thể (m)', 5, 'd', 0.5, 40), num('ISO', 100, 'iso', 50, 6400)), out,
      h('p', { class: 'hint' }, 'Ánh sáng flash giảm theo bình phương khoảng cách: xa gấp đôi chỉ còn 1/4. Máy hiện đại đo flash qua ống kính (TTL) bằng một chớp mồi trước khi màn trập mở.'));
  }

  /* ============ THỬ THÁCH ============ */
  const CH = [
    { id: 'exp', w: 4, t: 'Phơi sáng bằng tay', b: 'Ở chế độ M, chụp thác nước sao cho phơi sáng lệch không quá ±0.5 stop và vùng cháy trắng dưới 3%.', p: { device: 'ml_apsc', lens: 'kit', focal: 18, scene: 'landscape', mode: 'M', N: 8, t: 1 / 60, iso: 100 },
      ck: s => s.scene === 'landscape' && s.mode === 'M' && Math.abs(s.delta) <= 0.5 && s.clipHi < 0.03, hint: s => s.mode !== 'M' ? 'Chuyển sang chế độ M.' : Math.abs(s.delta) > 0.5 ? `Ảnh đang ${s.delta > 0 ? 'dư' : 'thiếu'} ${Math.abs(s.delta).toFixed(1)} stop – nhìn kim đo sáng trên thanh thông tin.` : 'Trời đang cháy nhiều – giảm phơi sáng một chút hoặc dùng kính GND.' },
    { id: 'bokeh', w: 6, t: 'Chân dung tách nền', b: 'Mắt người mẫu phải nét (vòng mờ dưới 2 px), hậu cảnh mờ mạnh (trung bình từ 15 px).', p: { device: 'ml_ff', lens: 'z2470', focal: 50, scene: 'portrait', mode: 'A', N: 8 },
      ck: s => s.scene === 'portrait' && s.subjCoc < 2 && s.subjMotion < 2 && s.bgBlur >= 15, hint: s => s.subjCoc >= 2 ? 'Chủ thể chưa nét – kiểm tra điểm lấy nét.' : `Nền mới mờ ${s.bgBlur.toFixed(0)} px: mở khẩu lớn hơn, dùng tiêu cự dài hơn hoặc đứng gần hơn.` },
    { id: 'deep', w: 8, t: 'Nét từ đá tiền cảnh tới núi xa', b: 'Mọi lớp từ hòn đá sát chân tới đồi phía xa đều nét (vòng mờ ≤ 2 px) và không rung máy.', p: { device: 'dslr_ff', lens: 'z1635', focal: 16, scene: 'landscape', mode: 'A', N: 4, D: 25 },
      ck: s => s.scene === 'landscape' && s.maxCoc <= 2 && s.shake < 1.5, hint: s => s.shake >= 1.5 ? 'Ảnh bị rung – dùng tripod hoặc tăng tốc độ.' : 'Vẫn có lớp bị mờ: khép khẩu và lấy nét ở khoảng siêu tiêu (xem số liệu trong mục Độ sâu trường ảnh).' },
    { id: 'persp', w: 7, t: 'Nén phối cảnh', b: 'Chụp hai ảnh chân dung giữ cùng cỡ người mẫu (lệch < 20%): một ở ≤ 28 mm, một ở ≥ 135 mm tương đương. So sánh hậu cảnh.', p: { device: 'ml_ff', lens: 'z2470', focal: 24, scene: 'portrait', mode: 'A', N: 4, keepSize: true },
      ck: (s, all) => { const ps = all.filter(x => x.scene === 'portrait'); for (const w of ps.filter(x => x.feq <= 28.5)) for (const t of ps.filter(x => x.feq >= 134)) if (Math.abs(w.subjPx / t.subjPx - 1) < 0.2) return true; return false; },
      hint: (s, all) => { const ps = all.filter(x => x.scene === 'portrait'); if (!ps.find(x => x.feq <= 28.5)) return 'Cần một ảnh ở 24–28 mm.'; if (!ps.find(x => x.feq >= 134)) return 'Cần một ảnh ở tiêu cự ≥ 135 mm (đổi sang ống 70–200).'; return 'Cỡ người mẫu hai ảnh lệch nhau – bật “Giữ cỡ chủ thể khi zoom” hoặc chỉnh khoảng cách.'; } },
    { id: 'freeze', w: 11, t: 'Đóng băng xe máy', b: 'Xe máy chạy ~30 km/h: nhòe chuyển động dưới 1 px, phơi sáng lệch không quá ±0.7 stop.', p: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'street', mode: 'A', N: 8 },
      ck: s => s.scene === 'street' && !s.pan && s.subjMotion < 1 && Math.abs(s.delta) <= 0.7, hint: s => s.subjMotion >= 1 ? `Xe còn nhòe ${s.subjMotion.toFixed(1)} px – tăng tốc độ màn trập (chế độ S).` : 'Phơi sáng lệch quá nhiều.' },
    { id: 'pan', w: 11, t: 'Lia máy', b: 'Bật lia máy: chủ thể nhòe dưới 3 px, hậu cảnh nhòe vệt từ 25 px.', p: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'street', mode: 'S', t: 1 / 500, isoAuto: true },
      ck: s => s.scene === 'street' && s.pan && s.subjBlur < 3 && s.bgMotion >= 25, hint: s => !s.pan ? 'Bật “Lia máy theo chủ thể”.' : s.bgMotion < 25 ? 'Nền chưa đủ nhòe – giảm tốc độ xuống 1/30–1/60.' : 'Chủ thể nhòe: có thể do rung tay hoặc mờ nét.' },
    { id: 'silk', w: 11, t: 'Nước mượt như lụa', b: 'Tốc độ từ 1/2 giây, phơi sáng lệch ≤ ±1 stop, không rung máy.', p: { device: 'dslr_ff', lens: 'z2470', focal: 35, scene: 'landscape', mode: 'A', N: 8 },
      ck: s => s.scene === 'landscape' && s.t >= 0.5 && Math.abs(s.delta) <= 1 && s.shake < 1.2, hint: s => s.t < 0.5 ? (s.iso > 200 ? 'ISO tự động đang đẩy ISO lên để giữ tốc độ nhanh – tắt ISO tự động và đặt ISO thấp nhất.' : 'Tốc độ còn nhanh: khép khẩu, hạ ISO, rồi dùng kính ND.') : Math.abs(s.delta) > 1 ? 'Dư sáng – ban ngày cần kính ND để kéo dài phơi sáng.' : 'Rung máy – dùng tripod và tắt chống rung.' },
    { id: 'wb', w: 15, t: 'Trả lại màu trắng', b: 'Dưới đèn sợi đốt, đặt cân bằng trắng lệch không quá 300 K so với nguồn sáng.', p: { device: 'ml_apsc', lens: 'kit', focal: 35, scene: 'indoor', mode: 'A', N: 5.6, isoAuto: true, wb: 'day' },
      ck: s => s.scene === 'indoor' && Math.abs(s.wbK - s.sceneK) <= 300, hint: s => `Máy đang đặt ${Math.round(s.wbK)} K. Đèn sợi đốt ở khoảng 2800 K – thử preset Đèn sợi đốt rồi chỉnh K.` },
    { id: 'night', w: 18, t: 'Phố đêm cầm tay', b: 'Không tripod: rung dưới 1.5 px, phơi sáng lệch ≤ ±0.7 stop, ISO không quá 6400.', p: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'night', mode: 'M', N: 8, t: 1 / 15, iso: 400 },
      ck: s => s.scene === 'night' && s.support === 'hand' && s.shake < 1.5 && Math.abs(s.delta) <= 0.7 && s.iso <= 6400, hint: s => s.shake >= 1.5 ? 'Rung tay – tốc độ quá chậm cho tiêu cự này.' : s.iso > 6400 ? 'ISO quá cao – mở khẩu lớn hơn (ống 50mm f/1.8 rất hợp).' : 'Phơi sáng lệch nhiều.' },
    { id: 'trail', w: 18, t: 'Vệt đèn xe', b: 'Tốc độ từ 4 giây trên tripod, phơi sáng lệch ≤ ±1 stop.', p: { device: 'dslr_apsc', lens: 'kit', focal: 24, scene: 'night', mode: 'S', t: 1 / 60 },
      ck: s => s.scene === 'night' && s.t >= 4 && s.support === 'tripod' && Math.abs(s.delta) <= 1, hint: s => s.support !== 'tripod' ? 'Cần tripod.' : s.t < 4 ? 'Tốc độ còn nhanh.' : 'Dư sáng – khép khẩu, hạ ISO về thấp nhất.' },
    { id: 'macro', w: 10, t: 'Macro 1:1', b: 'Độ phóng đại từ 0.95×, bọ rùa nét (vòng mờ < 2 px), không rung.', p: { device: 'ml_ff', lens: 'kit', focal: 55, scene: 'macro', mode: 'A', N: 8 },
      ck: s => s.scene === 'macro' && s.mag >= 0.95 && s.subjCoc < 2 && s.shake < 1.5, hint: s => s.mag < 0.95 ? `Mới đạt ${s.mag.toFixed(2)}× – cần ống macro và tiến sát tới khoảng lấy nét tối thiểu.` : s.subjCoc >= 2 ? 'Bọ rùa chưa nét – vùng nét chỉ vài mm, khép khẩu hoặc lấy nét chính xác.' : 'Rung máy – độ phóng đại lớn khuếch đại rung, dùng tripod.' },
    { id: 'fill', w: 17, t: 'Ngược sáng: mặt sáng, trời không cháy', b: 'Mặt người mẫu đủ sáng (độ sáng 105–210 trên 255) trong khi phần cháy trắng dưới 4%. Máy ảnh: dùng flash bù sáng. Điện thoại: thử chế độ Ảnh có HDR.', p: { device: 'dslr_apsc', lens: 'kit', focal: 35, scene: 'portrait', mode: 'A', N: 5.6, isoAuto: true },
      ck: s => s.scene === 'portrait' && s.face >= 105 && s.face <= 210 && s.clipHi < 0.04, hint: s => s.face < 105 ? `Mặt còn tối (${Math.round(s.face)}). Bật flash bù sáng hoặc dùng HDR.` : s.face > 210 ? 'Mặt bị quá sáng.' : 'Trời cháy quá nhiều – giảm phơi sáng nền (bù sáng âm) và để flash chiếu sáng mặt.' },
    { id: 'phonefz', w: 11, t: 'Điện thoại: đóng băng bằng chế độ Pro', b: 'Dùng điện thoại ở chế độ Pro/app chỉnh tay: xe máy nhòe dưới 1 px, phơi sáng lệch ≤ ±0.7 stop.', p: { device: 's26u', scene: 'street', phoneMode: 'pro' },
      ck: s => s.phone && s.scene === 'street' && (s.phoneMode === 'pro' || s.phoneMode === 'third') && s.subjMotion < 1 && Math.abs(s.delta) <= 0.7, hint: s => !s.phone ? 'Chọn một điện thoại.' : !(s.phoneMode === 'pro' || s.phoneMode === 'third') ? 'Chuyển sang chế độ Pro.' : s.subjMotion >= 1 ? 'Tăng tốc độ màn trập (S).' : 'Chỉnh ISO để bù phơi sáng.' },
    { id: 'phonebokeh', w: 6, t: 'Điện thoại vs máy ảnh: ai xóa phông thật?', b: 'Chụp chân dung bằng điện thoại ở chế độ Ảnh/Pro (không dùng Chân dung) và bằng máy ảnh full-frame. Cả hai giữ mắt nét; so sánh độ mờ nền trong Cuộn phim.', p: { device: 'ip18p', scene: 'portrait', phoneMode: 'pro' },
      ck: (s, all) => { const ph = all.find(x => x.scene === 'portrait' && x.phone && !x.portraitMode && x.subjCoc < 2); const ca = all.find(x => x.scene === 'portrait' && !x.phone && x.crop < 1.1 && x.subjCoc < 2); return !!(ph && ca); },
      hint: (s, all) => all.find(x => x.scene === 'portrait' && x.phone && !x.portraitMode) ? 'Giờ chụp thêm một ảnh bằng máy full-frame (85mm f/1.4 là lựa chọn tốt).' : 'Chụp một ảnh bằng điện thoại, không dùng chế độ Chân dung.' }
  ];
  let activeCh = store.get('activeCh', null);
  const done = store.get('chDone', {});
  function startCh(c) { activeCh = c.id; store.set('activeCh', c.id); SIM.applyPreset(c.p); showBanner(); }
  function showBanner(msg, ok) {
    let b = $('#ch-banner'); const c = CH.find(x => x.id === activeCh);
    if (!c) { if (b) b.remove(); return; }
    if (!b) { b = h('div', { id: 'ch-banner', class: 'ch-banner', role: 'status' }); const lab = $('#p-lab'); lab.prepend(b); }
    b.className = 'ch-banner' + (ok ? ' ok' : msg ? ' try' : '');
    b.innerHTML = '';
    b.append(h('div', null, h('strong', null, `Thử thách · Tuần ${c.w}: ${c.t}`), h('p', null, msg || c.b)), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { activeCh = null; store.set('activeCh', null); b.remove(); } }, 'Đóng'));
  }
  document.addEventListener('photolab:shot', e => {
    const c = CH.find(x => x.id === activeCh); if (!c) return;
    const s = e.detail;
    if (c.ck(s, SIM.shots)) { done[c.id] = true; store.set('chDone', done); showBanner('Hoàn thành! ' + c.b, true); }
    else showBanner('Chưa đạt: ' + c.hint(s, SIM.shots));
  });
  function mountChal(root) {
    root.append(h('header', { class: 'page-h' }, h('h1', null, 'Thử thách'), h('p', null, 'Mỗi thử thách mở sẵn máy và cảnh trong Lab. Chụp ảnh – hệ thống tự kiểm tra và gợi ý chỉnh gì nếu chưa đạt.')), h('div', { id: 'ch-list', class: 'ch-list' }));
  }
  function renderChal() {
    const host = $('#ch-list'); if (!host) return; host.innerHTML = '';
    const n = CH.filter(c => done[c.id]).length;
    host.append(h('p', { class: 'ch-prog' }, `Đã hoàn thành ${n}/${CH.length}`));
    for (const c of CH) host.append(h('article', { class: 'ch' + (done[c.id] ? ' done' : '') }, h('span', { class: 'ch-w' }, 'Tuần ' + c.w), h('h3', null, c.t), h('p', null, c.b), h('button', { class: 'btn', type: 'button', onclick: () => startCh(c) }, done[c.id] ? 'Làm lại' : 'Bắt đầu')));
  }

  /* ============ LỘ TRÌNH ============ */
  const wkDone = store.get('wkDone', {});
  function mountRoad(root) {
    root.append(h('header', { class: 'page-h' }, h('h1', null, 'Lộ trình 20 tuần'), h('p', null, 'Bám theo cấu trúc giáo trình “Digital Photography Complete Course”: mỗi tuần một chủ đề, kèm bài thực hành trong Lab và thử thách tương ứng.')), h('ol', { id: 'road', class: 'road' }));
  }
  function renderRoad() {
    const host = $('#road'); if (!host) return; host.innerHTML = '';
    for (const w of D.WEEKS) {
      const chs = CH.filter(c => c.w === w.n);
      const chk = h('input', { type: 'checkbox', checked: wkDone[w.n] ? true : null, 'aria-label': 'Đánh dấu đã học tuần ' + w.n });
      chk.onchange = () => { wkDone[w.n] = chk.checked; store.set('wkDone', wkDone); li.classList.toggle('done', chk.checked); };
      const li = h('li', { id: 'wk-' + w.n, class: 'wk' + (wkDone[w.n] ? ' done' : '') },
        h('div', { class: 'wk-n' }, String(w.n)),
        h('div', { class: 'wk-b' }, h('h3', null, w.t), h('p', { class: 'wk-k' }, w.k.join(' – ')),
          h('div', { class: 'chips' }, ...w.go.map(g => h('button', { class: 'chip', type: 'button', onclick: () => SIM.applyPreset(g.preset) }, g.label)), ...chs.map(c => h('button', { class: 'chip ch-chip' + (done[c.id] ? ' ok' : ''), type: 'button', onclick: () => { go('chal'); startCh(c); } }, 'Thử thách: ' + c.t)))),
        h('label', { class: 'wk-c' }, chk, h('span', null, 'Đã học')));
      host.append(li);
    }
  }

  /* ============ ÔN TẬP ============ */
  function mountQuiz(root) {
    let filter = 0; const best = store.get('quizBest', 0);
    const list = h('div', { class: 'qz' }); const score = h('p', { class: 'ch-prog', 'aria-live': 'polite' });
    const weeks = [...new Set(D.QUIZ.map(q => q.w))].sort((a, b) => a - b);
    const sel = h('select', { class: 'sel', 'aria-label': 'Lọc theo tuần' }, h('option', { value: 0 }, 'Tất cả các tuần'), ...weeks.map(w => h('option', { value: w }, 'Tuần ' + w + ' – ' + D.WEEKS[w - 1].t)));
    const draw = () => {
      list.innerHTML = ''; let right = 0, answered = 0;
      const qs = D.QUIZ.filter(q => !filter || q.w === filter).sort((a, b) => a.w - b.w);
      qs.forEach((q, qi) => {
        const fb = h('p', { class: 'qz-fb', 'aria-live': 'polite' });
        const opts = h('div', { class: 'qz-o' });
        q.a.forEach((a, ai) => opts.append(h('button', { class: 'chip', type: 'button', onclick: e => {
          if (opts.dataset.done) return; opts.dataset.done = 1; answered++;
          const ok = ai === q.c; if (ok) right++;
          e.target.classList.add(ok ? 'ok' : 'no'); if (!ok) opts.children[q.c].classList.add('ok');
          fb.textContent = (ok ? 'Đúng. ' : 'Chưa đúng. ') + q.e;
          score.textContent = `Đúng ${right}/${answered} câu đã trả lời · tổng ${qs.length} câu`;
          if (answered === qs.length && !filter) { const pct = Math.round(right / qs.length * 100); if (pct > store.get('quizBest', 0)) store.set('quizBest', pct); score.textContent += ` · Kết quả ${pct}%`; }
        } }, a)));
        list.append(h('div', { class: 'qz-i' }, h('p', { class: 'qz-q' }, h('span', { class: 'qz-w' }, 'Tuần ' + q.w), q.q), opts, fb));
      });
      score.textContent = `Tổng ${qs.length} câu${best ? ` · Kết quả tốt nhất trước đây: ${best}%` : ''}`;
    };
    sel.onchange = () => { filter = +sel.value; draw(); };
    root.append(h('header', { class: 'page-h' }, h('h1', null, 'Ôn tập'), h('p', null, 'Câu hỏi trắc nghiệm theo từng tuần, có giải thích ngay sau khi chọn.')), h('div', { class: 'qz-bar' }, sel, score), list);
    draw();
  }

  function init() {
    const nav = $('#nav');
    for (const [id, t] of PAGES) nav.append(h('button', { class: 'nav-b', type: 'button', 'data-p': id, onclick: () => go(id) }, t));
    const m = h('div', { class: 'brand-mark', 'aria-hidden': 'true' }, ...SC.CHECKER.map(c => h('i', { style: { background: c } })));
    $('#brand').prepend(m);
    $('#cmp-close').onclick = () => { const d = $('#cmp'); d.close ? d.close() : d.removeAttribute('open'); };
    const start = (location.hash || '#lab').slice(1);
    go(PAGES.find(p => p[0] === start) ? start : 'lab');
    if (activeCh) showBanner();
  }
  return { init, go, CH, parseLens };
})();
window.addEventListener('DOMContentLoaded', APP.init);
