import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);
camera.position.set(0, 40, 0);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0x303040, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

const wallMat = new THREE.MeshStandardMaterial({ color: 0x334455, side: THREE.DoubleSide });
const walls = [];
function addWall(x1, z1, x2, z2) {
    const len = Math.hypot(x2-x1, z2-z1);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 6), wallMat);
    wall.rotation.x = -Math.PI/2;
    wall.position.set((x1+x2)/2, 3, (z1+z2)/2);
    wall.rotation.z = Math.atan2(z2-z1, x2-x1);
    scene.add(wall);
    walls.push({ x1, z1, x2, z2 });
}

addWall(-20, -15, 20, -15);
addWall(20, -15, 20, 10);
addWall(20, 10, -5, 10);
addWall(-5, 10, -5, -5);
addWall(-5, -5, -20, -5);
addWall(-20, -5, -20, -15);

// LiDAR scan group
const lidarGroup = new THREE.Group();
scene.add(lidarGroup);
const lidarMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 });

// Occupancy grid
const GRID_SIZE = 80, GRID_RES = 1.0;
const occupancy = new Float32Array(GRID_SIZE * GRID_SIZE).fill(-1);
const occMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(GRID_RES*0.9, 0.2, GRID_RES*0.9),
    new THREE.MeshStandardMaterial({ color: 0x00ff88 }),
    GRID_SIZE * GRID_SIZE
);
occMesh.count = 0;
scene.add(occMesh);

// Robot state
const robotPos = new THREE.Vector3(0, 0, 0);
let robotAngle = 0;
const dummy = new THREE.Object3D();

// Ray casting
function castRay(angle) {
    const dx = Math.cos(angle), dz = Math.sin(angle);
    let minDist = 30;
    for (const w of walls) {
        const { x1, z1, x2, z2 } = w;
        const dxw = x2-x1, dzw = z2-z1;
        const denom = dx*dzw - dz*dxw;
        if (Math.abs(denom) < 1e-6) continue;
        const t = ((x1-robotPos.x)*dzw - (z1-robotPos.z)*dxw) / denom;
        const u = ((x1-robotPos.x)*dz - (z1-robotPos.z)*dx) / denom;
        if (t > 0.001 && u >= 0 && u <= 1) {
            const dist = Math.hypot(t*dx, t*dz);
            if (dist < minDist) minDist = dist;
        }
    }
    return minDist;
}

function updateLidar() {
    while (lidarGroup.children.length) lidarGroup.remove(lidarGroup.children[0]);

    const points = [];
    const NUM_BEAMS = 360;
    for (let i = 0; i < NUM_BEAMS; i++) {
        const angle = robotAngle - Math.PI + (Math.PI * 2 * i / (NUM_BEAMS - 1));
        const dist = castRay(angle);
        const ex = robotPos.x + Math.cos(angle) * dist;
        const ez = robotPos.z + Math.sin(angle) * dist;
        points.push(new THREE.Vector3(robotPos.x, 0.5, robotPos.z));
        points.push(new THREE.Vector3(ex, 0.5, ez));

        // Occupancy update: hit cell
        const gx = Math.floor((ex + GRID_SIZE*GRID_RES/2) / GRID_RES);
        const gz = Math.floor((ez + GRID_SIZE*GRID_RES/2) / GRID_RES);
        if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE) {
            const gi = gz * GRID_SIZE + gx;
            occupancy[gi] = Math.min(1, occupancy[gi] + 0.3);
        }
        // Free cells along ray
        for (let d = 0; d < dist; d += GRID_RES * 0.5) {
            const ix = Math.floor((robotPos.x + Math.cos(angle)*d + GRID_SIZE*GRID_RES/2) / GRID_RES);
            const iz = Math.floor((robotPos.z + Math.sin(angle)*d + GRID_SIZE*GRID_RES/2) / GRID_RES);
            if (ix >= 0 && ix < GRID_SIZE && iz >= 0 && iz < GRID_SIZE) {
                const gi = iz * GRID_SIZE + ix;
                occupancy[gi] = Math.max(-1, occupancy[gi] - 0.05);
            }
        }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    lidarGroup.add(new THREE.LineSegments(geo, lidarMat));

    // Update occ mesh
    let count = 0;
    for (let i = 0; i < GRID_SIZE*GRID_SIZE; i++) {
        if (occupancy[i] > 0.5) {
            const gx = i % GRID_SIZE, gz = Math.floor(i / GRID_SIZE);
            dummy.position.set(gx*GRID_RES - GRID_SIZE*GRID_RES/2, 0.1, gz*GRID_RES - GRID_SIZE*GRID_RES/2);
            dummy.scale.setScalar(occupancy[i]);
            dummy.updateMatrix();
            occMesh.setMatrixAt(count, dummy.matrix);
            count++;
        }
    }
    occMesh.count = count;
    occMesh.instanceMatrix.needsUpdate = true;
}

// Robot mesh
scene.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4488 })
));

scene.add(new THREE.GridHelper(40, 40, 0x222222, 0x111111));

// WASD controls
window.addEventListener('keydown', e => {
    const speed = 0.5;
    if (e.key === 'w') { robotPos.x += speed * Math.cos(robotAngle); robotPos.z += speed * Math.sin(robotAngle); }
    if (e.key === 's') { robotPos.x -= speed * Math.cos(robotAngle); robotPos.z -= speed * Math.sin(robotAngle); }
    if (e.key === 'a') robotAngle += 0.1;
    if (e.key === 'd') robotAngle -= 0.1;
    updateLidar();
    document.getElementById('panel').textContent = `WASD: move | LiDAR building occupancy grid in real-time`;
});

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

updateLidar();
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
