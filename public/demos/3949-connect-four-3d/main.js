import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.4, 0.85);
composer.addPass(bloom);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.GridHelper(20, 20, 0x1a2332, 0x0d1520));
scene.add(new THREE.AmbientLight(0x4060a0, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 15, 10);
dir.castShadow = true;
scene.add(dir);

const COLS = 7, ROWS = 6, CELL = 1.1;
const OFFSET_X = -(COLS-1)*CELL/2, OFFSET_Z = -(ROWS-1)*CELL/2;
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(COLS*CELL+0.2, 0.2, ROWS*CELL+0.2),
    new THREE.MeshStandardMaterial({ color: 0x1a3a8a, metalness: 0.6, roughness: 0.3 })
);
boardMesh.position.y = -0.1;
boardMesh.receiveShadow = true;
boardGroup.add(boardMesh);

for (let c=0; c<COLS; c++) for (let r=0; r<ROWS; r++) {
    const slot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32),
        new THREE.MeshStandardMaterial({ color: 0x000510, transparent: true, opacity: 0.8 })
    );
    slot.position.set(c*CELL+OFFSET_X, 0.01, r*CELL+OFFSET_Z);
    boardGroup.add(slot);
}

const discGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 32);
const discMat1 = new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0x880011, metalness: 0.8, roughness: 0.2 });
const discMat2 = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0x886600, metalness: 0.8, roughness: 0.2 });

const state = Array(COLS).fill(null).map(() => Array(ROWS).fill(0));
const discMeshes = {};
let currentPlayer = 1, gameOver = false, animating = false;

const colHighlights = [];
for (let c=0; c<COLS; c++) {
    const hl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.02, 32),
        new THREE.MeshStandardMaterial({ color: 0x4488ff, transparent: true, opacity: 0.0 })
    );
    hl.position.set(c*CELL+OFFSET_X, 0.1, OFFSET_Z+(ROWS-1)*CELL+0.5);
    boardGroup.add(hl);
    colHighlights.push(hl);
}

const hoverDisc = new THREE.Mesh(discGeo, discMat1.clone());
hoverDisc.position.set(0, 5, 0);
hoverDisc.scale.set(0.01, 0.01, 0.01);
scene.add(hoverDisc);

function getDropRow(col) {
    for (let r=ROWS-1; r>=0; r--) if (state[col][r] === 0) return r;
    return -1;
}

function checkWin(col, row, player) {
    const dirs = [[[0,1],[0,-1]], [[1,0],[-1,0]], [[1,1],[-1,-1]], [[1,-1],[-1,1]]];
    for (const [dx, dy] of dirs) {
        let count = 1;
        for (const [sx, sy] of [dx, dy]) {
            let c = col+sx, r = row+sy;
            while (c>=0 && c<COLS && r>=0 && r<ROWS && state[c][r] === player) { count++; c+=sx; r+=sy; }
        }
        if (count >= 4) return true;
    }
    return false;
}

function dropDisc(col) {
    if (gameOver || animating) return;
    const row = getDropRow(col);
    if (row < 0) return;
    animating = true;
    state[col][row] = currentPlayer;
    const mat = currentPlayer === 1 ? discMat1.clone() : discMat2.clone();
    const disc = new THREE.Mesh(discGeo, mat);
    disc.castShadow = true;
    const startY = 12, targetY = 0.1;
    disc.position.set(col*CELL+OFFSET_X, startY, row*CELL+OFFSET_Z);
    boardGroup.add(disc);
    discMeshes[`${col}-${row}`] = disc;
    let t = 0;
    const drop = () => {
        t += 0.05;
        disc.position.y = startY + (targetY - startY) * (1 - Math.exp(-8*t));
        if (t < 1) requestAnimationFrame(drop);
        else {
            disc.position.y = targetY;
            if (checkWin(col, row, currentPlayer)) {
                gameOver = true;
                document.getElementById('panel').textContent = `Player ${currentPlayer} WINS! Click to restart`;
                document.getElementById('panel').style.color = currentPlayer === 1 ? '#ff2244' : '#ffdd00';
            } else if (state.every(c => c.every(v => v !== 0))) {
                gameOver = true;
                document.getElementById('panel').textContent = 'Draw! Click to restart';
            } else {
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                hoverDisc.material = currentPlayer === 1 ? discMat1.clone() : discMat2.clone();
            }
            animating = false;
        }
    };
    drop();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', e => {
    if (gameOver) return;
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    let col = -1;
    for (const hit of raycaster.intersectObjects(boardGroup.children)) {
        if (hit.object !== boardMesh) continue;
        col = Math.round((hit.point.x-OFFSET_X)/CELL);
        break;
    }
    colHighlights.forEach((hl, c) => { hl.material.opacity = c === col ? 0.6 : 0.0; });
    if (col >= 0 && col < COLS) {
        hoverDisc.position.x = col*CELL+OFFSET_X;
        hoverDisc.position.z = OFFSET_Z+(ROWS-1)*CELL+0.5;
        hoverDisc.scale.set(1, 1, 1);
    } else {
        hoverDisc.scale.set(0.01, 0.01, 0.01);
    }
});

window.addEventListener('click', e => {
    if (gameOver) {
        state.forEach(c => c.fill(0));
        Object.values(discMeshes).forEach(d => boardGroup.remove(d));
        Object.keys(discMeshes).forEach(k => delete discMeshes[k]);
        gameOver = false; currentPlayer = 1;
        hoverDisc.material = discMat1.clone();
        document.getElementById('panel').textContent = '3D Connect Four board game with gravity drop, win detection, and bloom glow';
        document.getElementById('panel').style.color = '#aaa';
        return;
    }
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    raycaster.setFromCamera(mouse, camera);
    for (const hit of raycaster.intersectObjects(boardGroup.children)) {
        if (hit.object !== boardMesh) continue;
        const col = Math.round((hit.point.x-OFFSET_X)/CELL);
        if (col >= 0 && col < COLS) dropDisc(col);
        break;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}
animate();
