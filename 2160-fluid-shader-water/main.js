// 2160. 着色器水面 — Enhanced
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010a1a)
scene.fog = new THREE.FogExp2(0x010a1a, 0.016)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 12, 22)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.35, 0.72))

scene.add(new THREE.AmbientLight(0x0a1f3c, 1.8))
const sun = new THREE.DirectionalLight(0x8ec8ff, 2.5)
sun.position.set(8, 18, 10)
scene.add(sun)
scene.add(Object.assign(new THREE.DirectionalLight(0xff4d9a, 0.6), { position: new THREE.Vector3(-15, 5, -20) }))

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
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uMouseDown;
    uniform float uRippleTime;
    uniform vec2  uRipplePos;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vElevation;

    vec3 gw(vec2 p, float s, float wl, float spd, float d) {
      float k = 6.28318 / wl, c = sqrt(9.8 / k), a = s / k;
      float w = d * k * (p.x + d * p.y) - c * spd * uTime;
      return vec3(d * a * cos(w), a * sin(w), d * a * cos(w));
    }
    void main() {
      vUv = uv;
      vec3 p = position;
      p += gw(p.xy, 0.22, 18.0, 0.9,  1.0);
      p += gw(p.xy, 0.14, 11.0, 1.1, -0.7);
      p += gw(p.xy, 0.09,  6.5, 1.4,  0.5);
      p += gw(p.xy, 0.05,  3.8, 1.8, -1.0);
      if (uMouseDown > 0.5) {
        float age = uTime - uRippleTime;
        float d = distance(uv, uRipplePos);
        p.z += sin((d - age * 3.0) * 18.0) * exp(-age * 1.8) * exp(-d * 6.0) * 0.45;
      }
      vElevation = p.z;
      vNormal    = normalMatrix * vec3(0,0,1);
      vWorldPos  = (modelMatrix * vec4(p,1)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3  uSunDir;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vElevation;
    void main() {
      vec3 deep=vec3(0.0,0.06,0.22), mid=vec3(0.0,0.28,0.58), shallow=vec3(0.05,0.72,0.88);
      float t = clamp(vElevation*1.8+0.55, 0.0, 1.0);
      vec3 col = mix(deep, mid, t);
      col = mix(col, shallow, pow(t, 2.5));
      vec3 vd = normalize(cameraPosition - vWorldPos);
      float sp = pow(max(dot(vNormal, normalize(uSunDir+vd)), 0.0), 120.0);
      col += vec3(0.95,0.98,1.0)*sp*1.8;
      float fr = pow(1.0-max(dot(vNormal,vd),0.0), 3.5);
      col += vec3(0.12,0.55,0.92)*fr*0.7;
      float foam = smoothstep(0.38, 0.52, vElevation);
      col = mix(col, vec3(0.85,0.95,1.0), foam*0.65);
      col += vec3(0.0,0.45,0.8)*max(0.0,dot(vNormal,-uSunDir))*0.25;
      gl_FragColor = vec4(col, 0.88+fr*0.12);
    }
  `,
  transparent: true,
})

const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 256, 256), waterMat)
water.rotation.x = -Math.PI / 2
scene.add(water)

// 浮游粒子
const N = 500
const pg = new THREE.BufferGeometry()
const pbuf = new Float32Array(N * 3)
for (let i = 0; i < N; i++) {
  pbuf[i*3]   = (Math.random()-0.5)*70
  pbuf[i*3+1] = Math.random()*4+0.2
  pbuf[i*3+2] = (Math.random()-0.5)*70
}
pg.setAttribute('position', new THREE.BufferAttribute(pbuf, 3))
const particles = new THREE.Points(pg, new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `attribute float speed;uniform float uTime;varying float vA;
    void main(){vec3 p=position;p.y+=sin(uTime*speed+position.x*.3)*.3;
    vA=.3+.4*sin(uTime*speed*2.);vec4 mv=modelViewMatrix*vec4(p,1);
    gl_PointSize=3./-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `varying float vA;void main(){float d=length(gl_PointCoord-.5);
    if(d>.5)discard;gl_FragColor=vec4(.5,.85,1.,vA*(1.-d*2.));}`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
}))
scene.add(particles)

const sg = new THREE.BufferGeometry()
const sb = new Float32Array(600*3)
for (let i = 0; i < 600; i++) {
  const th=Math.random()*6.28, ph=Math.random()*1.57, r=130+Math.random()*60
  sb[i*3]=r*Math.sin(ph)*Math.cos(th); sb[i*3+1]=r*Math.cos(ph)+10; sb[i*3+2]=r*Math.sin(ph)*Math.sin(th)
}
sg.setAttribute('position', new THREE.BufferAttribute(sb, 3))
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8ec8ff, size: 0.5, sizeAttenuation: true })))

const mouse = new THREE.Vector2()
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX/innerWidth; mouse.y = e.clientY/innerHeight
  waterMat.uniforms.uMouse.value.set(mouse.x, mouse.y)
})
window.addEventListener('mousedown', () => {
  waterMat.uniforms.uMouseDown.value = 1.0
  waterMat.uniforms.uRippleTime.value = waterMat.uniforms.uTime.value
  waterMat.uniforms.uRipplePos.value.set(mouse.x, mouse.y)
})
window.addEventListener('mouseup', () => { waterMat.uniforms.uMouseDown.value = 0.0 })

const clock = new THREE.Clock()
let camAngle = 0

(function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  waterMat.uniforms.uTime.value = t
  particles.material.uniforms.uTime.value = t
  camAngle += 0.0006
  camera.position.set(Math.sin(camAngle)*22, 12+Math.sin(t*.12)*1.5, Math.cos(camAngle)*22)
  camera.lookAt(0, 0, 0)
  composer.render()
})()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
