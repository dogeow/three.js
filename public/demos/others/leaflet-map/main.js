// ============ Leaflet · 交互地图 ============
// 最流行的开源地图库，纯 2D SVG/DOM 渲染（不走 WebGL）
// 核心：瓦片图层（TileLayer）+ 矢量要素（Marker/Polyline/Polygon）+ 事件
// 应用：外卖路径、门店地图、打卡签到、运动轨迹、房源地图

import L from 'https://esm.sh/leaflet@1.9.4'

// ============ 1. 初始化地图（中心点：北京）============
const map = L.map('map', {
  center: [32.5, 110],
  zoom: 5,
  zoomControl: true,
})

// ============ 2. 底图瓦片（OpenStreetMap，免费）============
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map)

// ============ 3. 几个城市 marker ============
const cities = [
  { name: '北京', coord: [39.9042, 116.4074], emoji: '🏛️' },
  { name: '上海', coord: [31.2304, 121.4737], emoji: '🏙️' },
  { name: '广州', coord: [23.1291, 113.2644], emoji: '🌆' },
  { name: '成都', coord: [30.5728, 104.0668], emoji: '🐼' },
  { name: '西安', coord: [34.3416, 108.9398], emoji: '🏯' },
]

for (const c of cities) {
  L.marker(c.coord)
    .addTo(map)
    .bindPopup(`<b>${c.emoji} ${c.name}</b><br>坐标：${c.coord.join(', ')}`)
}

// ============ 4. 连线：模拟"城市路径"============
L.polyline(cities.map(c => c.coord), {
  color: '#4a90ff',
  weight: 3,
  dashArray: '6 8',
  opacity: 0.8,
}).addTo(map)

// ============ 5. 圆形区域（可以做覆盖范围、配送圈等）============
L.circle([39.9042, 116.4074], {
  radius: 200000, // 米
  color: '#ff6b9d',
  fillColor: '#ff6b9d',
  fillOpacity: 0.15,
}).addTo(map)
  .bindPopup('北京 200km 覆盖圈')

// ============ 6. 多边形（模拟一个省/区域）============
L.polygon(
  [
    [31.0, 118.0],
    [33.0, 118.0],
    [33.0, 122.0],
    [31.0, 122.0],
  ],
  { color: '#06d6a0', fillOpacity: 0.2 }
).addTo(map)
  .bindTooltip('自定义多边形区域')

// ============ 7. 点击地图添加自定义 marker ============
let userMarkerCount = 0
map.on('click', e => {
  userMarkerCount++
  L.marker(e.latlng)
    .addTo(map)
    .bindPopup(
      `自定义点 #${userMarkerCount}<br>` +
        `lat: ${e.latlng.lat.toFixed(4)}<br>` +
        `lng: ${e.latlng.lng.toFixed(4)}`
    )
    .openPopup()
})

// 暴露调试
window.map = map
