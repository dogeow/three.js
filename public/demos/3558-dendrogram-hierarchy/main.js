// 3558. Phylogenetic Dendrogram — Hierarchical Clustering Visualization
// 生物进化树状图：层次聚类树，节点可拖拽，展示分类关系
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 10, 40)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = false
controls.autoRotateSpeed = 0.5

scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(10, 30, 20)
scene.add(dirLight)

// Leaf names (species/taxon labels)
const LEAF_NAMES = [
  '智人', '黑猩猩', '大猩猩', '红毛猩猩',
  '恒河猴', '狒狒', '小鼠', '大鼠',
  '灰狼', '家猫', '家牛', '野猪',
  '原鸡', '斑马鱼', '果蝇', '秀丽隐杆线虫',
  '拟南芥', '玉米', '酿酒酵母', '大肠杆菌',
]

// Tree node structure
class TreeNode {
  constructor(id, name, isLeaf = false, depth = 0) {
    this.id = id
    this.name = name
    this.isLeaf = isLeaf
    this.depth = depth
    this.children = []
    this.parent = null
    this.position = new THREE.Vector3()
    this.x = 0
    this.y = 0
    this.clusterDist = 0  // distance from children to this cluster center
  }
}

let treeDepth = 4
let autoRotate = false
let nodes = []
let leafNodes = []
let nodeMeshes = []  // spheres for internal nodes
let leafMeshes = []  // boxes for leaves
let edgeLines = []
let edgeGroup = new THREE.Group()
let nodeGroup = new THREE.Group()
let leafGroup = new THREE.Group()
scene.add(edgeGroup, nodeGroup, leafGroup)

// Raycaster for mouse interaction
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let selectedNode = null
let isDragging = false

// Color palette for leaf clades
const CLADE_COLORS = [
  0x4fc3f7, 0x81c784, 0xffb74d, 0xf06292,
  0xba68c8, 0x4dd0e1, 0xaed581, 0xfff176,
  0x90a4ae, 0x7986cb, 0x4db6ac, 0xf48fb1,
  0x9575cd, 0x64b5f6, 0x6dbf73, 0xff8a65,
  0xa1887f, 0x90caf9, 0x80cbc4, 0xffcc80
]

function generateTree(depth) {
  // Clear existing
  nodes = []
  leafNodes = []
  while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0])
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0])
  while (leafGroup.children.length) leafGroup.remove(leafGroup.children[0])
  nodeMeshes = []
  leafMeshes = []

  // Generate random tree
  const allLeaves = [...LEAF_NAMES].sort(() => Math.random() - 0.5).slice(0, 16)
  const usedNames = allLeaves.slice()

  // Start with leaves
  let idCounter = 0
  const leafNodesList = allLeaves.map(name => {
    const node = new TreeNode(idCounter++, name, true, depth)
    nodes.push(node)
    return node
  })

  // Build up the tree
  let currentLevel = leafNodesList
  let currentDepth = depth

  while (currentLevel.length > 2 && currentDepth > 1) {
    // Pair up adjacent nodes
    const newLevel = []
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]
      const right = i + 1 < currentLevel[i] ? currentLevel[i] : currentLevel[i]
      const parentName = `支系${currentDepth}_${idCounter}`
      const parent = new TreeNode(idCounter++, parentName, false, currentDepth - 1)
      parent.children = [left, right]
      left.parent = parent
      right.parent = parent
      parent.clusterDist = (currentDepth / depth) * 8  // height in dendrogram
      nodes.push(parent)
      newLevel.push(parent)
    }
    currentLevel = newLevel
    currentDepth--
  }

  // Root node
  const root = new TreeNode(idCounter++, '根', false, 0)
  root.children = currentLevel
  currentLevel.forEach(c => c.parent = root)
  root.clusterDist = 0
  nodes.push(root)

  leafNodes = leafNodesList
  return root
}

function layoutTree(root) {
  // Assign x positions by leaf order, y by depth
  const leafCount = leafNodes.length
  const spacing = 18 / leafCount

  // Post-order: assign y from depth
  nodes.forEach(n => {
    n.y = n.depth / treeDepth * 12 - 6
  })

  // Assign x positions to leaves
  leafNodes.forEach((leaf, i) => {
    leaf.x = (i - leafCount / 2 + 0.5) * spacing
  })

  // Propagate x positions up: each internal node at midpoint of children
  function assignX(node) {
    if (node.isLeaf) return
    node.children.forEach(assignX)
    const xs = node.children.map(c => c.x)
    node.x = (Math.min(...xs) + Math.max(...xs)) / 2
  }
  assignX(root)
}

function buildVisuals() {
  // Clear groups
  while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0])
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0])
  while (leafGroup.children.length) leafGroup.remove(leafGroup.children[0])
  nodeMeshes = []
  leafMeshes = []

  const internalGeo = new THREE.SphereGeometry(0.25, 12, 12)
  const leafGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5)

  // Build edges (parent-child connections)
  nodes.forEach(node => {
    if (!node.parent) return
    const pts = [
      new THREE.Vector3(node.x, node.y, 0),
      new THREE.Vector3(node.x, node.parent.y, 0),
      new THREE.Vector3(node.parent.x, node.parent.y, 0),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x334466, opacity: 0.6, transparent: true })
    const line = new THREE.Line(geo, mat)
    edgeGroup.add(line)
  })

  // Build internal node spheres
  const cladeColors = [...CLADE_COLORS].sort(() => Math.random() - 0.5)
  nodes.forEach((node, i) => {
    if (node.isLeaf) return
    const mat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x112233
    })
    const mesh = new THREE.Mesh(internalGeo, mat)
    mesh.position.set(node.x, node.y, 0)
    mesh.userData.nodeId = node.id
    nodeGroup.add(mesh)
    nodeMeshes.push(mesh)

    // Leaf node boxes
    nodeMeshes[node.id] = mesh
  })

  // Build leaf node boxes
  leafNodes.forEach((leaf, i) => {
    const color = cladeColors[i % cladeColors.length]
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.5,
      emissive: new THREE.Color(color).multiplyScalar(0.2)
    })
    const mesh = new THREE.Mesh(leafGeo, mat)
    mesh.position.set(leaf.x, leaf.y, 0)
    mesh.userData.nodeId = leaf.id
    mesh.userData.isLeaf = true
    leafGroup.add(mesh)
    leafMeshes.push(mesh)
  })

  // Leaf labels
  leafNodes.forEach((leaf, i) => {
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 48
    const ctx = canvas.getContext('2d')
    ctx.font = 'bold 20px sans-serif'
    ctx.fillStyle = '#' + cladeColors[i % cladeColors.length].toString(16).padStart(6, '0')
    ctx.fillText(leaf.name, 10, 32)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(leaf.x + 0.5, leaf.y, 0.1)
    sprite.scale.set(8, 1.2, 1)
    leafGroup.add(sprite)
  })
}

function buildTree() {
  const root = generateTree(treeDepth)
  layoutTree(root)
  buildVisuals()
}

buildTree()

// Mouse interaction
let allInteractables = []

function updateInteractables() {
  allInteractables = [...nodeMeshes.filter(m => m), ...leafMeshes]
}

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1

  if (isDragging && selectedNode !== null) {
    const node = nodes.find(n => n.id === selectedNode)
    if (node) {
      // Project mouse to plane z=0
      raycaster.setFromCamera(mouse, camera)
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
      const pt = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, pt)
      node.x = pt.x
      node.y = pt.y
      // Update visuals
      const mesh = nodeMeshes[node.id]
      if (mesh) mesh.position.set(node.x, node.y, 0)
      // Update connected edges and children
      rebuildEdges()
    }
  }
})

window.addEventListener('mousedown', e => {
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects([...nodeGroup.children, ...leafGroup.children])
  if (intersects.length > 0) {
    selectedNode = intersects[0].object.userData.nodeId
    isDragging = true
    controls.enabled = false
    intersects[0].object.material.emissive.set(0x444444)
  }
})

window.addEventListener('mouseup', () => {
  isDragging = false
  controls.enabled = true
  selectedNode = null
  updateInteractables()
})

function rebuildEdges() {
  while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0])
  nodes.forEach(node => {
    if (!node.parent) return
    const pts = [
      new THREE.Vector3(node.x, node.y, 0),
      new THREE.Vector3(node.x, node.parent.y, 0),
      new THREE.Vector3(node.parent.x, node.parent.y, 0),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x334466, opacity: 0.6, transparent: true })
    edgeGroup.add(new THREE.Line(geo, mat))
  })
}

document.getElementById('resetBtn').addEventListener('click', buildTree)
document.getElementById('shuffleBtn').addEventListener('click', () => {
  leafNodes.forEach(n => n.name = LEAF_NAMES[Math.floor(Math.random() * LEAF_NAMES.length)])
  buildTree()
})
document.getElementById('toggleRotateBtn').addEventListener('click', () => {
  autoRotate = !autoRotate
  controls.autoRotate = autoRotate
})
document.getElementById('depthSlider').addEventListener('input', e => {
  treeDepth = parseInt(e.target.value)
  document.getElementById('depthVal').textContent = treeDepth
  buildTree()
})

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
