// 4191. Shadow Puppet Theater Optics
// Shadow puppet theater — light projection, hand-crafted silhouettes, Chinese shadow play, parallax depth effect

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let puppets = {};
let activePuppet = null;
let t = 0;

function createBirdShape() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.8, 0.3, -1.2, 0.8, -0.5, 1.0);
    shape.bezierCurveTo(0, 1.2, 0.5, 1.2, 0.8, 0.8);
    shape.bezierCurveTo(1.5, 0.3, 1.2, -0.2, 0.8, -0.1);
    shape.bezierCurveTo(0.5, 0, 0.3, -0.1, 0, 0);
    return new THREE.ShapeGeometry(shape);
}

function createDancerShape() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x110800, side: THREE.DoubleSide });
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), mat);
    head.position.set(0, 1.4, 0);
    group.add(head);
    const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), mat);
    body.position.set(0, 0.5, 0);
    group.add(body);
    const armL = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.1), mat);
    armL.position.set(-0.6, 0.9, 0);
    armL.rotation.z = 0.5;
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.1), mat);
    armR.position.set(0.6, 0.9, 0);
    armR.rotation.z = -0.5;
    group.add(armR);
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(0.6, 4), mat);
    skirt.scale.y = 0.5;
    skirt.position.y = -0.1;
    group.add(skirt);
    return group;
}

function createDragonShape() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x110800, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
        const seg = new THREE.Mesh(new THREE.CircleGeometry(0.22 - i * 0.015, 12), mat);
        seg.position.set(i * 0.38 - 1.4, Math.sin(i * 0.5) * 0.25, 0);
        group.add(seg);
    }
    const headShape = new THREE.Shape();
    headShape.moveTo(0, 0);
    headShape.lineTo(0.5, 0.25);
    headShape.lineTo(0.7, 0);
    headShape.lineTo(0.5, -0.25);
    headShape.lineTo(0, 0);
    const head = new THREE.Mesh(new THREE.ShapeGeometry(headShape), mat);
    head.position.set(1.7, 0, 0);
    group.add(head);
    return group;
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;

    // Screen
    const screenGeo = new THREE.PlaneGeometry(10, 7);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x2a1800, roughness: 0.95 });
    screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = -2;
    scene.add(screenMesh);

    // Light
    const lightBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffee88 })
    );
    lightBulb.position.set(0, 3, 2);
    scene.add(lightBulb);

    const spot = new THREE.SpotLight(0xffee88, 4, 30, Math.PI / 7, 0.4);
    spot.position.copy(lightBulb.position);
    spot.target.position.set(0, 0, -2);
    scene.add(spot);
    scene.add(spot.target);

    // Ambient fill
    scene.add(new THREE.AmbientLight(0x221100, 0.3));

    const puppetGroup = new THREE.Group();
    scene.add(puppetGroup);
    scene.userData.puppetGroup = puppetGroup;

    puppets.bird = createBirdShape();
    puppets.dancer = createDancerShape();
    puppets.dragon = createDragonShape();

    Object.values(puppets).forEach(p => { p.visible = false; puppetGroup.add(p); });
    activePuppet = 'bird';
    puppets.bird.visible = true;
}

let screenMesh;

function animatePuppets() {
    const t2 = t;
    if (puppets.bird.visible) {
        puppets.bird.rotation.z = Math.sin(t2 * 2.2) * 0.35;
        puppets.bird.position.y = Math.sin(t2 * 1.5) * 0.6;
        puppets.bird.position.x = Math.sin(t2 * 0.6) * 1.8;
    }
    if (puppets.dancer.visible) {
        puppets.dancer.rotation.y = Math.sin(t2 * 1.3) * 0.6;
        puppets.dancer.children[2].rotation.z = 0.5 + Math.sin(t2 * 3.0) * 0.4;
        puppets.dancer.children[3].rotation.z = -0.5 - Math.cos(t2 * 3.0) * 0.4;
        puppets.dancer.children[4].rotation.y = Math.sin(t2 * 2.0) * 0.3;
    }
    if (puppets.dragon.visible) {
        for (let i = 0; i < puppets.dragon.children.length - 1; i++) {
            puppets.dragon.children[i].position.y = Math.sin(t2 * 2.0 + i * 0.6) * 0.35;
        }
        puppets.dragon.position.x = Math.sin(t2 * 0.5) * 1.5;
    }
}

function animate() {
    requestAnimationFrame(animate);
    t += 0.016;
    animatePuppets();
    controls.update();
    renderer.render(scene, camera);
}

window.toggleBird = function() {
    Object.values(puppets).forEach(p => p.visible = false);
    puppets.bird.visible = true;
    activePuppet = 'bird';
};
window.toggleDancer = function() {
    Object.values(puppets).forEach(p => p.visible = false);
    puppets.dancer.visible = true;
    activePuppet = 'dancer';
};
window.toggleDragon = function() {
    Object.values(puppets).forEach(p => p.visible = false);
    puppets.dragon.visible = true;
    activePuppet = 'dragon';
};

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

init();
animate();
