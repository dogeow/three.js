# Three.js 入门教程

一套循序渐进的 Three.js 教程，共 **23 个独立示例**。每节都是一个独立的 HTML 文件，**双击即可在浏览器中运行**（推荐用本地服务打开，避免跨域问题）。

## 运行方式

```bash
# 在当前目录启动一个本地服务（任选其一）
npx serve .
# 或
python3 -m http.server 8000
```

然后访问 `http://localhost:3000` 或 `http://localhost:8000`。

## 目录

### 基础篇

| 章节 | 主题 | 你将学到 |
|------|------|---------|
| [01](./01-hello-scene/index.html) | 第一个 3D 场景 | Scene、Camera、Renderer 三件套，旋转立方体 |
| [02](./02-geometry-material/index.html) | 几何体与材质 | 常见 Geometry，Basic / Lambert / Standard 材质 |
| [03](./03-lights-shadows/index.html) | 灯光与阴影 | 环境光、平行光、点光，开启阴影投射 |
| [04](./04-textures/index.html) | 纹理贴图 | TextureLoader，颜色贴图、法线贴图 |
| [05](./05-orbit-controls/index.html) | 相机控制 | OrbitControls 鼠标拖拽、缩放 |
| [06](./06-raycaster/index.html) | 鼠标交互 | Raycaster 实现物体点击/悬停 |
| [07](./07-gltf-loader/index.html) | 加载 3D 模型 | GLTFLoader 加载 .glb 模型 |
| [08](./08-solar-system/index.html) | 综合实战：太阳系 | 父子节点、轨道公转、自转 |

### 进阶篇（技术点 · 效果）

| 章节 | 技术点 | 效果 |
|------|-------|------|
| [09](./09-fog-atmosphere/index.html) | **Scene.fog / FogExp2** | 雾气森林，远处褪入雾色，实时调密度和颜色 |
| [10](./10-particles/index.html) | **BufferGeometry + Points** | 5 万粒子星云，加法混合呼吸发光 |
| [11](./11-instanced-mesh/index.html) | **InstancedMesh** | 1 万方块水波动画，只有 1 次 Draw Call |
| [12](./12-environment-map/index.html) | **PMREMGenerator + PBR** | 从塑料到镜面金属的真实环境反射 |
| [13](./13-custom-shader/index.html) | **ShaderMaterial (GLSL)** | 自己写顶点/片元着色器，实现动态水面 |
| [14](./14-bloom-postfx/index.html) | **EffectComposer + UnrealBloomPass** | 霓虹辉光后期，实时调强度/半径/阈值 |
| [15](./15-physics/index.html) | **cannon-es 物理引擎** | 点击发射小球砸倒积木塔，真实物理碰撞 |

### 实战篇（高级效果）

| 章节 | 技术点 | 效果 |
|------|-------|------|
| [16](./16-animation-mixer/index.html) | **AnimationMixer + AnimationAction** | 加载带骨骼动画的 Fox 模型，按钮切换动作带淡入淡出 |
| [17](./17-css2d-labels/index.html) | **CSS2DRenderer** | HTML 浮窗标签跟随 3D 物体，可点击、可样式化 |
| [18](./18-galaxy/index.html) | **程序化粒子艺术** | 可调节的螺旋星系，臂数/扭曲/粒子密度实时变化 |
| [19](./19-outline-selection/index.html) | **OutlinePass** | 悬停蓝色描边 + 点击橙色锁定（带呼吸脉冲） |
| [20](./20-sky-water/index.html) | **Sky + Water addon** | 真实大气散射 + 动态海面，拖动太阳看日出日落 |
| [21](./21-mirror/index.html) | **Reflector 镜面反射** | 地面镜子和墙面镜子，真实倒映场景所有物体 |
| [22](./22-text-geometry/index.html) | **FontLoader + TextGeometry** | 加载字体并生成 3D 挤出文字，支持倒角、PBR 材质和灯光 |
| [23](./23-first-person/index.html) | **PointerLockControls** | 第一人称漫游场景，支持 WASD 移动、跳跃和鼠标锁定视角 |

---

## 示例说明

- `07-gltf-loader`、`15-physics`、`22-text-geometry` 会加载外部资源，建议始终通过本地服务打开。
- `23-first-person` 需要点击画面进入 Pointer Lock 模式，按 `Esc` 可以退出。
- `21-mirror` 提供球体数量滑杆，方便观察镜面反射在不同场景复杂度下的表现。

## 核心概念速览

Three.js 渲染一帧需要三样东西：

```
Scene（场景）        ——  3D 世界的容器，所有物体都加进去
  ├── Mesh         ——  网格 = 几何体(Geometry) + 材质(Material)
  ├── Light        ——  灯光
  └── Camera       ——  相机：决定从哪个角度看场景

Renderer（渲染器）   ——  把 Scene 用 Camera 视角画到 <canvas> 上
```

最小渲染循环：

```js
function animate() {
  requestAnimationFrame(animate)
  // 更新物体属性...
  renderer.render(scene, camera)
}
animate()
```

## 学习建议

1. **按顺序看**：每节都基于上一节的概念。
2. **动手改参数**：调灯光颜色、相机位置、几何体分段数，观察变化。
3. **打开 DevTools**：每节都把关键对象挂到 `window` 上，方便在控制台调试，例如 `window.cube.rotation.x = 1`。

## 版本

本教程基于 `three@0.160+`，使用原生 ES Modules + importmap，不依赖任何构建工具。
