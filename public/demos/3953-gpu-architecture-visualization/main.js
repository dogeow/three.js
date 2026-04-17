import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 20, 25);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.7));

new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0x202040, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

// GPU Architecture: hierarchical block diagram
// GPC (Graphics Processing Cluster) -> TPC (Texture Processing Cluster) -> SM (Streaming Multiprocessor)

const matGPC = new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x002288, metalness: 0.5, roughness: 0.3 });
const matTPC = new THREE.MeshStandardMaterial({ color: 0x00cc66, emissive: 0x004422, metalness: 0.5, roughness: 0.3 });
const matSM  = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x883300, metalness: 0.5, roughness: 0.3 });
const matBus = new THREE.MeshStandardMaterial({ color: 0x888888, emissive: 0x333333, metalness: 0.8, roughness: 0.2 });
const matMem = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0x662288, metalness: 0.6, roughness: 0.3 });
const matLabel = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444 });

function makeBlock(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
}

const gpuGroup = new THREE.Group();
scene.add(gpuGroup);

// Host interface (top)
const host = makeBlock(18, 1, 4, matBus, 0, 8, 0);
gpuGroup.add(host);

// Memory controller
const mem = makeBlock(4, 2, 4, matMem, 0, 5, 0);
gpuGroup.add(mem);

// GPCs (4 clusters)
const gpcPositions = [[-7, 2, 0], [-2.3, 2, 0], [2.3, 2, 0], [7, 2, 0]];
const gpcs = gpcPositions.map(([x,y,z]) => {
    const g = makeBlock(4, 3, 4, matGPC, x, y, z);
    gpuGroup.add(g);
    return g;
});

// TPCs within each GPC (2 per GPC)
const tpcOffsets = [-1, 1];
gpcs.forEach((gpc, gi) => {
    tpcOffsets.forEach((oz, ti) => {
        const tpc = makeBlock(1.5, 2, 3, matTPC, gpc.position.x + oz, gpc.position.y, gpc.position.z);
        gpuGroup.add(tpc);

        // 2 SMs per TPC
        [-0.5, 0.5].forEach((ox, si) => {
            const sm = makeBlock(1, 1.5, 2.5, matSM, tpc.position.x + ox, tpc.position.y + 0.5, tpc.position.z);
            gpuGroup.add(sm);
        });
    });
});

// Bus lines from memory to GPCs
const busMat = new THREE.LineBasicMaterial({ color: 0x4488ff });
for (let i = 0; i < 4; i++) {
    const x = gpcPositions[i][0];
    const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 4, 0),
        new THREE.Vector3(0, 6, 0)
    ]);
    gpuGroup.add(new THREE.Line(geo, busMat));
}

// Animated warp particles flowing through GPU
const warpParticles = [];
const warpMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
for (let i = 0; i < 32; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), warpMat.clone());
    p.userData = {
        fromY: 6 + Math.random() * 2,
        toY: 0 - Math.random() * 2,
        x: gpcPositions[Math.floor(Math.random() * 4)][0],
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random()
    };
    p.position.set(p.userData.x, p.userData.fromY, 0);
    gpuGroup.add(p);
    warpParticles.push(p);
}

// Labels via sprites
function addLabel(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(text, 10, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.set(x, y, z);
    spr.scale.set(6, 1.5, 1);
    scene.add(spr);
}

addLabel('Host Interface', 0, 10, 0);
addLabel('Memory Controller', 0, 7, 0);
addLabel('GPC', -7, 4, 0);
addLabel('GPC', -2.3, 4, 0);
addLabel('GPC', 2.3, 4, 0);
addLabel('GPC', 7, 4, 0);
addLabel('TPC + SM', -7, 2, 0);
addLabel('TPC + SM', -2.3, 2, 0);
addLabel('TPC + SM', 2.3, 2, 0);
addLabel('TPC + SM', 7, 2, 0);
addLabel('VRAM', 0, 3.5, 0);

// Info panel
document.getElementById('panel').textContent = 'GPU Architecture: GPC -> TPC -> SM hierarchy | Particles show warp execution flow';

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    gpuGroup.rotation.y += 0.003;
    warpParticles.forEach(p => {
        p.userData.phase += p.userData.speed;
        const t = (p.userData.phase % 1);
        p.position.y = p.userData.fromY + (p.userData.toY - p.userData.fromY) * t;
        p.material.opacity = 0.3 + 0.7 * Math.sin(t * Math.PI);
        p.scale.setScalar(0.5 + 0.5 * Math.sin(t * Math.PI));
    });
    composer.render();
}
animate();
