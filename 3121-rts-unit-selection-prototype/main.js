// 3121. RTS Unit Selection Prototype
// Drag-box selection, unit groups, move commands, attack-move
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2e1a)
scene.fog = new THREE.FogExp2(0x1a2e1a, 0.02)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 40, 30)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.4, 0.85))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.2
controls.minDistance = 10
controls.maxDistance = 100

// Lights
scene.add(new THREE.AmbientLight(0x445533, 0.6))
const sun = new THREE.DirectionalLight(0xffffcc, 0.8)
sun.position.set(20, 50, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 150
sun.shadow.camera.left = -60
sun.shadow.camera.right = 60
sun.shadow.camera.top = 60
sun.shadow.camera.bottom = -60
scene.add(sun)

// Ground
const groundGeo = new THREE.PlaneGeometry(120, 120, 60, 60)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.95 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(120, 60, 0x3a4a2a, 0x2a3a1a)
grid.position.y = 0.02
scene.add(grid)

// Selection box
const selBoxGeo = new THREE.PlaneGeometry(1, 1)
const selBoxMat = new THREE.MeshBasicMaterial({
  color: 0x00ff88,
  transparent: true,
  opacity: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false
})
const selBox = new THREE.Mesh(selBoxGeo, selBoxMat)
selBox.rotation.x = -Math.PI / 2
selBox.visible = false
scene.add(selBox)

const selBoxEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.01))
const selBoxEdgeMat = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 })
const selBoxEdge = new THREE.LineSegments(selBoxEdgeGeo, selBoxEdgeMat)
selBoxEdge.rotation.x = -Math.PI / 2
selBoxEdge.visible = false
scene.add(selBoxEdge)

// Units
const UNIT_TYPES = ['tank', 'soldier', 'scout']
const unitColors = { tank: 0x4488ff, soldier: 0xff8844, scout: 0x44ff88 }
const units = []

class Unit {
  constructor(x, z, type) {
    this.type = type
    this.health = type === 'tank' ? 3 : type === 'soldier' ? 2 : 1
    this.maxHealth = this.health
    this.selected = false
    this.target = null
    this.attackTarget = null
    this.speed = type === 'scout' ? 8 : type === 'soldier' ? 5 : 3
    this.attackCooldown = 0
    this.attackRate = type === 'tank' ? 1.5 : 0.8

    let geo, mat
    if (type === 'tank') {
      geo = new THREE.BoxGeometry(2, 1.2, 3)
      mat = new THREE.MeshStandardMaterial({ color: unitColors.tank, roughness: 0.4, metalness: 0.6 })
    } else if (type === 'soldier') {
      geo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8)
      mat = new THREE.MeshStandardMaterial({ color: unitColors.soldier, roughness: 0.5, metalness: 0.3 })
    } else {
      geo = new THREE.OctahedronGeometry(0.6, 0)
      mat = new THREE.MeshStandardMaterial({ color: unitColors.scout, roughness: 0.3, metalness: 0.5 })
    }

    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.position.set(x, type === 'tank' ? 0.6 : type === 'soldier' ? 0.8 : 0.6, z)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.userData.unit = this

    // Health bar
    const hbGeo = new THREE.PlaneGeometry(1.5, 0.15)
    const hbMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
    this.healthBar = new THREE.Mesh(hbGeo, hbMat)
    this.healthBar.position.y = type === 'tank' ? 1.5 : type === 'soldier' ? 1.8 : 1.3
    this.healthBar.rotation.x = 0
    this.mesh.add(this.healthBar)

    // Selection ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 16)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    this.ring = new THREE.Mesh(ringGeo, ringMat)
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = type === 'tank' ? -0.5 : -0.7
    this.mesh.add(this.ring)

    scene.add(this.mesh)
    units.push(this)
  }

  setSelected(s) {
    this.selected = s
    this.ring.material.opacity = s ? 0.8 : 0
  }

  moveTo(x, z) {
    this.target = new THREE.Vector3(x, 0, z)
  }

  attackMove(x, z) {
    this.moveTo(x, z)
    this.attackTarget = null
  }

  setAttackTarget(enemy) {
    this.attackTarget = enemy
  }

  takeDamage(amount) {
    this.health -= amount
    const ratio = Math.max(0, this.health / this.maxHealth)
    this.healthBar.scale.x = ratio
    this.healthBar.material.color.setHex(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000)
    if (this.health <= 0) {
      this.destroy()
    }
  }

  destroy() {
    scene.remove(this.mesh)
    const idx = units.indexOf(this)
    if (idx >= 0) units.splice(idx, 1)
    const ei = enemyUnits.indexOf(this)
    if (ei >= 0) enemyUnits.splice(ei, 1)
  }

  update(dt) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt

    // Attack nearby enemies
    if (this.attackTarget && this.attackTarget.mesh.parent) {
      const dist = this.mesh.position.distanceTo(this.attackTarget.mesh.position)
      if (dist < 8) {
        this.target = null
        // Face enemy
        const dir = new THREE.Vector3().subVectors(this.attackTarget.mesh.position, this.mesh.position)
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z)
        if (this.attackCooldown <= 0) {
          this.attackCooldown = this.attackRate
          this.attackTarget.takeDamage(1)
          this.showMuzzleFlash()
        }
      }
    }

    // Move toward target
    if (this.target) {
      const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position)
      dir.y = 0
      const dist = dir.length()
      if (dist > 0.5) {
        dir.normalize()
        this.mesh.position.x += dir.x * this.speed * dt
        this.mesh.position.z += dir.z * this.speed * dt
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z)
      } else {
        this.target = null
      }
    }

    // Idle animation
    if (!this.target && !this.attackTarget) {
      this.mesh.position.y = (this.type === 'tank' ? 0.6 : this.type === 'soldier' ? 0.8 : 0.6) +
        Math.sin(Date.now() * 0.003 + units.indexOf(this)) * 0.05
    }

    // Face attack target
    if (this.attackTarget && this.attackTarget.mesh.parent && !this.target) {
      const dir = new THREE.Vector3().subVectors(this.attackTarget.mesh.position, this.mesh.position)
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z)
    }
  }

  showMuzzleFlash() {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true })
    )
    const offset = this.type === 'tank' ? 2 : 1
    flash.position.copy(this.mesh.position)
    flash.position.y = 1
    scene.add(flash)
    const start = Date.now()
    function anim() {
      const t = (Date.now() - start) / 200
      if (t >= 1) { scene.remove(flash); return }
      flash.scale.setScalar(1 + t * 3)
      flash.material.opacity = 1 - t
      requestAnimationFrame(anim)
    }
    anim()
  }
}

// Create player units
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2
  const r = 8 + Math.random() * 5
  const type = UNIT_TYPES[i % 3]
  new Unit(Math.cos(angle) * r, Math.sin(angle) * r, type)
}

// Enemy units
const enemyUnits = []
for (let i = 0; i < 6; i++) {
  const eGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8)
  const eMat = new THREE.MeshStandardMaterial({ color: 0xff2222, roughness: 0.4, metalness: 0.5 })
  const e = new THREE.Mesh(eGeo, eMat)
  e.position.set((Math.random() - 0.5) * 40, 0.75, 20 + Math.random() * 20)
  e.castShadow = true
  e.receiveShadow = true
  scene.add(e)
  enemyUnits.push(e)
  // Give each enemy a unit wrapper
  const unit = {
    mesh: e, health: 2, maxHealth: 2,
    selected: false,
    target: null, attackTarget: null,
    speed: 3, attackCooldown: 0, attackRate: 1.5,
    type: 'enemy',
    takeDamage(amt) {
      this.health -= amt
      if (this.health <= 0) {
        scene.remove(this.mesh)
        const idx = enemyUnits.indexOf(this)
        if (idx >= 0) enemyUnits.splice(idx, 1)
      }
    }
  }
  enemyUnits[enemyUnits.length - 1] = unit
}

// Selection
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const selectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
let isSelecting = false
let selStart = { x: 0, z: 0 }
let selEnd = { x: 0, z: 0 }
let shiftHeld = false

function getWorldPos(event) {
  mouse.x = (event.clientX / innerWidth) * 2 - 1
  mouse.y = -(event.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hit = new THREE.Vector3()
  raycaster.ray.intersectPlane(selectionPlane, hit)
  return hit
}

function getMouseScreen(event) {
  return { x: event.clientX, y: event.clientY }
}

function selectUnitsInBox(sx, sz, ex, ez) {
  const minX = Math.min(sx, ex)
  const maxX = Math.max(sx, ex)
  const minZ = Math.min(sz, ez)
  const maxZ = Math.max(sz, ez)

  if (!shiftHeld) {
    units.forEach(u => u.setSelected(false))
  }

  units.forEach(u => {
    const px = u.mesh.position.x
    const pz = u.mesh.position.z
    if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {
      u.setSelected(true)
    }
  })
}

function getClickedUnit(event) {
  const pos = getWorldPos(event)
  let nearest = null
  let nearestDist = Infinity
  units.forEach(u => {
    const d = u.mesh.position.distanceTo(pos)
    if (d < 2 && d < nearestDist) {
      nearestDist = d
      nearest = u
    }
  })
  return nearest
}

document.addEventListener('mousedown', e => {
  if (e.button === 0) {
    const unit = getClickedUnit(e)
    if (unit) {
      if (!shiftHeld) units.forEach(u => u.setSelected(false))
      unit.setSelected(true)
    } else {
      isSelecting = true
      const wp = getWorldPos(e)
      selStart = { x: wp.x, z: wp.z }
      selEnd = { x: wp.x, z: wp.z }
    }
  }
})

document.addEventListener('mousemove', e => {
  if (isSelecting) {
    const wp = getWorldPos(e)
    selEnd = { x: wp.x, z: wp.z }
  }
})

document.addEventListener('mouseup', e => {
  if (e.button === 0 && isSelecting) {
    isSelecting = false
    selectUnitsInBox(selStart.x, selStart.z, selEnd.x, selEnd.z)
  }
})

document.addEventListener('contextmenu', e => {
  e.preventDefault()
  const wp = getWorldPos(e)
  const selected = units.filter(u => u.selected)
  if (selected.length === 0) return

  // Check if clicking on enemy
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  let targetEnemy = null
  enemyUnits.forEach(en => {
    const d = en.mesh.position.distanceTo(raycaster.ray.origin)
    const projected = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(d))
    if (projected.distanceTo(en.mesh.position) < 2) {
      targetEnemy = en
    }
  })

  if (targetEnemy) {
    // Attack command
    selected.forEach(u => u.setAttackTarget(targetEnemy))
  } else {
    // Move command - spread out
    const cols = Math.ceil(Math.sqrt(selected.length))
    selected.forEach((u, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      const offsetX = (col - (cols - 1) / 2) * 3
      const offsetZ = (row - (Math.ceil(selected.length / cols) - 1) / 2) * 3
      u.setAttackTarget(null)
      u.moveTo(wp.x + offsetX, wp.z + offsetZ)
    })
  }
  showMoveIndicator(wp.x, wp.z, !!targetEnemy)
})

document.addEventListener('keydown', e => { if (e.key === 'Shift') shiftHeld = true })
document.addEventListener('keyup', e => { if (e.key === 'Shift') shiftHeld = false })

function showMoveIndicator(x, z, isAttack) {
  const color = isAttack ? 0xff4444 : 0x00ff88
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.8, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(x, 0.05, z)
  scene.add(ring)
  const start = Date.now()
  function anim() {
    const t = (Date.now() - start) / 500
    if (t >= 1) { scene.remove(ring); return }
    ring.scale.setScalar(1 + t * 3)
    ring.material.opacity = 0.8 * (1 - t)
    requestAnimationFrame(anim)
  }
  anim()

  // Expand ring
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.5, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  )
  ring2.rotation.x = -Math.PI / 2
  ring2.position.set(x, 0.06, z)
  scene.add(ring2)
  const t0 = Date.now()
  function anim2() {
    const t = (Date.now() - t0) / 400
    if (t >= 1) { scene.remove(ring2); return }
    ring2.scale.setScalar(1 + t * 5)
    ring2.material.opacity = 0.6 * (1 - t)
    requestAnimationFrame(anim2)
  }
  anim2()
}

// UI
const uiDiv = document.createElement('div')
uiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.75);padding:12px;border-radius:8px;border:1px solid #334;'
document.body.appendChild(uiDiv)

const title = document.createElement('div')
title.style.cssText = 'font-size:14px;font-weight:bold;color:#ffcc00;margin-bottom:8px;'
title.textContent = '🎮 RTS Unit Selection'
uiDiv.appendChild(title)

const infoDiv = document.createElement('div')
uiDiv.appendChild(infoDiv)

const helpDiv = document.createElement('div')
helpDiv.innerHTML = 'LMB: Select | Shift+LMB: Multi-select<br>Right-click: Move/Attack<br>Enemy units (red) in foreground'
helpDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#aaa;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.7);padding:10px;border-radius:6px;'
document.body.appendChild(helpDiv)

// Enemy AI
let enemyAI = 0
function updateEnemyAI(dt) {
  enemyAI += dt
  if (enemyAI > 3) {
    enemyAI = 0
    enemyUnits.forEach(e => {
      // Simple patrol toward player
      const selected = units.filter(u => u.selected)
      if (selected.length > 0) {
        const target = selected[Math.floor(Math.random() * selected.length)]
        const dir = new THREE.Vector3().subVectors(target.mesh.position, e.mesh.position)
        dir.normalize()
        e.mesh.position.x += dir.x * e.speed * dt * 0.5
        e.mesh.position.z += dir.z * e.speed * dt * 0.5
        e.mesh.rotation.y = Math.atan2(dir.x, dir.z)
      }
    })
  }
}

function animate(t = 0) {
  requestAnimationFrame(animate)
  const dt = 1 / 60

  // Update selection box
  if (isSelecting) {
    selBox.visible = true
    selBoxEdge.visible = true
    const cx = (selStart.x + selEnd.x) / 2
    const cz = (selStart.z + selEnd.z) / 2
    const sx = Math.abs(selEnd.x - selStart.x)
    const sz = Math.abs(selEnd.z - selStart.z)
    selBox.position.set(cx, 0.03, cz)
    selBox.scale.set(sx, 1, sz)
    selBoxEdge.position.set(cx, 0.04, cz)
    selBoxEdge.scale.set(sx, 1, sz)
  } else {
    selBox.visible = false
    selBoxEdge.visible = false
  }

  // Update units
  units.forEach(u => u.update(dt))
  updateEnemyAI(dt)

  // Enemy units animation
  enemyUnits.forEach(e => {
    if (e.mesh.parent) {
      e.mesh.rotation.y += 0.01
    }
  })

  // Info
  const selCount = units.filter(u => u.selected).length
  const totalUnits = units.length
  const enemyCount = enemyUnits.length
  infoDiv.innerHTML = `Units: ${totalUnits} | Selected: ${selCount} | Enemies: ${enemyCount}`

  controls.update()
  composer.render()
}

animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
