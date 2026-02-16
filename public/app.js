const stage = document.getElementById('stage');
const uploadForm = document.getElementById('uploadForm');
const photoCard = document.getElementById('photoCard');
const webcamEl = document.getElementById('webcam');
const startCameraBtn = document.getElementById('startCamera');
const statusText = document.getElementById('statusText');

let photos = [];
let currentIndex = 0;
let markerMeshes = [];
let orbitTrails = [];
let swipeBaseX = null;
let lastPinchAt = 0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020615, 0.2);

const camera = new THREE.PerspectiveCamera(52, stage.clientWidth / stage.clientHeight, 0.1, 2000);
camera.position.set(0, 0.4, 4.3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(stage.clientWidth, stage.clientHeight);
stage.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
controls.minDistance = 2.2;
controls.maxDistance = 6;

scene.add(new THREE.AmbientLight(0x80b5ff, 1.2));
const keyLight = new THREE.PointLight(0x5ad9ff, 2.5, 30);
keyLight.position.set(4, 3, 4);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x9a6cff, 1.8, 30);
rimLight.position.set(-3, -2, -3);
scene.add(rimLight);

const world = new THREE.Group();
scene.add(world);

const globe = createParticleGlobe();
const outerShell = createOuterWire();
const timelineBand = createTimelineBand();
const stars = createStarfield();

world.add(globe, outerShell, timelineBand);
scene.add(stars);

function createParticleGlobe() {
  const base = new THREE.SphereGeometry(1.22, 110, 110);
  const positions = [];

  for (let i = 0; i < base.attributes.position.count; i += 2) {
    positions.push(base.attributes.position.getX(i), base.attributes.position.getY(i), base.attributes.position.getZ(i));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0x96e8ff, size: 0.019, transparent: true, opacity: 0.95 });
  return new THREE.Points(geo, mat);
}

function createOuterWire() {
  const geo = new THREE.SphereGeometry(1.28, 36, 36);
  const mat = new THREE.MeshBasicMaterial({ color: 0x78dbff, wireframe: true, transparent: true, opacity: 0.2 });
  return new THREE.Mesh(geo, mat);
}

function createTimelineBand() {
  const geo = new THREE.TorusGeometry(1.78, 0.04, 20, 180);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8f7aff, transparent: true, opacity: 0.35 });
  const torus = new THREE.Mesh(geo, mat);
  torus.rotation.x = Math.PI / 2.2;
  return torus;
}

function createStarfield() {
  const starGeo = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 2000; i++) {
    vertices.push((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x8cceff, size: 0.07, transparent: true, opacity: 0.8 });
  return new THREE.Points(starGeo, starMat);
}

function latLonToVector3(lat, lon, radius = 1.25) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function clearPhotoObjects() {
  markerMeshes.forEach((mesh) => world.remove(mesh));
  orbitTrails.forEach((line) => world.remove(line));
  markerMeshes = [];
  orbitTrails = [];
}

function rebuildPhotoObjects() {
  clearPhotoObjects();

  photos.forEach((p, idx) => {
    const isActive = idx === currentIndex;
    const markerGeo = new THREE.SphereGeometry(isActive ? 0.05 : 0.028, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: isActive ? 0xff7cc8 : 0xffec6a,
      transparent: true,
      opacity: isActive ? 1 : 0.85
    });

    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(latLonToVector3(p.lat, p.lon));
    markerMeshes.push(marker);
    world.add(marker);

    const points = [];
    const target = marker.position.clone();
    const ringPoint = marker.position.clone().normalize().multiplyScalar(1.78);
    for (let t = 0; t <= 1; t += 0.04) {
      points.push(new THREE.Vector3().lerpVectors(target, ringPoint, t));
    }
    const trailGeo = new THREE.BufferGeometry().setFromPoints(points);
    const trailMat = new THREE.LineBasicMaterial({
      color: isActive ? 0xff8de6 : 0x75dfff,
      transparent: true,
      opacity: isActive ? 0.9 : 0.18
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    orbitTrails.push(trail);
    world.add(trail);
  });
}

function renderPhotoCard() {
  const active = photos[currentIndex];
  if (!active) {
    statusText.textContent = '等待上传第一张旅行照片…';
    photoCard.classList.add('hidden');
    clearPhotoObjects();
    return;
  }

  statusText.textContent = `时间轴 ${currentIndex + 1}/${photos.length} · ${new Date(active.time).toLocaleDateString()}`;
  photoCard.classList.remove('hidden');
  photoCard.innerHTML = `
    <img src="${active.file}" alt="${active.title}">
    <div class="meta">
      <h3>${active.title}</h3>
      <p>🕒 ${new Date(active.time).toLocaleString()}</p>
      <p>📍 ${active.lat.toFixed(4)}, ${active.lon.toFixed(4)}</p>
      <p>${active.notes || '无备注'}</p>
    </div>
  `;

  rebuildPhotoObjects();
}

function nextPhoto(step = 1) {
  if (!photos.length) return;
  currentIndex = (currentIndex + step + photos.length) % photos.length;
  renderPhotoCard();
}

async function fetchPhotos() {
  const res = await fetch('/api/photos');
  photos = await res.json();
  currentIndex = Math.min(currentIndex, Math.max(photos.length - 1, 0));
  renderPhotoCard();
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);

  const res = await fetch('/api/photos', { method: 'POST', body: formData });
  if (!res.ok) {
    alert('上传失败，请检查参数。');
    return;
  }

  uploadForm.reset();
  await fetchPhotos();
  currentIndex = Math.max(photos.length - 1, 0);
  renderPhotoCard();
});

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function initHands() {
  const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    if (!results.multiHandLandmarks?.length) {
      swipeBaseX = null;
      return;
    }

    const hand = results.multiHandLandmarks[0];
    const wrist = hand[0];
    const thumbTip = hand[4];
    const indexTip = hand[8];

    if (swipeBaseX === null) swipeBaseX = wrist.x;

    const delta = wrist.x - swipeBaseX;
    if (delta > 0.11) {
      nextPhoto(1);
      swipeBaseX = wrist.x;
    } else if (delta < -0.11) {
      nextPhoto(-1);
      swipeBaseX = wrist.x;
    }

    if (distance(thumbTip, indexTip) < 0.03 && Date.now() - lastPinchAt > 900) {
      nextPhoto(1);
      lastPinchAt = Date.now();
    }
  });

  const cam = new Camera(webcamEl, {
    onFrame: async () => hands.send({ image: webcamEl }),
    width: 640,
    height: 360
  });

  await cam.start();
}

startCameraBtn.addEventListener('click', async () => {
  startCameraBtn.disabled = true;
  startCameraBtn.textContent = '手势识别运行中';
  try {
    await initHands();
  } catch (error) {
    console.error(error);
    startCameraBtn.disabled = false;
    startCameraBtn.textContent = '启动手势识别';
    alert('无法启动摄像头，请检查权限。');
  }
});

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  globe.rotation.y += 0.0009;
  outerShell.rotation.y -= 0.0004;
  timelineBand.rotation.z += 0.001;
  world.position.y = Math.sin(t * 0.9) * 0.03;
  stars.rotation.y += 0.00015;
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight);
});

fetchPhotos();
animate();
