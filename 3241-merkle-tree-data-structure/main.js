// 3241. Merkle Tree Data Structure
// Merkle树数据结构可视化 - 区块链默克尔树的构建与验证过程3D可视化
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050f1a)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0x88ccff, 0.8)
dirLight.position.set(10, 30, 10)
scene.add(dirLight)

const params = {
  leafCount: 8,
  animationSpeed: 1,
  highlightVerified: false,
  verifiedNode: 0,
  showHashes: true,
  colorScheme: 'neon'
}

const LEAF_DATA = ['TX-A', 'TX-B', 'TX-C', 'TX-D', 'TX-E', 'TX-F', 'TX-G', 'TX-H']

// Simple hash function
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

function computeMerkle(data) {
  if (data.length === 0) return null
  let level = data.map(d => hash(d))
  while (level.length > 1) {
    const next = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]
      const b = level[i + 1] || a
      next.push(hash(a + b))
    }
    level = next
  }
  return level[0]
}

// Tree structure
const LEVEL_HEIGHT = 8
const NODE_SPACING_X = 6
let nodeObjects = []
let edgeObjects = []
let treeRootHash = ''
let currentLevel = 0
let animationProgress = 0
let animating = false

class TreeNode {
  constructor(value, level, index) {
    this.value = value
    this.level = level
    this.index = index
    this.mesh = null
    this.label = null
    this.verified = false
  }
  
  createMesh(color = 0x4488ff) {
    const geo = new THREE.SphereGeometry(1.2, 16, 16)
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.4
    })
    this.mesh = new THREE.Mesh(geo, mat)
    
    const levelCount = Math.pow(2, this.level)
    const x = (this.index - levelCount / 2 + 0.5) * NODE_SPACING_X * Math.pow(2, Math.max(0, 3 - this.level))
    const y = 25 - this.level * LEVEL_HEIGHT
    this.mesh.position.set(x, y, 0)
    
    // Hash label
    if (params.showHashes) {
      const shortHash = this.value ? this.value.substring(0, 6) + '...' : ''
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#050f1a'
      ctx.fillRect(0, 0, 256, 64)
      ctx.fillStyle = '#aaddff'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(shortHash, 128, 40)
      
      const tex = new THREE.CanvasTexture(canvas)
      const labelGeo = new THREE.PlaneGeometry(4, 1)
      const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      this.label = new THREE.Mesh(labelGeo, labelMat)
      this.label.position.set(0, 2.5, 0)
      this.mesh.add(this.label)
    }
    
    return this.mesh
  }
  
  highlight(color = 0xffaa00) {
    if (this.mesh) {
      this.mesh.material.color.setHex(color)
      this.mesh.material.emissive.setHex(color)
      this.mesh.material.emissiveIntensity = 0.8
    }
  }
  
  reset() {
    if (this.mesh) {
      const c = this.level === 0 ? 0xffd700 : 0x4488ff
      this.mesh.material.color.setHex(c)
      this.mesh.material.emissive.setHex(c)
      this.mesh.material.emissiveIntensity = 0.3
    }
    this.verified = false
  }
}

function buildTree() {
  // Clear existing
  nodeObjects.forEach(n => { if (n.mesh) scene.remove(n.mesh) })
  edgeObjects.forEach(e => scene.remove(e))
  nodeObjects = []
  edgeObjects = []
  
  const n = params.leafCount
  const leafData = LEAF_DATA.slice(0, n)
  const rootHash = computeMerkle(leafData)
  treeRootHash = rootHash
  
  // Build levels
  const levels = []
  levels.push(leafData.map(d => hash(d)))
  while (levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1]
    const next = []
    for (let i = 0; i < prev.length; i += 2) {
      next.push(hash(prev[i] + (prev[i + 1] || prev[i])))
    }
    levels.push(next)
  }
  
  // Create nodes
  levels.forEach((level, lvl) => {
    level.forEach((val, idx) => {
      const node = new TreeNode(val, lvl, idx)
      const color = lvl === 0 ? 0x00cc66 : lvl === levels.length - 1 ? 0xffd700 : 0x4488ff
      scene.add(node.createMesh(color))
      nodeObjects.push(node)
      
      // Connect to parent
      if (lvl < levels.length - 1) {
        const parentLvl = lvl + 1
        const parentIdx = Math.floor(idx / 2)
        const parentNode = nodeObjects.find(n => n.level === parentLvl && n.index === parentIdx)
        if (parentNode && parentNode.mesh) {
          const points = [node.mesh.position.clone(), parentNode.mesh.position.clone()]
          const edgeGeo = new THREE.BufferGeometry().setFromPoints(points)
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x334466, opacity: 0.5, transparent: true })
          const edge = new THREE.Line(edgeGeo, edgeMat)
          scene.add(edge)
          edgeObjects.push({ edge, child: node, parent: parentNode })
        }
      }
    })
  })
  
  return levels
}

buildTree()

// Root hash display
const rootCanvas = document.createElement('canvas')
rootCanvas.width = 512
rootCanvas.height = 80
const rootCtx = rootCanvas.getContext('2d')
rootCtx.fillStyle = '#050f1a'
rootCtx.fillRect(0, 0, 512, 80)
rootCtx.fillStyle = '#ffd700'
rootCtx.font = 'bold 28px monospace'
rootCtx.textAlign = 'center'
rootCtx.fillText('Root: ' + treeRootHash, 256, 50)
const rootTex = new THREE.CanvasTexture(rootCanvas)
const rootLabelGeo = new THREE.PlaneGeometry(16, 2.5)
const rootLabelMat = new THREE.MeshBasicMaterial({ map: rootTex, transparent: true })
const rootLabel = new THREE.Mesh(rootLabelGeo, rootLabelMat)
rootLabel.position.set(0, 30, 0)
scene.add(rootLabel)

// Verify a leaf path
function verifyPath(leafIdx) {
  nodeObjects.forEach(n => n.reset())
  
  const n = params.leafCount
  let currentHash = hash(LEAF_DATA[leafIdx % n])
  
  // Highlight leaf
  const leafNode = nodeObjects.find(n => n.level === 0 && n.index === leafIdx % n)
  if (leafNode) leafNode.highlight(0x00ff88)
  
  let siblingIdx = leafIdx % 2 === 0 ? 1 : 0
  let level = 0
  let parentIdx = Math.floor(leafIdx % n / 2)
  
  while (level < 5 && !(level === 0 && leafIdx >= n)) {
    const currNode = nodeObjects.find(n => n.level === level && n.index === (level === 0 ? leafIdx % n : parentIdx))
    if (currNode) {
      currNode.highlight(0xffaa00)
    }
    
    const siblingNode = nodeObjects.find(n => n.level === level && n.index === (level === 0 ? (leafIdx % 2 === 0 ? leafIdx % n + 1 : leafIdx % n - 1) : (parentIdx * 2 + (siblingIdx === 0 ? 1 : 0))))
    if (siblingNode) {
      siblingNode.highlight(0xff4444)
    }
    
    parentIdx = Math.floor(parentIdx / 2)
    level++
    siblingIdx = parentIdx % 2
  }
  
  // Highlight root
  const rootNode = nodeObjects.find(n => n.level === Math.max(...nodeObjects.map(o => o.level)))
  if (rootNode) rootNode.highlight(0xffd700)
}

verifyPath(0)

// GUI
const gui = new GUI()
gui.add(params, 'leafCount', 2, 16, 1).name('叶子节点数').onChange(() => { buildTree(); verifyPath(params.verifiedNode) })
gui.add(params, 'verifiedNode', 0, params.leafCount - 1, 1).name('验证节点').onChange(verifyPath)
gui.add(params, 'showHashes').name('显示哈希值')
gui.add(params, 'animationSpeed', 0.1, 5, 0.1).name('动画速度')
gui.add({ verify: () => verifyPath(params.verifiedNode) }, 'verify').name('验证路径')

const infoDiv = document.createElement('div')
infoDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#88ccff;font-family:monospace;font-size:13px;pointer-events:none;line-height:1.6'
infoDiv.innerHTML = 'Merkle Tree | 区块链默克尔树<br>Verify: 点击节点验证哈希路径<br>Orbit: 拖拽旋转视角'
document.body.appendChild(infoDiv)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
