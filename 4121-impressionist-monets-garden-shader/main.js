// 4121. Impressionist Monets Garden Shader
// Impressionist Monets Garden Shader

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0x404060, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Placeholder geometry
const geo = new THREE.BoxGeometry(2, 2, 2);
const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.5, roughness: 0.3 });
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

scene.add(new THREE.GridHelper(20, 20));

let t = 0;
function animate() {
    requestAnimationFrame(animate);
    t += 0.016;
    mesh.rotation.y = t * 0.5;
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
