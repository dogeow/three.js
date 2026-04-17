import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a12)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 1.5, 4)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.5, 0)

// ============ 环境光与火焰点光源 ============
const ambientLight = new THREE.AmbientLight(0x331100, 2.0)
scene.add(ambientLight)

const fireLight = new THREE.PointLight(0xff5500, 8, 20)
fireLight.position.set(0, 2, 0)
scene.add(fireLight)

// ============ 底座台 ============
const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.4, 32)
const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.8,
  metalness: 0.2
})
const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat)
pedestal.position.y = -0.2
scene.add(pedestal)

// 火坑（火焰升起的燃料堆）
const pitGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.2, 24)
const pitMat = new THREE.MeshStandardMaterial({
  color: 0x4a2c00,
  roughness: 0.9,
  emissive: 0x220800,
  emissiveIntensity: 0.3
})
scene.add(new THREE.Mesh(pitGeo, pitMat))

// ============ GUI 参数 ============
const params = {
  fireIntensity: 1.0,
  smokeDensity: 1.0,
  windStrength: 0.5,
  particleSize: 1.0
}

// ============ 共用圆形软粒子贴图 ============
function makeSoftSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.15)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const sprite = makeSoftSprite()

// ============ 粒子系统基类 ============
class ParticleSystem {
  constructor({
    count,
    spawnRadius,
    maxLife,
    size,
    colorFn,
    blending,
    baseSpeed,
    sizeGrow,
    windFactor,
    transparent = true
  }) {
    this.count = count
    this.spawnRadius = spawnRadius
    this.maxLife = maxLife
    this.baseSpeed = baseSpeed
    this.sizeGrow = sizeGrow
    this.windFactor = windFactor
    this.colorFn = colorFn

    // 顶点数据
    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.lives = new Float32Array(count)
    this.maxLives = new Float32Array(count)
    this.sizes = new Float32Array(count)
    this.baseSizes = new Float32Array(count)
    this.seed = new Float32Array(count)  // 随机种子，用于个体差异

    // 初始化生命值
    for (let i = 0; i < count; i++) {
      this.lives[i] = Math.random() * maxLife
      this.maxLives[i] = maxLife
      this.seed[i] = Math.random()
    }

    // BufferAttribute（需要动态更新的标记 needsUpdate）
    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geo.setAttribute('aLife',     new THREE.BufferAttribute(this.lives, 1))
    this.geo.setAttribute('aMaxLife',  new THREE.BufferAttribute(this.maxLives, 1))
    this.geo.setAttribute('aSize',     new THREE.BufferAttribute(this.sizes, 1))
    this.geo.setAttribute('aSeed',      new THREE.BufferAttribute(this.seed, 1))

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: sprite },
        uSize:    { value: size },
        uTime:    { value: 0 }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent,
      depthWrite: false,
      blending: blending || THREE.AdditiveBlending
    })

    this.points = new THREE.Points(this.geo, this.mat)
    this.resetAll()
  }

  getVertexShader() {
    return /* glsl */`
      attribute float aLife;
      attribute float aMaxLife;
      attribute float aSize;
      attribute float aSeed;

      uniform float uSize;
      uniform float uTime;

      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        float lifeNorm = clamp(aLife / max(aMaxLife, 0.001), 0.0, 1.0);
        vLifeNorm = lifeNorm;

        // 子类通过 vColor 插值，这里提供默认实现
        vColor = vec3(1.0, 0.8, 0.4);

        // 透明度随生命衰减
        vAlpha = lifeNorm * lifeNorm * 0.9;

        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        // 粒子大小随距离衰减，同时叠加 aSize
        gl_PointSize = uSize * aSize * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `
  }

  getFragmentShader() {
    return /* glsl */`
      uniform sampler2D uTexture;
      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        // 使用 vColor 混合（子类可覆盖 vColor varying）
        gl_FragColor = vec4(vColor, tex.a * vAlpha);
        if (gl_FragColor.a < 0.005) discard;
      }
    `
  }

  reset(i) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * this.spawnRadius
    this.positions[i * 3]     = Math.cos(angle) * r
    this.positions[i * 3 + 1] = 0
    this.positions[i * 3 + 2] = Math.sin(angle) * r

    this.velocities[i * 3]     = (Math.random() - 0.5) * 0.3
    this.velocities[i * 3 + 1] = this.baseSpeed * (0.7 + Math.random() * 0.6)
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3

    this.lives[i] = this.maxLives[i] * (0.2 + Math.random() * 0.8)
    this.sizes[i] = this.baseSizes[i]
  }

  resetAll() {
    for (let i = 0; i < this.count; i++) {
      this.reset(i)
      this.sizes[i] = this.size * (0.5 + Math.random())
      this.baseSizes[i] = this.sizes[i]
    }
    this.geo.attributes.aLife.needsUpdate = true
    this.geo.attributes.aMaxLife.needsUpdate = true
    this.geo.attributes.aSize.needsUpdate = true
  }

  update(dt, time, intensity, windStrength) {
    const pos = this.geo.attributes.position.array
    const life = this.geo.attributes.aLife.array
    const size = this.geo.attributes.aSize.array
    const vel = this.velocities

    for (let i = 0; i < this.count; i++) {
      life[i] -= dt
      if (life[i] <= 0) {
        this.reset(i)
        life[i] = this.maxLives[i]
        size[i] = this.baseSizes[i] * intensity
      }

      const windX = Math.sin(time * 0.8 + this.seed[i] * 10) * windStrength * this.windFactor
      const windZ = Math.cos(time * 0.6 + this.seed[i] * 7) * windStrength * this.windFactor * 0.5

      pos[i * 3]     += (vel[i * 3]     + windX) * dt
      pos[i * 3 + 1] += vel[i * 3 + 1]  * dt * intensity
      pos[i * 3 + 2] += (vel[i * 3 + 2] + windZ) * dt

      // 粒子随生命消耗而扩展或缩小
      size[i] += this.sizeGrow * dt
    }

    this.geo.attributes.position.needsUpdate = true
    this.geo.attributes.aLife.needsUpdate = true
    this.geo.attributes.aSize.needsUpdate = true
  }

  setIntensity(v) {
    this.mat.uniforms.uSize.value = this.size * v
  }
}

// ============ 火焰粒子 ============
class FireSystem extends ParticleSystem {
  constructor(count) {
    super({
      count,
      spawnRadius: 0.35,
      maxLife: 1.8,
      size: 0.18,
      blending: THREE.AdditiveBlending,
      baseSpeed: 2.5,
      sizeGrow: 0.06,
      windFactor: 0.1
    })
  }

  getVertexShader() {
    return /* glsl */`
      attribute float aLife;
      attribute float aMaxLife;
      attribute float aSize;
      attribute float aSeed;

      uniform float uSize;
      uniform float uTime;

      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      // 基于 sin 的哈希随机
      float rand(float n) {
        return fract(sin(n * 12.9898) * 43758.5453);
      }

      void main() {
        float lifeNorm = clamp(aLife / max(aMaxLife, 0.001), 0.0, 1.0);
        vLifeNorm = lifeNorm;

        // 火焰颜色随高度/生命变化
        // 高处（慢=老=冷）→ 红；低处（快=年轻=热）→ 黄白
        vec3 colorYoung = vec3(1.0, 0.95, 0.6);  // 白黄
        vec3 colorMid   = vec3(1.0, 0.55, 0.1); // 橙
        vec3 colorOld   = vec3(0.9, 0.1, 0.0);  // 深红

        // 越老颜色越冷
        vec3 hot = mix(colorYoung, colorMid, 1.0 - lifeNorm);
        vec3 cold = mix(colorMid, colorOld, pow(1.0 - lifeNorm, 2.0));
        vColor = mix(hot, cold, smoothstep(0.3, 0.7, 1.0 - lifeNorm));

        // 高出更亮（叠加能量感）
        float heat = pow(lifeNorm, 1.5);
        vColor += vec3(0.2, 0.05, 0.0) * heat;

        // 透明度：出生时淡入，消亡时淡出
        vAlpha = smoothstep(0.0, 0.1, lifeNorm) * smoothstep(0.0, 0.15, lifeNorm);

        // 核心粒子更亮
        float core = pow(lifeNorm, 3.0);
        vColor += vec3(0.3, 0.15, 0.0) * core;

        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * aSize * (320.0 / -mvPos.z) * (0.5 + lifeNorm * 0.8);
        gl_Position = projectionMatrix * mvPos;
      }
    `
  }

  getFragmentShader() {
    return /* glsl */`
      uniform sampler2D uTexture;
      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        vec4 tex = texture2D(uTexture, gl_PointCoord);

        // 外缘更透明
        float alpha = tex.a * vAlpha * smoothstep(0.5, 0.1, d);
        vec3 col = vColor;
        // 中心加亮白核
        float core = smoothstep(0.2, 0.0, d);
        col += vec3(0.4, 0.2, 0.05) * core;

        gl_FragColor = vec4(col, alpha);
        if (gl_FragColor.a < 0.005) discard;
      }
    `
  }

  reset(i) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * this.spawnRadius
    this.positions[i * 3]     = Math.cos(angle) * r
    this.positions[i * 3 + 1] = 0
    this.positions[i * 3 + 2] = Math.sin(angle) * r

    // 火焰向中心聚拢，向上快速喷射
    this.velocities[i * 3]     = (Math.random() - 0.5) * 0.5
    this.velocities[i * 3 + 1] = this.baseSpeed * (0.6 + Math.random() * 0.8)
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5

    this.lives[i] = this.maxLives[i] * (0.3 + Math.random() * 0.7)
    this.sizes[i] = this.baseSizes[i]
  }
}

// ============ 烟雾粒子 ============
class SmokeSystem extends ParticleSystem {
  constructor(count) {
    super({
      count,
      spawnRadius: 0.3,
      maxLife: 5.0,
      size: 0.35,
      blending: THREE.NormalBlending,
      baseSpeed: 0.6,
      sizeGrow: 0.12,
      windFactor: 1.0,
      transparent: true
    })
  }

  getVertexShader() {
    return /* glsl */`
      attribute float aLife;
      attribute float aMaxLife;
      attribute float aSize;
      attribute float aSeed;

      uniform float uSize;
      uniform float uTime;

      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        float lifeNorm = clamp(aLife / max(aMaxLife, 0.001), 0.0, 1.0);
        vLifeNorm = lifeNorm;

        // 烟雾：底部深灰，顶部渐浅渐透明
        vec3 dark  = vec3(0.25, 0.2, 0.18);
        vec3 light = vec3(0.6, 0.58, 0.55);
        vColor = mix(dark, light, 1.0 - lifeNorm);

        // 透明度和大小随生命变化：老粒子更大更透明
        float age = 1.0 - lifeNorm;
        vAlpha = smoothstep(0.0, 0.1, lifeNorm) * smoothstep(0.0, 0.3, lifeNorm) * 0.35;

        // 快速生长阶段
        float growFactor = mix(1.0, 3.0, smoothstep(0.0, 0.4, age));

        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * aSize * growFactor * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `
  }

  getFragmentShader() {
    return /* glsl */`
      uniform sampler2D uTexture;
      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        float alpha = tex.a * vAlpha;
        // 边缘更透明
        vec2 uv = gl_PointCoord - 0.5;
        float edge = smoothstep(0.5, 0.2, length(uv));
        alpha *= edge;
        gl_FragColor = vec4(vColor, alpha);
        if (gl_FragColor.a < 0.005) discard;
      }
    `
  }

  reset(i) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * this.spawnRadius
    this.positions[i * 3]     = Math.cos(angle) * r
    this.positions[i * 3 + 1] = 0.5 + Math.random() * 0.5
    this.positions[i * 3 + 2] = Math.sin(angle) * r

    this.velocities[i * 3]     = (Math.random() - 0.5) * 0.2
    this.velocities[i * 3 + 1] = this.baseSpeed * (0.3 + Math.random() * 0.4)
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2

    this.lives[i] = this.maxLives[i] * (0.2 + Math.random() * 0.8)
    this.sizes[i] = this.baseSizes[i]
  }
}

// ============ 余烬粒子 ============
class EmberSystem extends ParticleSystem {
  constructor(count) {
    super({
      count,
      spawnRadius: 0.25,
      maxLife: 2.5,
      size: 0.04,
      blending: THREE.AdditiveBlending,
      baseSpeed: 4.0,
      sizeGrow: 0.0,
      windFactor: 0.4
    })
  }

  getVertexShader() {
    return /* glsl */`
      attribute float aLife;
      attribute float aMaxLife;
      attribute float aSize;
      attribute float aSeed;

      uniform float uSize;
      uniform float uTime;

      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        float lifeNorm = clamp(aLife / max(aMaxLife, 0.001), 0.0, 1.0);
        vLifeNorm = lifeNorm;

        // 余烬：橙红到暗淡消失
        vec3 emberHot  = vec3(1.0, 0.6, 0.1);
        vec3 emberCool = vec3(0.8, 0.15, 0.0);
        vColor = mix(emberHot, emberCool, 1.0 - lifeNorm);

        // 闪烁效果
        float flicker = 0.7 + 0.3 * sin(uTime * 15.0 + aSeed * 30.0);
        vAlpha = lifeNorm * flicker;

        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * aSize * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `
  }

  getFragmentShader() {
    return /* glsl */`
      varying float vAlpha;
      varying vec3  vColor;
      varying float vLifeNorm;

      void main() {
        // 余烬是简单的圆点
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = vAlpha * smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(vColor, alpha);
        if (gl_FragColor.a < 0.005) discard;
      }
    `
  }

  reset(i) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * this.spawnRadius
    this.positions[i * 3]     = Math.cos(angle) * r
    this.positions[i * 3 + 1] = Math.random() * 0.3
    this.positions[i * 3 + 2] = Math.sin(angle) * r

    this.velocities[i * 3]     = (Math.random() - 0.5) * 1.5
    this.velocities[i * 3 + 1] = this.baseSpeed * (0.5 + Math.random() * 1.0)
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5

    this.lives[i] = this.maxLives[i] * (0.5 + Math.random() * 0.5)
    this.sizes[i] = this.baseSizes[i]
  }
}

// ============ 创建三层粒子系统 ============
const fire  = new FireSystem(2000)
const smoke = new SmokeSystem(3000)
const ember = new EmberSystem(500)

scene.add(fire.points)
scene.add(smoke.points)
scene.add(ember.points)

// ============ GUI ============
const gui = new GUI()
gui.add(params, 'fireIntensity', 0.1, 2.0).name('火焰强度')
gui.add(params, 'smokeDensity', 0.1, 2.0).name('烟雾密度')
gui.add(params, 'windStrength', 0.0, 2.0).name('风力强度')
gui.add(params, 'particleSize', 0.3, 2.0).name('粒子大小')

// ============ 渲染循环 ============
const clock = new THREE.Clock()
const firePosAttr = fire.geo.attributes.position

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  // 更新各层粒子
  fire.update(dt, t, params.fireIntensity, params.windStrength)
  smoke.update(dt, t, params.smokeDensity, params.windStrength)
  ember.update(dt, t, params.fireIntensity, params.windStrength)

  // 更新着色器时间
  fire.mat.uniforms.uTime.value = t
  smoke.mat.uniforms.uTime.value = t
  ember.mat.uniforms.uTime.value = t

  // 粒子大小
  fire.mat.uniforms.uSize.value = params.particleSize
  smoke.mat.uniforms.uSize.value = params.particleSize
  ember.mat.uniforms.uSize.value = params.particleSize

  // 火焰光源随时间闪烁
  const flicker = 0.85 + Math.sin(t * 8) * 0.1 + Math.sin(t * 13) * 0.05
  fireLight.intensity = 3 * params.fireIntensity * flicker

  // 火焰光源位置在燃料堆上方微微跳动
  fireLight.position.x = Math.sin(t * 3) * 0.1
  fireLight.position.z = Math.cos(t * 2) * 0.1

  controls.update()
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})