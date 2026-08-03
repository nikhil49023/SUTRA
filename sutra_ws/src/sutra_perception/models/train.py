import os, torch, ultralytics, zipfile, cv2, urllib.request
from pathlib import Path
from ultralytics import YOLO
import torch.serialization

try:
    torch.serialization.add_safe_globals([ultralytics.nn.tasks.DetectionModel])
except Exception:
    pass

_orig = torch.load
def _p(*args, **kwargs):
    kwargs['weights_only'] = False
    return _orig(*args, **kwargs)
torch.load = _p

print(f'CUDA Available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU Name: {torch.cuda.get_device_name(0)}')

base = Path('/kaggle/working/vd')
base.mkdir(exist_ok=True)

url = 'https://github.com/ultralytics/assets/releases/download/v0.0.0/VisDrone2019-DET-val.zip'
zip_p = base / 'val.zip'
print('Downloading VisDrone dataset...')
urllib.request.urlretrieve(url, zip_p)
print('Extracting...')
with zipfile.ZipFile(zip_p, 'r') as z:
    z.extractall(base)
print('Downloaded!')

vd_dir = base / 'VisDrone2019-DET-val'
img_dir = vd_dir / 'images'
ann_dir = vd_dir / 'annotations'
lbl_dir = vd_dir / 'labels'
lbl_dir.mkdir(exist_ok=True)

cat_map = {1:0, 2:0, 3:1, 4:2, 5:3, 6:4, 7:5, 8:5, 9:6, 10:7}
converted = 0

for txt in ann_dir.glob('*.txt'):
    img_f = img_dir / (txt.stem + '.jpg')
    if not img_f.exists(): continue
    img = cv2.imread(str(img_f))
    if img is None: continue
    H, W = img.shape[:2]
    lines = []
    for line in txt.read_text().splitlines():
        p = line.strip().split(',')
        if len(p) < 6: continue
        x, y, w, h, score, cat = int(p[0]), int(p[1]), int(p[2]), int(p[3]), int(p[4]), int(p[5])
        if w <= 0 or h <= 0 or cat not in cat_map: continue
        cls_id = cat_map[cat]
        cx, cy, nw, nh = (x + w/2)/W, (y + h/2)/H, w/W, h/H
        lines.append(f'{cls_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}')
    (lbl_dir / txt.name).write_text('
'.join(lines))
    converted += 1

print(f'Converted {converted} annotation files')

imgs = sorted(list(img_dir.glob('*.jpg')))
split = int(len(imgs)*0.8)
train_imgs, val_imgs = imgs[:split], imgs[split:]
(base / 'train.txt').write_text('
'.join(str(p) for p in train_imgs))
(base / 'val.txt').write_text('
'.join(str(p) for p in val_imgs))

yaml_lines = [
    'path: ' + str(base),
    'train: train.txt',
    'val: val.txt',
    'nc: 8',
    'names: [person, bicycle, car, van, truck, tricycle, bus, motor]'
]
(base / 'dataset.yaml').write_text('
'.join(yaml_lines))
print('Dataset YAML ready!')

model = YOLO('yolov8n.pt')
print('Starting 15-epoch fast fine-tuning...')
res = model.train(
    data      = str(base / 'dataset.yaml'),
    epochs    = 15,
    imgsz     = 640,
    batch     = 16,
    device    = 0 if torch.cuda.is_available() else 'cpu',
    project   = 'sutra_train',
    name      = 'yolov8n_visdrone',
    exist_ok  = True,
    pretrained= True,
    save      = True,
    val       = True,
    verbose   = True,
)
print('Training finished!')

best_m = YOLO('sutra_train/yolov8n_visdrone/weights/best.pt')
metrics = best_m.val(data=str(base / 'dataset.yaml'))
print(f'mAP@0.5: {metrics.box.map50*100:.2f}%')
best_m.export(format='onnx', imgsz=640)
print('ONNX export complete!')
