// 003. Basic Lights — 四种光源逐个展示
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 20)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// 地面
const groundGeo = new THREE.PlaneGeometry(20, 20)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = 0
ground.receiveShadow = true
scene.add(ground)

// 通用材质
const sphereGeo = new THREE.SphereGeometry(1.5, 32, 32)

// ── AmbientLight（环境光）──────────────────────────────────────────────
const ambientMesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
ambientMesh.position.set(-5, 1.5, 0)
ambientMesh.castShadow = true
ambientMesh.receiveShadow = true
scene.add(ambientMesh)

const ambientLight = new THREE.AmbientLight(0xffffff, 0)
scene.add(ambientLight)

// 小灯泡标记
const bulbGeo = new THREE.SphereGeometry(0.25, 12, 12)

// ── DirectionalLight（平行光）──────────────────────────────────────────
const dirMesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
dirMesh.position.set(0, 1.5, 0)
dirMesh.castShadow = true
dirMesh.receiveShadow = true
scene.add(dirMesh)

const dirLight = new THREE.DirectionalLight(0xffeebb, 0)
dirLight.position.set(5, 10, 5)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(1024, 1024)
dirLight.shadow.camera.near = 1
dirLight.shadow.camera.far = 30
dirLight.shadow.camera.left = -8
dirLight.shadow.camera.right = 8
dirLight.shadow.camera.top = 8
dirLight.shadow.camera.bottom = -8
scene.add(dirLight)

const sunMark = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffeebb }))
sunMark.position.set(5, 10, 5)
scene.add(sunMark)

// ── PointLight（点光源）───────────────────────────────────────────────
const pointMesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
pointMesh.position.set(5, 1.5, 0)
pointMesh.castShadow = true
pointMesh.receiveShadow = true
scene.add(pointMesh)

const pointLight = new THREE.PointLight(0x4488ff, 0, 25)
pointLight.position.set(5, 4, 0)
pointLight.castShadow = true
pointLight.shadow.mapSize.set(1024, 1024)
scene.add(pointLight)

const pointBulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0x4488ff }))
pointBulb.position.set(5, 4, 0)
scene.add(pointBulb)

// ── SpotLight（聚光灯）────────────────────────────────────────────────
const spotMesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }))
spotMesh.position.set(0, 1.5, -5)
spotMesh.castShadow = true
spotMesh.receiveShadow = true
scene.add(spotMesh)

const spotLight = new THREE.SpotLight(0xff44ff, 0)
spotLight.position.set(0, 8, -5)
spotLight.target.position.set(0, 0, -5)
spotLight.angle = Math.PI / 8
spotLight.penumbra = 0.3
spotLight.castShadow = true
spotLight.shadow.mapSize.set(1024, 1024)
scene.add(spotLight)
scene.add(spotLight.target)

const spotBulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xff44ff }))
spotBulb.position.set(0, 8, -5)
scene.add(spotBulb)

// ── 标签信息 ───────────────────────────────────────────────────────────
const lightInfo = [
  { light: ambientLight, color: 0xffffff, text: 'AmbientLight\n环境光\n均匀照亮，无方向，无阴影' },
  { light: dirLight,    color: 0xffeebb, text: 'DirectionalLight\n平行光\n像太阳光，有阴影' },
  { light: pointLight,  color: 0x4488ff, text: 'PointLight\n点光源\n向四周发散，有距离衰减' },
  { light: spotLight,   color: 0xff44ff, text: 'SpotLight\n聚光灯\n锥形光束，边缘可柔化' },
]
const lightIntensity = [1, 2, 3, 4]

let activeIdx = 0

// ── UI：四个平铺按钮 ───────────────────────────────────────────────────
const bar = document.createElement('div')
bar.style.cssText = `
  position:fixed; top:20px; left:50%; transform:translateX(-50%);
  display:flex; gap:10px; z-index:10;
`
document.body.appendChild(bar)

const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);color:#ccc;font:13px monospace;line-height:1.7;pointer-events:none;text-shadow:0 1px 3px #000;background:rgba(0,0,0,0.5);padding:10px 18px;border-radius:6px;text-align:center'
document.body.appendChild(labelDiv)

const hintDiv = document.createElement('div')
hintDiv.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#555;font:12px monospace;pointer-events:none'
hintDiv.textContent = '按 1 / 2 / 3 / 4 切换光源'
document.body.appendChild(hintDiv)

const btnData = []
lightInfo.forEach((info, i) => {
  const btn = document.createElement('button')
  const colorHex = '#' + info.color.toString(16).padStart(6, '0')
  btn.style.cssText = `
    padding: 8px 18px; border-radius: 8px; border: 1.5px solid ${colorHex};
    background: rgba(0,0,0,0.6); color: ${colorHex};
    font: bold 12px monospace; cursor: pointer; transition: all 0.15s;
    font-family: 'Courier New', monospace;
  `
  btn.textContent = `${i + 1} ${['AmbientLight', 'DirectionalLight', 'PointLight', 'SpotLight'][i]}`
  btn.dataset.idx = i
  btn.addEventListener('click', () => setActive(i))
  bar.appendChild(btn)
  btnData.push(btn)
})

function setActive(idx) {
  // 关闭所有
  lightInfo.forEach(info => { info.light.intensity = 0 })
  btnData.forEach(b => {
    b.style.background = 'rgba(0,0,0,0.6)'
    b.style.color = b.style.borderColor
  })

  // 开启当前
  lightInfo[idx].light.intensity = lightIntensity[idx]
  btnData[idx].style.background = colorHex(lightInfo[idx].color)
  btnData[idx].style.color = '#000'

  // 更新标签
  const l = lightInfo[idx]
  const ch = l.color.toString(16).padStart(6, '0')
  labelDiv.innerHTML = l.text.split('\n').map((line, i) =>
    `<div style="color:#${ch};font-weight:${i===0?'bold':'normal'}">${line}</div>`
  ).join('')
}

function colorHex(c) {
  return '#' + c.toString(16).padStart(6, '0')
}

// 默认开启 AmbientLight
setActive(0)

// ── 键盘切换 1-4 ───────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  const n = parseInt(e.key)
  if (n >= 1 && n <= 4) setActive(n - 1)
})

// ── 动画 ───────────────────────────────────────────────────────────────
let t = 0
function animate() {
  requestAnimationFrame(animate)
  t += 0.016

  // PointLight 上下浮动
  pointBulb.position.y = 4 + Math.sin(t * 2) * 1.5
  pointLight.position.y = pointBulb.position.y

  // SpotLight 轻微摆动
  spotLight.target.position.x = Math.sin(t * 0.5) * 0.5
  spotBulb.position.x = Math.sin(t * 0.5) * 0.5
  spotLight.position.x = spotBulb.position.x

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
