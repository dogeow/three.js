// 3219. Lotka-Volterra — Predator-Prey population dynamics
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(new THREE.DirectionalLight(0x88ffaa, 1.0)).position.set(5, 10, 5);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 18, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshPhongMaterial({ color: 0x111122, side: THREE.DoubleSide })
)).rotation.x = -Math.PI / 2;
scene.add(new THREE.GridHelper(30, 30, 0x222244, 0x111133));

let prey = 40, predator = 12;
const alpha = 0.1, beta = 0.015, delta = 0.008, gamma = 0.06;
const MAX_PREY = 80, MAX_PRED = 40;
const preyPool = [], predPool = [];

for (let i = 0; i < MAX_PREY; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshPhongMaterial({ color: 0x44ff66, emissive: 0x114411 }));
    m.visible = false; scene.add(m); preyPool.push(m);
}
for (let i = 0; i < MAX_PRED; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6),
        new THREE.MeshPhongMaterial({ color: 0xff4422, emissive: 0x441100 }));
    m.visible = false; scene.add(m); predPool.push(m);
}

const preyHistory = [], predHistory = [];
const graphLen = 200;
const preyGraph = new Float32Array(graphLen * 3);
const predGraph = new Float32Array(graphLen * 3);
const preyGraphLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(preyGraph, 3)),
    new THREE.LineBasicMaterial({ color: 0x44ff66 }));
const predGraphLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(predGraph, 3)),
    new THREE.LineBasicMaterial({ color: 0xff4422 }));
preyGraphLine.position.set(-8, 7, -10);
predGraphLine.position.set(-8, 7, -10);
preyGraphLine.rotation.x = predGraphLine.rotation.x = -Math.PI / 2;
scene.add(preyGraphLine);
scene.add(predGraphLine);

function updateSim() {
    const dp = (alpha * prey - beta * prey * predator) * 1.0;
    const dq = (delta * prey * predator - gamma * predator) * 1.0;
    prey = Math.max(1, Math.min(MAX_PREY, prey + dp));
    predator = Math.max(1, Math.min(MAX_PRED, predator + dq));
    
    const pc = Math.round(prey), qc = Math.round(predator);
    for (let i = 0; i < MAX_PREY; i++) {
        preyPool[i].visible = i < pc;
        if (i < pc) {
            const a = i * 2.399 + simT;
            const r = Math.sqrt(i / pc) * 5;
            preyPool[i].position.set(Math.cos(a) * r, 0.18, Math.sin(a) * r);
        }
    }
    for (let i = 0; i < MAX_PRED; i++) {
        predPool[i].visible = i < qc;
        if (i < qc) {
            const a = i * 3.714 + simT * 0.6;
            const r = Math.sqrt(i / qc) * 5;
            predPool[i].position.set(Math.cos(a) * r, 0.22, Math.sin(a) * r);
            predPool[i].rotation.y = a + Math.PI / 2;
        }
    }
    
    preyHistory.push(prey);
    predHistory.push(predator);
    if (preyHistory.length > graphLen) { preyHistory.shift(); predHistory.shift(); }
    
    const pp = preyGraphLine.geometry.attributes.position.array;
    const rp = predGraphLine.geometry.attributes.position.array;
    for (let i = 0; i < preyHistory.length; i++) {
        const x = (i / graphLen) * 16;
        pp[i*3] = x; pp[i*3+1] = (preyHistory[i] / MAX_PREY) * 5; pp[i*3+2] = 0;
        rp[i*3] = x; rp[i*3+1] = (predHistory[i] / MAX_PRED) * 5; rp[i*3+2] = 0.05;
    }
    preyGraphLine.geometry.attributes.position.needsUpdate = true;
    predGraphLine.geometry.attributes.position.needsUpdate = true;
    preyGraphLine.geometry.setDrawRange(0, preyHistory.length);
    predGraphLine.geometry.setDrawRange(0, predHistory.length);
}

let simT = 0;
function animate() {
    requestAnimationFrame(animate);
    updateSim();
    controls.update();
    renderer.render(scene, camera);
    simT += 0.016;
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
