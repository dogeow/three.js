// 2999. Crowd Emergent Behaviors
// Crowd Emergent Behaviors
// type: custom
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 60, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(20, 40, 20)
scene.add(dirLight)

// Ground plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x1c2128 })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// Grid
const gridHelper = new THREE.GridHelper(200, 40, 0x30363d, 0x21262d)
scene.add(gridHelper)

// Agent parameters
const NUM_AGENTS = 300
const MAX_SPEED = 8
const MAX_FORCE = 0.5
const DESIRED_SEPARATION = 4
const SEPARATION_WEIGHT = 1.5
const ALIGNMENT_WEIGHT = 1.0
const COHESION_WEIGHT = 1.0
const BOUNDARY_MARGIN = 20

// Behavior modes
let behaviorMode = 'flock' // 'flock', 'split', 'circle', 'line'

// Agents
const agents = []
const agentColors = [
  0x58a6ff, 0x3fb950, 0xf0883e, 0xbc8cff,
  0xff7b72, 0x79c0ff, 0x56d364, 0xffa657
]

for (let i = 0; i < NUM_AGENTS; i++) {
  const geo = new THREE.ConeGeometry(0.5, 1.5, 4)
  const mat = new THREE.MeshStandardMaterial({
    color: agentColors[i % agentColors.length],
    emissive: agentColors[i % agentColors.length],
    emissiveIntensity: 0.3
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(
    (Math.random() - 0.5) * 60,
    0.75,
    (Math.random() - 0.5) * 60
  )
  scene.add(mesh)
  agents.push({
    mesh,
    pos: mesh.position.clone(),
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      0,
      (Math.random() - 0.5) * 4
    ),
    acc: new THREE.Vector3(),
    maxSpeed: MAX_SPEED * (0.8 + Math.random() * 0.4),
    color: agentColors[i % agentColors.length]
  })
}

function steer(target, maxForce = MAX_FORCE) {
  const desired = target.clone().sub(this.pos)
  desired.normalize().multiplyScalar(this.maxSpeed)
  const steer = desired.sub(this.vel)
  if (steer.length() > maxForce) steer.setLength(maxForce)
  return steer
}

function separate(agents) {
  const steer = new THREE.Vector3()
  let count = 0
  for (const other of agents) {
    if (other === this) continue
    const d = this.pos.distanceTo(other.pos)
    if (d > 0 && d < DESIRED_SEPARATION) {
      const diff = this.pos.clone().sub(other.pos).normalize().divideScalar(d)
      steer.add(diff)
      count++
    }
  }
  if (count > 0) {
    steer.divideScalar(count)
    steer.normalize().multiplyScalar(this.maxSpeed)
    steer.sub(this.vel)
    if (steer.length() > MAX_FORCE) steer.setLength(MAX_FORCE)
  }
  return steer
}

function align(agents) {
  const avg = new THREE.Vector3()
  let count = 0
  for (const other of agents) {
    if (other === this) continue
    const d = this.pos.distanceTo(other.pos)
    if (d > 0 && d < 20) {
      avg.add(other.vel)
      count++
    }
  }
  if (count > 0) {
    avg.divideScalar(count)
    avg.normalize().multiplyScalar(this.maxSpeed)
    const steer = avg.sub(this.vel)
    if (steer.length() > MAX_FORCE) steer.setLength(MAX_FORCE)
    return steer
  }
  return new THREE.Vector3()
}

function cohere(agents) {
  const center = new THREE.Vector3()
  let count = 0
  for (const other of agents) {
    if (other === this) continue
    const d = this.pos.distanceTo(other.pos)
    if (d > 0 && d < 25) {
      center.add(other.pos)
      count++
    }
  }
  if (count > 0) {
    center.divideScalar(count)
    return steer.call(this, center)
  }
  return new THREE.Vector3()
}

function applyBehaviors(agent, allAgents) {
  agent.acc.set(0, 0, 0)
  const sep = separate.call(agent, allAgents).multiplyScalar(SEPARATION_WEIGHT)
  const ali = align.call(agent, allAgents).multiplyScalar(ALIGNMENT_WEIGHT)
  const coh = cohere.call(agent, allAgents).multiplyScalar(COHESION_WEIGHT)
  agent.acc.add(sep).add(ali).add(coh)

  // Boundary avoidance
  const margin = BOUNDARY_MARGIN
  const halfBound = 50
  if (agent.pos.x < -halfBound + margin) agent.acc.x += MAX_FORCE * 3
  if (agent.pos.x > halfBound - margin) agent.acc.x -= MAX_FORCE * 3
  if (agent.pos.z < -halfBound + margin) agent.acc.z += MAX_FORCE * 3
  if (agent.pos.z > halfBound - margin) agent.acc.z -= MAX_FORCE * 3
}

const clock = new THREE.Clock()

// Mode display
const modeDiv = document.createElement('div')
modeDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#58a6ff;font:bold 18px monospace;text-shadow:0 0 10px #58a6ff'
modeDiv.textContent = 'Mode: Flocking (click to cycle)'
document.body.appendChild(modeDiv)

window.addEventListener('click', () => {
  const modes = ['flock', 'split', 'circle', 'line']
  const idx = modes.indexOf(behaviorMode)
  behaviorMode = modes[(idx + 1) % modes.length]
  modeDiv.textContent = `Mode: ${behaviorMode}`
})

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  // Behavior-specific target changes
  if (behaviorMode === 'split') {
    // Half go left, half go right
    for (let i = 0; i < agents.length; i++) {
      const target = new THREE.Vector3(
        i < NUM_AGENTS / 2 ? -40 : 40,
        0,
        (Math.random() - 0.5) * 20
      )
      const s = steer.call(agents[i], target, MAX_FORCE * 2)
      agents[i].acc.add(s)
    }
  } else if (behaviorMode === 'circle') {
    for (let i = 0; i < agents.length; i++) {
      const t = clock.getElapsedTime() + (i / NUM_AGENTS) * Math.PI * 2
      const target = new THREE.Vector3(
        Math.cos(t) * 25,
        0,
        Math.sin(t) * 25
      )
      const s = steer.call(agents[i], target, MAX_FORCE * 2)
      agents[i].acc.add(s)
    }
  } else if (behaviorMode === 'line') {
    for (let i = 0; i < agents.length; i++) {
      const row = Math.floor(i / 20)
      const col = i % 20
      const target = new THREE.Vector3(
        -40 + col * 4,
        0,
        -20 + row * 4
      )
      const s = steer.call(agents[i], target, MAX_FORCE * 2)
      agents[i].acc.add(s)
    }
  }

  // Update each agent
  for (const agent of agents) {
    if (behaviorMode === 'flock') {
      applyBehaviors(agent, agents)
    }
    agent.vel.add(agent.acc.clone().multiplyScalar(dt))
    if (agent.vel.length() > agent.maxSpeed) {
      agent.vel.setLength(agent.maxSpeed)
    }
    agent.pos.add(agent.vel.clone().multiplyScalar(dt))
    agent.mesh.position.copy(agent.pos)
    agent.mesh.position.y = 0.75

    // Orient to face velocity
    if (agent.vel.length() > 0.1) {
      const angle = Math.atan2(agent.vel.x, agent.vel.z)
      agent.mesh.rotation.y = angle
    }
  }

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
