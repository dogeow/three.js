// 2152. 着色器水面 - Enhanced Edition
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x001133, 0.012)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 12, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.1
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85))

scene.add(new THREE.AmbientLight(0x404060, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)
const ptLight1 = new THREE.PointLight(0x00aaff, 2, 50)
ptLight1.position.set(-10, 5, -10)
scene.add(ptLight1)
const ptLight2 = new THREE.PointLight(0xff6600, 1.5, 50)
ptLight2.position.set(15, 3, 5)
scene.add(ptLight2)

const waterGeo = new THREE.PlaneGeometry(60, 60, 200, 200)
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseInfl: { value: 0.0 },
    uDeep: { value: new THREE.Color(0x001133) },
    uShallow: { value: new THREE.Color(0x0066aa) },
    uFoam: { value: new THREE.Color(0xaaddff) },
    uL1: { value: new THREE.Vector3(-10, 5, -10) },
    uL2: { value: new THREE.Vector3(15, 3, 5) }
  },
  vertexShader: `
    uniform float uTime; uniform vec2 uMouse; uniform float uMouseInfl;
    varying vec2 vUv; varying vec3 vNorm; varying vec3 vPos; varying float vH;
    void main() {
      vUv = uv; vec3 p = position;
      float w1 = sin(p.x*0.5+uTime*1.2)*0.5, w2 = cos(p.y*0.3+uTime*0.8)*0.4;
      float w3 = sin((p.x+p.y)*0.2+uTime*1.5)*0.3, w4 = sin(p.x*0.15+uTime)*sin(p.y*0.15+uTime*0.8)*0.8;
      float tw = w1+w2+w3+w4;
      float d = distance(p.xy, uMouse*30.0);
      tw += sin(d*0.5-uTime*3.0)*exp(-d*0.1)*uMouseInfl*1.5;
      p.z += tw; vH = tw;
      float dl = 0.1;
      float hL = sin((p.x-dl)*0.5+uTime*1.2)*0.5+cos(p.y*0.3+uTime*0.8)*0.4;
      float hR = sin((p.x+dl)*0.5+uTime*1.2)*0.5+cos(p.y*0.3+uTime*0.8)*0.4;
      float hD = sin(p.x*0.5+uTime*1.2)*0.5+cos((p.y-dl)*0.3+uTime*0.8)*0.4;
      float hU = sin(p.x*0.5+uTime*1.2)*0.5+cos((p.y+dl)*0.3+uTime*0.8)*0.4;
      vNorm = normalize(vec3(hL-hR, 2.0*dl, hD-hU)); vPos = p;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
    }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uDeep,uShallow,uFoam,uL1,uL2;
    varying vec2 vUv; varying vec3 vNorm; varying vec3 vPos; varying float vH;
    void main() {
      vec3 vc = mix(uDeep, uShallow, smoothstep(-1.5,1.5,vH));
      vec3 vd = normalize(cameraPosition-vPos);
      vec3 r1 = reflect(-normalize(uL1-vPos), vNorm);
      vec3 r2 = reflect(-normalize(uL2-vPos), vNorm);
      float sp = pow(max(dot(vd,r1),0.0),64.0)*0.8 + pow(max(dot(vd,r2),0.0),64.0)*0.5;
      float fm = smoothstep(0.8,1.5,vH)*0.6;
      float ca = sin(vPos.x*3.0+uTime*2.0)*sin(vPos.y*3.0+uTime*1.5)*0.1;
      float fr = pow(1.0-max(dot(vd,vNorm),0.0),3.0);
      vec3 fc = vc + vec3(sp) + fm*uFoam + ca;
      fc = mix(fc, vec3(0.8,0.9,1.0), fr*0.3);
      gl_FragColor = vec4(fc, 0.92);
    }`,
  transparent: true, side: THREE.DoubleSide
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
scene.add(water)

const ptGeo = new THREE.BufferGeometry()
const ptPos = new Float32Array(300*3)
for(let i=0;i<300;i++){ptPos[i*3]=(Math.random()-0.5)*60;ptPos[i*3+1]=Math.random()*8+1;ptPos[i*3+2]=(Math.random()-0.5)*60}
ptGeo.setAttribute('position',new THREE.BufferAttribute(ptPos,3))
const ptMat = new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uColor:{value:new THREE.Color(0x88ccff)}},
  vertexShader:`attribute float size;varying float vA;uniform float uTime;
    void main(){vec3 p=position;p.y+=sin(uTime*0.5+p.x*0.1)*0.3;
      vA=0.6+sin(uTime+p.x)*0.3;vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=size*(200.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;uniform vec3 uColor;
    void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
      gl_FragColor=vec4(uColor,smoothstep(0.5,0.0,d)*vA);}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
})
const pts = new THREE.Points(ptGeo, ptMat)
scene.add(pts)

const mouse = new THREE.Vector2(), targetMouse = new THREE.Vector2()
let mouseInfl = 0
window.addEventListener('mousemove',e=>{targetMouse.x=e.clientX/window.innerWidth*2-1;targetMouse.y=-(e.clientY/window.innerHeight)*2+1;mouseInfl=1.0})
window.addEventListener('touchmove',e=>{if(e.touches.length>0){targetMouse.x=e.touches[0].clientX/window.innerWidth*2-1;targetMouse.y=-(e.touches[0].clientY/window.innerHeight)*2+1;mouseInfl=1.0}})
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);composer.setSize(window.innerWidth,window.innerHeight)})

const clock = new THREE.Clock()
function animate(){requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  mouse.x+=(targetMouse.x-mouse.x)*0.05;mouse.y+=(targetMouse.y-mouse.y)*0.05;mouseInfl*=0.98
  waterMat.uniforms.uTime.value=t;waterMat.uniforms.uMouse.value.set(mouse.x,mouse.y);waterMat.uniforms.uMouseInfl.value=mouseInfl
  ptLight1.position.x=Math.sin(t*0.5)*15;ptLight1.position.z=Math.cos(t*0.5)*15
  ptLight2.position.x=Math.cos(t*0.3)*12;ptLight2.position.z=Math.sin(t*0.3)*12
  ptMat.uniforms.uTime.value=t
  controls.update();composer.render()
}
animate()
