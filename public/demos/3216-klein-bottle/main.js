// 3216. Klein Bottle — Non-orientable surface in 3D
// Parametric immersion using "figure-8" torus Kleinian technique

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.add(new THREE.AmbientLight(0x334466, 1.2));
const dirLight = new THREE.DirectionalLight(0x88aaff, 1.5);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
const ptLight = new THREE.PointLight(0xff4466, 1.2, 20);
ptLight.position.set(-4, -4, 4);
scene.add(ptLight);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Build Klein bottle surface using parametric equations
// "Figure-8" immersion by Clifford torus parametrization
const N = 100;
const positions = [];
const indices = [];

for (let i = 0; i <= N; i++) {
    const u = (i / N) * Math.PI * 2;
    for (let j = 0; j <= N; j++) {
        const v = (j / N) * Math.PI * 2;
        
        // Classic "figure-8" Klein bottle immersion
        const r = 2.0;
        let x, y, z;
        
        if (u < Math.PI) {
            x = r * (Math.cos(u) + Math.cos(2*u) * 0.5) * Math.cos(v) * 0.6;
            y = r * (Math.sin(u) + Math.sin(2*u) * 0.5) * Math.cos(v) * 0.6;
            z = r * Math.sin(v) * 0.6;
        } else {
            const u2 = u - Math.PI;
            x = r * 0.8 * Math.cos(v) + 1.5;
            y = r * 0.8 * Math.sin(v) * (1 + Math.cos(u2) * 0.3);
            z = r * Math.sin(u2) * 0.5 + 0.5;
        }
        
        positions.push(x, y + 0.5, z);
    }
}

for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
        const a = i * (N + 1) + j;
        const b = a + 1;
        const c = a + N + 1;
        const d = c + 1;
        if (i < N && j < N) {
            indices.push(a, b, c, b, d, c);
        }
    }
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const solidMat = new THREE.MeshPhongMaterial({
    color: 0x4488ff,
    emissive: 0x112244,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    shininess: 100,
});
const wireMat = new THREE.MeshBasicMaterial({
    color: 0xaaddff,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
});

const mesh = new THREE.Mesh(geometry, solidMat);
const wireMesh = new THREE.Mesh(geometry, wireMat);
scene.add(mesh);
scene.add(wireMesh);

scene.add(new THREE.AxesHelper(3));

let t = 0;
function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y = t * 0.15;
    mesh.rotation.x = Math.sin(t * 0.08) * 0.3;
    wireMesh.rotation.copy(mesh.rotation);
    controls.update();
    renderer.render(scene, camera);
    t += 0.016;
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
