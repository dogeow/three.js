// 3218. Fourier Series 3D — Epicycle decomposition visualization
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.add(new THREE.AmbientLight(0x334466, 1.0));
const dirLight = new THREE.DirectionalLight(0x88aaff, 1.2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 8, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const params = { n: 5, amplitude: 2.0, speed: 0.8, showCircles: true, showArms: true };
const gui = new GUI();
gui.add(params, "n", 1, 10, 1).name("Harmonics");
gui.add(params, "amplitude", 0.5, 4.0).name("Amplitude");
gui.add(params, "speed", 0.1, 3.0).name("Speed");
gui.add(params, "showCircles").name("Show Circles");
gui.add(params, "showArms").name("Show Arms");

const epicycleGroup = new THREE.Group();
scene.add(epicycleGroup);

// Wave line
const waveN = 200;
const wavePositions = new Float32Array(waveN * 3);
const waveGeo = new THREE.BufferGeometry();
waveGeo.setAttribute("position", new THREE.BufferAttribute(wavePositions, 3));
const waveLine = new THREE.Line(waveGeo, new THREE.LineBasicMaterial({ color: 0x00ffcc }));
scene.add(waveLine);

// 3D surface (epicycle endpoint projection)
const surfN = 200;
const surfM = 80;
const surfPositions = new Float32Array(surfN * surfM * 3);
const surfGeo = new THREE.BufferGeometry();
surfGeo.setAttribute("position", new THREE.BufferAttribute(surfPositions, 3));
const surfMat = new THREE.MeshPhongMaterial({ color: 0x2266ff, wireframe: true, transparent: true, opacity: 0.2 });
const surface = new THREE.Mesh(surfGeo, surfMat);
scene.add(surface);

const COLORS = [0xff4444, 0xff8800, 0xffff00, 0x44ff44, 0x4488ff, 0x8844ff, 0xff44ff, 0x00ffff, 0xff8844, 0x88ff44];

function fourier(x, n, amp) {
    let val = 0;
    for (let k = 1; k <= n; k++) val += (amp / k) * Math.sin(k * x + k * Math.PI / 4);
    return val;
}

let t = 0;
function animate() {
    requestAnimationFrame(animate);
    t += 0.016 * params.speed;
    
    while (epicycleGroup.children.length) epicycleGroup.remove(epicycleGroup.children[0]);
    
    let px = 0, py = 0;
    for (let k = 1; k <= params.n; k++) {
        const r = params.amplitude / k;
        const angle = k * t;
        
        if (params.showCircles) {
            const pts = [];
            for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                pts.push(new THREE.Vector3(px + r * Math.cos(a), py + r * Math.sin(a) * 0.4, 0));
            }
            const cGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const cMat = new THREE.LineBasicMaterial({ color: COLORS[(k-1) % COLORS.length], transparent: true, opacity: 0.25 });
            epicycleGroup.add(new THREE.Line(cGeo, cMat));
        }
        
        if (params.showArms) {
            const nx = px + r * Math.cos(angle);
            const ny = py + r * Math.sin(angle) * 0.4;
            const armGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px, py, 0), new THREE.Vector3(nx, ny, 0)]);
            const armMat = new THREE.LineBasicMaterial({ color: COLORS[(k-1) % COLORS.length] });
            epicycleGroup.add(new THREE.Line(armGeo, armMat));
            px = nx; py = ny;
        } else {
            px += r * Math.cos(angle);
            py += r * Math.sin(angle) * 0.4;
        }
    }
    
    // Update wave
    for (let i = 0; i < waveN; i++) {
        const x = (i / waveN) * 20 - 10;
        const y = fourier(x + t, params.n, params.amplitude) * 0.6;
        wavePositions[i * 3] = x;
        wavePositions[i * 3 + 1] = y;
        wavePositions[i * 3 + 2] = 0;
    }
    waveGeo.attributes.position.needsUpdate = true;
    
    // 3D surface
    for (let i = 0; i < waveN; i++) {
        for (let j = 0; j < surfM; j++) {
            const x = (i / waveN) * 20 - 10;
            const z = (j / surfM) * 8 - 4;
            const y = fourier(x + t, params.n, params.amplitude) * 0.5;
            surfPositions[(i * surfM + j) * 3] = x;
            surfPositions[(i * surfM + j) * 3 + 1] = y;
            surfPositions[(i * surfM + j) * 3 + 2] = z * 0.15;
        }
    }
    surfGeo.attributes.position.needsUpdate = true;
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
