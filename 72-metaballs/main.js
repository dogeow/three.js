import * as THREE from 'three'
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
    import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

    // ─── Renderer ────────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.appendChild(renderer.domElement)

    // ─── Scene ──────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.04)

    // ─── Camera ─────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 1.5, 3.5)

    // ─── Controls ────────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 1.5
    controls.maxDistance = 8

    // ─── Lights ──────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x88ccff, 1.8)
    dirLight1.position.set(4, 8, 5)
    dirLight1.castShadow = true
    dirLight1.shadow.mapSize.set(1024, 1024)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xff88cc, 1.2)
    dirLight2.position.set(-5, -3, -4)
    scene.add(dirLight2)

    const rimLight = new THREE.PointLight(0x44ffcc, 0.8, 10)
    rimLight.position.set(0, -2, -2)
    scene.add(rimLight)

    // ─── Marching Cubes ─────────────────────────────────────────────────────────
    const matStd = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x110022,
      emissiveIntensity: 0.3,
      specular: 0x8888ff,
      shininess: 80,
      metalness: 0.3,
      roughness: 0.25,
    })

    const RESOLUTION = 40
    const marchingCubes = new MarchingCubes(RESOLUTION, matStd, true, true, 100000)
    marchingCubes.isolation = 80
    scene.add(marchingCubes)

    // ─── GUI ─────────────────────────────────────────────────────────────────────
    const params = {
      isolation: 80,
      speed: 1.0,
      resolution: 40,
      numBlobs: 10,
      color: '#ffffff',
      wireframe: false,
      animateBg: true,
    }

    const gui = new GUI({ title: '融球参数' })
    gui.add(params, 'isolation', 40, 120, 1).name('等值面阈值')
    gui.add(params, 'speed', 0.1, 3.0, 0.05).name('运动速度')
    gui.add(params, 'numBlobs', 4, 16, 1).name('融球数量').onChange(v => {
      marchingCubes.fill = true
    })
    gui.add(params, 'resolution', 20, 60, 1).name('网格分辨率').listen()
    gui.addColor(params, 'color').name('材质颜色').onChange(v => {
      matStd.color.set(v)
    })
    gui.add(params, 'wireframe').name('线框模式').onChange(v => {
      matStd.wireframe = v
    })
    gui.add(params, 'animateBg').name('背景动画')

    // ─── Update Metaballs ────────────────────────────────────────────────────────
    function updateCubes(object, time) {
      object.reset()

      const num = Math.round(params.numBlobs)
      const speed = params.speed

      for (let i = 0; i < num; i++) {
        const t = time * 0.45 * speed + i * 1.618 // golden ratio spread

        // Lissajous-like 3D orbit
        const x = Math.sin(t * 0.8 + i * 0.9) * 0.55
        const y = Math.cos(t * 0.6 + i * 0.4) * 0.45
        const z = Math.sin(t * 0.7 + i * 0.7) * 0.55

        // Pulsating radius
        const r = 0.12 + Math.sin(t * 1.3 + i * 2.1) * 0.05 + 0.03

        // HSL color per blob, cycling across spectrum
        const hue = ((i / num) + time * 0.03) % 1.0
        const color = new THREE.Color().setHSL(hue, 0.75, 0.55)
        object.addBall(x, y, z, r, color)
      }

      object.isolation = params.isolation
    }

    // ─── Background Particles ────────────────────────────────────────────────────
    const PARTICLE_COUNT = 600
    const bgPositions = new Float32Array(PARTICLE_COUNT * 3)
    const bgColors = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const r = 4 + Math.random() * 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      bgPositions[i3]     = r * Math.sin(phi) * Math.cos(theta)
      bgPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      bgPositions[i3 + 2] = r * Math.cos(phi)
      const brightness = 0.15 + Math.random() * 0.2
      bgColors[i3]     = brightness * 0.6
      bgColors[i3 + 1] = brightness * 0.8
      bgColors[i3 + 2] = brightness
    }

    const bgGeo = new THREE.BufferGeometry()
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3))
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3))

    const bgMat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    })

    const bgParticles = new THREE.Points(bgGeo, bgMat)
    scene.add(bgParticles)

    // Subtle grid on the floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x112233, 0x0a1520)
    gridHelper.position.y = -1.8
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.4
    scene.add(gridHelper)

    // ─── Clock ───────────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()

    // ─── Resize ──────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    })

    // ─── Animate ─────────────────────────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate)

      const elapsed = clock.getElapsedTime()

      updateCubes(marchingCubes, elapsed)

      // Slowly rotate background
      if (params.animateBg) {
        bgParticles.rotation.y = elapsed * 0.03
        bgParticles.rotation.x = elapsed * 0.015
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()