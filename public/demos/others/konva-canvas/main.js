// ============ Konva · 2D 交互画布 ============
// 基于 Canvas 2D 的图形库，把底层像素画笔抽象成"对象"（Shape/Group/Layer）
// 支持事件、拖拽、Transformer（旋转缩放控制柄）
// 应用：在线白板、海报设计器、图片编辑器、流程图工具、表单拖拽布局

import Konva from 'https://esm.sh/konva@9.3.16'

// ============ 1. 舞台（Stage）和图层（Layer）============
// 分层类似 Photoshop，每个 Layer 独立重绘，性能更好
const stage = new Konva.Stage({
  container: 'container',
  width: innerWidth,
  height: innerHeight,
})

const layer = new Konva.Layer()
stage.add(layer)

// ============ 2. 变换控制器（自带旋转/缩放句柄）============
const tr = new Konva.Transformer({
  rotateAnchorOffset: 30,
  borderStroke: '#4a90ff',
  anchorStroke: '#4a90ff',
  anchorFill: '#fff',
})
layer.add(tr)

// ============ 3. 工具函数：让任意 shape 可选中/拖拽 ============
function makeInteractive(shape) {
  shape.draggable(true)
  shape.on('click tap', () => tr.nodes([shape]))
  shape.on('mouseenter', () => (stage.container().style.cursor = 'move'))
  shape.on('mouseleave', () => (stage.container().style.cursor = 'default'))
  layer.add(shape)
}

// 点击空白处取消选中
stage.on('click tap', e => {
  if (e.target === stage) tr.nodes([])
})

// ============ 4. 添加形状的工厂函数 ============
const randColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`
const randPos = () => ({
  x: Math.random() * (innerWidth - 200) + 100,
  y: Math.random() * (innerHeight - 200) + 100,
})

document.getElementById('rect').onclick = () => {
  const p = randPos()
  makeInteractive(new Konva.Rect({
    x: p.x, y: p.y, width: 140, height: 100,
    fill: randColor(), cornerRadius: 10,
    shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.1, shadowOffset: { x: 2, y: 4 },
  }))
}

document.getElementById('circle').onclick = () => {
  const p = randPos()
  makeInteractive(new Konva.Circle({
    x: p.x, y: p.y, radius: 55,
    fill: randColor(),
    shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.1,
  }))
}

document.getElementById('star').onclick = () => {
  const p = randPos()
  makeInteractive(new Konva.Star({
    x: p.x, y: p.y,
    numPoints: 5, innerRadius: 30, outerRadius: 60,
    fill: randColor(),
  }))
}

document.getElementById('text').onclick = () => {
  const p = randPos()
  const t = new Konva.Text({
    x: p.x, y: p.y,
    text: '双击我可编辑',
    fontSize: 28, fontFamily: '-apple-system',
    fill: '#222',
    padding: 8,
  })
  // 双击编辑文字
  t.on('dblclick dbltap', () => {
    const val = prompt('编辑文字：', t.text())
    if (val !== null) t.text(val)
  })
  makeInteractive(t)
}

document.getElementById('image').onclick = () => {
  const p = randPos()
  Konva.Image.fromURL('https://picsum.photos/200/150', img => {
    img.setAttrs({ x: p.x, y: p.y, width: 200, height: 150 })
    makeInteractive(img)
  })
}

// 删除当前选中
document.getElementById('del').onclick = () => {
  const nodes = tr.nodes()
  nodes.forEach(n => n.destroy())
  tr.nodes([])
}

// 键盘快捷键：Delete/Backspace 删除
addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && tr.nodes().length) {
    tr.nodes().forEach(n => n.destroy())
    tr.nodes([])
  }
})

// ============ 5. 默认放几个形状演示 ============
document.getElementById('rect').onclick()
document.getElementById('circle').onclick()
document.getElementById('star').onclick()
document.getElementById('text').onclick()

// resize
addEventListener('resize', () => {
  stage.width(innerWidth)
  stage.height(innerHeight)
})

window.stage = stage
