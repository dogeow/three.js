// 3220. Penrose Tiling — Aperiodic P3 with golden ratio
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
scene.add(new THREE.DirectionalLight(0xffd700, 1.5)).position.set(5, 15, 5);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 25, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

const PHI = (1 + Math.sqrt(5)) / 2;
const D2R = Math.PI / 180;

function createKite(scale) {
    const pts = [
        [0, 0],
        [scale, 0],
        [Math.cos(72*D2R)*scale, Math.sin(72*D2R)*scale],
        [Math.cos(144*D2R)*scale, Math.sin(144*D2R)*scale],
    ];
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0x443300, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

function createDart(scale) {
    const pts = [
        [0, 0],
        [Math.cos(72*D2R)*scale, Math.sin(72*D2R)*scale],
        [Math.cos(-72*D2R)*scale, Math.sin(-72*D2R)*scale],
    ];
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshPhongMaterial({ color: 0x4488ff, emissive: 0x112244, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

function deflate(triangles, iters) {
    let current = triangles;
    for (let iter = 0; iter < iters; iter++) {
        const next = [];
        for (const tri of current) {
            const a = tri.s / PHI;
            if (tri.t === 0) {
                next.push({ t: 0, x: tri.x, z: tri.z, r: tri.r, s: a });
                next.push({ t: 1, x: tri.x, z: tri.z, r: tri.r, s: a });
                next.push({ t: 0, x: tri.x, z: tri.z, r: tri.r + 144*D2R, s: a });
            } else {
                next.push({ t: 1, x: tri.x, z: tri.z, r: tri.r, s: a });
                next.push({ t: 0, x: tri.x, z: tri.z, r: tri.r, s: a });
                next.push({ t: 1, x: tri.x, z: tri.z, r: tri.r + 72*D2R, s: a });
            }
        }
        current = next;
    }
    return current;
}

const ITERS = 4;
let triangles = [{ t: 0, x: 0, z: 0, r: 0, s: 1.0 }];
// Add 5 kites around center to start sun pattern
for (let i = 0; i < 5; i++) triangles.push({ t: 0, x: 0, z: 0, r: i * 72 * D2R, s: 1.0 });
triangles = deflate(triangles, ITERS);
console.log("Penrose triangles:", triangles.length);

const tilingGroup = new THREE.Group();
scene.add(tilingGroup);

for (const tri of triangles) {
    const mesh = tri.t === 0 ? createKite(tri.s) : createDart(tri.s);
    mesh.position.set(tri.x, 0, tri.z);
    mesh.rotation.y = tri.r;
    tilingGroup.add(mesh);
    
    const dot = new THREE.Mesh(
        new THREE.SphereGeometry(tri.s * 0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.position.set(tri.x, 0.01, tri.z);
    tilingGroup.add(dot);
}

let animT = 0;
function animate() {
    requestAnimationFrame(animate);
    tilingGroup.rotation.y = animT * 0.1;
    controls.update();
    renderer.render(scene, camera);
    animT += 0.016;
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
