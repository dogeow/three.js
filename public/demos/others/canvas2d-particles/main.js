// ============ Canvas 2D · 粒子系统 ============
// 纯原生 Canvas API，零依赖
// 适合学：动画循环 / 物理模拟 / 鼠标交互 / 拖尾效果
// 应用：H5 背景特效、loading 动画、小游戏

const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')

// ============ 1. 高清屏适配 ============
function resize() {
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  canvas.style.width = innerWidth + 'px'
  canvas.style.height = innerHeight + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resize()
addEventListener('resize', resize)

// ============ 2. 鼠标状态 ============
const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false }
addEventListener('mousemove', e => {
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true
})
addEventListener('mouseleave', () => (mouse.active = false))

// ============ 3. 创建粒子 ============
const COUNT = 150
const particles = Array.from({ length: COUNT }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  vx: (Math.random() - 0.5) * 0.8,
  vy: (Math.random() - 0.5) * 0.8,
  hue: Math.random() * 60 + 180, // 青蓝色调
}))

// ============ 4. 动画循环 ============
function step() {
  // 半透明覆盖整画面 => 粒子自带拖尾（关键技巧）
  ctx.fillStyle = 'rgba(10, 10, 26, 0.15)'
  ctx.fillRect(0, 0, innerWidth, innerHeight)

  for (const p of particles) {
    // 鼠标吸引力
    if (mouse.active) {
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const d = Math.hypot(dx, dy)
      if (d < 180 && d > 1) {
        p.vx += (dx / d) * 0.15
        p.vy += (dy / d) * 0.15
      }
    }

    // 更新位置 + 摩擦力
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.97
    p.vy *= 0.97

    // 边界环绕
    if (p.x < 0) p.x += innerWidth
    if (p.x > innerWidth) p.x -= innerWidth
    if (p.y < 0) p.y += innerHeight
    if (p.y > innerHeight) p.y -= innerHeight

    // 画粒子
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`
    ctx.fill()
  }

  // ============ 5. 邻近粒子连线（经典 constellation 效果）============
  for (let i = 0; i < COUNT; i++) {
    for (let j = i + 1; j < COUNT; j++) {
      const a = particles[i]
      const b = particles[j]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < 110) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 65%, ${1 - d / 110})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    }
  }

  requestAnimationFrame(step)
}
step()

// 暴露到全局方便调试
window.particles = particles
