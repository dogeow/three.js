// 3117. Finite State Machine NPC
// FSM AI: patrol / chase / attack / flee states with transitions
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 25, 40)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.85)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.1

// Lights
scene.add(new THREE.AmbientLight(0x334466, 0.4))
const dirLight = new THREE.DirectionalLight(0xaaccff, 0.8)
dirLight.position.set(20, 40, 20)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
dirLight.shadow.camera.near = 0.5
dirLight.shadow.camera.far = 100
dirLight.shadow.camera.left = -40
dirLight.shadow.camera.right = 40
dirLight.shadow.camera.top = 40
dirLight.shadow.camera.bottom = -40
scene.add(dirLight)

// Grid ground
const groundGeo = new THREE.PlaneGeometry(80, 80, 80, 80)
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  roughness: 0.9,
  metalness: 0.1
})
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid helper
const gridHelper = new THREE.GridHelper(80, 40, 0x334466, 0x223344)
gridHelper.position.y = 0.01
scene.add(gridHelper)

// Patrol waypoints
const waypoints = [
  new THREE.Vector3(-15, 0, -15),
  new THREE.Vector3(15, 0, -15),
  new THREE.Vector3(15, 0, 15),
  new THREE.Vector3(-15, 0, 15)
]
const waypointMarkers = waypoints.map(wp => {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.3 })
  )
  m.position.set(wp.x, 0.06, wp.z)
  scene.add(m)
  return m
})

// Player (red cube)
const playerGeo = new THREE.BoxGeometry(1.5, 2, 1.5)
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.5, metalness: 0.2 })
const player = new THREE.Mesh(playerGeo, playerMat)
player.position.set(0, 1, 0)
player.castShadow = true
scene.add(player)
const playerGlow = new THREE.PointLight(0xff3344, 1, 8)
player.add(playerGlow)

// NPC (the FSM agent)
const npcGeo = new THREE.CapsuleGeometry(0.8, 1.6, 8, 16)
const npcMats = {
  patrol: new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.2, roughness: 0.4 }),
  chase: new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff8800, emissiveIntensity: 0.4, roughness: 0.4 }),
  attack: new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6, roughness: 0.4 }),
  flee: new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 0.5, roughness: 0.4 })
}
const npc = new THREE.Mesh(npcGeo, npcMats.patrol)
npc.position.set(-15, 1.2, -15)
npc.castShadow = true
scene.add(npc)
const npcGlow = new THREE.PointLight(0x4488ff, 1.5, 10)
npc.add(npcGlow)

// NPC trail
const trailGeo = new THREE.SphereGeometry(0.2, 8, 8)
const trailMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 })
const trailMarkers = Array.from({ length: 30 }, () => {
  const t = new THREE.Mesh(trailGeo, trailMat.clone())
  t.visible = false
  scene.add(t)
  return t
})
let trailIdx = 0

// Attack projectile
const projGeo = new THREE.SphereGeometry(0.3, 8, 8)
const projMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 1 })
const projectile = new THREE.Mesh(projGeo, projMat)
projectile.visible = false
scene.add(projectile)
const projLight = new THREE.PointLight(0xff2200, 2, 5)
projectile.add(projLight)

// Detection range ring
const detectGeo = new THREE.RingGeometry(8, 8.2, 64)
const detectMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
const detectRing = new THREE.Mesh(detectGeo, detectMat)
detectRing.rotation.x = -Math.PI / 2
detectRing.position.y = 0.05
scene.add(detectRing)

// Attack range ring
const attackGeo = new THREE.RingGeometry(4, 4.2, 64)
const attackMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
const attackRing = new THREE.Mesh(attackGeo, attackMat)
attackRing.rotation.x = -Math.PI / 2
attackRing.position.y = 0.06
scene.add(attackRing)

// FSM States
const STATES = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', FLEE: 'flee' }
const DETECT_RANGE = 8
const ATTACK_RANGE = 4
const FLEE_HP = 20
const HP_MAX = 100
let npcHP = 100
let npcState = STATES.PATROL
let wpIdx = 0
let stateTimer = 0
let attackCooldown = 0
let patrolWait = 0
let fleeDir = new THREE.Vector3()

// State color mapping
const stateColors = { patrol: 0x4488ff, chase: 0xff8800, attack: 0xff2200, flee: 0xaa00ff }
const stateNames = { patrol: '🟦 PATROL', chase: '🟧 CHASE', attack: '🔴 ATTACK', flee: '🟣 FLEE' }

// Enemy NPCs (targets)
const enemies = []
for (let i = 0; i < 5; i++) {
  const eGeo = new THREE.CylinderGeometry(0.6, 0.6, 2, 8)
  const eMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.3,
    roughness: 0.4
  })
  const e = new THREE.Mesh(eGeo, eMat)
  e.position.set(
    (Math.random() - 0.5) * 50,
    1,
    (Math.random() - 0.5) * 50
  )
  e.castShadow = true
  scene.add(e)
  enemies.push(e)
}

// State display UI
const uiDiv = document.createElement('div')
uiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#fff;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:16px;border-radius:8px;border:1px solid #334;min-width:200px;'
document.body.appendChild(uiDiv)

const hpBarOuter = document.createElement('div')
hpBarOuter.style.cssText = 'width:100%;height:8px;background:#333;border-radius:4px;margin-top:8px;overflow:hidden;'
const hpBarInner = document.createElement('div')
hpBarInner.style.cssText = 'width:100%;height:100%;background:linear-gradient(90deg,#ff2200,#44ff00);transition:width 0.3s;'
hpBarOuter.appendChild(hpBarInner)
uiDiv.appendChild(hpBarInner)

const stateLabel = document.createElement('div')
stateLabel.style.cssText = 'margin-top:10px;font-size:16px;font-weight:bold;letter-spacing:2px;'
uiDiv.appendChild(stateLabel)

const infoLabel = document.createElement('div')
infoLabel.style.cssText = 'margin-top:6px;font-size:11px;color:#aaa;'
uiDiv.appendChild(infoLabel)

const legendDiv = document.createElement('div')
legendDiv.style.cssText = 'position:fixed;bottom:20px;left:20px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.7);padding:12px;border-radius:8px;border:1px solid #334;'
legendDiv.innerHTML = 'WASD: Move player<br>SPACE: NPC takes damage<br>Click enemy: reduce enemy HP<br>R: Reset NPC HP'
document.body.appendChild(legendDiv)

// Player movement
const keys = {}
document.addEventListener('keydown', e => keys[e.code] = true)
document.addEventListener('keyup', e => keys[e.code] = false)
document.addEventListener('keydown', e => {
  if (e.code === 'Space') npcHP = Math.max(0, npcHP - 15)
  if (e.code === 'KeyR') npcHP = HP_MAX
})
document.addEventListener('click', e => {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(enemies)
  if (hits.length > 0) {
    hits[0].object.scale.setScalar(0.5)
    setTimeout(() => {
      hits[0].object.scale.setScalar(1)
    }, 200)
  }
})

// FSM update
function updateFSM(dt) {
  const toPlayer = new THREE.Vector3().subVectors(player.position, npc.position)
  const dist = toPlayer.length()
  toPlayer.normalize()

  // State transitions
  const prevState = npcState

  if (npcHP <= FLEE_HP) {
    npcState = STATES.FLEE
  } else if (dist < ATTACK_RANGE) {
    npcState = STATES.ATTACK
  } else if (dist < DETECT_RANGE) {
    npcState = STATES.CHASE
  } else {
    npcState = STATES.PATROL
  }

  // Update material
  npc.material = npcMats[npcState]
  npcGlow.color.setHex(stateColors[npcState])

  // State behavior
  let moveDir = new THREE.Vector3()

  if (npcState === STATES.PATROL) {
    const wp = waypoints[wpIdx]
    const toWP = new THREE.Vector3().subVectors(wp, npc.position)
    if (toWP.length() < 1) {
      patrolWait += dt
      if (patrolWait > 1.5) {
        wpIdx = (wpIdx + 1) % waypoints.length
        patrolWait = 0
      }
    } else {
      toWP.normalize()
      moveDir.copy(toWP)
    }
  } else if (npcState === STATES.CHASE) {
    moveDir.copy(toPlayer)
  } else if (npcState === STATES.ATTACK) {
    stateTimer += dt
    if (stateTimer > 0.5) {
      // Shoot projectile
      projectile.position.copy(npc.position)
      projectile.visible = true
      projDir = toPlayer.clone()
      projSpeed = 20
      stateTimer = 0
    }
  } else if (npcState === STATES.FLEE) {
    const away = new THREE.Vector3().subVectors(npc.position, player.position).normalize()
    moveDir.copy(away)
    // Also avoid enemies
    enemies.forEach(e => {
      const awayE = new THREE.Vector3().subVectors(npc.position, e.position)
      if (awayE.length() < 4) {
        awayE.normalize()
        moveDir.add(awayE)
      }
    })
    moveDir.normalize()
  }

  // Move NPC
  const speed = npcState === STATES.FLEE ? 8 : npcState === STATES.CHASE ? 6 : 4
  npc.position.x += moveDir.x * speed * dt
  npc.position.z += moveDir.z * speed * dt
  npc.position.x = Math.max(-38, Math.min(38, npc.position.x))
  npc.position.z = Math.max(-38, Math.min(38, npc.position.z))

  // Face direction
  if (moveDir.length() > 0.1) {
    npc.rotation.y = Math.atan2(moveDir.x, moveDir.z)
  }

  // Update rings
  detectRing.position.x = npc.position.x
  detectRing.position.z = npc.position.z
  attackRing.position.x = npc.position.x
  attackRing.position.z = npc.position.z
  detectRing.material.color.setHex(stateColors[npcState])
  detectRing.material.opacity = npcState === STATES.PATROL ? 0.1 : 0.3

  // Projectile
  if (projectile.visible) {
    projectile.position.x += projDir.x * projSpeed * dt
    projectile.position.z += projDir.z * projSpeed * dt
    const pDist = projectile.position.distanceTo(player.position)
    if (pDist < 2 || Math.abs(projectile.position.x) > 45 || Math.abs(projectile.position.z) > 45) {
      projectile.visible = false
      if (pDist < 2) npcHP = Math.max(0, npcHP - 10)
    }
  }

  // Trail
  trailIdx = (trailIdx + 1) % trailMarkers.length
  trailMarkers[trailIdx].position.copy(npc.position)
  trailMarkers[trailIdx].position.y = 0.5
  trailMarkers[trailIdx].visible = true
  trailMarkers[trailIdx].material.opacity = 0.5
  trailMarkers.forEach((t, i) => {
    const age = (trailIdx - i + trailMarkers.length) % trailMarkers.length
    t.material.opacity = Math.max(0, 0.5 - age / trailMarkers.length * 0.5)
  })

  // Enemy animation
  enemies.forEach((e, i) => {
    e.rotation.y += dt * (0.5 + i * 0.1)
    e.position.y = 1 + Math.sin(Date.now() * 0.002 + i) * 0.2
  })

  // Player
  const pSpeed = 10
  if (keys['KeyW']) player.position.z -= pSpeed * dt
  if (keys['KeyS']) player.position.z += pSpeed * dt
  if (keys['KeyA']) player.position.x -= pSpeed * dt
  if (keys['KeyD']) player.position.x += pSpeed * dt
  player.position.x = Math.max(-38, Math.min(38, player.position.x))
  player.position.z = Math.max(-38, Math.min(38, player.position.z))
  player.rotation.y += dt * 0.5

  // Update UI
  hpBarInner.style.width = (npcHP / HP_MAX * 100) + '%'
  stateLabel.textContent = 'State: ' + stateNames[npcState]
  stateLabel.style.color = '#' + stateColors[npcState].toString(16).padStart(6, '0')
  infoLabel.textContent = `HP: ${npcHP}/${HP_MAX} | Dist to player: ${dist.toFixed(1)}m | ${enemies.filter(e => e.scale.x > 0.9).length} enemies alive`
}

// Animate
let last = 0
let projDir = new THREE.Vector3()
let projSpeed = 0

function animate(t = 0) {
  requestAnimationFrame(animate)
  const dt = Math.min((t - last) / 1000, 0.1)
  last = t

  updateFSM(dt)
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
