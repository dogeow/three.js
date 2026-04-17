import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202030)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(4, 4, 6)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
// ⚠️ 关键：必须开启阴影渲染
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap // 软阴影边缘更柔
document.body.appendChild(renderer.domElement)

// ============ 灯光 ============

// 1) 环境光：均匀照亮所有物体，没有方向、不产生阴影
//    用来「提亮暗部」，避免背光面全黑
scene.add(new THREE.AmbientLight(0xffffff, 0.2))

// 2) 平行光：模拟太阳光，所有光线方向一致
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
dirLight.position.set(5, 8, 5)
dirLight.castShadow = true // ⚠️ 这盏灯要投射阴影
// 阴影贴图分辨率，越高越清晰、越耗性能
dirLight.shadow.mapSize.set(1024, 1024)
// 阴影相机的范围（平行光的阴影是用一个正交相机渲染的）
const s = 6
dirLight.shadow.camera.left = -s
dirLight.shadow.camera.right = s
dirLight.shadow.camera.top = s
dirLight.shadow.camera.bottom = -s
scene.add(dirLight)

// 3) 点光：从一个点向四面八方发光，像灯泡
const pointLight = new THREE.PointLight(0xff4488, 2, 10)
pointLight.position.set(-2, 2, 2)
scene.add(pointLight)

// 可视化辅助器（学习时非常有用）
scene.add(new THREE.DirectionalLightHelper(dirLight, 0.5))
scene.add(new THREE.PointLightHelper(pointLight, 0.2))
scene.add(new THREE.CameraHelper(dirLight.shadow.camera)) // 看清阴影范围

// ============ 物体 ============

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x888888 })
)
ground.rotation.x = -Math.PI / 2 // 平面默认竖立，转 90° 变水平
ground.receiveShadow = true // ⚠️ 接收阴影
scene.add(ground)

// 一群小球
const balls = []
for (let i = 0; i < 5; i++) {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(i / 5, 0.7, 0.5),
      roughness: 0.3,
      metalness: 0.2
    })
  )
  ball.position.set((i - 2) * 1.2, 0.5, 0)
  ball.castShadow = true // ⚠️ 投射阴影
  scene.add(ball)
  balls.push(ball)
}

// ============ 渲染循环 ============
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  // 让球上下跳，阴影会跟着动
  balls.forEach((b, i) => {
    b.position.y = 0.5 + Math.abs(Math.sin(t * 2 + i)) * 1.5
  })
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.dirLight = dirLight
window.balls = balls