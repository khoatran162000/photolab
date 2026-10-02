#!/usr/bin/env python3
"""
Tạo "gói cảnh" ảnh thật cho Lab PhotoLab.

Mỗi mục trong scenes/catalog.json được biến thành thư mục scenes/<id>/ gồm:
  photo.jpg   ảnh gốc thu nhỏ (cạnh dài tối đa 1600 px)
  depth.png   bản đồ độ sâu (sáng = gần) do mô hình MiDaS ước lượng
  mask.png    vùng chủ thể (trắng) – dùng cho nhòe chuyển động, lia máy, xóa phông kiểu điện thoại
  bg.jpg      nền đã xóa chủ thể (chỉ có ở cảnh chuyển động)
  scene.json  thông số: độ sáng EV, nhiệt độ màu, tiêu cự, khoảng cách, nguồn ảnh, giấy phép
và cập nhật scenes/index.json.

Cách dùng (chạy ở thư mục gốc của repo):
  pip install -r tools/requirements.txt
  python3 tools/tao_goi_canh.py               # tạo các gói còn thiếu
  python3 tools/tao_goi_canh.py --force       # tạo lại tất cả
  python3 tools/tao_goi_canh.py --only pho-ha-noi,bmx
  python3 tools/tao_goi_canh.py --dung-anh-san --force   # tạo lại từ ảnh đã tải (sau khi sửa catalog)

Muốn tự vẽ vùng chủ thể: đặt file scenes/<id>/mask-tay.png (trắng = chủ thể, cùng tỉ lệ ảnh)
rồi chạy lại với --only <id> --force; file vẽ tay được ưu tiên hơn mặt nạ tự động.
"""
import argparse, io, json, math, os, re, sys, urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, ExifTags
import cv2
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
SCENES = ROOT / 'scenes'
MODEL_URL = 'https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx'
MODEL = Path(__file__).resolve().parent / 'models' / 'midas_small.onnx'
UA = {'User-Agent': 'Mozilla/5.0 (PhotoLab scene builder; educational use)'}
MAX_SIDE = 1600


def log(*a):
    print(*a, flush=True)


# ---------------- tải ảnh ----------------
def http_get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def parse_wordpress(page):
    html = http_get(page).decode('utf-8', 'replace')
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html) or re.search(r'og:image" content="([^"]+)"', html)
    if not m:
        raise RuntimeError('Không tìm thấy og:image trên trang ' + page)
    img = m.group(1)
    exif = {}
    for key, pat in [('N', r'Aperture\s*(?:</[^>]+>\s*)*ƒ/([\d.]+)'), ('f', r'Focal length\s*(?:</[^>]+>\s*)*([\d.]+)\s*mm'),
                     ('iso', r'ISO\s*(?:</[^>]+>\s*)*(\d+)'), ('t', r'Shutter speed\s*(?:</[^>]+>\s*)*([\d./]+)')]:
        mm = re.search(pat, html)
        if mm:
            v = mm.group(1)
            exif[key] = (1 / float(v.split('/')[1]) * float(v.split('/')[0])) if '/' in v else float(v)
    au = re.search(r'/photos/author/[^"]+"[^>]*>([^<]+)<', html)
    return img, exif, (au.group(1).strip() if au else '')


def load_source(src):
    """Trả về (PIL.Image, exif_từ_trang, tác_giả, link_trang)."""
    t = src['type']
    if t == 'wordpress':
        url, exif, author = parse_wordpress(src['page'])
        return Image.open(io.BytesIO(http_get(url))), exif, author, src['page']
    if t == 'pexels':
        pid = src['id']
        url = f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=2000'
        return Image.open(io.BytesIO(http_get(url))), {}, src.get('author', ''), f'https://www.pexels.com/photo/{pid}/'
    if t == 'unsplash':
        uid = src['id']
        url = f'https://unsplash.com/photos/{uid}/download?force=true&w=2000'
        return Image.open(io.BytesIO(http_get(url))), {}, src.get('author', ''), f'https://unsplash.com/photos/{uid}'
    if t == 'url':
        return Image.open(io.BytesIO(http_get(src['url']))), {}, src.get('author', ''), src.get('page', src['url'])
    if t == 'file':
        p = Path(src['path'])
        p = p if p.is_absolute() else ROOT / p
        return Image.open(p), {}, src.get('author', ''), src.get('page', '')
    if t == 'skimage':  # ảnh mẫu thuộc phạm vi công cộng đi kèm thư viện scikit-image
        import skimage.data as skd
        return Image.fromarray(getattr(skd, src['name'])()), {}, src.get('author', ''), src.get('page', '')
    raise ValueError('Nguồn ảnh không hỗ trợ: ' + t)


def read_exif(img):
    out = {}
    try:
        raw = img.getexif()
        ifd = raw.get_ifd(0x8769) if hasattr(raw, 'get_ifd') else {}
        tags = {**{ExifTags.TAGS.get(k, k): v for k, v in raw.items()}, **{ExifTags.TAGS.get(k, k): v for k, v in ifd.items()}}
        f = lambda v: float(v[0]) / float(v[1]) if isinstance(v, tuple) else float(v)
        if 'FNumber' in tags: out['N'] = f(tags['FNumber'])
        if 'ExposureTime' in tags: out['t'] = f(tags['ExposureTime'])
        iso = tags.get('ISOSpeedRatings') or tags.get('PhotographicSensitivity')
        if iso: out['iso'] = float(iso[0] if isinstance(iso, (tuple, list)) else iso)
        if 'FocalLength' in tags: out['f'] = f(tags['FocalLength'])
        if tags.get('FocalLengthIn35mmFilm'): out['feq'] = float(tags['FocalLengthIn35mmFilm'])
    except Exception:
        pass
    return out


# ---------------- độ sâu ----------------
_sess = None


def depth_model():
    global _sess
    if _sess is None:
        if not MODEL.exists():
            MODEL.parent.mkdir(parents=True, exist_ok=True)
            log('  tải mô hình độ sâu MiDaS (khoảng 66 MB, chỉ một lần)…')
            MODEL.write_bytes(http_get(MODEL_URL))
        _sess = ort.InferenceSession(str(MODEL), providers=['CPUExecutionProvider'])
    return _sess


def estimate_depth(rgb):
    """Ước lượng độ chênh (nghịch đảo khoảng cách, tương đối) – lớn = gần."""
    h, w = rgb.shape[:2]
    sess = depth_model()
    x = cv2.resize(rgb, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None]
    pred = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]
    # thêm một lượt lật ngang để giảm nhiễu
    pred2 = sess.run(None, {sess.get_inputs()[0].name: x[:, :, :, ::-1].copy()})[0][0][:, ::-1]
    d = (pred + pred2) / 2
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(1e-6, hi - lo), 0, 1).astype(np.float32)
    # làm mượt nhưng giữ biên theo ảnh màu (lọc song phương kết hợp đơn giản)
    d8 = (d * 255).astype(np.uint8)
    d8 = cv2.bilateralFilter(d8, 9, 30, 9)
    return d8.astype(np.float32) / 255.0


# ---------------- chủ thể ----------------
def mask_from_box(d, rgb, box, hint):
    """Tách chủ thể bằng GrabCut khởi tạo từ khung chữ nhật (tọa độ 0..1), loại bớt vùng quá xa theo độ sâu."""
    h, w = d.shape
    sc = min(1.0, 900 / max(w, h))
    sm = cv2.resize(rgb, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    H, W = sm.shape[:2]
    x0, y0, x1, y1 = int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W - 1, max(x0 + 4, x1)), min(H - 1, max(y0 + 4, y1))
    gc = np.zeros((H, W), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(sm, cv2.COLOR_RGB2BGR), gc, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    ref = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    hx, hy = (int(hint[0] * W), int(hint[1] * H)) if isinstance(hint, (list, tuple)) else ((x0 + x1) // 2, (y0 + y1) // 2)
    ds = cv2.resize(d, (W, H))
    dref = float(np.median(ds[ref > 0])) if ref.any() else float(ds[hy, hx])
    ref[ds < dref - 0.3] = 0  # bỏ phần hậu cảnh xa lọt vào khung
    n, lab, stats, _ = cv2.connectedComponentsWithStats(ref, 8)
    if n > 1:
        k = lab[min(H - 1, hy), min(W - 1, hx)]
        if k == 0:
            k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        ref = ((lab == k) * 255).astype(np.uint8)
    mask = cv2.resize(ref, (w, h), interpolation=cv2.INTER_LINEAR)
    mask = (mask > 127).astype(np.uint8) * 255
    if mask.mean() / 255 < 0.0005:
        mask[int(box[1] * h):int(box[3] * h), int(box[0] * w):int(box[2] * w)] = 255
    ys, xs = np.where(mask > 0)
    pt = (hint[0], hint[1]) if isinstance(hint, (list, tuple)) else (xs.mean() / w, ys.mean() / h)
    return mask, pt


def subject_mask(d, rgb, hint, tol):
    h, w = d.shape
    if isinstance(hint, (list, tuple)):
        sx, sy = int(hint[0] * w), int(hint[1] * h)
    else:
        # chủ thể = vùng gần nhất trong khung giữa
        x0, x1, y0, y1 = int(w * .12), int(w * .88), int(h * .1), int(h * .97)
        sub = d[y0:y1, x0:x1]
        thr = np.percentile(sub, 92)
        bw = (sub >= thr).astype(np.uint8)
        n, lab, stats, cent = cv2.connectedComponentsWithStats(bw, 8)
        if n > 1:
            k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            ys, xs = np.where(lab == k)
            sx, sy = x0 + int(xs.mean()), y0 + int(ys.mean())
        else:
            sx, sy = w // 2, h // 2
    sx, sy = min(w - 1, max(0, sx)), min(h - 1, max(0, sy))
    ds = float(np.median(d[max(0, sy - 3):sy + 4, max(0, sx - 3):sx + 4]))
    # 1) ngưỡng độ sâu: mọi điểm gần bằng hoặc gần hơn chủ thể, nối liền với điểm chủ thể
    bw = (d >= ds - tol).astype(np.uint8)
    n, lab = cv2.connectedComponents(bw, connectivity=8)
    mask = ((lab == lab[sy, sx]) * 255).astype(np.uint8) if n > 1 and lab[sy, sx] > 0 else np.zeros((h, w), np.uint8)
    area = mask.mean() / 255
    if area < 0.004 or area > 0.7:
        mask = np.zeros((h, w), np.uint8)
        cv2.ellipse(mask, (sx, sy), (int(w * .12), int(h * .28)), 0, 0, 360, 255, -1)
    # 2) tinh chỉnh biên theo màu bằng GrabCut (ở độ phân giải ≤ 800 px)
    try:
        sc = min(1.0, 800 / max(w, h))
        sm = cv2.resize(rgb, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        mm = cv2.resize(mask, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_NEAREST)
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        gc = np.full(mm.shape, cv2.GC_BGD, np.uint8)
        gc[cv2.dilate(mm, k) > 0] = cv2.GC_PR_BGD
        gc[mm > 0] = cv2.GC_PR_FGD
        gc[cv2.erode(mm, k) > 0] = cv2.GC_FGD
        cx, cy = int(sx * sc), int(sy * sc)
        cv2.circle(gc, (cx, cy), max(2, int(3 * sc)), cv2.GC_FGD, -1)
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(cv2.cvtColor(sm, cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
        ref = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        n, lab = cv2.connectedComponents(ref, connectivity=8)
        if n > 1 and lab[cy, cx] > 0:
            ref = ((lab == lab[cy, cx]) * 255).astype(np.uint8)
        a2 = ref.mean() / 255
        if 0.003 < a2 < 0.75:
            mask = cv2.resize(ref, (w, h), interpolation=cv2.INTER_LINEAR)
            mask = (mask > 127).astype(np.uint8) * 255
    except Exception as ex:
        log('  (bỏ qua GrabCut: %s)' % ex)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
    return mask, (sx / w, sy / h)


def feather(mask, r=3):
    return cv2.GaussianBlur(mask, (0, 0), r)


# ---------------- xử lý một cảnh ----------------
def make_thumb(out, img=None):
    """Ảnh nhỏ cho nút chọn cảnh (khoảng 12 KB)."""
    img = img or Image.open(out / 'photo.jpg')
    t = img.convert('RGB').copy()
    t.thumbnail((320, 220), Image.LANCZOS)
    t.save(out / 'thumb.jpg', quality=78, optimize=True, progressive=True)


def build(entry, force=False, reuse=False):
    sid = entry['id']
    out = SCENES / sid
    if (out / 'scene.json').exists() and not force:
        log(f'• {sid}: đã có, bỏ qua (dùng --force để tạo lại)')
        return json.loads((out / 'scene.json').read_text('utf-8'))
    log(f'• {sid}: {entry.get("title", "")}')
    old = json.loads((out / 'scene.json').read_text('utf-8')) if (out / 'scene.json').exists() else None
    reused = reuse and (out / 'photo.jpg').exists()
    if reused:  # dùng lại ảnh đã tải, không tải lại từ mạng
        img = Image.open(out / 'photo.jpg')
        page_exif = (old or {}).get('src', {})
        author = ((old or {}).get('credit') or {}).get('author', '')
        page = ((old or {}).get('credit') or {}).get('page', '')
        log('  dùng lại ảnh đã tải')
    else:
        img, page_exif, author, page = load_source(entry['source'])
    exif = {**entry.get('exif', {}), **page_exif, **read_exif(img)}
    img = ImageOps.exif_transpose(img).convert('RGB')
    if max(img.size) > MAX_SIDE:
        s = MAX_SIDE / max(img.size)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    out.mkdir(parents=True, exist_ok=True)
    if not reused:
        img.save(out / 'photo.jpg', quality=88, optimize=True, progressive=True)
    make_thumb(out, img)
    rgb = np.asarray(img)
    h, w = rgb.shape[:2]

    log('  ước lượng độ sâu…')
    d = estimate_depth(rgb)
    Image.fromarray((d * 255).astype(np.uint8)).save(out / 'depth.png', optimize=True)

    subj = entry.get('subject', {})
    hand = out / 'mask-tay.png'
    if hand.exists():
        mask = np.asarray(Image.open(hand).convert('L').resize((w, h)))
        mask = (mask > 127).astype(np.uint8) * 255
        ys, xs = np.where(mask > 0)
        pt = (xs.mean() / w, ys.mean() / h) if len(xs) else (0.5, 0.5)
        log('  dùng mặt nạ vẽ tay')
    elif subj.get('box'):
        mask, pt = mask_from_box(d, rgb, subj['box'], subj.get('hint', 'center'))
    else:
        mask, pt = subject_mask(d, rgb, subj.get('hint', 'nearest'), subj.get('tol', 0.09))
    Image.fromarray(feather(mask)).save(out / 'mask.png', optimize=True)
    ys, xs = np.where(mask > 127)
    box = [float(xs.min() / w), float(ys.min() / h), float(xs.max() / w), float(ys.max() / h)] if len(xs) else [0.4, 0.3, 0.6, 0.8]
    people = any(k in entry.get('kinds', []) for k in ('chan-dung', 'nhom-nguoi', 'nguoi'))
    animal = 'dong-vat' in entry.get('kinds', [])
    eye = [(box[0] + box[2]) / 2, box[1] + (box[3] - box[1]) * (0.18 if people else 0.4 if animal else 0.5)]
    face = None
    if people:  # tìm khuôn mặt để đặt điểm lấy nét mắt và đo độ sáng da mặt
        try:
            cas = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            fs = cas.detectMultiScale(gray, 1.1, 5, minSize=(max(20, w // 40), max(20, w // 40)))
            # chỉ nhận khuôn mặt nằm trong vùng chủ thể (tránh nhận nhầm hoa văn, bóng tối)
            bx0, by0, bx1, by1 = box[0] * w, box[1] * h, box[2] * w, box[3] * h
            mx, my = (bx1 - bx0) * 0.1, (by1 - by0) * 0.1
            fs = [f for f in fs if bx0 - mx <= f[0] + f[2] / 2 <= bx1 + mx and by0 - my <= f[1] + f[3] / 2 <= by1 + my
                  and mask[min(h - 1, int(f[1] + f[3] / 2)), min(w - 1, int(f[0] + f[2] / 2))] > 0]
            if len(fs):
                fx, fy, fw, fh = max(fs, key=lambda r: r[2] * r[3])
                face = [round(fx / w, 4), round(fy / h, 4), round((fx + fw) / w, 4), round((fy + fh) / h, 4)]
                eye = [(fx + fw / 2) / w, (fy + fh * 0.42) / h]
                log(f'  thấy {len(fs)} khuôn mặt')
        except Exception as ex:
            log('  (bỏ qua nhận diện mặt: %s)' % ex)

    # hiệu chuẩn độ sâu thật: d = alpha / Z + beta (hai mốc: chủ thể và hậu cảnh xa)
    ds = float(np.median(d[mask > 127])) if len(xs) else float(d[int(pt[1] * h), int(pt[0] * w)])
    dbg = float(np.percentile(d, 3))
    Zs = float(subj.get('dist', 3.0))
    Zb = float(entry.get('bgDist') or 1000.0)
    if ds - dbg < 0.05:
        dbg = ds - 0.05
    alpha = (ds - dbg) / (1 / Zs - 1 / Zb)
    beta = ds - alpha / Zs

    motion = entry.get('motion')
    if motion:
        log('  dựng nền phía sau chủ thể…')
        big = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        sc = 0.5 if max(w, h) > 1000 else 1.0
        small = cv2.resize(rgb, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        msm = cv2.resize(big, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
        fill = cv2.inpaint(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), msm, 9, cv2.INPAINT_TELEA)
        fill = cv2.cvtColor(cv2.resize(fill, (w, h), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB)
        a = (feather(big, 2).astype(np.float32) / 255)[..., None]
        bg = (rgb * (1 - a) + fill * a).astype(np.uint8)
        Image.fromarray(bg).save(out / 'bg.jpg', quality=85, optimize=True)

    N, t, iso = exif.get('N'), exif.get('t'), exif.get('iso')
    ev = entry.get('ev')
    if ev is None and N and t and iso:
        ev = math.log2(N * N / t) - math.log2(iso / 100)
    if ev is None:
        ev = 12.0
    feq = exif.get('feq') or entry.get('feq') or (exif['f'] * 7.0 if exif.get('f', 99) < 9 else exif.get('f', 35))
    scene = {
        'id': sid, 'title': entry.get('title', sid), 'desc': entry.get('desc', ''),
        'place': entry.get('place', 'ngoai'), 'light': entry.get('light', 'du'), 'kinds': entry.get('kinds', []),
        'ev': round(float(ev), 2), 'K': entry.get('K', 5500), 'feq': round(float(feq), 1),
        'src': {k: exif[k] for k in ('N', 't', 'iso', 'f', 'feq') if k in exif},
        'size': [w, h],
        'subject': {'name': subj.get('name', 'Chủ thể'), 'x': round(pt[0], 4), 'y': round(pt[1], 4), 'Z': Zs,
                    'box': [round(v, 4) for v in box], 'eye': [round(v, 4) for v in eye], 'face': face},
        'depth': {'alpha': round(alpha, 6), 'beta': round(beta, 6), 'bgDist': Zb},
        'motion': motion, 'headroom': entry.get('headroom', 1.5),
        'meterTrim': entry.get('meterTrim', 0),
        'credit': {'author': author or entry['source'].get('author', ''), 'license': entry.get('license', ''), 'page': page},
        'files': {'photo': 'photo.jpg', 'depth': 'depth.png', 'mask': 'mask.png', **({'bg': 'bg.jpg'} if motion else {})}
    }
    (out / 'scene.json').write_text(json.dumps(scene, ensure_ascii=False, indent=1), 'utf-8')
    log(f'  xong: EV {scene["ev"]}, {scene["feq"]} mm tđ, chủ thể {Zs} m')
    return scene


def main():
    ap = argparse.ArgumentParser(description='Tạo gói cảnh ảnh thật cho PhotoLab')
    ap.add_argument('--force', action='store_true', help='tạo lại cả gói đã có')
    ap.add_argument('--only', default='', help='chỉ tạo các id (phân cách bằng dấu phẩy)')
    ap.add_argument('--catalog', default=str(SCENES / 'catalog.json'))
    ap.add_argument('--dung-anh-san', dest='reuse', action='store_true', help='dùng lại photo.jpg đã có (không tải lại) – dùng khi chỉ sửa thông số trong catalog')
    a = ap.parse_args()
    cat = json.loads(Path(a.catalog).read_text('utf-8'))
    only = set(x for x in a.only.split(',') if x)
    done, fail = [], []
    for e in cat['scenes']:
        if only and e['id'] not in only:
            continue
        if e.get('skip'):
            continue
        try:
            build(e, a.force, a.reuse)
            done.append(e['id'])
        except Exception as ex:
            fail.append((e['id'], str(ex)))
            log(f'  LỖI {e["id"]}: {ex}')
    # cập nhật chỉ mục từ mọi gói đang có
    idx = []
    for e in cat['scenes']:
        p = SCENES / e['id'] / 'scene.json'
        if p.exists():
            s = json.loads(p.read_text('utf-8'))
            if not (SCENES / e['id'] / 'thumb.jpg').exists() and (SCENES / e['id'] / 'photo.jpg').exists():
                make_thumb(SCENES / e['id'])
            idx.append({**{k: s[k] for k in ('id', 'title', 'place', 'light', 'kinds')}, 'thumb': 'thumb.jpg'})
    (SCENES / 'index.json').write_text(json.dumps({'scenes': idx}, ensure_ascii=False, indent=1), 'utf-8')
    log(f'\nĐã có {len(idx)} gói cảnh trong scenes/index.json.')
    if fail:
        log('Không tạo được: ' + ', '.join(f'{i} ({m[:80]})' for i, m in fail))


if __name__ == '__main__':
    main()
