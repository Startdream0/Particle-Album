import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbFile = path.join(dataDir, 'photos.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]', 'utf-8');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

function readPhotos() {
  const raw = fs.readFileSync(dbFile, 'utf-8');
  return JSON.parse(raw);
}

function writePhotos(photos) {
  fs.writeFileSync(dbFile, JSON.stringify(photos, null, 2), 'utf-8');
}

app.get('/api/photos', (_req, res) => {
  const photos = readPhotos().sort((a, b) => new Date(a.time) - new Date(b.time));
  res.json(photos);
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  const { title, lat, lon, time, notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'photo file is required' });
  }

  if (!lat || !lon || !time) {
    return res.status(400).json({ error: 'lat, lon, time are required' });
  }

  const photos = readPhotos();
  const item = {
    id: crypto.randomUUID(),
    title: title || 'Untitled',
    lat: Number(lat),
    lon: Number(lon),
    time,
    notes: notes || '',
    file: `/uploads/${req.file.filename}`
  };

  photos.push(item);
  writePhotos(photos);

  res.status(201).json(item);
});

app.delete('/api/photos/:id', (req, res) => {
  const photos = readPhotos();
  const index = photos.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'not found' });
  }

  const [removed] = photos.splice(index, 1);
  writePhotos(photos);

  const absolute = path.join(uploadsDir, path.basename(removed.file));
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }

  res.json({ ok: true });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Particle Album running on http://localhost:${port}`);
});
