import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080810);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 10, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0x404060, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 1.0));

// Memory hierarchy data: [name, latency(ns), bandwidth(GB/s), size]
const levels = [
    { name: 'L1 Cache', lat: 1,    bw: 10000, size: '64 KB',  color: 0xff2244, y: 8   },
    { name: 'L2 Cache', lat: 4,    bw: 5000,  size: '256 KB', color: 0xff8800, y: 6   },
    { name: 'L3 Cache', lat: 15,   bw: 2000,  size: '16 MB',  color: 0xffdd00, y: 4   },
    { name: 'DRAM',     lat: 100,  bw: 256,   size: '32 GB',  color: 0x00ff88, y: 2   },
    { name: 'NVMe SSD', lat: 20000, bw: 5,     size: '1 TB',   color: 0x00ccff, y: 0   },
    { name: 'HDD',      lat: 5000000, bw: 0.1, size: '4 TB',  color: 0x4488ff, y: -2  },
];

const maxLat = Math.log10(levels[levels.length-1].lat);
const maxBar = 20; // max bar width

const group = new THREE.Group();
scene.add(group);

// Log scale bar chart
levels.forEach((lvl, i) => {
    const logLat = Math.log10(lvl.lat);
    const barWidth = (logLat / maxLat) * maxBar;
    const barGeo = new THREE.BoxGeometry(barWidth, 0.8, 1.5);
    const barMat = new THREE.MeshStandardMaterial({ color: lvl.color, emissive: lvl.color, emissiveIntensity: 0.2, metalness: 0.3, roughness: 0.5 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(-barWidth/2, lvl.y, 0);
    group.add(bar);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(lvl.name, 10, 30);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`${lvl.lat} ns | ${lvl.bw} GB/s | ${lvl.size}`, 10, 55);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.set(barWidth/2 + 3, lvl.y, 0);
    spr.scale.set(16, 2, 1);
    group.add(spr);

    // Latency value text
    const latCanvas = document.createElement('canvas');
    latCanvas.width = 256; latCanvas.height = 32;
    const latCtx = latCanvas.getContext('2d');
    latCtx.fillStyle = '#ffffff';
    latCtx.font = '20px monospace';
    latCtx.fillText(`${lvl.lat} ns`, 10, 24);
    const latTex = new THREE.CanvasTexture(latCanvas);
    const latSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: latTex, transparent: true }));
    latSpr.position.set(-barWidth/2 - 4, lvl.y, 0);
    latSpr.scale.set(6, 0.75, 1);
    group.add(latSpr);
});

// Animated access demo
const accessMat = new THREE.MeshBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.9 });
const accessParticles = [];
for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), accessMat.clone());
    p.userData = {
        levelIdx: Math.floor(Math.random() * levels.length),
        t: Math.random(),
        speed: 0.005 + Math.random() * 0.01
    };
    const y = levels[p.userData.levelIdx].y;
    p.position.set(0, y, 2);
    scene.add(p);
    accessParticles.push(p);
}

// Connecting lines between levels
const connMat = new THREE.LineBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.4 });
const connPoints = [];
levels.forEach((lvl, i) => {
    if (i < levels.length - 1) {
        connPoints.push(new THREE.Vector3(0, lvl.y, 0));
        connPoints.push(new THREE.Vector3(0, levels[i+1].y, 0));
    }
});
if (connPoints.length > 0) {
    const connGeo = new THREE.BufferGeometry().setFromPoints(connPoints);
    scene.add(new THREE.LineSegments(connGeo, connMat));
}

// Axis
const axisMat = new THREE.LineBasicMaterial({ color: 0x666666 });
scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-maxBar/2 - 5, -4, 0),
    new THREE.Vector3(maxBar/2 + 20, -4, 0)
]), axisMat));

scene.add(new THREE.GridHelper(40, 40, 0x111122, 0x080810));

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    group.rotation.y += 0.002;
    accessParticles.forEach(p => {
        p.userData.t += p.userData.speed;
        if (p.userData.t >= 1) {
            p.userData.t = 0;
            p.userData.levelIdx = Math.floor(Math.random() * levels.length);
        }
        const targetY = levels[p.userData.levelIdx].y;
        p.position.y += (targetY - p.position.y) * 0.05;
        p.material.opacity = 0.3 + 0.7 * Math.sin(p.userData.t * Math.PI);
        p.position.x = (p.userData.t - 0.5) * (maxBar + 5);
    });
    renderer.render(scene, camera);
}
animate();
