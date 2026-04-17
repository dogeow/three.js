import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 20, 25);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0x404080, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(10, 20, 10);
scene.add(dir);

// Black-Scholes implied volatility surface model
function bsIV(spot, strike, maturity) {
    const logM = Math.log(spot / strike);
    const t = Math.max(maturity, 0.01);
    const skew = -0.2 * logM;
    const smile = 0.1 * (logM * logM);
    const term = 0.05 * Math.sqrt(t);
    return Math.max(0.05, 0.2 + skew + smile + term);
}

const GRID = 64;
const geo = new THREE.PlaneGeometry(30, 30, GRID-1, GRID-1);
const pos = geo.attributes.position.array;
const cols = new Float32Array(GRID * GRID * 3);
const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.4 });
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

const K_MIN = 50, K_MAX = 150, T_MIN = 0.1, T_MAX = 2.0, S = 100;

for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const strike = K_MIN + (K_MAX - K_MIN) * (i / (GRID - 1));
        const maturity = T_MIN + (T_MAX - T_MIN) * (j / (GRID - 1));
        const iv = bsIV(S, strike, maturity);
        pos[idx * 3 + 2] = iv * 20;
        const t = (iv - 0.1) / 0.4;
        cols[idx*3+0] = Math.min(1, t * 2);
        cols[idx*3+1] = Math.max(0, 1 - Math.abs(t - 0.5) * 2);
        cols[idx*3+2] = Math.max(0, 1 - t * 2);
    }
}

geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
geo.computeVertexNormals();
mesh.rotation.x = -Math.PI / 2;
mesh.position.x = (K_MIN + K_MAX) / 2 - 100;
mesh.position.z = (T_MIN + T_MAX) / 2 * 10 - 15;

// Axes
const axisMat = new THREE.LineBasicMaterial({ color: 0x888888 });
scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0, -5), new THREE.Vector3(20, 0, -5),
    new THREE.Vector3(0, 0, -20), new THREE.Vector3(0, 0, 5)
]), axisMat));

// Title sprite
function makeLabel(text, x, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(text, 10, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.set(x, 8, z);
    spr.scale.set(16, 2, 1);
    scene.add(spr);
}
makeLabel('Implied Volatility Surface', (K_MIN+K_MAX)/2-100, -20);
makeLabel('Strike Price', 15, -23);
makeLabel('Maturity', -20, 3);

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.002;
    renderer.render(scene, camera);
}
animate();
