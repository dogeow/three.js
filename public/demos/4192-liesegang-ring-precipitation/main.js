// 4192. Liesegang Ring Precipitation Pattern
// Liesegang banding — periodic precipitation rings in gel media, reaction-diffusion chemistry, Ostwald ripening

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let t = 0;
let rings = [];
let ringMeshes = [];
let time = 0;

const RING_COUNT = 14;
const DISK_RADIUS = 10;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080e);

    camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x334466, 0.7));
    const dLight = new THREE.DirectionalLight(0x88aaff, 1.2);
    dLight.position.set(10, 20, 15);
    scene.add(dLight);
    const dLight2 = new THREE.DirectionalLight(0xff8844, 0.6);
    dLight2.position.set(-10, 5, -10);
    scene.add(dLight2);

    // Petri dish base
    const dishGeo = new THREE.CylinderGeometry(DISK_RADIUS + 1, DISK_RADIUS + 1, 0.5, 64);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 0.3, metalness: 0.2 });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = -0.25;
    scene.add(dish);

    // Gel medium
    const gelGeo = new THREE.CylinderGeometry(DISK_RADIUS, DISK_RADIUS, 0.15, 64);
    const gelMat = new THREE.MeshPhysicalMaterial({
        color: 0xddcc88,
        roughness: 0.4,
        metalness: 0.0,
        transmission: 0.3,
        thickness: 0.5,
        opacity: 0.85,
        transparent: true,
    });
    const gel = new THREE.Mesh(gelGeo, gelMat);
    gel.position.y = 0.075;
    scene.add(gel);

    // Liesegang rings: power law spacing r_n = a * sqrt(n)
    // Inner electrolyte (center drop)
    const innerDropletGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.18, 32);
    const innerMat = new THREE.MeshPhysicalMaterial({
        color: 0x0066ff,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.7,
        thickness: 0.3,
        transparent: true,
        opacity: 0.9,
    });
    const innerDrop = new THREE.Mesh(innerDropletGeo, innerMat);
    innerDrop.position.y = 0.18;
    scene.add(innerDrop);

    // Compute ring positions using power law
    // r_n = r_1 * sqrt(n) is the Moyal generalization
    const r1 = 1.2;
    for (let n = 1; n <= RING_COUNT; n++) {
        const radius = r1 * Math.sqrt(n);
        const thickness = 0.18 - n * 0.008;
        const color = new THREE.Color().setHSL(0.08 + n * 0.03, 0.8, 0.35 + Math.sin(n * 0.7) * 0.1);

        const ringGeo = new THREE.RingGeometry(
            Math.max(0.01, radius - thickness),
            radius,
            64
        );
        const ringMat = new THREE.MeshPhysicalMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.15;
        scene.add(ringMesh);

        ringMeshes.push({
            mesh: ringMesh,
            n: n,
            baseRadius: radius,
            thickness: thickness,
            baseColor: color.clone(),
            formationTime: n * 0.6,
        });
    }

    // Label rings
    scene.userData.rings = ringMeshes;
}

function updateRings() {
    const visible = time;
    for (const ring of ringMeshes) {
        const progress = Math.max(0, Math.min(1, (visible - ring.formationTime + 0.5) / 1.5));
        const pulse = 1 + 0.03 * Math.sin(t * 2 + ring.n * 0.5);
        ring.mesh.scale.setScalar(progress * pulse);

        // Color shifts as ring forms
        const h = ring.baseColor.getHSL({}).h;
        const s = ring.baseColor.getHSL({}).s;
        const l = ring.baseColor.getHSL({}).l * (0.7 + 0.3 * progress);
        ring.mesh.material.color.setHSL(h, s, l);
        ring.mesh.material.opacity = 0.5 + 0.35 * progress;
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.016;
    t += 0.016;
    updateRings();
    controls.update();
    renderer.render(scene, camera);
}

window.resetSim = function() { time = 0; };

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

init();
animate();
