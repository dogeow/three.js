// 2998. Physics Platformer Sideview
// Physics Platformer Sideview
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.015)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 5, 20)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.2)
sun.position.set(10, 20, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 80
sun.shadow.camera.left = -30
sun.shadow.camera.right = 30
sun.shadow.camera.top = 20
sun.shadow.camera.bottom = -10
scene.add(sun)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 30),
  new THREE.MeshStandardMaterial({ color: 0x2d5016 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Platforms
const platforms = []
function makePlatform(x, y, w, h, color = 0x8b6914) {
  const geo = new THREE.BoxGeometry(w, h, 3)
  const mat = new THREE.MeshStandardMaterial({ color })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  platforms.push({ mesh, x, y, w, h })
  return mesh
}

// Level layout
makePlatform(0, -0.5, 60, 1)  // ground
makePlatform(-8, 3, 6, 0.5, 0x4a7c59)
makePlatform(0, 5.5, 5, 0.5, 0x4a7c59)
makePlatform(8, 3.5, 6, 0.5, 0x4a7c59)
makePlatform(-5, 8, 4, 0.5, 0x7a5c3a)
makePlatform(4, 9.5, 5, 0.5, 0x7a5c3a)
makePlatform(-2, 12, 7, 0.5, 0xc9a227)
makePlatform(9, 7, 3, 0.5, 0x4a7c59)
makePlatform(-10, 5.5, 3, 0.5, 0x4a7c59)
makePlatform(12, 10, 4, 0.5, 0xc9a227)

// Player character
const playerGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8)
const playerMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c })
const player = new THREE.Mesh(playerGeo, playerMat)
player.castShadow = true
scene.add(player)

// Player physics state
const playerState = {
  x: 0, y: 1,
  vx: 0, vy: 0,
  onGround: false,
  facingRight: true,
}
const GRAVITY = -28
const JUMP_FORCE = 12
const MOVE_SPEED = 8
const FRICTION = 0.85

// Keyboard input
const keys = {}
window.addEventListener('keydown', e => { keys[e.code] = true })
window.addEventListener('keyup', e => { keys[e.code] = false })

// Coins
const coins = []
const coinGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 20)
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
const coinPositions = [
  [-8, 3.8], [0, 6.3], [8, 4.3], [-5, 8.8], [4, 10.3],
  [-2, 12.8], [9, 7.8], [-10, 6.3], [12, 10.8], [0, 1.5]
]
for (const [cx, cy] of coinPositions) {
  const coin = new THREE.Mesh(coinGeo, coinMat)
  coin.position.set(cx, cy, 0)
  coin.rotation.x = Math.PI / 2
  scene.add(coin)
  coins.push({ mesh: coin, collected: false })
}

let score = 0
// Score display
const scoreDiv = document.createElement('div')
scoreDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#ffd700;font:bold 24px monospace;text-shadow:0 0 10px #ffa500'
scoreDiv.textContent = 'Score: 0'
document.body.appendChild(scoreDiv)

// Platform collision
function checkPlatformCollisions(px, py, pw, ph, prevY) {
  for (const plat of platforms) {
    const platTop = plat.y + plat.h / 2
    const platLeft = plat.x - plat.w / 2
    const platRight = plat.x + plat.w / 2
    const platBottom = plat.y - plat.h / 2
    const playerBottom = py - ph / 2
    const playerTop = py + ph / 2
    const playerLeft = px - pw / 2
    const playerRight = px + pw / 2
    if (playerRight > platLeft && playerLeft < platRight) {
      if (prevY >= platTop - ph / 2 && playerBottom < platTop) {
        return platTop + ph / 2
      }
    }
  }
  return null
}

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const prevY = playerState.y

  // Horizontal movement
  if (keys['ArrowLeft'] || keys['KeyA']) {
    playerState.vx = -MOVE_SPEED
    playerState.facingRight = false
  } else if (keys['ArrowRight'] || keys['KeyD']) {
    playerState.vx = MOVE_SPEED
    playerState.facingRight = true
  } else {
    playerState.vx *= FRICTION
  }

  // Jump
  if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && playerState.onGround) {
    playerState.vy = JUMP_FORCE
    playerState.onGround = false
  }

  // Gravity
  playerState.vy += GRAVITY * dt

  // Move
  playerState.x += playerState.vx * dt
  playerState.y += playerState.vy * dt

  // Clamp horizontal
  playerState.x = Math.max(-28, Math.min(28, playerState.x))

  // Floor fall reset
  if (playerState.y < -5) {
    playerState.x = 0; playerState.y = 1
    playerState.vx = 0; playerState.vy = 0
  }

  // Platform collision
  const newY = checkPlatformCollisions(playerState.x, playerState.y, 0.8, 1.2, prevY)
  if (newY !== null && playerState.vy <= 0) {
    playerState.y = newY
    playerState.vy = 0
    playerState.onGround = true
  } else {
    playerState.onGround = false
  }

  // Update mesh
  player.position.set(playerState.x, playerState.y + 0.6, 0)
  player.rotation.z = playerState.facingRight ? 0 : 0

  // Flip player direction
  player.scale.x = playerState.facingRight ? 1 : -1

  // Coin collection
  for (const coin of coins) {
    if (coin.collected) continue
    const dx = playerState.x - coin.mesh.position.x
    const dy = (playerState.y + 0.6) - coin.mesh.position.y
    if (Math.sqrt(dx * dx + dy * dy) < 1.2) {
      coin.collected = true
      coin.mesh.visible = false
      score += 10
      scoreDiv.textContent = `Score: ${score}`
    }
    // Animate coin spin
    coin.mesh.rotation.z += 2 * dt
  }

  // Animate coin hover
  const t = clock.getElapsedTime()
  for (let i = 0; i < coins.length; i++) {
    if (!coins[i].collected) {
      coins[i].mesh.position.y = coinPositions[i][1] + Math.sin(t * 2 + i) * 0.1
    }
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
