// 006. Basic Lights — 在上一个旋转立方体场景上切换不同光源
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(3, 3, 5)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

const geometry = new THREE.BoxGeometry(2, 2, 2)
const material = new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.3, metalness: 0.2 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x20243a, roughness: 0.95, metalness: 0.05 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.8
scene.add(ground)

const lightConfigs = [
  {
    key: '1',
    name: 'AmbientLight',
    text: '环境光：整体一起变亮，没有明确受光方向。',
    color: 0xffffff,
    create: () => new THREE.AmbientLight(0xffffff, 1.6),
  },
  {
    key: '2',
    name: 'DirectionalLight',
    text: '平行光：像太阳光，能明显看到明暗面方向。',
    color: 0xffe6b3,
    create: () => {
      const light = new THREE.DirectionalLight(0xffe6b3, 2.6)
      light.position.set(4, 6, 8)
      return light
    },
  },
  {
    key: '3',
    name: 'PointLight',
    text: '点光源：从一个点向四周发散，靠近的一侧更亮。',
    color: 0x66aaff,
    create: () => {
      const light = new THREE.PointLight(0x66aaff, 18, 14, 2)
      light.position.set(2.8, 2.5, 3.4)
      return light
    },
  },
  {
    key: '4',
    name: 'SpotLight',
    text: '聚光灯：锥形光束，只照亮一个更集中的区域。',
    color: 0xff66cc,
    create: () => {
      const light = new THREE.SpotLight(0xff66cc, 36, 14, Math.PI / 10, 0.18, 1.4)
      light.position.set(2.2, 3.8, 3.2)
      light.target.position.set(0, 0.2, 0)
      scene.add(light.target)
      return light
    },
  },
]

let activeLight = null
const indicators = []

const bar = document.createElement('div')
bar.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:10;flex-wrap:wrap;justify-content:center'
document.body.appendChild(bar)

const labelDiv = document.createElement('div')
labelDiv.style.cssText = 'position:fixed;top:74px;left:50%;transform:translateX(-50%);color:#d5d9e8;font:13px/1.6 monospace;pointer-events:none;text-shadow:0 1px 3px #000;background:rgba(12,14,24,0.72);padding:10px 16px;border-radius:8px;text-align:center;min-width:320px'
document.body.appendChild(labelDiv)

const hintDiv = document.createElement('div')
hintDiv.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);color:#7d86a9;font:12px monospace;pointer-events:none'
hintDiv.textContent = '按 1 / 2 / 3 / 4 切换光源类型'
document.body.appendChild(hintDiv)

function toHex(color) {
  return '#' + color.toString(16).padStart(6, '0')
}

function clearIndicators() {
  indicators.splice(0).forEach((node) => {
    scene.remove(node)
  })
}

function createIndicator(config) {
  if (config.name === 'AmbientLight') return

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: config.color })
  )

  if (config.name === 'DirectionalLight') marker.position.set(4, 6, 8)
  if (config.name === 'PointLight') marker.position.set(2.8, 2.5, 3.4)
  if (config.name === 'SpotLight') marker.position.set(2.2, 3.8, 3.2)

  indicators.push(marker)
  scene.add(marker)
}

const buttons = lightConfigs.map((config, index) => {
  const button = document.createElement('button')
  const color = toHex(config.color)
  button.style.cssText = `padding:8px 14px;border-radius:8px;border:1px solid ${color};background:rgba(0,0,0,0.45);color:${color};font:600 12px monospace;cursor:pointer;transition:all .15s;`
  button.textContent = `${config.key} ${config.name}`
  button.addEventListener('click', () => setActive(index))
  bar.appendChild(button)
  return button
})

function setActive(index) {
  if (activeLight) {
    if (activeLight.target) scene.remove(activeLight.target)
    scene.remove(activeLight)
  }

  clearIndicators()
  activeLight = lightConfigs[index].create()
  scene.add(activeLight)
  createIndicator(lightConfigs[index])

  buttons.forEach((button, buttonIndex) => {
    const color = toHex(lightConfigs[buttonIndex].color)
    button.style.background = buttonIndex === index ? color : 'rgba(0,0,0,0.45)'
    button.style.color = buttonIndex === index ? '#0b1020' : color
  })

  const color = toHex(lightConfigs[index].color)
  labelDiv.innerHTML = `<div style="color:${color};font-weight:700">${lightConfigs[index].name}</div><div>${lightConfigs[index].text}</div>`
}

setActive(0)

window.addEventListener('keydown', (event) => {
  const index = Number.parseInt(event.key, 10) - 1
  if (index >= 0 && index < lightConfigs.length) {
    setActive(index)
  }
})

function animate() {
  requestAnimationFrame(animate)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
