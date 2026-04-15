// 2160. Fluid Shader Water — Enhanced Edition
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010a1a)
scene.fog = new THREE.FogExp2(0x010a1a, 0.016)

// ── Camera & Renderer ───────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 12, 22)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

// ── Post-Processing (Bloom) ─────────────────────────────────────────────────
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.35, 0.72))

// ── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x0a1f3c, 1.8))
const sun = new THREE.DirectionalLight(0x8ec8ff, 2.5)
sun.position.set(8, 18, 10); scene.add(sun)
scene.add(Object.assign(new THREE.DirectionalLight(0xff4d9a, 0.6), { position: new THREE.Vector3(-15, 5, -20) }))

// ── Water Shader ─────────────────────────────────────────────────────────────
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    uMouseDown:  { value: 0.0 },
    uRippleTime: { value: 0.0 },
    uRipplePos:  { value: new THREE.Vector2(0.5, 0.5) },
    uSunDir:     { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
  },
  vertexShader: `
    uniform float uTime, uMouseDown, uRippleTime;
    uniform vec2  uMouse, uRipplePos;
    varying vec2  vUv;
    varying vec3  vNormal, vWorldPos;
    varying float vElevation;
    vec3 gw(vec2 p,float s,float wl,float sp,float d){
      float k=6.28318/wl,c=sqrt(9.8/k),a=s/k;
      float w=d*k*(p.x+d*p.y)-c*sp*uTime;
      return vec3(d*a*cos(w),a*sin(w),d*a*cos(w));
    }
    void main(){
      vUv=uv; vec3 p=position;
      p+=gw(p.xy,.22,18.,.9, 1.); p+=gw(p.xy,.14,11.,1.1,-.7);
      p+=gw(p.xy,.09,6.5,1.4,.5); p+=gw(p.xy,.05,3.8,1.8,-1.);
      if(uMouseDown>.5){
        float age=uTime-uRippleTime,d=distance(uv,uRipplePos);
        p.z+=sin((d-age*3.)*18.)*exp(-age*1.8)*exp(-d*6.)*.45;
      }
      vElevation=p.z; vNormal=normalMatrix*vec3(0,0,1);
      vWorldPos=(modelMatrix*vec4(p,1)).xyz;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1);
    }
  `,
  fragmentShader: `
    uniform float uTime; uniform vec3 uSunDir;
    varying vec2 vUv; varying vec3 vNormal,vWorldPos; varying float vElevation;
    void main(){
      vec3 d=vec3(0,.06,.22),m=vec3(0,.28,.58),s=vec3(.05,.72,.88);
      float t=clamp(vElevation*1.8+.55,0.,1.);
      vec3 col=mix(d,m,t); col=mix(col,s,pow(t,2.5));
      vec3 vd=normalize(cameraPosition-vWorldPos);
      float sp=pow(max(dot(vNormal,normalize(uSunDir+vd)),0.),120.);
      col+=vec3(.95,.98,1.)*sp*1.8;
      float fr=pow(1.-max(dot(vNormal,vd),0.),3.5);
      col+=vec3(.12,.55,.92)*fr*.7;
      float foam=smoothstep(.38,.52,vElevation);
      col=mix(col,vec3(.85,.95,1.),foam*.65);
      col+=vec3(0,.45,.8)*max(0.,dot(vNormal,-uSunDir))*.25;
      gl_FragColor=vec4(col,.88+fr*.12);
    }
  `,
  transparent: true,
})

const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 256, 256), waterMat)
water.rotation.x = -Math.PI / 2; scene.add(water)

// ── Particles ───────────────────────────────────────────────────────────────
const N=500, pg=new THREE.BufferGeometry(), pbuf=new Float32Array(N*3)
for(let i=0;i<N;i++){pbuf[i*3]=(Math.random()-.5)*70;pbuf[i*3+1]=Math.random()*4+.2;pbuf[i*3+2]=(Math.random()-.5)*70}
pg.setAttribute('position', new THREE.BufferAttribute(pbuf,3))
const particles = new THREE.Points(pg, new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0}},
  vertexShader:`attribute float speed;uniform float uTime;varying float vA;
    void main(){vec3 p=position;p.y+=sin(uTime*speed+position.x*.3)*.3;
    vA=.3+.4*sin(uTime*speed*2.);vec4 mv=modelViewMatrix*vec4(p,1);
    gl_PointSize=3./-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);
    if(d>.5)discard;gl_FragColor=vec4(.5,.85,1.,vA*(1.-d*2.));}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
}))
scene.add(particles)

// ── Stars ───────────────────────────────────────────────────────────────────
const sg=new THREE.BufferGeometry(),sb=new Float32Array(600*3)
for(let i=0;i<600;i++){const th=Math.random()*6.28,ph=Math.random()*1.57,r=130+Math.random()*60
  sb[i*3]=r*Math.sin(ph)*Math.cos(th);sb[i*3+1]=r*Math.cos(ph)+10;sb[i*3+2]=r*Math.sin(ph)*Math.sin(th)}
sg.setAttribute('position',new THREE.BufferAttribute(sb,3))
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x8ec8ff,size:0.5,sizeAttenuation:true})))

// ── Mouse ───────────────────────────────────────────────────────────────────
const mouse=new THREE.Vector2()
window.addEventListener('mousemove',e=>{mouse.x=e.clientX/innerWidth;mouse.y=e.clientY/innerHeight
  waterMat.uniforms.uMouse.value.set(mouse.x,mouse.y)})
window.addEventListener('mousedown',()=>{
  waterMat.uniforms.uMouseDown.value=1.
  waterMat.uniforms.uRippleTime.value=waterMat.uniforms.uTime.value
  waterMat.uniforms.uRipplePos.value.set(mouse.x,mouse.y)})
window.addEventListener('mouseup',()=>{waterMat.uniforms.uMouseDown.value=0.})

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)})

// ── Animation Loop ────────────────────────────────────────────────────────────
const clock=new THREE.Clock(); let camAngle=0
;(function loop(){
  requestAnimationFrame(loop)
  const t=clock.getElapsedTime()
  waterMat.uniforms.uTime.value=t
  particles.material.uniforms.uTime.value=t
  camAngle+=.0006
  camera.position.set(Math.sin(camAngle)*22,12+Math.sin(t*.12)*1.5,Math.cos(camAngle)*22)
  camera.lookAt(0,0,0)
  composer.render()
})()
