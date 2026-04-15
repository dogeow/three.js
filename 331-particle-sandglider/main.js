import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// --- 配置 ---
const W = window.innerWidth, H = window.innerHeight;
const MAX_PARTICLES = 2000;
const RADIUS = 0.12;          // 粒子半径
const RESTITUTION = 0.25;     // 碰撞恢复系数
const WALL_X = 6, WALL_Z = 4;  // 容器半尺寸

// --- 场景初始化 ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

// --- 光照 ---
scene.add(new THREE.AmbientLight(0x334455, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(8, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x334466, 0x221133, 0.6));

// --- 容器（无底盒子） ---
const boxMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.7, metalness: 0.2 });
const wallGeo = new THREE.BoxGeometry(1, 1, 1);

// 底面
const floor = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2, 0.3, WALL_Z * 2), boxMat);
floor.position.y = -0.15;
floor.receiveShadow = true;
scene.add(floor);

// 四面墙
const walls = [
  { pos: [-WALL_X, 2, 0],  rot: [0,0,0],            size: [0.3, 4, WALL_Z*2] },
  { pos: [ WALL_X, 2, 0],  rot: [0,0,0],            size: [0.3, 4, WALL_Z*2] },
  { pos: [0,  2, -WALL_Z], rot: [0,0,0],            size: [WALL_X*2, 4, 0.3] },
  { pos: [0,  2,  WALL_Z], rot: [0,0,0],            size: [WALL_X*2, 4, 0.3] },
];
walls.forEach(({ pos, rot, size }) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), boxMat);
  m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
});

// 栅格地面参考线
const grid = new THREE.GridHelper(WALL_X * 2, 12, 0x334455, 0x223344);
grid.position.y = 0.01;
scene.add(grid);

// --- 粒子系统 ---
const geo = new THREE.SphereGeometry(RADIUS, 7, 7);
const mat = new THREE.MeshStandardMaterial({
  color: 0xd4a055,
  roughness: 0.85,
  metalness: 0.05
});
const mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

const dummy = new THREE.Object3D();
const particles = [];
// 初始化所有实例为不可见（缩放0）
for (let i = 0; i < MAX_PARTICLES; i++) {
  dummy.position.set(0, -100, 0);
  dummy.scale.setScalar(0);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  particles.push({ x:0, y:-100, z:0, vx:0, vy:0, vz:0, active:false });
}
mesh.instanceMatrix.needsUpdate = true;

let activeCount = 0;

// --- GUI 控制 ---
const params = {
  gravity: 0.018,
  friction: 0.92,
  restitution: 0.25,
  pourRate: 8,          // 每帧倾倒粒子数
  angleOfRepose: 0.65,  // 安息角阈值（速度衰减临界值）
  reset: () => resetAll()
};

const gui = new GUI({ title: '🌍 沙滑块控制面板' });
gui.add(params, 'gravity', 0, 0.05, 0.001).name('重力');
gui.add(params, 'friction', 0.7, 0.99, 0.01).name('摩擦力');
gui.add(params, 'restitution', 0, 0.8, 0.01).name('弹性系数');
gui.add(params, 'pourRate', 1, 30, 1).name('倾倒速率');
gui.add(params, 'angleOfRepose', 0.1, 1.5, 0.01).name('安息角');
gui.add(params, 'reset').name('🔄 重置场景');

// --- 仿真逻辑 ---
function resetAll() {
  activeCount = 0;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles[i].active = false;
    particles[i].x = 0; particles[i].y = -100; particles[i].z = 0;
    particles[i].vx = 0; particles[i].vy = 0; particles[i].vz = 0;
    dummy.position.set(0, -100, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function pourSand(mx, my) {
  // 将鼠标归一化坐标映射到容器上方
  const rect = renderer.domElement.getBoundingClientRect();
  const nx = ((mx - rect.left) / rect.width) * 2 - 1;
  const nz = ((my - rect.top) / rect.height) * 2 - 1;

  const spread = 0.4;
  for (let n = 0; n < params.pourRate; n++) {
    if (activeCount >= MAX_PARTICLES) return;
    const i = activeCount++;
    const p = particles[i];
    p.x = nx * WALL_X * 0.5 + (Math.random() - 0.5) * spread;
    p.y = 5 + (Math.random() - 0.5) * 0.3;
    p.z = nz * WALL_Z * 0.5 + (Math.random() - 0.5) * spread;
    p.vx = (Math.random() - 0.5) * 0.02;
    p.vy = 0;
    p.vz = (Math.random() - 0.5) * 0.02;
    p.active = true;
    dummy.scale.setScalar(1);
    dummy.position.set(p.x, p.y, p.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function updatePhysics() {
  const g = params.gravity;
  const fric = params.friction;
  const rest = params.restitution;

  for (let i = 0; i < activeCount; i++) {
    const p = particles[i];
    if (!p.active) continue;

    // 重力
    p.vy -= g;

    // 速度衰减（摩擦 + 安息角概念）
    const spd = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
    if (spd < params.angleOfRepose) {
      // 速度过小视为静止颗粒
      p.vx *= fric;
      p.vz *= fric;
    } else {
      p.vx *= (1 - (1 - fric) * 0.1);
      p.vz *= (1 - (1 - fric) * 0.1);
    }
    p.vy *= fric;

    // 位置更新
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    // 地面碰撞
    if (p.y - RADIUS < 0) {
      p.y = RADIUS;
      p.vy = -p.vy * rest;
      // 地面摩擦
      p.vx *= fric;
      p.vz *= fric;
    }

    // 左右墙
    if (p.x - RADIUS < -WALL_X) { p.x = -WALL_X + RADIUS; p.vx = -p.vx * rest; }
    if (p.x + RADIUS >  WALL_X) { p.x =  WALL_X - RADIUS; p.vx = -p.vx * rest; }
    // 前后墙
    if (p.z - RADIUS < -WALL_Z) { p.z = -WALL_Z + RADIUS; p.vz = -p.vz * rest; }
    if (p.z + RADIUS >  WALL_Z) { p.z =  WALL_Z - RADIUS; p.vz = -p.vz * rest; }

    // 粒子间简单排斥（O(n²)，小规模演示用）
    for (let j = i + 1; j < activeCount; j++) {
      const q = particles[j];
      const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
      const d2 = dx*dx + dy*dy + dz*dz;
      const minD = RADIUS * 2.1;
      if (d2 < minD * minD && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        const nx = dx / d, ny = dy / d, nz = dz / d;
        p.x -= nx * push; p.y -= ny * push; p.z -= nz * push;
        q.x += nx * push; q.y += ny * push; q.z += nz * push;
        // 速度交换（简化弹性碰撞）
        const relV = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny + (p.vz - q.vz) * nz;
        if (relV < 0) {
          const imp = relV * rest;
          p.vx -= imp * nx; p.vy -= imp * ny; p.vz -= imp * nz;
          q.vx += imp * nx; q.vy += imp * ny; q.vz += imp * nz;
        }
      }
    }

    // 更新实例矩阵
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  if (activeCount > 0) mesh.instanceMatrix.needsUpdate = true;
}

// --- 事件 ---
let pouring = false;
let mouseX = 0, mouseY = 0;

renderer.domElement.addEventListener('mousedown', e => {
  pouring = true; mouseX = e.clientX; mouseY = e.clientY;
});
renderer.domElement.addEventListener('mousemove', e => {
  if (pouring) { mouseX = e.clientX; mouseY = e.clientY; }
});
renderer.domElement.addEventListener('mouseup', () => pouring = false);
renderer.domElement.addEventListener('mouseleave', () => pouring = false);

// 触摸支持
renderer.domElement.addEventListener('touchstart', e => {
  pouring = true;
  mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchmove', e => {
  mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => pouring = false);

// --- 窗口调整 ---
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// --- 动画循环 ---
function animate() {
  requestAnimationFrame(animate);
  if (pouring) pourSand(mouseX, mouseY);
  updatePhysics();
  controls.update();
  renderer.render(scene, camera);
}

animate();