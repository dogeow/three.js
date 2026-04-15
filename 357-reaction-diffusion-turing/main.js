import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const W=512,H=512;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x050a05);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);

const renderer=new THREE.WebGLRenderer({antialias:false});
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

// Simulation shaders
const simVS=`void main(){gl_Position=vec4(position,1.0);}`;
const simFS=`
precision highp float;
uniform sampler2D uState;
uniform vec2 uRes;
uniform float uFeed;
uniform float uKill;
uniform float uDt;
uniform vec2 uBrush;
uniform float uBrushR;
uniform float uBrushOn;
const float Da=1.0;const float Db=0.5;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 px=1.0/uRes;
  vec4 c=texture2D(uState,uv);
  float a=c.r,b=c.g;
  float lapA=(texture2D(uState,uv+vec2(-px.x,0)).r+texture2D(uState,uv+vec2(px.x,0)).r+
              texture2D(uState,uv+vec2(0,-px.y)).r+texture2D(uState,uv+vec2(0,px.y)).r-4.0*a);
  float lapB=(texture2D(uState,uv+vec2(-px.x,0)).g+texture2D(uState,uv+vec2(px.x,0)).g+
              texture2D(uState,uv+vec2(0,-px.y)).g+texture2D(uState,uv+vec2(0,px.y)).g-4.0*b);
  float reaction=a*b*b;
  float na=a+(Da*lapA-reaction+uFeed*(1.0-a))*uDt;
  float nb=b+(Db*lapB+reaction-(uFeed+uKill)*b)*uDt;
  na=clamp(na,0.0,1.0);nb=clamp(nb,0.0,1.0);
  if(uBrushOn>0.5){
    float d=distance(uv,uBrush);
    if(d<uBrushR)nb=1.0;
  }
  gl_FragColor=vec4(na,nb,0.0,1.0);
}`;

function makeFBO(w,h){
  const geo=new THREE.PlaneGeometry(2,2);
  const mat=new THREE.ShaderMaterial({
    uniforms:{uState:{value:null},uRes:{value:new THREE.Vector2(w,h)},
              uFeed:{value:0.055},uKill:{value:0.062},uDt:{value:1.0},
              uBrush:{value:new THREE.Vector2(0.5,0.5)},uBrushR:{value:0.02},uBrushOn:{value:0.0}},
    vertexShader:simVS,fragmentShader:simFS,depthTest:false,depthWrite:false
  });
  const scene2=new THREE.Scene();scene2.add(new THREE.Mesh(geo,mat));
  const rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  return {scene:scene2,mat,rt};
}

function makeDisplay(){
  const geo=new THREE.PlaneGeometry(2,2);
  const mat=new THREE.ShaderMaterial({
    uniforms:{uState:{value:null}},
    vertexShader:simVS,
    fragmentShader:`
      precision highp float;
      uniform sampler2D uState;
      void main(){
        vec2 uv=gl_FragCoord.xy/512.0;
        float b=texture2D(uState,uv).g;
        vec3 col=mix(vec3(0.02,0.12,0.02),vec3(0.2,0.9,0.3),b);
        col=mix(col,vec3(0.9,0.5,0.1),smoothstep(0.4,0.6,b));
        gl_FragColor=vec4(col,1.0);
      }`,
    depthTest:false,depthWrite:false
  });
  const s=new THREE.Scene();s.add(new THREE.Mesh(geo,mat));
  return {scene:s,mat};
}

const fboA=makeFBO(W,H),fboB=makeFBO(W,H);
const display=makeDisplay();
let readFBO=fboA,writeFBO=fboB;

function initState(){
  const data=new Float32Array(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    const cx=W/2,cy=H/2,r=40;
    const d=Math.sqrt((x-cx)**2+(y-cy)**2);
    if(d<r){data[i]=0.0;data[i+1]=1.0;}
    else{data[i]=1.0;data[i+1]=0.0;}
    data[i+2]=0;data[i+3]=1;
  }
  const tex=new THREE.DataTexture(data,W,H,THREE.RGBAFormat,THREE.FloatType);
  tex.needsUpdate=true;
  readFBO.mat.uniforms.uState.value=tex;
  writeFBO.mat.uniforms.uState.value=tex;
}

initState();
let brushOn=false,brushX=0.5,brushY=0.5;

window.addEventListener("mousedown",()=>brushOn=true);
window.addEventListener("mouseup",()=>brushOn=false);
window.addEventListener("mousemove",e=>{
  brushX=e.clientX/innerWidth;brushY=1.0-e.clientY/innerHeight;
});
window.addEventListener("touchstart",e=>{brushOn=true;const t=e.touches[0];brushX=t.clientX/innerWidth;brushY=1.0-t.clientY/innerHeight;});
window.addEventListener("touchend",()=>brushOn=false);
window.addEventListener("touchmove",e=>{const t=e.touches[0];brushX=t.clientX/innerWidth;brushY=1.0-t.clientY/innerHeight;});

function animate(){
  requestAnimationFrame(animate);
  writeFBO.mat.uniforms.uBrush.value.set(brushX,brushY);
  writeFBO.mat.uniforms.uBrushOn.value=brushOn?1.0:0.0;
  writeFBO.mat.uniforms.uState.value=readFBO.rt.texture;
  renderer.setRenderTarget(writeFBO.rt);
  renderer.render(writeFBO.scene,camera);
  renderer.setRenderTarget(null);
  display.mat.uniforms.uState.value=writeFBO.rt.texture;
  renderer.render(display.scene,camera);
  const tmp=readFBO;readFBO=writeFBO;writeFBO=tmp;
}
animate();
window.addEventListener("resize",()=>renderer.setSize(innerWidth,innerHeight));