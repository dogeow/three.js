// 4189. Ferrofluid Magnetic Field Spikes
// Rosensweig instability — ferrofluid surface spikes under rotating magnetic dipole array

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const W = 80, H = 80;
let scene, camera, renderer, controls;
let t = 0;
let rotating = true;
let fieldAngle = 0;
const N_MAGNETS = 6;
const magnets = [];
const SPIKE_H = 2.8;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExpBox(0x050508, 40);

    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
    camera.position.set(0, 18, 28);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.48;

    // Lighting
    scene.add(new THREE.AmbientLight(0x112233, 0.6));
    const pLight = new THREE.PointLight(0x4488ff, 2.5, 100);
    pLight.position.set(12, 22, 12);
    scene.add(pLight);
    const pLight2 = new THREE.PointLight(0xff3366, 1.8, 80);
    pLight2.position.set(-12, 15, -12);
    scene.add(pLight2);

    // Ferrofluid surface
    const geo = new THREE.PlaneGeometry(22, 22, W - 1, H - 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhysicalMaterial({
        color: 0x080810,
        metalness: 0.95,
        roughness: 0.02,
        envMapIntensity: 2.0,
    });
    const surface = new THREE.Mesh(geo, mat);
    surface.userData.isFerrofluid = true;
    scene.add(surface);

    // Magnetic dipole indicators
    const magnetGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const magnetMat = new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        metalness: 1,
        roughness: 0.1,
    });
    for (let i = 0; i < N_MAGNETS; i++) {
        const angle = (i / N_MAGNETS) * Math.PI * 2;
        const m = new THREE.Mesh(magnetGeo, magnetMat.clone());
        m.position.set(Math.cos(angle) * 5.5, 0.3, Math.sin(angle) * 5.5);
        m.userData.baseAngle = angle;
        magnets.push(m);
        scene.add(m);

        // Halo ring
        const ringGeo = new THREE.TorusGeometry(0.7, 0.04, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        m.add(ring);
    }

    // Grid base
    const grid = new THREE.GridHelper(30, 30, 0x111133, 0x0a0a22);
    grid.position.y = -0.05;
    scene.add(grid);

    // Env map for metallic reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x080818);
    for (let i = 0; i < 5; i++) {
        const envLight = new THREE.PointLight(
            [0x4488ff, 0xff3366, 0x44ffaa, 0xffaa44, 0x8844ff][i],
            3, 30
        );
        envLight.position.set(
            Math.cos(i * 1.26) * 10,
            5 + Math.random() * 10,
            Math.sin(i * 1.26) * 10
        );
        envScene.add(envLight);
    }
    const envMap = pmrem.fromScene(envScene).texture;
    mat.envMap = envMap;
    pmrem.dispose();

    scene.userData.surface = surface;
}

function computeSpikeHeight(wx, wz) {
    let totalField = 0;
    for (const m of magnets) {
        const dx = wx - m.position.x;
        const dz = wz - m.position.z;
        const d = Math.sqrt(dx * dx + dz * dz) + 0.01;
        totalField += 1.0 / (d * d + 0.4);
    }
    const threshold = 0.6;
    if (totalField < threshold) return 0;
    const spikeVal = (totalField - threshold) / threshold;
    const wave = Math.sin(wx * 0.7 + t * 1.4) * Math.cos(wz * 0.7 + t * 1.0);
    const h = spikeVal * SPIKE_H * (0.65 + 0.35 * wave);
    return Math.max(0, h);
}

function updateSurface() {
    const surface = scene.userData.surface;
    const geo = surface.geometry;
    const pos = geo.attributes.position;
    const W2 = 11, H2 = 11;
    for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
            const wx = (i / (W - 1) - 0.5) * W2 * 2;
            const wz = (j / (H - 1) - 0.5) * H2 * 2;
            pos.setY(j * W + i, computeSpikeHeight(wx, wz));
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
}

function updateMagnets() {
    if (!rotating) return;
    fieldAngle += 0.007;
    const R = 5.5;
    for (let i = 0; i < N_MAGNETS; i++) {
        const angle = fieldAngle + (i / N_MAGNETS) * Math.PI * 2;
        magnets[i].position.x = Math.cos(angle) * R;
        magnets[i].position.z = Math.sin(angle) * R;
        magnets[i].rotation.y = fieldAngle * 2;
    }
}

function animate() {
    requestAnimationFrame(animate);
    t += 0.016;
    updateMagnets();
    updateSurface();
    controls.update();
    renderer.render(scene, camera);
}

window.toggleRotate = function() { rotating = !rotating; };
window.resetField = function() { fieldAngle = 0; };

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

init();
animate();
