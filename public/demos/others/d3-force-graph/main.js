// ============ D3.js · 力导向图 ============
// D3 是数据可视化的瑞士军刀：svg/canvas + 数据绑定 + 丰富算法
// 这里展示 force simulation（斥力/引力/碰撞）+ 拖拽交互
// 应用：图表、关系网络、仪表盘、大屏数据可视化

import * as d3 from 'https://esm.sh/d3@7'

// ============ 1. 模拟数据：5 组社群 + 组内/组间连线 ============
const nodes = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  group: Math.floor(i / 6),
}))

const links = []
// 组内全连接
for (let g = 0; g < 5; g++) {
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      links.push({ source: g * 6 + i, target: g * 6 + j })
    }
  }
}
// 组间随机桥接
for (let i = 0; i < 8; i++) {
  links.push({
    source: Math.floor(Math.random() * 30),
    target: Math.floor(Math.random() * 30),
  })
}

// ============ 2. 创建 SVG ============
const svg = d3
  .select('#svg')
  .attr('width', innerWidth)
  .attr('height', innerHeight)

const color = d3.scaleOrdinal(d3.schemeTableau10)

// 连线层
const link = svg
  .append('g')
  .attr('class', 'link-layer')
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('class', 'link')
  .attr('stroke-width', 1.5)

// 节点层
const node = svg
  .append('g')
  .selectAll('circle')
  .data(nodes)
  .join('circle')
  .attr('class', 'node')
  .attr('r', 14)
  .attr('fill', d => color(d.group))
  .attr('stroke', '#fff')
  .attr('stroke-width', 2)

// 标签层
const label = svg
  .append('g')
  .selectAll('text')
  .data(nodes)
  .join('text')
  .text(d => d.id)
  .attr('text-anchor', 'middle')
  .attr('dy', 4)
  .attr('fill', '#fff')
  .attr('font-size', 11)
  .attr('font-weight', 600)
  .style('pointer-events', 'none')

// ============ 3. 力模拟 ============
const simulation = d3
  .forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(60))
  .force('charge', d3.forceManyBody().strength(-150)) // 节点互相排斥
  .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
  .force('collide', d3.forceCollide().radius(18))     // 防止重叠
  .on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
    node.attr('cx', d => d.x).attr('cy', d => d.y)
    label.attr('x', d => d.x).attr('y', d => d.y)
  })

// ============ 4. 拖拽交互 ============
node.call(
  d3
    .drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    })
)

// ============ 5. resize ============
addEventListener('resize', () => {
  svg.attr('width', innerWidth).attr('height', innerHeight)
  simulation.force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
  simulation.alpha(0.3).restart()
})

window.simulation = simulation
