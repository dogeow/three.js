import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 25, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
scene.add(new THREE.AmbientLight(0x404060, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 1.0));

function sieve(n) {
    const isPrime = new Uint8Array(n+1).fill(true);
    isPrime[0] = isPrime[1] = false;
    for (let p = 2; p*p <= n; p++) if (isPrime[p]) for (let q = p*p; q <= n; q += p) isPrime[q] = false;
    return isPrime;
}

const MAX_N = 10000;
const isPrime = sieve(MAX_N);

function ulamPos(n) {
    if (n === 1) return [0, 0];
    let k = Math.ceil((Math.sqrt(n)-1)/2);
    let t = 2*k+1, m = t*t, side = m-n;
    let offset = side % (t-1), half = t-1;
    if (side < half) return [k-offset, -k];
    else if (side < 2*half) return [-k, -k+(side-half)];
    else if (side < 3*half) return [-k+(side-2*half), k];
    else return [k, k-(side-3*half)];
}

const SIZE = 201, HALF = (SIZE-1)/2;
const primes = [];
for (let n = 1; n <= MAX_N; n++) {
    const [x, z] = ulamPos(n);
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) continue;
    if (isPrime[n]) primes.push([x, z, n]);
}

const primeGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
const primeMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x004433, metalness: 0.3, roughness: 0.5 });
const primeMesh = new THREE.InstancedMesh(primeGeo, primeMat, primes.length);
const dummy = new THREE.Object3D();
primes.forEach(([x, z, n], i) => {
    dummy.position.set(x, 0.15, z);
    dummy.updateMatrix();
    primeMesh.setMatrixAt(i, dummy.matrix);
});
primeMesh.instanceMatrix.needsUpdate = true;
scene.add(primeMesh);
scene.add(new THREE.GridHelper(SIZE, SIZE, 0x1a1a3a, 0x0a0a2a));

const centerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4488, emissive: 0x880022 })
);
centerMesh.position.y = 0.5;
scene.add(centerMesh);

const infoDiv = document.getElementById('panel');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(primeMesh);
    if (hits.length > 0) {
        const [x, z, n] = primes[hits[0].instanceId];
        infoDiv.textContent = `n=${n} | pos=(${x},${z}) | primes up to ${MAX_N} shown`;
        infoDiv.style.color = '#00ffcc';
    } else {
        infoDiv.textContent = 'Ulam spiral: prime numbers on a square spiral grid | Hover for n | Scroll to zoom';
        infoDiv.style.color = '#aaa';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    primeMesh.rotation.y += 0.001;
    controls.update();
    renderer.render(scene, camera);
}
animate();
