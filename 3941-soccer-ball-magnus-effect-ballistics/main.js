// 3941. Soccer Ball Magnus Effect Ballistics
// Simulates soccer ball flight with spin-induced Magnus force
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 8, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0x404080, 0.6));
const sun = new THREE.DirectionalLight(0xfffbe0, 1.2);
sun.position.set(20, 40, 20);
sun.castShadow = true;
scene.add(sun);
const fillLight = new THREE.PointLight(0xe94560, 0.4, 100);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

// Ground
const groundGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x2d4a3e, roughness: 0.9, metalness: 0.0
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid overlay
const gridHelper = new THREE.GridHelper(200, 50, 0x3d6a5e, 0x2d4a3e);
scene.add(gridHelper);

// Goal posts
function makeGoalPost(x) {
  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 7.3, 16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.6 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.castShadow = true;
  return post;
}
const goalGroup = new THREE.Group();
goalGroup.add(makeGoalPost(-3.66));
goalGroup.add(makeGoalPost(3.66));
const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.32, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.6 }));
crossbar.rotation.z = Math.PI / 2;
crossbar.position.y = 2.44;
goalGroup.add(crossbar);
goalGroup.position.z = -50;
scene.add(goalGroup);

// Soccer ball
const ballGeo = new THREE.IcosahedronGeometry(0.7, 3);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.castShadow = true;
scene.add(ball);

// Ball texture lines (pentagon/hex pattern simulation via emissive)
const patternGeo = new THREE.IcosahedronGeometry(0.71, 2);
const patternMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.0, wireframe: true, transparent: true, opacity: 0.15 });
const pattern = new THREE.Mesh(patternGeo, patternMat);
ball.add(pattern);

// Spin axis helper arrow
const spinArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0xe94560, 0.3, 0.15);
ball.add(spinArrow);

// Trail
const trailPoints = [];
const maxTrail = 200;
const trailGeo = new THREE.BufferGeometry();
const trailMat = new THREE.LineBasicMaterial({ color: 0xe94560, transparent: true, opacity: 0.6 });
const trail = new THREE.Line(trailGeo, trailMat);
scene.add(trail);

// Physics state
const state = {
  pos: new THREE.Vector3(0, 0.7, 0),
  vel: new THREE.Vector3(0, 0, 0),
  spin: new THREE.Vector3(0, 15, 0), // spin in rad/s around y axis
  launched: false,
  t: 0
};

const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;
const BALL_RADIUS = 0.7;
const BALL_MASS = 0.43; // kg (regulation soccer ball)
const BALL_CD = 0.25;   // drag coefficient
const BALL_CL = 0.15;   // lift coefficient (Magnus)
const CROSS_SECTION = Math.PI * BALL_RADIUS * BALL_RADIUS;

function launch(speed = 28, angleDeg = 30, spinRate = 20) {
  const angle = angleDeg * Math.PI / 180;
  state.pos.set(-15, 0.7, 0);
  state.vel.set(
    speed * Math.cos(angle),
    speed * Math.sin(angle),
    0
  );
  state.spin.set(0, spinRate, 0);
  state.launched = true;
  state.t = 0;
  trailPoints.length = 0;
}

function reset() {
  state.pos.set(0, 0.7, 0);
  state.vel.set(0, 0, 0);
  state.spin.set(0, 15, 0);
  state.launched = false;
  state.t = 0;
  trailPoints.length = 0;
}

function updatePhysics(dt) {
  if (!state.launched) return;

  // Normalize spin
  const spinMag = state.spin.length();

  // Drag force: Fd = 0.5 * rho * Cd * A * v^2
  const speed = state.vel.length();
  const dragMag = 0.5 * AIR_DENSITY * BALL_CD * CROSS_SECTION * speed * speed;
  const dragForce = state.vel.clone().normalize().multiplyScalar(-dragMag);

  // Magnus force: Fm = 0.5 * rho * Cl * A * (spin × velocity)
  // Simplified: perpendicular to velocity, magnitude proportional to spin
  const spinDir = state.spin.clone().normalize();
  const magnusMag = 0.5 * AIR_DENSITY * BALL_CL * CROSS_SECTION * speed * spinMag * 0.05;
  // Magnus force perpendicular to both spin axis and velocity
  const magnusForce = new THREE.Vector3().crossVectors(spinDir, state.vel).normalize().multiplyScalar(magnusMag);

  // Gravity
  const gravityForce = new THREE.Vector3(0, -GRAVITY * BALL_MASS, 0);

  // Total force
  const totalForce = new THREE.Vector3().addVectors(dragForce, magnusForce).add(gravityForce);

  // Acceleration
  const acc = totalForce.divideScalar(BALL_MASS);

  // Integrate
  state.vel.add(acc.multiplyScalar(dt));
  state.pos.add(state.vel.clone().multiplyScalar(dt));
  state.t += dt;

  // Ground collision
  if (state.pos.y < BALL_RADIUS) {
    state.pos.y = BALL_RADIUS;
    state.vel.y = -state.vel.y * 0.6;
    state.vel.x *= 0.8;
    state.vel.z *= 0.8;
    state.spin.multiplyScalar(0.95);
    if (state.vel.length() < 0.5) {
      state.launched = false;
    }
  }

  // Record trail
  trailPoints.push(state.pos.clone());
  if (trailPoints.length > maxTrail) trailPoints.shift();
}

function updateTrail() {
  if (trailPoints.length < 2) {
    trailGeo.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    return;
  }
  trailGeo.setFromPoints(trailPoints);
}

function updateBall() {
  ball.position.copy(state.pos);
  // Rotate ball based on spin
  ball.rotation.x += state.spin.x * 0.016;
  ball.rotation.y += state.spin.y * 0.016;
  ball.rotation.z += state.spin.z * 0.016;

  // Update spin arrow direction
  spinArrow.setDirection(state.spin.clone().normalize());

  // Scale arrow with spin magnitude
  const spinMag = state.spin.length();
  spinArrow.setLength(Math.min(spinMag * 0.08, 3), 0.3, 0.15);
}

function updateStats() {
  const el = document.getElementById('stats');
  if (!el) return;
  const speed = state.vel.length();
  const spinMag = state.spin.length();
  el.textContent = ` v: ${speed.toFixed(1)} m/s | spin: ${spinMag.toFixed(1)} rad/s | h: ${state.pos.y.toFixed(1)}m`;
}

// Event handlers
document.getElementById('launchBtn').addEventListener('click', () => launch());
document.getElementById('resetBtn').addEventListener('click', () => reset());

// OrbitControls (manual)
const orbit = { theta: 0.5, phi: 0.3, radius: 45, target: new THREE.Vector3(0, 3, -10) };
let mouseDown = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  orbit.theta -= (e.clientX - lastX) * 0.005;
  orbit.phi = Math.max(0.1, Math.min(1.4, orbit.phi + (e.clientY - lastY) * 0.005));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('wheel', e => {
  orbit.radius = Math.max(10, Math.min(120, orbit.radius + e.deltaY * 0.05));
});

function updateCamera() {
  camera.position.set(
    orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
}

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePhysics(dt);
  updateBall();
  updateTrail();
  updateCamera();
  updateStats();
  renderer.render(scene, camera);
}
animate();
