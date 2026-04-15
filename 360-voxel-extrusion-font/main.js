import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050010);
const camera = new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,500);
camera.position.set(0,20,80);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;

scene.add(new THREE.AmbientLight(0x220033,1.0));
const dLight = new THREE.DirectionalLight(0xff44ff,2.0);
dLight.position.set(20,30,20);
scene.add(dLight);
scene.add(new THREE.PointLight(0x4444ff,3.0,100).translateY(10));

// 3D text using TextGeometry
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const fontUrl = "https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";
const loader = new FontLoader();

const dummy = new THREE.Object3D();
const VSIZE=0.8;
const VOXELS = [
  // "THREE"
  [0,0,0],[1,0,0],[2,0,0],[3,0,0],[4,0,0],
  [0,1,0],[4,1,0],
  [0,2,0],[1,2,0],[2,2,0],[3,2,0],[4,2,0],
  [0,3,0],[4,3,0],
  [0,4,0],[1,4,0],[2,4,0],[3,4,0],[4,4,0],
  // ".JS"
  [6,0,0],[7,0,0],
  [6,1,0],[7,1,0],
  [6,2,0],[7,2,0],
  [6,3,0],[7,3,0],
  [6,4,0],[7,4,0],
];

const blockGeo = new THREE.BoxGeometry(VSIZE,VSIZE,VSIZE);
const iCount = VOXELS.length;
const blockMesh = new THREE.InstancedMesh(blockGeo,
  new THREE.MeshStandardMaterial({color:0x8800ff,emissive:0x440088,roughness:0.2,metalness:0.8}),iCount);
blockMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
scene.add(blockMesh);

const blockPositions = VOXELS.map(([x,y,z])=>{
  const bx=(x-2.5)*VSIZE, by=y*VSIZE+5, bz=z*VSIZE+5;
  return {bx,by,bz};
});

// entrance animation
let phase=0;
const startTimes = VOXELS.map((_,i)=>i*0.08);
const targetY = VOXELS.map(([,,z])=>z*VSIZE+5);

function setMatrix(i,mx,my,mz,sx,sy,sz,rx,ry,rz){
  dummy.position.set(mx,my,mz);
  dummy.scale.set(sx,sy,sz);
  dummy.rotation.set(rx,ry,rz);
  dummy.updateMatrix();
  blockMesh.setMatrixAt(i,dummy.matrix);
}

const clock = new THREE.Clock();
let restartKey=-1;

function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  for(let i=0;i<iCount;i++){
    const {bx,by,bz}=blockPositions[i];
    const delay=startTimes[i];
    const localT=Math.max(0,t-delay);
    const progress=Math.min(localT*3,1);
    const ease=1-Math.pow(1-progress,3);
    const height=ease*by;
    const bounce=progress<1?(Math.sin(progress*Math.PI)*0.3):0;
    const hue=(i/iCount);
    const col=new THREE.Color().setHSL(hue*0.3+0.7,1.0,0.5);
    blockMesh.setColorAt(i,col);
    setMatrix(i,bx,height+bounce,bz,VSIZE,VSIZE*(ease+0.1),VSIZE,0,0,0);
  }
  blockMesh.instanceMatrix.needsUpdate=true;
  if(blockMesh.instanceColor)blockMesh.instanceColor.needsUpdate=true;
  controls.update();
  renderer.render(scene,camera);
}
animate();

window.addEventListener("keydown",e=>{
  if(e.key===" "){clock.getDelta();clock.start();}
});
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});