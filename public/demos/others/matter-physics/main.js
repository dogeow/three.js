// ============ Matter.js · 2D 物理引擎 ============
// 入门：刚体动力学 / 碰撞 / 重力 / 鼠标约束
// 应用：2D 小游戏、UI 物理互动效果、物理教学、抽奖/摇一摇动效

import Matter from 'https://esm.sh/matter-js@0.20.0'

const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter

// ============ 1. 引擎 + 渲染器（Matter 自带一个调试渲染器）============
const engine = Engine.create()
engine.gravity.y = 1 // 重力方向（向下为正）

const render = Render.create({
  element: document.body,
  engine,
  options: {
    width: innerWidth,
    height: innerHeight,
    wireframes: false,    // false = 彩色实心模式
    background: '#1a1a2e',
  },
})
Render.run(render)
Runner.run(Runner.create(), engine)

// ============ 2. 边界：地面 + 两堵墙 ============
const thick = 60
const walls = [
  Bodies.rectangle(innerWidth / 2, innerHeight + thick / 2, innerWidth * 2, thick, { isStatic: true }),
  Bodies.rectangle(-thick / 2, innerHeight / 2, thick, innerHeight * 2, { isStatic: true }),
  Bodies.rectangle(innerWidth + thick / 2, innerHeight / 2, thick, innerHeight * 2, { isStatic: true }),
]
Composite.add(engine.world, walls)

// ============ 3. 随机生成形状（圆/矩形/多边形）============
function addShapes(n = 30) {
  const shapes = []
  for (let i = 0; i < n; i++) {
    const x = Math.random() * innerWidth
    const y = -Math.random() * 300 // 从屏幕上方掉下来
    const hue = Math.random() * 360
    const color = `hsl(${hue}, 70%, 60%)`
    const type = Math.random()

    let body
    if (type < 0.33) {
      // 圆形
      body = Bodies.circle(x, y, 18 + Math.random() * 20, {
        restitution: 0.6, // 弹性系数（0~1）
        render: { fillStyle: color },
      })
    } else if (type < 0.66) {
      // 矩形
      body = Bodies.rectangle(
        x, y,
        30 + Math.random() * 30,
        30 + Math.random() * 30,
        { restitution: 0.4, render: { fillStyle: color } }
      )
    } else {
      // 多边形（3~6 边）
      body = Bodies.polygon(
        x, y,
        3 + Math.floor(Math.random() * 4),
        18 + Math.random() * 20,
        { restitution: 0.5, render: { fillStyle: color } }
      )
    }
    shapes.push(body)
  }
  Composite.add(engine.world, shapes)
}
addShapes(40)

document.getElementById('add').onclick = () => addShapes(20)

// ============ 4. 鼠标拖拽约束 ============
const mouse = Mouse.create(render.canvas)
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: { stiffness: 0.2, render: { visible: false } },
})
Composite.add(engine.world, mouseConstraint)
render.mouse = mouse

// ============ 5. resize ============
addEventListener('resize', () => {
  render.canvas.width = innerWidth
  render.canvas.height = innerHeight
  render.options.width = innerWidth
  render.options.height = innerHeight
})

// 暴露调试
window.Matter = Matter
window.engine = engine
