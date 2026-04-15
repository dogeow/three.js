import * as THREE from 'three'
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
    import GUI from 'three/addons/libs/lil-gui.module.min.js'

    // ─── Renderer ────────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // ─── Scene ──────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050810)
    scene.fog = new THREE.FogExp2(0x050810, 0.03)

    // ─── Camera ─────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 30)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 80
    controls.minDistance = 5

    // ─── Lights ──────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a2244, 1.5))
    const ptLight = new THREE.PointLight(0x4488ff, 60, 60)
    ptLight.position.set(10, 10, 10)
    scene.add(ptLight)
    const ptLight2 = new THREE.PointLight(0xff6644, 40, 60)
    ptLight2.position.set(-10, -5, -10)
    scene.add(ptLight2)

    // ─── Shader: Noise Flow Field (GPU particles) ───────────────────────────────
    const PARTICLE_COUNT = 40000

    const vertexShader = `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aLife;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vAlpha = aLife;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - 0.5;
        float dist = length(coord);
        if (dist > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 1.5);
        gl_FragColor = vec4(vColor * glow, vAlpha * glow * 0.85);
      }
    `

    // ─── Particle State (CPU managed) ──────────────────────────────────────────
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const lives = new Float32Array(PARTICLE_COUNT)

    // Field bounds
    const BOUNDS = 24

    // Simplex/Perlin-like noise approximation (fast)
    function noise2D(x, y) {
      const n = Math.sin(x * 0.127 + y * 0.311) * 43758.5453
      return (n - Math.floor(n)) * 2.0 - 1.0
    }

    function fbm(x, y, octaves) {
      let val = 0.0
      let amp = 0.5
      let freq = 1.0
      let maxVal = 0.0
      for (let i = 0; i < octaves; i++) {
        val += amp * noise2D(x * freq, y * freq)
        maxVal += amp
        amp *= 0.5
        freq *= 2.1
      }
      return val / maxVal
    }

    // Mouse disturbance state
    const mouse = new THREE.Vector2(0, 0)
    const mouseWorld = new THREE.Vector3(0, 0, 0)
    let mouseActive = false

    // Initialize particles
    function initParticle(i) {
      const i3 = i * 3
      positions[i3]     = (Math.random() - 0.5) * BOUNDS * 2
      positions[i3 + 1] = (Math.random() - 0.5) * BOUNDS * 2
      positions[i3 + 2] = (Math.random() - 0.5) * 8

      const speed = 0.03 + Math.random() * 0.06
      velocities[i3]     = (Math.random() - 0.5) * speed
      velocities[i3 + 1] = (Math.random() - 0.5) * speed
      velocities[i3 + 2] = (Math.random() - 0.5) * speed * 0.3

      // Hue based on position
      const hue = ((i / PARTICLE_COUNT) + Math.random() * 0.1) % 1.0
      const c = new THREE.Color().setHSL(hue, 0.8, 0.55)
      colors[i3]     = c.r
      colors[i3 + 1] = c.g
      colors[i3 + 2] = c.b

      sizes[i] = 1.5 + Math.random() * 2.5
      lives[i] = 0.5 + Math.random() * 0.5
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) initParticle(i)

    // Create geometry
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aLife', new THREE.BufferAttribute(lives, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, mat)
    scene.add(points)

    // ─── Grid backdrop ──────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(60, 30, 0x0a1530, 0x080e20)
    grid.position.z = -5
    grid.material.transparent = true
    grid.material.opacity = 0.4
    scene.add(grid)

    // Subtle ambient ring
    const ringGeo = new THREE.TorusGeometry(25, 0.08, 8, 80)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x1a3366, transparent: true, opacity: 0.5 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.z = -2
    scene.add(ring)

    // ─── Raycaster for mouse ───────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const rayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    )
    rayPlane.rotation.x = -Math.PI / 2
    scene.add(rayPlane)

    renderer.domElement.addEventListener('mousemove', (e) => {
      mouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(rayPlane)
      if (hits.length > 0) {
        mouseWorld.copy(hits[0].point)
        mouseActive = true
      }
    })

    renderer.domElement.addEventListener('mouseleave', () => { mouseActive = false })

    // ─── GUI ─────────────────────────────────────────────────────────────────────
    const params = {
      flowSpeed: 1.0,
      noiseScale: 0.08,
      octaves: 3,
      particleSize: 1.0,
      turbulence: 0.5,
      colorShift: 0.5,
      reset: () => {
        for (let i = 0; i < PARTICLE_COUNT; i++) initParticle(i)
        geo.attributes.position.needsUpdate = true
        geo.attributes.aColor.needsUpdate = true
        geo.attributes.aSize.needsUpdate = true
        geo.attributes.aLife.needsUpdate = true
      },
    }

    const gui = new GUI({ title: '流场参数' })
    gui.add(params, 'flowSpeed', 0.1, 3.0, 0.05).name('流动速度')
    gui.add(params, 'noiseScale', 0.02, 0.3, 0.01).name('噪声缩放')
    gui.add(params, 'octaves', 1, 5, 1).name('噪声倍频')
    gui.add(params, 'particleSize', 0.2, 3.0, 0.1).name('粒子大小')
    gui.add(params, 'turbulence', 0.0, 2.0, 0.05).name('湍流强度')
    gui.add(params, 'colorShift', 0.0, 1.0, 0.01).name('颜色偏移')
    gui.add(params, 'reset').name('重置粒子')

    // ─── Resize ─────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })

    // ─── Animate ─────────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let globalHueOffset = 0

    function updateParticles(time, dt) {
      const posAttr = geo.attributes.position
      const colAttr = geo.attributes.aColor
      const sizeAttr = geo.attributes.aSize
      const lifeAttr = geo.attributes.aLife

      const noiseScale = params.noiseScale
      const speed = params.flowSpeed
      const turb = params.turbulence
      const colorShift = params.colorShift

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3

        const px = positions[i3]
        const py = positions[i3 + 1]

        // Perlin-like flow direction
        const angle1 = fbm(px * noiseScale + time * 0.15 * speed,
                           py * noiseScale + time * 0.12 * speed,
                           Math.round(params.octaves)) * Math.PI * 2
        const angle2 = fbm(px * noiseScale * 1.7 + time * 0.08 * speed + 100,
                           py * noiseScale * 1.7 + time * 0.1 * speed + 100,
                           2) * Math.PI * 0.5

        // Flow velocity
        let vx = Math.cos(angle1) * 0.08 * speed
        let vy = Math.sin(angle1) * 0.08 * speed
        let vz = Math.sin(angle2) * 0.02 * speed

        // Turbulence
        vx += fbm(px * 0.2 + time * 0.3, py * 0.2 + i * 0.001, 2) * 0.04 * turb
        vy += fbm(px * 0.2 + time * 0.25 + 50, py * 0.2 + i * 0.001, 2) * 0.04 * turb

        // Mouse vortex disturbance
        if (mouseActive) {
          const dx = px - mouseWorld.x
          const dy = py - mouseWorld.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 100) {
            const dist = Math.sqrt(dist2)
            const strength = Math.max(0, (10 - dist) / 10) * 0.5
            // Tangential vortex
            const nx = -dy / (dist + 0.01)
            const ny = dx / (dist + 0.01)
            vx += nx * strength
            vy += ny * strength
            vz += Math.sin(time * 3 + i) * strength * 0.3
          }
        }

        velocities[i3]     = velocities[i3] * 0.92 + vx * 0.08
        velocities[i3 + 1] = velocities[i3 + 1] * 0.92 + vy * 0.08
        velocities[i3 + 2] = velocities[i3 + 2] * 0.92 + vz * 0.08

        positions[i3]     += velocities[i3]
        positions[i3 + 1] += velocities[i3 + 1]
        positions[i3 + 2] += velocities[i3 + 2]

        // Wrap around bounds
        if (positions[i3]     >  BOUNDS) positions[i3]     = -BOUNDS
        if (positions[i3]     < -BOUNDS) positions[i3]     =  BOUNDS
        if (positions[i3 + 1] >  BOUNDS) positions[i3 + 1] = -BOUNDS
        if (positions[i3 + 1] < -BOUNDS) positions[i3 + 1] =  BOUNDS
        if (positions[i3 + 2] >  5)      positions[i3 + 2] = -2
        if (positions[i3 + 2] < -3)     positions[i3 + 2] =  5

        // Color shifts over time + position
        const baseHue = ((i / PARTICLE_COUNT) + colorShift) % 1.0
        const speedHue = (Math.abs(velocities[i3]) + Math.abs(velocities[i3 + 1])) * 5
        const h = (baseHue + speedHue * 0.2 + globalHueOffset) % 1.0
        const s = 0.7 + Math.abs(Math.sin(time + i)) * 0.2
        const l = 0.45 + Math.sqrt(velocities[i3] * velocities[i3] + velocities[i3 + 1] * velocities[i3 + 1]) * 3
        const c = new THREE.Color().setHSL(h, Math.min(s, 0.9), Math.min(l, 0.75))
        colAttr.array[i3]     = c.r
        colAttr.array[i3 + 1] = c.g
        colAttr.array[i3 + 2] = c.b

        // Speed-based size
        const spd = Math.sqrt(
          velocities[i3] * velocities[i3] +
          velocities[i3 + 1] * velocities[i3 + 1] +
          velocities[i3 + 2] * velocities[i3 + 2]
        )
        sizeAttr.array[i] = (1.5 + spd * 15) * params.particleSize
        lifeAttr.array[i] = 0.6 + spd * 3
      }

      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
      lifeAttr.needsUpdate = true
    }

    function animate() {
      requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const dt = clock.getDelta()

      globalHueOffset = elapsed * 0.01 * params.colorShift

      updateParticles(elapsed, dt)

      // Animate lights
      ptLight.position.x = Math.sin(elapsed * 0.5) * 15
      ptLight.position.y = Math.cos(elapsed * 0.3) * 10
      ptLight.intensity = 50 + Math.sin(elapsed * 1.5) * 15

      ring.rotation.z = elapsed * 0.05

      controls.update()
      renderer.render(scene, camera)
    }

    animate()