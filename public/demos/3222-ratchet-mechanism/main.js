// 3222. Ratchet Mechanism — Geneva drive escapement animation
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffcc88, 1.2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Base plate
const baseMat = new THREE.MeshPhongMaterial({ color: 0x333344, emissive: 0x111122 });
const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4), baseMat);
base.position.y = -1.5;
scene.add(base);

// Drive wheel (escapement wheel)
const wheelGeo = new THREE.CylinderGeometry(2, 2, 0.2, 32);
const wheelMat = new THREE.MeshPhongMaterial({ color: 0xcc8844, emissive: 0x442211, shininess: 80 });
const wheel = new THREE.Mesh(wheelGeo, wheelMat);
wheel.rotation.x = Math.PI / 2;
wheel.position.set(0, 0, 1);
scene.add(wheel);

// Ratchet teeth on wheel
const toothCount = 12;
const teethGroup = new THREE.Group();
for (let i = 0; i < toothCount; i++) {
    const angle = (i / toothCount) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.15, 0.25, 0.1);
    const tooth = new THREE.Mesh(toothGeo, wheelMat);
    tooth.position.set(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
    tooth.rotation.z = angle;
    teethGroup.add(tooth);
}
teethGroup.rotation.z = 0;
wheel.add(teethGroup);

// Geneva pin (driver)
const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16);
const pinMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444, shininess: 100 });
const pin = new THREE.Mesh(pinGeo, pinMat);
pin.rotation.x = Math.PI / 2;
pin.position.set(1.2, 0, 0);
wheel.add(pin);

// Geneva wheel (driven member)
const genevaGroup = new THREE.Group();
scene.add(genevaGroup);

const genevaDiscGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32);
const genevaMat = new THREE.MeshPhongMaterial({ color: 0x4488cc, emissive: 0x112233, shininess: 80 });
const genevaDisc = new THREE.Mesh(genevaDiscGeo, genevaMat);
genevaDisc.rotation.x = Math.PI / 2;
genevaGroup.add(genevaDisc);

// Slot in geneva wheel
const slotGeo = new THREE.BoxGeometry(0.3, 0.25, 1.8);
const slot = new THREE.Mesh(slotGeo, new THREE.MeshPhongMaterial({ color: 0x222233 }));
slot.position.z = 0;
genevaGroup.add(slot);

// Center shaft
const shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 16);
const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshPhongMaterial({ color: 0x888888 }));
shaft.rotation.x = Math.PI / 2;
shaft.position.set(0, 0, 1);
scene.add(shaft);

// Geneva drive kinematics
let wheelAngle = 0;
const teethPerRev = 12;
const genevaRotationPerDrive = (Math.PI * 2) / teethPerRev * 0.5;
let genevaAngle = 0;
let genevaActive = false;
let genevaTimer = 0;
let drivePhase = 0; // 0=engaging, 1=driving, 2=disengaging, 3=waiting

const driveSpeed = 2.0; // wheel rad/s
const driveDuration = 0.3; // seconds
const waitDuration = 0.5; // seconds

// Output shaft rotation history for graph
const outputHistory = [];
const outputGraphGeo = new THREE.BufferGeometry();
const outputGraphPos = new Float32Array(300 * 3);
outputGraphGeo.setAttribute("position", new THREE.BufferAttribute(outputGraphPos, 3));
const outputGraphLine = new THREE.Line(outputGraphGeo, new THREE.LineBasicMaterial({ color: 0x44aaff }));
outputGraphLine.position.set(-2, 3, -3);
outputGraphLine.rotation.x = -Math.PI / 2;
scene.add(outputGraphLine);

let simT = 0;

function updateGeneva(dt) {
    wheelAngle += driveSpeed * dt;
    teethGroup.rotation.z = wheelAngle;
    
    // Geneva mechanism phases
    const toothAngle = (wheelAngle % (Math.PI * 2 / toothCount));
    const toothIndex = Math.floor(wheelAngle / (Math.PI * 2 / toothCount));
    
    // Engagement: pin enters slot at specific angle
    const engageAngle = Math.PI * 0.15;
    const disengageAngle = Math.PI * 0.85;
    
    if (toothAngle > engageAngle && toothAngle < disengageAngle && !genevaActive) {
        genevaActive = true;
        genevaTimer = 0;
        drivePhase = 1;
    }
    
    if (genevaActive) {
        genevaTimer += dt;
        
        if (drivePhase === 1) {
            // Pin drives geneva wheel
            const progress = Math.min(1, genevaTimer / driveDuration);
            const eased = 1 - Math.pow(1 - progress, 2); // ease in
            genevaAngle += genevaRotationPerDrive * dt / driveDuration * eased;
            
            if (genevaTimer >= driveDuration) {
                genevaActive = false;
                drivePhase = 0;
            }
        }
    }
    
    // Continuous slow return (geneva wheel only moves during drive)
    genevaGroup.rotation.z = genevaAngle;
    
    // Output graph
    outputHistory.push(genevaAngle);
    if (outputHistory.length > 300) outputHistory.shift();
    const opp = outputGraphLine.geometry.attributes.position.array;
    for (let i = 0; i < outputHistory.length; i++) {
        const x = (i / 300) * 4;
        opp[i*3] = x;
        opp[i*3+1] = (outputHistory[i] / (Math.PI * 2)) * 3;
        opp[i*3+2] = 0;
    }
    outputGraphLine.geometry.attributes.position.needsUpdate = true;
    outputGraphLine.geometry.setDrawRange(0, outputHistory.length);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = 0.016;
    updateGeneva(dt);
    controls.update();
    renderer.render(scene, camera);
    simT += dt;
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
