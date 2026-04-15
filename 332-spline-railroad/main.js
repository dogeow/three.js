import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 场景初始化
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 80, 200);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 18, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// 轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 0, 0);

// 光照
scene.add(new THREE.AmbientLight(0x404060, 1.2));
const dirLight = new THREE.DirectionalLight(0xffeedd, 2);
dirLight.position.set(30, 50, 20);
scene.add(dirLight);
const ptLight = new THREE.PointLight(0x7ec8e3, 1, 60);
ptLight.position.set(-10, 10, 0);
scene.add(ptLight);

// 参数（可由 GUI 调节）
const params = {
  speed: 0.6,        // 火车速度
  segments: 400,     // 曲线采样精度
  railSegs: 12,      // 轨道横截面段数（TubeGeometry）
  tieCount: 120,     // 枕木数量
  tieHeight: 0.22,   // 枕木厚度
  tieWidth: 2.8,     // 枕木宽度
  railRadius: 0.12,  // 铁轨半径
  railSpread: 0.85,  // 左右轨道间距
};

// ─── CatmullRomCurve3 路径 ───
// 定义一个环形铁路路径，途经多个控制点
const rawPoints = [
  new THREE.Vector3(-20, 0, -8),
  new THREE.Vector3(-10, 0, -18),
  new THREE.Vector3(10, 0, -20),
  new THREE.Vector3(22, 0, -10),
  new THREE.Vector3(24, 0, 5),
  new THREE.Vector3(18, 0, 18),
  new THREE.Vector3(2, 0, 22),
  new THREE.Vector3(-16, 0, 18),
  new THREE.Vector3(-24, 0, 8),
];
const curve = new THREE.CatmullRomCurve3(rawPoints, true, 'catmullrom', 0.5);

// ─── 地面 ───
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshLambertMaterial({ color: 0x2d3a1e })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.12;
scene.add(groundMesh);

// ─── 生成轨道组 ───
const trackGroup = new THREE.Group();
scene.add(trackGroup);

function buildTrack() {
  // 清除旧轨道
  while (trackGroup.children.length) trackGroup.remove(trackGroup.children[0]);

  // 左右两条铁轨偏移向量（基于切线计算）
  const points = curve.getPoints(params.segments);
  const frames = curve.computeFrenetFrames(params.segments, true);

  const leftPts = [], rightPts = [];
  for (let i = 0; i <= params.segments; i++) {
    const pt = points[i];
    const nrm = frames.normals[i];
    const bin = frames.binormals[i];
    // 法线方向即轨道横向
    leftPts.push(pt.clone().addScaledVector(nrm, -params.railSpread));
    rightPts.push(pt.clone().addScaledVector(nrm, params.railSpread));
  }

  // 使用 TubeGeometry 构造两条轨道管
  const leftCurve = new THREE.CatmullRomCurve3(leftPts);
  const rightCurve = new THREE.CatmullRomCurve3(rightPts);

  const railMat = new THREE.MeshLambertMaterial({ color: 0xb0b8c0 });

  const leftTube = new THREE.Mesh(
    new THREE.TubeGeometry(leftCurve, params.segments, params.railRadius, params.railSegs, false),
    railMat
  );
  const rightTube = new THREE.Mesh(
    new THREE.TubeGeometry(rightCurve, params.segments, params.railRadius, params.railSegs, false),
    railMat
  );
  trackGroup.add(leftTube, rightTube);

  // ─── 枕木（Ties） ───
  // 沿曲线等距采样，放置扁平长方体
  const tieMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
  const tieGeo = new THREE.BoxGeometry(params.tieWidth, params.tieHeight, 0.25);

  for (let i = 0; i < params.tieCount; i++) {
    const t = i / params.tieCount;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const frames_i = curve.computeFrenetFrames(params.segments, true);
    const normal = frames_i.normals[Math.floor(t * params.segments)];
    const binorm = frames_i.binormals[Math.floor(t * params.segments)];

    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.copy(pt);
    tie.position.y -= params.tieHeight * 0.5 + 0.02;

    // 对齐到轨道方向：X 轴朝向切线
    const mat3 = new THREE.Matrix4().makeBasis(tangent, binorm, normal);
    tie.setRotationFromMatrix(mat3);
    trackGroup.add(tie);
  }
}

buildTrack();

// ─── 火车车厢 ───
const cartGroup = new THREE.Group();
scene.add(cartGroup);

const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
const roofMat = new THREE.MeshLambertMaterial({ color: 0x922b21 });
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
const rimMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });

// 车厢主体
const bodyGeo = new THREE.BoxGeometry(2.4, 1.0, 1.1);
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.7;
cartGroup.add(body);

// 车顶
const roofGeo = new THREE.BoxGeometry(2.0, 0.35, 1.15);
const roof = new THREE.Mesh(roofGeo, roofMat);
roof.position.y = 1.35;
cartGroup.add(roof);

// 车轮
const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
const rimGeo = new THREE.TorusGeometry(0.3, 0.06, 8, 16);
const wheelPositions = [
  [-0.75, 0.3, 0.58], [0.75, 0.3, 0.58],
  [-0.75, 0.3, -0.58], [0.75, 0.3, -0.58],
];
wheelPositions.forEach(([x, y, z]) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.x = Math.PI / 2;
  w.position.set(x, y, z);
  cartGroup.add(w);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(x, y, z + (z > 0 ? 0.08 : -0.08));
  rim.rotation.x = Math.PI / 2;
  cartGroup.add(rim);
});

// ─── GUI ───
const gui = new GUI();
gui.add(params, 'speed', 0.1, 3.0, 0.05).name('火车速度');
gui.add(params, 'tieCount', 20, 300, 1).name('枕木数量').onChange(buildTrack);
gui.add(params, 'railSpread', 0.4, 1.5, 0.05).name('轨距').onChange(buildTrack);
gui.add(params, 'railSegs', 4, 20, 1).name('轨道精度').onChange(buildTrack);

// ─── 动画循环 ───
let t = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // 沿曲线循环移动车厢
  t = (t + params.speed * dt * 0.02) % 1;
  const pos = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t);
  cartGroup.position.copy(pos);
  cartGroup.position.y += 0.35;

  // 让车厢朝向切线方向
  const angle = Math.atan2(tangent.x, tangent.z);
  cartGroup.rotation.y = angle;

  // 车轮旋转
  cartGroup.children.forEach((child, i) => {
    if (i >= 2 && i < 10) child.rotation.z += params.speed * dt * 3;
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

// 窗口自适应
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});