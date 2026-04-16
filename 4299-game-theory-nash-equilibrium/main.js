// {title: "Game Theory: Nash Equilibrium"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(8, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Player strategies
const strategies = ['S1', 'S2', 'S3', 'S4'];
const n = strategies.length;

// Payoff matrices (two-player zero-sum)
const payoffA = [
  [3, 0, 2, 1],
  [1, 4, 0, 2],
  [0, 1, 3, 4],
  [2, 3, 1, 0]
];

// Create 3D payoff matrix bars
const barGroup = new THREE.Group();
const matrixGroup = new THREE.Group();
scene.add(matrixGroup);

const gridHelper = new THREE.GridHelper(n, n, 0x334466, 0x223344);
gridHelper.position.y = 0;
matrixGroup.add(gridHelper);

// Draw payoff bars as 3D matrix
const barGeo = new THREE.BoxGeometry(0.7, 1, 0.7);
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const payoff = payoffA[i][j];
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(payoff / 5, 0.8, 0.45),
      transparent: true,
      opacity: 0.85
    });
    const bar = new THREE.Mesh(barGeo, mat);
    bar.scale.y = payoff;
    bar.position.set(i - n / 2 + 0.5, payoff / 2, j - n / 2 + 0.5);
    bar.userData = { row: i, col: j, payoff };
    barGroup.add(bar);

    // Payoff text label below bar
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(payoff.toString(), 64, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.8, 0.4, 1);
    sprite.position.set(i - n / 2 + 0.5, -0.3, j - n / 2 + 0.5);
    matrixGroup.add(sprite);
  }
}
matrixGroup.add(barGroup);

// Axis labels
const axisLabels = ['Row Player Strategy', 'Col Player Strategy'];
const makeLabel = (text, pos) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#aacccc';
  ctx.font = '24px monospace';
  ctx.fillText(text, 10, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4, 1, 1);
  sprite.position.copy(pos);
  scene.add(sprite);
};
makeLabel('Player A Payoffs', new THREE.Vector3(0, -1, n + 1));

// Highlight best responses
const bestResponseMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true });

function updateBestResponses(rowChoice, colChoice) {
  // Remove old highlights
  barGroup.children.forEach(bar => {
    if (bar.userData.isBestResponse) {
      bar.material.emissive?.setHex(0x000000);
      bar.userData.isBestResponse = false;
    }
  });

  // Best response for row player: max of chosen column
  let brRow = 0;
  for (let i = 1; i < n; i++) if (payoffA[i][colChoice] > payoffA[brRow][colChoice]) brRow = i;
  // Best response for col player: min of chosen row (col player wants to minimize row's payoff)
  let brCol = 0;
  for (let j = 1; j < n; j++) if (payoffA[rowChoice][j] < payoffA[rowChoice][brCol]) brCol = j;

  barGroup.children.forEach(bar => {
    if (bar.userData.col === colChoice && bar.userData.row === brRow) {
      bar.material.emissive = new THREE.Color(0x00ff88);
      bar.userData.isBestResponse = true;
    }
    if (bar.userData.row === rowChoice && bar.userData.col === brCol) {
      bar.material.emissive = new THREE.Color(0x00ff88);
      bar.userData.isBestResponse = true;
    }
  });

  // Check Nash equilibrium
  const isNash = (rowChoice === brRow) && (colChoice === brCol);
  if (isNash) {
    const eqBar = barGroup.children.find(b => b.userData.row === rowChoice && b.userData.col === colChoice);
    if (eqBar) {
      const glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.3 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(eqBar.position);
      glow.position.y = eqBar.scale.y + 0.5;
      glow.userData.isNashGlow = true;
      // Remove old glow
      barGroup.children.filter(b => b.userData.isNashGlow).forEach(b => barGroup.remove(b));
      barGroup.add(glow);
    }
  }
}

// Interactive sliders
let rowChoice = 2, colChoice = 2;
updateBestResponses(rowChoice, colChoice);

const guiDiv = document.createElement('div');
guiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:16px;border-radius:8px;z-index:100;';
document.body.appendChild(guiDiv);

guiDiv.innerHTML = `
  <div>Row Player (P1) Strategy: <span id="rval">S${rowChoice + 1}</span></div>
  <input type="range" id="rslider" min="0" max="${n - 1}" value="${rowChoice}" style="width:180px">
  <br><br>
  <div>Col Player (P2) Strategy: <span id="cval">S${colChoice + 1}</span></div>
  <input type="range" id="cslider" min="0" max="${n - 1}" value="${colChoice}" style="width:180px">
  <br><br>
  <div id="info" style="color:#88ffaa">Nash Equilibrium: (S${rowChoice + 1}, S${colChoice + 1})</div>
`;

document.getElementById('rslider').addEventListener('input', e => {
  rowChoice = +e.target.value;
  document.getElementById('rval').textContent = `S${rowChoice + 1}`;
  updateBestResponses(rowChoice, colChoice);
  document.getElementById('info').textContent = `Nash Equilibrium: (S${rowChoice + 1}, S${colChoice + 1})`;
});

document.getElementById('cslider').addEventListener('input', e => {
  colChoice = +e.target.value;
  document.getElementById('cval').textContent = `S${colChoice + 1}`;
  updateBestResponses(rowChoice, colChoice);
  document.getElementById('info').textContent = `Nash Equilibrium: (S${rowChoice + 1}, S${colChoice + 1})`;
});

// Legend
const legend = document.createElement('div');
legend.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.7);padding:12px;border-radius:8px;';
legend.innerHTML = '🟢 Best Response highlight | 🟡 Nash Equilibrium glow | Color = payoff magnitude';
document.body.appendChild(legend);

// Animate bars pulsing
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.02;
  barGroup.children.forEach(bar => {
    if (!bar.userData.isNashGlow) {
      bar.scale.y = bar.userData.payoff * (1 + Math.sin(t + bar.userData.row + bar.userData.col) * 0.05);
      bar.position.y = bar.scale.y / 2;
    }
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
