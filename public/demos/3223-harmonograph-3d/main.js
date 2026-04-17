// 3223. Harmonograph 3D — Damped 3-pendulum Lissajous figures
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08080f);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Harmonograph parameters (3 coupled pendulums)
const params = {
    f1: 1.0, f2: 1.017, f3: 0.983,
    d1: 0.002, d2: 0.003, d3: 0.001,
    p1: 0, p2: Math.PI/2, p3: Math.PI/4,
    scale: 4.0,
    autoRotate: true,
    showDots: true,
    lineWidth: 1.5,
};

const gui = new GUI();
gui.add(params, "f1", 0.5, 3.0).name("Freq X");
gui.add(params, "f2", 0.5, 3.0).name("Freq Y");
gui.add(params, "f3", 0.5, 3.0).name("Freq Z");
gui.add(params, "d1", 0.0001, 0.02).name("Damp X");
gui.add(params, "d2", 0.0001, 0.02).name("Damp Y");
gui.add(params, "d3", 0.0001, 0.02).name("Damp Z");
gui.add(params, "p1", 0, Math.PI*2, 0.1).name("Phase X");
gui.add(params, "p2", 0, Math.PI*2, 0.1).name("Phase Y");
gui.add(params, "p3", 0, Math.PI*2, 0.1).name("Phase Z");
gui.add(params, "scale", 1, 8).name("Scale");
gui.add(params, "autoRotate").name("Auto Rotate");
gui.add(params, "showDots").name("Show Dots");

// Line geometry
const maxPoints = 8000;
const linePositions = new Float32Array(maxPoints * 3);
const lineColors = new Float32Array(maxPoints * 3);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
const line = new THREE.Line(lineGeo, lineMat);
scene.add(line);

// Dot points
const dotGeo = new THREE.BufferGeometry();
const dotPositions = new Float32Array(maxPoints * 3);
const dotColors = new Float32Array(maxPoints * 3);
dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
const dotMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.8 });
const dots = new THREE.Points(dotGeo, dotMat);
scene.add(dots);

let pointCount = 0;
let simT = 0;
let lastParams = { ...params };

function harmonograph(t, f1, f2, f3, d1, d2, d3, p1, p2, p3, scale) {
    const x = Math.sin(f1 * t * Math.PI * 2 + p1) * Math.exp(-d1 * t) * scale;
    const y = Math.sin(f2 * t * Math.PI * 2 + p2) * Math.exp(-d2 * t) * scale;
    const z = Math.sin(f3 * t * Math.PI * 2 + p3) * Math.exp(-d3 * t) * scale;
    return { x, y, z };
}

function rebuildLine() {
    pointCount = 0;
    const maxT = 100;
    const dt = 0.005;
    
    for (let i = 0; i < maxPoints; i++) {
        const t = i * dt;
        if (t > maxT) break;
        
        const p = harmonograph(t, params.f1, params.f2, params.f3, params.d1, params.d2, params.d3, params.p1, params.p2, params.p3, params.scale);
        
        // Color based on time and position
        const speed = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) / (params.scale * 3);
        const hue = (t / maxT) * 0.8 + 0.5;
        const color = new THREE.Color().setHSL(hue % 1, 0.8, 0.5 + speed * 0.3);
        
        linePositions[i*3] = p.x;
        linePositions[i*3+1] = p.y;
        linePositions[i*3+2] = p.z;
        lineColors[i*3] = color.r;
        lineColors[i*3+1] = color.g;
        lineColors[i*3+2] = color.b;
        
        dotPositions[i*3] = p.x;
        dotPositions[i*3+1] = p.y;
        dotPositions[i*3+2] = p.z;
        dotColors[i*3] = color.r;
        dotColors[i*3+1] = color.g;
        dotColors[i*3+2] = color.b;
        
        pointCount++;
    }
    
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.setDrawRange(0, pointCount);
    dotGeo.attributes.position.needsUpdate = true;
    dotGeo.attributes.color.needsUpdate = true;
    dotGeo.setDrawRange(0, pointCount);
}

rebuildLine();
gui.onChange(rebuildLine);

let lastGuiChange = 0;
gui.onChange(() => { lastGuiChange = simT; });

function animate() {
    requestAnimationFrame(animate);
    
    if (params.autoRotate) {
        line.rotation.z += 0.002;
        dots.rotation.z += 0.002;
    }
    
    simT += 0.016;
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
