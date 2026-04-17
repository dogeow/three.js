// 3221. Electrostatic Field — Field lines between point charges
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 12, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Charges: [+1, -1, +0.5]
const charges = [
    { x: 2.0, y: 0, z: 0, q: 1.0 },
    { x: -2.0, y: 0, z: 0, q: -1.0 },
    { x: 0, y: 0, z: 1.5, q: 0.5 },
];

const chargeMeshes = [];
for (const c of charges) {
    const color = c.q > 0 ? 0xff3333 : 0x3333ff;
    const geo = new THREE.SphereGeometry(Math.abs(c.q) * 0.3 + 0.15, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5, shininess: 100 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c.x, c.y, c.z);
    scene.add(mesh);
    chargeMeshes.push(mesh);
    
    // Glow ring
    const ringGeo = new THREE.TorusGeometry(Math.abs(c.q) * 0.35 + 0.2, 0.03, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(mesh.position);
    scene.add(ring);
}

// Compute field at a point
function fieldAt(x, y, z) {
    let Ex = 0, Ey = 0, Ez = 0;
    for (const c of charges) {
        const dx = x - c.x, dy = y - c.y, dz = z - c.z;
        const r2 = dx*dx + dy*dy + dz*dz + 0.01;
        const r = Math.sqrt(r2);
        const E = c.q / r2;
        Ex += E * dx / r;
        Ey += E * dy / r;
        Ez += E * dz / r;
    }
    return { x: Ex, y: Ey, z: Ez };
}

// Trace field lines from each charge
const fieldLineGroup = new THREE.Group();
scene.add(fieldLineGroup);

function traceFieldLine(startX, startY, startZ, maxSteps, stepSize, direction) {
    const pts = [new THREE.Vector3(startX, startY, startZ)];
    let x = startX, y = startY, z = startZ;
    let sign = direction;
    
    for (let i = 0; i < maxSteps; i++) {
        const { x: Ex, y: Ey, z: Ez } = fieldAt(x, y, z);
        const mag = Math.sqrt(Ex*Ex + Ey*Ey + Ez*Ez) + 0.001;
        x += sign * stepSize * Ex / mag;
        y += sign * stepSize * Ey / mag;
        z += sign * stepSize * Ez / mag;
        
        // Stop if too close to a charge
        let tooClose = false;
        for (const c of charges) {
            const dx = x - c.x, dy = y - c.y, dz = z - c.z;
            if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.3) { tooClose = true; break; }
        }
        if (tooClose) break;
        
        pts.push(new THREE.Vector3(x, y, z));
        if (Math.abs(x) > 8 || Math.abs(y) > 8 || Math.abs(z) > 8) break;
    }
    return pts;
}

// Generate field lines from positive charges going outward, negative going inward
const colors = [0xff4444, 0x4444ff, 0x44ff44];
for (let ci = 0; ci < charges.length; ci++) {
    const c = charges[ci];
    const numLines = 16;
    const color = c.q > 0 ? 0xff6666 : 0x6666ff;
    
    for (let li = 0; li < numLines; li++) {
        const theta = (li / numLines) * Math.PI * 2;
        const phi = Math.PI / 2;
        const r = 0.35;
        const startX = c.x + r * Math.sin(phi) * Math.cos(theta);
        const startY = c.y + r * Math.cos(phi);
        const startZ = c.z + r * Math.sin(phi) * Math.sin(theta);
        
        const dir = c.q > 0 ? 1 : -1;
        const pts = traceFieldLine(startX, startY, startZ, 300, 0.05, dir);
        
        if (pts.length > 2) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
            fieldLineGroup.add(new THREE.Line(lineGeo, lineMat));
        }
    }
}

// Field strength indicator particles
const particleCount = 500;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 6;
    const z = (Math.random() - 0.5) * 10;
    particlePositions[i*3] = x;
    particlePositions[i*3+1] = y;
    particlePositions[i*3+2] = z;
    
    const { x: Ex, y: Ey, z: Ez } = fieldAt(x, y, z);
    const mag = Math.sqrt(Ex*Ex + Ey*Ey + Ez*Ez);
    const t = Math.min(1, mag / 2);
    particleColors[i*3] = 0.5 + t * 0.5;
    particleColors[i*3+1] = 0.5;
    particleColors[i*3+2] = 1.0 - t * 0.5;
}

particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
const particleMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

let t = 0;
function animate() {
    requestAnimationFrame(animate);
    fieldLineGroup.rotation.y = t * 0.05;
    t += 0.016;
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
