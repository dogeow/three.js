// 3217. PID Controller 3D — Ball balancing on tilting platform
// Proportional-Integral-Derivative control with real-time physics

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 10, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Platform
const platformGeo = new THREE.CylinderGeometry(3, 3, 0.2, 64);
const platformMat = new THREE.MeshPhongMaterial({ color: 0x223355, emissive: 0x112233 });
const platform = new THREE.Mesh(platformGeo, platformMat);
scene.add(platform);

const gridHelper = new THREE.GridHelper(6, 12, 0x334466, 0x223355);
gridHelper.position.y = 0.11;
platform.add(gridHelper);

// Ball
const ballGeo = new THREE.SphereGeometry(0.4, 32, 32);
const ballMat = new THREE.MeshPhongMaterial({ color: 0xff4422, emissive: 0x441100, shininess: 100 });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.position.set(0, 0.5, 0);
scene.add(ball);

// Target ring
const ringGeo = new THREE.RingGeometry(0.3, 0.5, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
const targetRing = new THREE.Mesh(ringGeo, ringMat);
targetRing.rotation.x = -Math.PI / 2;
scene.add(targetRing);

// Trail
const trailPositions = new Float32Array(200 * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.4 });
const trail = new THREE.Line(trailGeo, trailMat);
trail.position.y = 0.45;
scene.add(trail);
const trailHistory = [];

// PID State
let eX = 0, eZ = 0, peX = 0, peZ = 0, iX = 0, iZ = 0;
const Kp = 3.0, Ki = 0.2, Kd = 1.8;
const maxTilt = Math.PI / 7;
let bVx = 0, bVz = 0;
const fric = 0.985, g = 9.8;
let tX = 0, tZ = 0, simT = 0;

function updatePID() {
    eX = ball.position.x - tX;
    eZ = ball.position.z - tZ;
    iX = Math.max(-1.5, Math.min(1.5, iX + eX * 0.016));
    iZ = Math.max(-1.5, Math.min(1.5, iZ + eZ * 0.016));
    const dX = (eX - peX) / 0.016;
    const dZ = (eZ - peZ) / 0.016;
    peX = eX; peZ = eZ;
    const oX = Kp * eX + Ki * iX + Kd * dX;
    const oZ = Kp * eZ + Ki * iZ + Kd * dZ;
    platform.rotation.z = Math.max(-maxTilt, Math.min(maxTilt, oX * 0.08));
    platform.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, oZ * 0.08));
    bVx += Math.sin(platform.rotation.z) * g * 0.016;
    bVz -= Math.sin(platform.rotation.x) * g * 0.016;
    bVx *= fric; bVz *= fric;
    ball.position.x += bVx * 0.016;
    ball.position.z += bVz * 0.016;
    const bd = 2.6;
    if (Math.abs(ball.position.x) > bd) { bVx *= -0.6; ball.position.x = Math.sign(ball.position.x) * bd; }
    if (Math.abs(ball.position.z) > bd) { bVz *= -0.6; ball.position.z = Math.sign(ball.position.z) * bd; }
    ball.position.y = 0.4 + ball.position.x * Math.tan(platform.rotation.z) + ball.position.z * Math.tan(platform.rotation.x);
    trailHistory.push({ x: ball.position.x, z: ball.position.z });
    if (trailHistory.length > 200) trailHistory.shift();
    for (let i = 0; i < trailHistory.length; i++) {
        trailPositions[i * 3] = trailHistory[i].x;
        trailPositions[i * 3 + 1] = 0;
        trailPositions[i * 3 + 2] = trailHistory[i].z;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.setDrawRange(0, trailHistory.length);
}

function animate() {
    requestAnimationFrame(animate);
    simT += 0.016;
    tX = Math.sin(simT * 0.6) * 1.2;
    tZ = Math.cos(simT * 0.4) * 1.2;
    targetRing.position.set(tX, 0.12, tZ);
    updatePID();
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
