// 2153. 程序化地形LOD
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1628)
scene.fog = new THREE.FogExp2(0x0a1628, 0.006)

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(60, 40, 80)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.85))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 20
controls.maxDistance = 250

scene.add(new THREE.AmbientLight(0x1a2a4a, 1.0))
const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.5)
sunLight.position.set(120, 180, 80)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
Object.assign(sunLight.shadow.camera, { near: 10, far: 500, left: -120, right: 120, top: 120, bottom: -120 })
sunLight.shadow.bias = -0.0003
scene.add(sunLight)
scene.add(Object.assign(new THREE.DirectionalLight(0x4488ff, 0.8), { position: new THREE.Vector3(-80, 60, -120) }))

scene.add(new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 24), new THREE.ShaderMaterial({
  uniforms: { topColor: { value: new THREE.Color(0x0a1628) }, bottomColor: { value: new THREE.Color(0x1a3a6a) }, offset: { value: 200 }, exponent: { value: 0.4 } },
  vertexShader: `varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform vec3 topColor,bottomColor;uniform float offset,exponent;varying vec3 vWP;void main(){float h=normalize(vWP+offset).y;gl_FragColor=vec4(mix(bottomColor,topColor,pow(max(h,0.),exponent)),1.);}`,
  side: THREE.BackSide
})))

function fbm(x, y, o = 5) { let h = 0, a = 1, f = 0.05, m = 0; for (let i = 0; i < o; i++) { h += (Math.sin(x*f*0.7+y*f*1.3)+Math.cos(x*f*1.3-y*f*0.9)*0.6+Math.sin((x+y)*f*0.5)*0.4)*a; m += a; a *= 0.45; f *= 2.1 } return h / m }

const terrainMeshes = []
const LOD = [{ segs: 128, yOff: 0, color: 0x2d5a27 }, { segs: 64, yOff: 0.15, color: 0x3d7a35 }, { segs: 32, yOff: 0.3, color: 0x4d9a43 }, { segs: 16, yOff: 0.45, color: 0x5dba51 }]
LOD.forEach(({ segs, yOff, color }) => {
  const geo = new THREE.PlaneGeometry(200, 200, segs, segs)
  const pos = geo.attributes.position
  for (let j = 0; j < pos.count; j++) {
    const x = pos.getX(j), y = pos.getY(j)
    pos.setZ(j, fbm(x, y) * 12 + Math.abs(Math.sin(x * 0.07 + y * 0.13) * Math.cos(x * 0.13 - y * 0.09)) * 5 - 3)
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true }))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = yOff
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)
  terrainMeshes.push(mesh)
})

const waterGeo = new THREE.PlaneGeometry(200, 200, 64, 64)
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0a2a4a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.82 })
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
water.position.y = -1.5
water.receiveShadow = true
scene.add(water)

const PCOUNT = 600
const pArr = new Float32Array(PCOUNT * 3)
for (let i = 0; i < PCOUNT; i++) { pArr[i*3]=(Math.random()-0.5)*180; pArr[i*3+1]=Math.random()*20+2; pArr[i*3+2]=(Math.random()-0.5)*180 }
const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3))
const pMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0x88ffaa) } },
  vertexShader: `uniform float time;varying float vA;void main(){vA=0.4+0.6*sin(time*2.+position.x*.5);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=(3.*(300./-mv.z))*vA;gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform vec3 color;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,(1.-d)*vA*.9);}`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
})
scene.add(new THREE.Points(pGeo, pMat))

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }))
hoverRing.rotation.x = -Math.PI / 2
hoverRing.visible = false
scene.add(hoverRing)

window.addEventListener('mousemove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1 })

const clock = new THREE.Clock()
const LOD_DIST = [0, 60, 100, 160, 220]

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const wp = waterGeo.attributes.position
  for (let i = 0; i < wp.count; i++) { const x = wp.getX(i), y = wp.getY(i); wp.setZ(i, Math.sin(x*.08+t*.8)*.3+Math.cos(y*.06+t*.6)*.25) }
  wp.needsUpdate = true
  waterMat.opacity = 0.75 + Math.sin(t * .5) * .07
  pMat.uniforms.time.value = t
  sunLight.intensity = 2.2 + Math.sin(t * .3) * .3
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(terrainMeshes)
  if (hits.length) { const pt = hits[0].point; hoverRing.position.set(pt.x, pt.y + .2, pt.z); hoverRing.visible = true; document.body.style.cursor = 'pointer' }
  else { hoverRing.visible = false; document.body.style.cursor = 'default' }
  const dist = camera.position.length()
  terrainMeshes.forEach((m, i) => m.visible = dist < LOD_DIST[i + 1] || i === terrainMeshes.length - 1)
  controls.update()
  composer.render()
}

animate()
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight) })
