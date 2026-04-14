# Three.js 入门到进阶教程

一套循序渐进的 Three.js 教程，**46 节**独立可运行的 HTML 示例，从第一个 Hello Cube 一路到 PBR、后期、物理、骨骼动画、程序化地形等高级技术。

## 运行方式

```bash
# 在当前目录启动本地服务（任选其一）
npx serve .
# 或
python3 -m http.server 8000
```

然后访问 `http://localhost:3000` 或 `http://localhost:8000`。

> 直接双击 HTML 通常也能跑，但第 09 (GLTF) / 20 / 22 等需要加载外部资源的章节必须走本地服务器，否则 CORS 拦截。

---

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

---

## 目录

### 一、基础篇 · 上手 Three.js（01~10）

| # | 章节 | 技术点 |
|---|------|-------|
| [01](./01-hello-scene/index.html) | Hello 场景 | Scene / Camera / Renderer 三件套 |
| [02](./02-geometry-material/index.html) | 几何体与材质 | 常见 Geometry + 4 种 Material 对比 |
| [03](./03-lights-shadows/index.html) | 灯光与阴影 | 环境光/平行光/点光 + castShadow |
| [04](./04-textures/index.html) | 纹理贴图 | TextureLoader，颜色贴图、法线贴图、重复 |
| [05](./05-canvas-texture/index.html) | Canvas 动态纹理 | 用 Canvas 2D 实时绘制并作为纹理 |
| [06](./06-video-texture/index.html) | Video 纹理 | `<video>` 元素直接变 3D 贴图 |
| [07](./07-orbit-controls/index.html) | 相机控制 | OrbitControls 鼠标拖拽/缩放 |
| [08](./08-raycaster/index.html) | 鼠标拾取 | Raycaster 悬停/点击物体 |
| [09](./09-gltf-loader/index.html) | 加载 3D 模型 | GLTFLoader 加载 .glb |
| [10](./10-loading-manager/index.html) | 加载管理器 | LoadingManager 统一管理进度 |

### 二、几何与材质进阶（11~20）

| # | 章节 | 技术点 |
|---|------|-------|
| [11](./11-extrude-shape/index.html) | Shape / ExtrudeGeometry | 2D 形状挤出成 3D |
| [12](./12-curve-tube/index.html) | 曲线与管道 | CatmullRomCurve3 + TubeGeometry |
| [13](./13-text-geometry/index.html) | 3D 文字 | FontLoader + TextGeometry |
| [14](./14-geometry-merge/index.html) | 几何体合并 | BufferGeometryUtils.mergeGeometries 性能优化 |
| [15](./15-vertex-animation/index.html) | 顶点动画 | 每帧修改 position buffer |
| [16](./16-morph-targets/index.html) | **形变目标 ★** | MorphTargets 多套顶点混合（球化/尖刺/扭曲） |
| [17](./17-blending-modes/index.html) | 混合模式 | Additive / Multiply / Normal 对比 |
| [18](./18-environment-map/index.html) | 环境贴图 PBR | PMREMGenerator + metalness/roughness |
| [19](./19-custom-shader/index.html) | 自定义 Shader | ShaderMaterial + GLSL 水波 |
| [20](./20-instanced-mesh/index.html) | 实例化渲染 | InstancedMesh 1 万方块 1 个 Draw Call |

### 三、场景与氛围（21~28）

| # | 章节 | 技术点 |
|---|------|-------|
| [21](./21-fog-atmosphere/index.html) | 雾效 | Scene.fog / FogExp2 远景渐隐 |
| [22](./22-sky-water/index.html) | 天空与海面 | Sky + Water addon 真实大气散射 |
| [23](./23-particles/index.html) | 粒子系统 | 5 万 Points + AdditiveBlending |
| [24](./24-galaxy/index.html) | 程序化银河 | 螺旋公式 + 颜色插值，可调参数 |
| [25](./25-terrain-perlin/index.html) | **程序化地形 ★** | Value Noise + FBM 分形，按高度着色 |
| [26](./26-marching-cubes/index.html) | Metaball 流体 | MarchingCubes 等值面 |
| [27](./27-mirror/index.html) | 镜面反射 | Reflector 真实倒映 |
| [28](./28-cube-camera/index.html) | 动态反射 | CubeCamera 实时环境捕捉 |

### 四、后期处理与渲染技巧（29~35）

| # | 章节 | 技术点 |
|---|------|-------|
| [29](./29-bloom-postfx/index.html) | 辉光 Bloom | EffectComposer + UnrealBloomPass |
| [30](./30-bokeh-postfx/index.html) | 景深 Bokeh | BokehPass 模拟大光圈虚化 |
| [31](./31-outline-selection/index.html) | 选中描边 | 双 OutlinePass（悬停+锁定） |
| [32](./32-render-target/index.html) | 离屏渲染 | WebGLRenderTarget 纹理作为另一个场景输入 |
| [33](./33-lod/index.html) | 细节层级 | LOD 远近切换低/高模 |
| [34](./34-clipping-planes/index.html) | 裁剪平面 | clippingPlanes 剖切查看内部 |
| [35](./35-decal/index.html) | **表面贴花 ★** | DecalGeometry 点击生成弹孔 |

### 五、交互与控制（36~44）

| # | 章节 | 技术点 |
|---|------|-------|
| [36](./36-css2d-labels/index.html) | HTML 标签 | CSS2DRenderer 跟随 3D 物体 |
| [37](./37-sprites-billboards/index.html) | 精灵 Billboard | Sprite 永远面向相机 |
| [38](./38-drag-controls/index.html) | 拖拽物体 | DragControls 鼠标直接拖动 |
| [39](./39-transform-controls/index.html) | 变换控件 | TransformControls 物体平移/旋转/缩放 |
| [40](./40-first-person/index.html) | 第一人称漫游 | PointerLockControls + WASD + 跳跃 |
| [41](./41-camera-switch/index.html) | 多相机切换 | 透视/正交 + 多视口布局 |
| [42](./42-camera-tween/index.html) | **相机补间 ★** | 自制 easeInOutCubic + waypoints 巡游 |
| [43](./43-animation-mixer/index.html) | 骨骼动画 | AnimationMixer + 动作交叉淡入淡出 |
| [44](./44-gui-debug/index.html) | 调试面板 | lil-gui 参数实时调节 |

### 六、物理与综合实战（45~46）

| # | 章节 | 技术点 |
|---|------|-------|
| [45](./45-physics/index.html) | 物理引擎 | cannon-es 发射球砸积木塔 |
| [46](./46-solar-system/index.html) | **综合：太阳系** | 父子节点 / 公转 / 自转 / 卫星 |

★ 标记的是本次新增章节

---

## 学习建议

1. **按顺序看**：每节都基于上一节的概念
2. **动手改参数**：调灯光颜色、相机位置、几何体分段数，观察变化
3. **打开 DevTools**：每节都把关键对象挂到 `window` 上（如 `window.cube.rotation.x = 1`）
4. 每章顶部的 `<div class="tip">` 会用一句话说明「本节技术点 + 对应效果」，先看这段再读代码

## 技术栈

- **Three.js** `0.160.0`
- **原生 ES Modules + importmap**，零构建工具
- **cannon-es** `0.20.0`（仅第 45 节物理章节）
- 第 09/20/22/43 节需要联网加载模型/纹理，其余完全离线可跑

## 章节索引（按技术点）

需要查某个功能在哪节？按字母序速查：

- **AnimationMixer** → 43
- **BloomPass** → 29
- **BokehPass** → 30
- **BufferGeometryUtils** → 14
- **CanvasTexture** → 05
- **cannon-es 物理** → 45
- **ClippingPlanes** → 34
- **CSS2DRenderer** → 36
- **CubeCamera** → 28
- **DecalGeometry** → 35
- **DragControls** → 38
- **EffectComposer** → 29 / 30 / 31
- **ExtrudeGeometry** → 11
- **FirstPerson / PointerLock** → 40
- **Fog** → 21
- **FontLoader / TextGeometry** → 13
- **GLTFLoader** → 09
- **InstancedMesh** → 20
- **lil-gui** → 44
- **LOD** → 33
- **MarchingCubes** → 26
- **MorphTargets** → 16
- **OrbitControls** → 07
- **OutlinePass** → 31
- **Particles / Points** → 23 / 24
- **PMREM / PBR** → 18
- **Raycaster** → 08 / 35 / 38 / 31
- **Reflector** → 27
- **RenderTarget** → 32
- **ShaderMaterial** → 19
- **Sky + Water** → 22
- **Sprite** → 37
- **TransformControls** → 39
- **TubeGeometry** → 12
- **Tween (自制)** → 42
- **Value Noise / FBM** → 25
- **VideoTexture** → 06
- **顶点动画** → 15
- **多相机视口** → 41
- **混合模式** → 17
- **加载管理器** → 10
