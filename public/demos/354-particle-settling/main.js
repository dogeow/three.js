import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec6ff);
const camera = new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,500);
camera.position.set(0,40,80);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
scene.add(new THREE.AmbientLight(0xffffff,1.4));
scene.add(new THREE.HemisphereLight(0xfff4d6, 0x6a7a9a, 1.2));
const sun = new THREE.DirectionalLight(0xfff1cc, 4.5);
sun.position.set(40, 80, 30);
scene.add(sun);
const sunFill = new THREE.DirectionalLight(0xbfd4ff, 1.8);
sunFill.position.set(-30, 40, -20);
scene.add(sunFill);
const pl = new THREE.PointLight(0xff8a3d,2.2,120); pl.position.y=20; scene.add(pl);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0x7a88a8,roughness:0.9}));
floor.rotateX(-Math.PI/2); floor.position.y=-2; scene.add(floor);
const MAX=40000;
const dummy=new THREE.Object3D();
const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25,5,5),new THREE.MeshStandardMaterial({color:0xff8844,emissive:0x331100,roughness:0.3,metalness:0.5}),MAX);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);
const px=new Float32Array(MAX),py=new Float32Array(MAX),pz=new Float32Array(MAX);
const pvx=new Float32Array(MAX),pvy=new Float32Array(MAX),pvz=new Float32Array(MAX);
const pactive=new Uint8Array(MAX);
let activeCount=0;
function pour(x,y,z){
  for(let k=0;k<120&&activeCount<MAX;k++){
    let i=activeCount++;pactive[i]=1;
    px[i]=x+(Math.random()-0.5)*4;py[i]=y+Math.random()*3;pz[i]=z+(Math.random()-0.5)*4;
    pvx[i]=(Math.random()-0.5)*1.5;pvy[i]=0;pvz[i]=(Math.random()-0.5)*1.5;
  }
}
pour(0,35,0);
window.addEventListener("click",e=>{
  const raycaster=new THREE.Raycaster();
  const mouse=new THREE.Vector2((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
  raycaster.setFromCamera(mouse,camera);
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-10);
  const hit=new THREE.Vector3();
  raycaster.ray.intersectPlane(plane,hit);
  pour(hit.x,hit.y+35,hit.z);
});
let settled=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(0.033,0.05);
  settled=0;
  for(let i=0;i<MAX;i++){
    if(!pactive[i]){dummy.position.set(999,999,999);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);continue;}
    pvy[i]-=18*dt;
    if(py[i]<=-1.7){py[i]=-1.7;const vy=Math.abs(pvy[i]);pvy[i]=vy>0.5?-vy*0.25:0;pvx[i]*=0.75;pvz[i]*=0.75;if(pvy[i]<0.1&&Math.abs(pvx[i])<0.1&&Math.abs(pvz[i])<0.1)settled++;}
    px[i]+=pvx[i]*dt;py[i]+=pvy[i]*dt;pz[i]+=pvz[i]*dt;
    if(px[i]>39){px[i]=39;pvx[i]*=-0.5;}if(px[i]<-39){px[i]=-39;pvx[i]*=-0.5;}
    if(pz[i]>39){pz[i]=39;pvz[i]*=-0.5;}if(pz[i]<-39){pz[i]=-39;pvz[i]*=-0.5;}
    dummy.position.set(px[i],py[i],pz[i]);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  document.getElementById("cnt").textContent=settled;
  controls.update();renderer.render(scene,camera);
}
animate();
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});