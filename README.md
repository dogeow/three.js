# Three.js 入门到进阶教程

一套循序渐进的 Three.js 教程，**169 节**独立可运行的 HTML 示例，从第一个 Hello Cube 一路到 PBR、后期、物理、骨骼动画、程序化地形等高级技术。

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
- [170] Particle Attractor - distance-based force field, velocity color coding

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

### 七、特效着色（47~50）

| # | 章节 | 技术点 |
|---|------|-------|
| [47](./47-toon-shading/index.html) | **卡通着色 ★** | MeshToonMaterial +渐变纹理，实现赛璐璐风格 |
| [48](./48-fat-lines/index.html) | 粗线条 | Line2 + LineMaterial，点线轨迹可视化 |
| [49](./49-edges-wireframe/index.html) | 线框增强 | EdgesGeometry + LineSegments，边缘提取 |
| [50](./50-fresnel-hologram/index.html) | **菲涅尔全息 ★** | Fresnel 着色器，透明物体边缘发光全息感 |

### 八、综合与进阶（51~58）

| # | 章节 | 技术点 |
|---|------|-------|
| [51](./51-particle-attractor/index.html) | **粒子引力场 ★** | 鼠标吸引/排斥粒子，速度/颜色随距离变化 |
| [52](./52-ssao-postfx/index.html) | **环境光遮蔽 ★** | SSAOPass，物体接触处产生接触阴影 |
| [53](./53-glass-refraction/index.html) | **玻璃折射 ★** | MeshPhysicalMaterial + transmission + IOR |
| [54](./54-camera-shake/index.html) | **镜头抖动 ★** | 多频正弦叠加衰减震动，点击/按钮触发 |
| [55](./55-shadow-mapping/index.html) | **阴影地图对比 ★** | Basic / PCF / PCFSoft 三种模式并排对比 |
| [56](./56-terrain-flythrough/index.html) | **地形穿越飞行 ★** | 程序化地形 + PointerLock + 地形跟随 |
| [57](./57-audio-reactive/index.html) | **音频可视化 ★** | Web Audio API，频谱驱动 3D 几何体缩放 |
| [58](./58-boolean-geometry/index.html) | **布尔几何体 ★** | 并集/差集/交集组合，透明材质观察内部 |

### 九、高级视觉效果（59~66）

### 十、综合创意（67~70）

### 十一、Shader与后处理（71~74）

### 十二、综合与视觉（75~78）

### 十三、综合创作（79~82）

### 十四、物理与仿真（83~86）

### 十五、综合与特色（87~90）

| # | 章节 | 技术点 |
|---|------|-------|
| [59](./59-ray-marching/index.html) | **光线步进 ★** | GLSL Ray Marching + SDF，实时渲染球体/立方体/圆环 |
| [60](./60-volumetric-light/index.html) | **体积光 ★** | God Rays 径向模糊，逆光穿透粒子的光柱效果 |
| [61](./61-sprite-animation/index.html) | **精灵动画 ★** | Canvas 绘制序列帧，UV 偏移驱动帧切换 |
| [62](./62-voxel-terrain/index.html) | **体素地形 ★** | 网格合并 + 面剔除，优化 Draw Call 渲染体素世界 |
| [63](./63-smoke-fire/index.html) | **火焰与烟雾 ★** | 多层粒子系统，GPU 顶点着色器驱动颜色与尺寸 |
| [64](./64-portal-wormhole/index.html) | **传送门 ★** | 极坐标着色器扭曲，粒子螺旋吸入效果 |
| [65](./65-water-ripple/index.html) | **水波涟漪 ★** | CPU 波浪方程，点击水面产生涟漪扩散 |
| [66](./66-snow-accumulation/index.html) | **积雪效果 ★** | 粒子落地堆积，实时顶点位移积雪层 |
| [67](./67-cloth-simulation/index.html) | **布料模拟 ★** | Verlet积分粒子-弹簧系统，鼠标拖拽交互 |
| [68](./68-gpu-particles/index.html) | **GPU粒子系统 ★** | 顶点着色器驱动轨迹，50万粒子零CPU开销 |
| [69](./69-terrain-erosion/index.html) | **地形侵蚀模拟 ★** | 水力侵蚀+热力侵蚀，实时刻蚀生成峡谷河道 |
| [70](./70-dithered-transparency/index.html) | **抖动透明 ★** | Bayer矩阵有序抖动，无需排序的伪透明渲染 |
| [71](./71-fluid-shader/index.html) | **流体着色器 ★** | 帧缓冲器乒乓技术，Navier-Stokes简化方程渲染墨水扩散 |
| [72](./72-metaballs/index.html) | **融球 Metaballs ★** | MarchingCubes等值面提取，融球合并分离的有机效果 |
| [73](./73-game-of-life/index.html) | **GPU生命游戏 ★** | 康威生命游戏，GPU帧缓冲器计算，鼠标点击染色，右键清除 |
| [74](./74-holographic-display/index.html) | **全息投影 ★** | Pepper's Ghost金字塔投影，扫描线菲涅尔全息效果 |
| [75](./75-aurora-borealis/index.html) | **极光 Aurora ★** | FBM噪声驱动光带，多层透明度叠加，粒子星尘效果 |
| [76](./76-lens-flare/index.html) | **镜头眩光 ★** | THREE.Lensflare六边形散景，鬼影重影，变形宽银幕光斑 |
| [77](./77-solar-system/index.html) | **太阳系 ★** | 开普勒轨道运动，公转自转，土星环与卫星系统 |
| [78](./78-noise-flow-field/index.html) | **噪声流场 ★** | Perlin噪声流场，4万GPU粒子系统，点击鼠标产生涡流扰动 |
| [79](./79-procedural-city/index.html) | **程序化城市 ★** | InstancedMesh高效渲染，程序建筑生成，日夜切换 |
| [80](./80-force-graph/index.html) | **力导向图 ★** | 库仑斥力+弹簧引力，Verlet物理积分，节点拖拽 |
| [81](./81-terrain-blend/index.html) | **地形材质混合 ★** | 多通道顶点色混合，坡度/高度分层，草方块散布 |
| [82](./82-wireframe-world/index.html) | **线框世界 ★** | 全线框渲染，扫描线动画，赛博朋克数字景观 |
| [83](./83-splines-animation/index.html) | **样条动画 ★** | CatmullRom曲线，物体沿路径运动，切线方向对齐 |
| [84](./84-soft-body/index.html) | **软体模拟 ★** | 弹簧-质点系统，Verlet积分，碰撞反弹形变 |
| [85](./85-parallax-mapping/index.html) | **视差映射 ★** | 法线/视差/遮蔽映射三档对比，砖墙高度图 |
| [86](./86-ocean-waves/index.html) | **海洋波浪 ★** | Gerstner波浪叠加，顶点位移着色器，菲涅尔反射 |
| [87](./87-voxel-character/index.html) | **体素角色 ★** | InstancedMesh身体部件，程序化行走/跳跃动画 |
| [88](./88-sound-visualizer/index.html) | **声音可视化 ★** | Web Audio API频谱分析，频谱驱动3D几何体 |
| [89](./89-rain-system/index.html) | **雨天气系统 ★** | Points粒子雨，溅射，闪电光效，湿地面反射 |
| [90](./90-hair-fur/index.html) | **毛发渲染 ★** | Shell分层渲染，阿尔法剔除，顶点位移风力动画 |

### 十六、风格化后期（91~99）

| # | 章节 | 技术点 |
|---|------|-------|
| [91](./91-afterimage-trails/index.html) | **残影拖尾 ★** | AfterimagePass 叠帧保留运动轨迹，强化速度感 |
| [92](./92-film-grain/index.html) | **胶片颗粒 ★** | FilmPass 统一处理最终画面，添加噪点和灰度风格 |
| [93](./93-halftone-postfx/index.html) | **半调印刷 ★** | HalftonePass 把渲染结果转成报纸/漫画式点阵 |
| [94](./94-rgb-shift-postfx/index.html) | **RGB 色散 ★** | ShaderPass + RGBShiftShader，做通道错位和镜头色散 |
| [95](./95-glitch-postfx/index.html) | **数字故障 ★** | GlitchPass 施加画面撕裂、错位、断层和扫描噪声 |
| [96](./96-ascii-effect/index.html) | **字符画渲染 ★** | AsciiEffect 用 DOM 字符逐帧重建 3D 场景 |
| [97](./97-css3d-cards/index.html) | **3D HTML 面板 ★** | CSS3DRenderer 把 DOM 卡片放进 3D 空间 |
| [98](./98-peppers-ghost/index.html) | **SVG 矢量渲染 ★** | SVGRenderer 把 3D 场景输出为真正的 SVG 路径 |
| [99](./99-lut-color-grading/index.html) | **LUT 调色 ★** | LUTPass 用查找表统一做电影化色彩分级 |

### 十七、几何采样与高级变形（100~102）

| # | 章节 | 技术点 |
|---|------|-------|
| [100](./100-mesh-surface-sampler/index.html) | **表面散布 ★** | MeshSurfaceSampler 在任意网格表面随机采样 |
| [101](./101-convex-geometry/index.html) | **凸包几何体 ★** | ConvexGeometry 用点云快速生成凸多面体 |
| [102](./102-curve-modifier/index.html) | **曲线变形 ★** | Flow / CurveModifier 让模型沿曲线弯折巡航 |

### 十八、几何优化与空间碰撞（103~105）

| # | 章节 | 技术点 |
|---|------|-------|
| [103](./103-simplify-modifier/index.html) | **网格简化 ★** | SimplifyModifier 在尽量保住轮廓时减少顶点数 |
| [104](./104-csm-shadows/index.html) | **级联阴影 CSM ★** | Cascaded Shadow Maps 把大视锥拆成多段分别投影 |
| [105](./105-obb-collision/index.html) | **定向包围盒 OBB ★** | OBB 跟着物体姿态旋转，碰撞比 AABB 更精确 |

### 十九、交互与 UI（106~108）

| # | 章节 | 技术点 |
|---|------|-------|
| [106](./106-virtual-joystick/index.html) | **虚拟操纵杆 ★** | 触控摇杆 + 跳跃按钮，适合移动端无鼠标漫游 |
| [107](./107-path-recorder/index.html) | **轨迹录制回放 ★** | R 录制相机飞行动画，P 回放，实时调速 |
| [108](./108-grid-snap/index.html) | **网格吸附多选 ★** | Shift 多选 / 框选 / 网格吸附 / 批量旋转删除 |

### 二十、工具与创作（109~111）

| # | 章节 | 技术点 |
|---|------|-------|
| [109](./109-voxel-editor/index.html) | **体素编辑器 ★** | Minecraft 式搭建，左键放块/右键删除，滚轮换色，镜像绘制 |
| [110](./110-procedural-tree/index.html) | **L-System 树木 ★** | 递归字符串替换生成树枝拓扑，风场动画，四季颜色切换 |
| [111](./111-shader-playground/index.html) | **着色器实验室 ★** | 左右分屏，左边写 GLSL 片段着色器，实时预览，6 种预设 |

### 二十一、综合创意（112~121）

| # | 章节 | 技术点 |
|---|------|-------|
| [112](./112-earth-globe/index.html) | **地球仪 ★** | 昼夜分界线、城市灯光、大气辉光、云层、月球卫星 |
| [113](./113-rubiks-cube/index.html) | **魔方 ★** | 3×3 魔方，点击选中面，方向旋转，平滑动画，Shuffle |
| [114](./114-shooting-gallery/index.html) | **射击靶场 ★** | 瞄准射击、弹道轨迹、命中粒子特效、积分系统 |
| [115](./115-solar-system-orbits/index.html) | **太阳系轨道 ★** | 6 大行星、开普勒轨道速度、土星环、卫星、速度滑块 |
| [116](./116-qr-code-3d/index.html) | **3D 二维码 ★** | 立体像素方块、扫描激光、URL 输入重建、InstancedMesh |
| [117](./117-wave-interference/index.html) | **波干涉 ★** | 多源圆波干涉、GLSL 顶点位移、霓虹色图、lil-gui 调参 |
| [118](./118-morphing-blobs/index.html) | **融球变形 ★** | Icosahedron + FBM 噪声变形、虹彩着色器、鼠标悬停发光 |
| [119](./119-data-bar-chart/index.html) | **3D 数据柱图 ★** | CSS2D 标签、动态渐变、弹性入场动画、5 种配色方案 |
| [120](./120-fireworks/index.html) | **烟花粒子 ★** | GPU 粒子爆发、重力下落、拖尾、自动波次，点击/空格发射 |
| [121](./121-crystal-gem/index.html) | **水晶宝石 ★** | 物理材质折射、色散、菲涅尔高光、点击随机生成 |

### 二十二、综合创意 2（122~131）

| # | 章节 | 技术点 |
|---|------|-------|
| [122](./122-fluid-sim/index.html) | **流体模拟 ★** | Eulerian 流体、Navier-Stokes 速度场、压力求解、染料密度、ping-pong FBO |
| [123](./123-character-controller/index.html) | **角色控制器 ★** | 第三人称、胶囊体+WASD+跳跃、重力物理、AABB 碰撞检测、肢体动画 |
| [124](./124-spline-road/index.html) | **程序化道路 ★** | CatmullRomCurve3 道路挤出、车道标线、噪声地形、程序化树木、自动相机 |
| [125](./125-portal-door/index.html) | **传送门 ★** | 双传送门渲染、视口替换、穿越传送、第一人称控制 |
| [126](./126-voronoi-shatter/index.html) | **Voronoi 破碎 ★** | Voronoi 细胞破碎动画、ConvexGeometry 碎片、飞散 + 重力 + 复原 |
| [127](./127-terrain-carver/index.html) | **地形雕刻器 ★** | 可编辑地形、笔刷升降/平滑、Raycaster 笔刷光标、实时顶点更新 |
| [128](./128-cloth-flag/index.html) | **布料旗帜 ★** | Verlet 积分布料模拟、弹簧约束、风力震动、顶点着色器联动 |
| [129](./129-magnetic-field/index.html) | **磁场可视化 ★** | 偶极子场计算、RK4 磁场线追踪、粒子流线、磁铁交互 |
| [130](./130-kinect-pose/index.html) | **姿态捕捉 ★** | 摄像头姿态骨架、手部/全身关键点、骨骼线框跟随、交互球体 |
| [131](./131-sdf-sculptor/index.html) | **SDF 雕刻器 ★** | GPU Raymarching、SDF 基础体素、雕刻/减去/平滑、笔刷光标 |

### 二十三、综合创意 3（132~141）

| # | 章节 | 技术点 |
|---|------|-------|
| [132](./132-graph-layout/index.html) | **力导向图 ★** | 力导向布局、Coulomb 排斥 + 弹簧吸引、可拖拽节点、CSS2D 标签 |
| [133](./133-stellar-collision/index.html) | **星系碰撞 ★** | 螺旋星系、N-body 引力交互、粒子拖尾、星空背景 |
| [134](./134-flip-clock/index.html) | **翻页时钟 ★** | 3D 翻页动画、Canvas 数字纹理、实时时间、多种配色 |
| [135](./135-marching-cubes/index.html) | **Marching Cubes ★** | 标量场等值面提取、Metaball 密度场、实时网格更新 |
| [136](./136-puzzle-swap/index.html) | **滑块拼图 ★** | 8-puzzle/15-puzzle、滑动动画、华容道、胜利检测 |
| [137](./137-audio-waveform/index.html) | **音频可视化 ★** | Web Audio API、频谱柱图、波形带、文件加载 |
| [138](./138-dither-shader/index.html) | **抖动着色器 ★** | 后期抖动处理、Bayer 矩阵、Floyd-Steinberg、颜色量化 |
| [139](./139-car-physics/index.html) | **汽车物理 ★** | 简化车辆物理、WASD 驾驶、轮胎旋转、障碍碰撞 |
| [140](./140-billiards/index.html) | **台球模拟 ★** | 2D 物理弹性碰撞、摩擦力、瞄准击球、落袋检测 |
| [141](./141-fractal-tree/index.html) | **分形之树 ★** | L-System 分形树、四季变化、风力摇摆、落叶粒子 |

### 二十四、综合创意 4（142~151）

| # | 章节 | 技术点 |
|---|------|-------|
| [142](./142-bubble-pop/index.html) | **泡泡爆破 ★** | 物理材质泡泡、点击爆破、雪花粒子特效、无限生成 |
| [143](./143-parallax-scene/index.html) | **视差场景 ★** | 多层视差背景、Canvas 程序化贴图、鼠标拖拽层间运动 |
| [144](./144-pinball-machine/index.html) | **弹珠台 ★** | 倾斜桌面、弹球物理、弹射挡板、重力弹跳、积分系统 |
| [145](./145-splat-paint/index.html) | **颜料飞溅 ★** | 程序化颜料泼洒、Canvas 纹理生成、颜色选择、撤销功能 |
| [146](./146-crystal-growth/index.html) | **晶体生长 ★** | 程序化晶体生成、MeshPhysicalMaterial 宝石材质、生长动画 |
| [147](./147-domino-chain/index.html) | **多米诺骨牌 ★** | 刚体连锁反应、倾斜动画、球触发、骨牌链式倒塌 |
| [148](./148-lens-distortion/index.html) | **镜头畸变 ★** | ShaderPass 桶形/枕形畸变、场景可视化、多种扭曲模式 |
| [149](./149-rope-bridge/index.html) | **绳索吊桥 ★** | Verlet 绳索模拟、重力下垂、角色行走、动态桥面 |
| [150](./150-neural-network/index.html) | **神经网络可视化 ★** | 节点连线、激活传播动画、数据包流、权重颜色编码 |
| [151](./151-snow-globe/index.html) | **水晶球 ★** | 玻璃穹顶折射、Fresnel 边缘光、内部微缩场景、雪花粒子 |

### 二十五、综合创意 5（152~161）

| # | 章节 | 技术点 |
|---|------|-------|
| [152](./152-origami-crane/index.html) | **折纸仙鹤 ★** | 纸艺折叠动画、顶点关键帧插值、纸张材质 |
| [153](./153-space-debris/index.html) | **太空碎片 ★** | InstancedMesh 碎片场、地球轨道、卫星解体、星空背景 |
| [154](./154-fireflies-swarm/index.html) | **萤火虫群 ★** | Boids 群体算法、发光粒子、吸引/分离/对齐 |
| [155](./155-kaleidoscope/index.html) | **万花筒 ★** | 对称分片着色器、UV 镜像、旋转几何体 |
| [156](./156-holographic-ui/index.html) | **全息面板 ★** | 线框发光面板、雷达扫描动画、HUD 界面元素 |
| [157](./157-lava-lamp/index.html) | **熔岩灯 ★** | 热对流模拟、Metaball 融合、玻璃折射 |
| [158](./158-particle-texture/index.html) | **粒子图像 ★** | Canvas 像素采样、粒子颜色重建、动态图案 |
| [159](./159-spiral-galaxy/index.html) | **螺旋星系 ★** | 对数螺旋星系、粒子星场、自定义着色器 |
| [160](./160-mini-golf/index.html) | **迷你高尔夫 ★** | 2D 物理、传送带瞄准、球洞检测、多球洞 |
| [161](./161-sushi-plate/index.html) | **旋转寿司 ★** | 环形传送带、点击点餐、账单系统、无限补盘 |

### 二十六、综合创意 6（162~169）

| # | 章节 | 技术点 |
|---|------|-------|
| [162](./162-wave-collapse/index.html) | **波函数坍缩 ★** | 约束传播算法，相邻砖块边匹配，实时3D可视化 |
| [163](./163-volumetric-cloud/index.html) | **体积云 Raymarching ★** | GLSL 体积密度采样，48 步光线累积，动态云层流动 |
| [164](./164-physics-pendulum/index.html) | **双摆混沌物理 ★** | Lagrangian 方程 RK4 积分，混沌敏感度，轨迹保留动画 |
| [165](./165-interactive-piano/index.html) | **交互钢琴 ★** | Web Audio 多谐波合成，ADSR 包络，3D 白键/黑键，点击/键盘触发 |
| [166](./166-procedural-clouds/index.html) | **程序化云层 ★** | 多层 2D FBM 噪声，覆盖度/速度可调，UV 漂移流动 |
| [167](./167-holographic-comm/index.html) | **全息通信器 ★** | 全息投影锥，扫描环，脉冲粒子，输入文字实时全息渲染 |
| [168](./168-qubit-viz/index.html) | **量子比特可视化 ★** | 三维布洛赫球，θ/φ 角拖拽，预设 Pauli 态 |
| [169](./169-time-dilation/index.html) | **时间膨胀效应 ★** | 狭义相对论 Lorentz 因子，地面/飞船双时钟，多普勒频移着色 |

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
- 第 09/13/20/22/26/28/35/43/52/53 节需要联网加载模型/纹理，其余完全离线可跑

## 章节索引（按技术点）

需要查某个功能在哪节？按字母序速查：

- **AnimationMixer** → 43
- **AfterimagePass** → 91
- **AsciiEffect** → 96
- **BloomPass** → 29
- **BokehPass** → 30
- **BufferGeometryUtils** → 14
- **CanvasTexture** → 05
- **cannon-es 物理** → 45
- **ClippingPlanes** → 34
- **CSM / Cascaded Shadows** → 104
- **CSS2DRenderer** → 36
- **CSS3DRenderer** → 97
- **CubeCamera** → 28
- **DecalGeometry** → 35
- **DragControls** → 38
- **EffectComposer** → 29 / 30 / 31 / 91 / 92 / 93 / 94 / 95 / 99
- **ExtrudeGeometry** → 11
- **FilmPass** → 92
- **FirstPerson / PointerLock** → 40 / 56 / 125
- **Fog** → 21
- **FontLoader / TextGeometry** → 13
- **GLTFLoader** → 09
- **GlitchPass** → 95
- **GPU 粒子** → 68
- **HalftonePass** → 93
- **InstancedMesh** → 20
- **lil-gui** → 44
- **LOD** → 33
- **LUTPass** → 99
- **MarchingCubes** → 26
- **MeshSurfaceSampler** → 100
- **MorphTargets** → 16
- **OBB / 定向包围盒** → 105
- **OrbitControls** → 07
- **OutlinePass** → 31
- **Particles / Points** → 23 / 24
- **SVGRenderer** → 98
- **PMREM / PBR** → 18
- **Raycaster** → 08 / 35 / 38 / 31
- **Reflector** → 27
- **RenderTarget** → 32
- **RGBShiftShader** → 94
- **ShaderMaterial** → 19
- **ShaderPass** → 94
- **SimplifyModifier** → 103
- **Sky + Water** → 22
- **Sprite** → 37
- **TransformControls** → 39
- **TubeGeometry** → 12
- **ConvexGeometry** → 101 / 126
- **CurveModifier / Flow** → 102
- **Tween (自制)** → 42
- **Value Noise / FBM** → 25
- **VideoTexture** → 06
- **Web Audio API** → 137
- **顶点动画** → 15
- **多相机视口** → 41
- **混合模式** → 17
- **加载管理器** → 10
- **Toon / 卡通着色** → 47
- **Fat Lines** → 48
- **EdgesGeometry** → 49
- **Fresnel** → 50
- **粒子引力场** → 51
- **SSAO** → 52
- **玻璃折射** → 53
- **镜头抖动** → 54
- **阴影地图** → 55
- **地形穿越** → 56
- **音频可视化** → 57
- **布尔几何体** → 58
- **Ray Marching / SDF** → 59
- **体积光 / God Rays** → 60
- **精灵动画** → 61
- **Voxel 体素** → 62
- **烟雾 / 火焰粒子** → 63
- **传送门 / 虫洞** → 64
- **水波涟漪** → 65
- **积雪效果** → 66
- **布料模拟** → 67 / 128
- **GPU粒子系统** → 68
- **地形侵蚀** → 69
- **抖动透明** → 70
- **流体着色器** → 71
- **融球 / Metaballs** → 72
- **GPU 生命游戏** → 73
- **全息投影** → 74
- **极光** → 75
- **镜头眩光** → 76
- **太阳系** → 77
- **噪声流场** → 78
- **程序化城市** → 79
- **力导向图** → 80
- **地形材质混合** → 81
- **线框世界** → 82
- **样条动画** → 83
- **软体模拟** → 84
- **视差映射** → 85
- **海洋波浪** → 86
- **体素角色** → 87
- **声音可视化** → 88
- **雨天气系统** → 89
- **毛发渲染** → 90
- **虚拟操纵杆** → 106
- **轨迹录制回放** → 107
- **网格吸附** → 108
- **多选 / 框选** → 108
- **体素编辑器** → 109
- **L-System 树木** → 110
- **Shader Playground** → 111
- **GLSL 片段着色器** → 111
- **地球仪 / 昼夜分界** → 112
- **魔方** → 113
- **射击靶场** → 114
- **太阳系轨道** → 115
- **3D 二维码** → 116
- **波干涉** → 117
- **融球 / Metaballs** → 118
- **3D 数据柱图** → 119
- **烟花粒子** → 120
- **水晶宝石** → 121
- **流体模拟** → 122
- **角色控制器** → 123
- **程序化道路** → 124
- **传送门** → 125
- **Voronoi 破碎** → 126
- **地形雕刻器** → 127
- **布料模拟** → 128
- **磁场可视化** → 129
- **姿态捕捉** → 130
- **SDF 雕刻** → 131
- **力导向图** → 132
- **星系碰撞** → 133
- **翻页时钟** → 134
- **Marching Cubes** → 135
- **滑块拼图** → 136
- **音频可视化** → 137
- **抖动着色** → 138
- **汽车物理** → 139
- **台球物理** → 140
- **L-System** → 141
- **分形树** → 141
- **泡泡特效** → 142
- **视差渲染** → 143
- **弹珠台** → 144
- **颜料泼洒** → 145
- **晶体生成** → 146
- **多米诺骨牌** → 147
- **镜头畸变** → 148
- **绳索物理** → 149
- **神经网络** → 150
- **水晶球** → 151
- **折纸动画** → 152
- **太空碎片** → 153
- **Boids 算法** → 154
- **万花筒** → 155
- **全息 UI** → 156
- **熔岩灯** → 157
- **粒子图像** → 158
- **螺旋星系** → 159
- **迷你高尔夫** → 160
- **传送带** → 161
- **MeshPhysicalMaterial** → 53 / 121 / 142 / 146 / 151
- **Wave Function Collapse** → 162
- **Volumetric Cloud** → 163
- **Double Pendulum** → 164
- **Interactive Piano** → 165
- **Procedural Clouds** → 166
- **Holographic Communicator** → 167
- **Bloch Sphere** → 168
- **Time Dilation** → 169

## 二十七、新示例（170~）

| [170](./170-particle-attractor/index.html) | **Particle Attractor** | 距离场引力粒子群、鼠标吸引/排斥、速度颜色编码 |
| [171](./171-morph-blob/index.html) | **Morph Blob ★** | FBM顶点变形、虹彩菲涅尔着色、鼠标悬停发光 |
| [172](./172-voxel-fracture/index.html) | **Voxel Fracture ★** | 点击爆炸、Verlet物理、InstancedMesh碎片模拟 |
| [173](./173-audio-fft-visualizer/index.html) | **Audio FFT Visualizer ★** | Web Audio API频谱分析、3D柱图频谱驱动 |
| [174](./174-sdf-raymarcher/index.html) | **SDF Ray Marching ★** | GLSL光线步进、SDF基础体素、软阴影、环境光遮蔽 |
| [175](./175-fluid-dye/index.html) | **Fluid Dye Sim ★** | Navier-Stokes流体、染料平流、ping-pong FBO、鼠标注入 |
| [176](./176-terrain-erosion/index.html) | **Terrain Erosion ★** | 程序化地形、水力侵蚀、热力侵蚀、实时顶点位移 |
| [177](./177-portal-portal/index.html) | **Portal Door ★** | StencilBuffer传送门、RenderTarget视口替换、穿越位移 |
| [178](./178-neural-style-transfer/index.html) | **神经风格迁移 ★** | GLSL 神经风格迁移着色器，卷积网络驱动的艺术风格滤镜 |
| [179](./179-volumetric-fog/index.html) | **体积雾 ★** | Raymarching 体积雾着色器，密度采样衰减，真实雾效 |
| [180](./180-motion-blur/index.html) | **Motion Blur ★** | 累积缓冲时域采样，速度向量驱动方向模糊 |
| [181](./181-water-caustics/index.html) | **水面焦散 ★** | GLSL 焦散着色器，波纹折射光纹，水下光影效果 |
| [182](./182-subsurface-scatter/index.html) | **次表面散射 ★** | MeshPhysicalMaterial 次表面散射，半透明材质光透射效果 |
| [183](./183-procedural-city/index.html) | **程序化城市 ★** | 程序化城市建模，建筑生成，道路网络，日夜切换 |
| [184](./184-crowd-simulation/index.html) | **群体模拟 ★** | Boids 群体行为模拟，分离/聚集/对齐，拥挤人群渲染 |
| [185](./185-quantum-viz/index.html) | **量子计算可视化 ★** | 量子比特门操作可视化，叠加态与纠缠态演示 |


## 二十八、更新示例（186~193）

| [186](./186-sss-skin/index.html) | **次表面散射皮肤 ★** | MeshPhysicalMaterial 次表面散射、透射厚度、散射色彩 |
| [187](./187-cloth-physics/index.html) | **布料物理模拟 ★** | Verlet积分布料、弹簧约束、风力、重力 |
| [188](./188-node-material/index.html) | **程序化材质编辑器 ★** | GLSL程序化图案、棋盘格/同心圆/砖块着色器 |
| [189](./189-gpu-particles-webgl/index.html) | **GPU粒子银河 ★** | 顶点着色器驱动10万粒子、螺旋星系、鼠标吸引交互 |
| [190](./190-procedural-planet/index.html) | **程序化行星生成 ★** | 程序化地形、噪声驱动高度图、多层材质、大气层渲染 |
| [191](./191-ik-chain/index.html) | **反向动力学链条 ★** | FABRIK IK算法、2骨骼链、鼠标跟随末端执行器 |
| [192](./192-audio-visualizer-webgl/index.html) | **Web Audio 3D频谱 ★** | Web Audio API频谱分析、3D柱图、文件加载音频可视化 |
| [193](./193-atmospheric-scattering/index.html) | **大气散射天空 ★** | Rayleigh/Mie散射着色器、太阳位置驱动、天空渐变 |

## 二十九、高级特效（196~）

| # | 章节 | 技术点 |
|---|------|-------|
| [194](./194-particle-trails/index.html) | **粒子轨迹系统 ★** | 流场驱动粒子、环形缓冲拖尾、点击爆发、附加混合发光 |
| [195](./195-lightning-effect/index.html) | **闪电特效 ★** | 递归细分闪电、分支闪电、UnrealBloom发光、Web Audio雷鸣合成 |
| [196](./196-heatmap-visualization/index.html) | **热力图可视化 ★** | Gaussian热力图、ShaderMaterial渐变、Raycaster悬停/点击注入 |
| [197](./197-procedural-fire/index.html) | **程序化火焰特效 ★** | 三层GPU粒子、顶点着色器上升+风力、热度闪烁后期处理、点击冲击 |
| [198](./198-snowflake-generator/index.html) | **雪花生成器 ★** | 六重对称分形、CatmullRomCurve3晶体管、点击随机生成 |
| [199](./199-sand-simulation/index.html) | **沙子物理模拟 ★** | 网格粒子、角度安息角、InstancedMesh 25万粒子、点击/拖动倾倒 |
| [200](./200-graph-layout/index.html) | **力导向图布局 ★** | Barabási–Albert无标度网络、Verlet物理、Coulomb排斥+弹簧吸引、拖拽交互 |
| [201](./201-voronoi-diagram/index.html) | **Voronoi 图可视化 ★** | Fortune算法3D Voronoi细胞、点击添加点、边缘着色、动态更新 |
| [202](./202-dna-helix/index.html) | **DNA 双螺旋可视化 ★** | 双螺旋骨架、碱基对rungs、5'/3'端点标签、MeshStandardMaterial金属质感 |
| [203](./203-fractal-mandelbrot/index.html) | **Mandelbrot 分形可视化 ★** | GLSL Mandelbrot迭代计算、顶点着色器Z轴位移、三套平滑配色方案 |
| [204](./204-puzzle-3d-slab/index.html) | **3D 滑块拼图 ★** | 4×4滑块谜题、点击滑动、胜利检测、洗牌动画 |
| [205](./205-solar-system-3d/index.html) | **太阳系 3D ★** | 八大行星、艺术比例、土星环、木卫四、地球月亮、5000星场 |
| [206](./206-spline-editor/index.html) | **CatmullRom样条编辑器 ★** | 拖拽控制点、实时曲线更新、TubeGeometry管道、沿曲线运动体 |
| [207](./207-ping-pong-physics/index.html) | **3D乒乓球游戏 ★** | 球拍物理、AI对战、旋转效果、Web Audio音效、粒子爆发 |
| [208](./208-procedural-crystal/index.html) | **程序化水晶生成器 ★** | MeshPhysicalMaterial折射、IOR 2.4、彩虹棱晶色、PMREM环境映射、UnrealBloom |
| [209](./209-wave-function-collapse-3d/index.html) | **3D波函数坍缩 ★** | WFC熵选择+约束传播、InstancedMesh体素渲染、三种瓷砖类型、生成耗时显示 |
| [210](./210-tesseract-hypercube/index.html) | **四维超立方体 ★** | 4D tesseract投影、旋转动画、投影矩阵可视化 |
| [211](./211-packing-spheres/index.html) | **球体最密堆积 ★** | FCC晶格排列、空间填充算法、Raycaster交互 |
| [212](./212-shader-graph-visualizer/index.html) | **着色器函数图像 ★** | GLSL动态编译、实时函数可视化、ShaderMaterial |
| [213](./213-diffusion-limited-aggregation/index.html) | **DLA分形生长 ★** | 随机游走粒子聚集、分形树生长、InstancedMesh |
| [214](./214-marching-squares-contour/index.html) | **等值线图 Marching Squares ★** | 标量场等值线、噪声高度场、交互式场编辑 |
| [215](./215-planck-scale-universe/index.html) | **普朗克尺度到宇宙 ★** | 宇宙尺度对比、指数级缩放、25个数量级 |
| [216](./216-music-visualizer-3d/index.html) | **3D音乐可视化器 ★** | Web Audio API频谱分析、3D柱图森林、节拍检测 |
| [217](./217-topological-data-analysis/index.html) | **拓扑数据分析 TDA ★** | 持续同调、Vietoris-Rips复形、拓扑特征可视化 |
| [218](./218-quantum-entanglement/index.html) | **量子纠缠可视化 ★** | 量子纠缠态、Bell态、粒子对关联、纠缠度量 |
| [219](./219-plasma-physics/index.html) | **等离子体物理模拟 ★** | 等离子体粒子模拟、电磁场渲染、Lorentz力、粒子轨迹 |
| [220](./220-procedural-coral/index.html) | **程序化珊瑚礁 ★** | 程序化珊瑚生成、递归分支算法、水下焦散、气泡粒子 |
| [221](./221-crystal-lattice/index.html) | **晶体晶格振动 ★** | FCC晶格、晶格振动波传播、顶点着色器、声子概念 |
| [222](./222-perlin-flowmap/index.html) | **Perlin噪声流场 ★** | FBM噪声流场、粒子丝带轨迹、流向颜色编码、环形包裹 |
| [223](./223-magnetic-monopole/index.html) | **磁单极子可视化 ★** | 磁场线可视化、Line2场线箭头、UnrealBloom发光、Dirac磁单极子理论 |
| [224](./224-string-theory/index.html) | **弦理论可视化 ★** | 卡拉比-丘流形、额外维度、弦振动模式、弦论物理 |
| [225](./225-black-hole-lensing/index.html) | **黑洞引力透镜 ★** | 引力透镜后期着色器、吸积盘多普勒频移、事件视界、光子球 |

## 三十、科学与物理特效（226~232）

| # | 章节 | 技术点 |
|---|------|-------|
| [226](./226-webxr-vr/index.html) | **WebXR VR体验 ★** | WebXR API、VR控制器、沉浸式虚拟现实、三维空间交互 |
| [227](./227-sdf-garden/index.html) | **SDF 虚拟花园 ★** | SDF渲染、程序化植物生长、距离场着色、虚拟自然场景 |
| [228](./228-ecosystem-sim/index.html) | **生态系统模拟 ★** | 生态仿真、生物种群动态、捕食者-猎物模型、生态平衡 |
| [229](./229-weather-system/index.html) | **天气系统模拟 ★** | 体积云渲染、雨粒子系统、闪电效果、天气状态切换 |
| [230](./230-procedural-architecture/index.html) | **程序化建筑学 ★** | 程序化建筑生成、Algorithmic AIA、规则驱动设计、结构优化 |
| [231](./231-reaction-diffusion/index.html) | **反应扩散系统 ★** | Gray-Scott模型、化学反应扩散、图灵斑图、Pattern生成 |
| [232](./232-particle-sandglider/index.html) | **粒子沙盒滑块 ★** | 3D网格空间哈希、粒子碰撞、InstancedMesh渲染、24万粒子 |
| [233](./233-spline-railroad/index.html) | **铁路过山车 ★** | CatmullRomCurve3铁轨生成、火车车厢跟随、Matrix4轨道铺设、预设轨道形状 |
| [234](./234-particle-physics/index.html) | **粒子物理引擎 ★** | Verlet积分、弹簧约束、刚体碰撞、摩擦力 |
| [235](./235-procedural-canyon/index.html) | **程序化峡谷地形 ★** | 程序化地形生成、侵蚀模拟、顶点着色器位移、岩层纹理 |
| [236](./236-holographic-shader/index.html) | **全息着色器 ★** | 扫描线着色、菲涅尔发光、透明折射、RGB色散、全息干扰图纹 |

---

## 附录：基础示例集（examples/）

| 文件 | 内容 |
|------|------|
| [01-basic-scene.html](./examples/01-basic-scene.html) | 基础场景、立方体、轨道控制、Bloom后期 |
| [02-lighting.html](./examples/02-lighting.html) | 环境光/平行光/点光/聚光灯、lil-gui控制 |
| [03-materials.html](./examples/03-materials.html) | Standard/Phong/Physical/Toon材质对比 |
| [04-particle-system.html](./examples/04-particle-system.html) | Shader粒子系统、15000粒子、流动动画 |
| [05-physics-animation.html](./examples/05-physics-animation.html) | 弹簧物理、Verlet积分、碰撞边界 |
| [06-post-processing.html](./examples/06-post-processing.html) | Bloom/Film/Bokeh后期处理切换 |
| [07-3d-text.html](./examples/07-3d-text.html) | TextGeometry 3D文字、金属反射材质 |
| [08-raycasting.html](./examples/08-raycasting.html) | 射线检测、悬停高亮、点击脉冲效果 |
| [animation.html](./examples/animation.html) | 骨骼动画混合、关键帧插值 |

## 三十一、高级视觉与物理（237~352）

| # | 章节 | 技术点 |
|---|------|-------|
| [237](./237-skeletal-animation-blend/index.html) | **骨骼动画混合 ★** | 骨骼动画、动画混合、关键帧插值、IK/FK切换 |
| [238](./238-volumetric-smoke/index.html) | **体积烟雾渲染 ★** | GPU烟雾模拟、体积渲染、粒子系统、光线步进 |
| [239](./239-galaxy-merger/index.html) | **星系碰撞合并 ★** | N-body模拟、引力交互、星系碰撞、粒子动力学 |
| [240](./240-spatial-hash-grid/index.html) | **空间哈希网格 ★** | 空间分割算法、网格单元着色、InstancedMesh、实时碰撞检测 |
| [241](./240-quantum-circuit/index.html) | **量子电路可视化 ★** | 量子门电路、量子比特可视化、量子计算 |
| [242](./242-voxel-maze-generator/index.html) | **体素迷宫生成器 ★** | 递归回溯、Prim、Kruskal算法、InstancedMesh渲染 |
| [243](./240-3d-histogram/index.html) | **3D数据柱图可视化 ★** | 3D柱状图、交互式数据可视化、实时更新 |
| [244](./244-procedural-planet-erosion/index.html) | **程序化行星侵蚀 ★** | 水力侵蚀模拟、FBM地形、顶点颜色、大气辉光 |
| [245](./240-isosurface/index.html) | **等值面可视化 ★** | Marching Cubes算法、三维标量场、表面重建、隐式曲面 |
| [246](./243-skybox-procedural/index.html) | **程序化天空盒 ★** | 大气散射、Rayleigh/Mie散射、FBM云朵着色、Three.js Sky |
| [247](./240-spatial-hash/index.html) | **空间哈希表 ★** | 空间哈希表可视化、O(1)查找、点击高亮、时间复杂度对比 |
| [248](./248-fluid-shader-ink/index.html) | **墨水扩散流体 ★** | Navier-Stokes GPU流体、ping-pong FBO、墨水染料、鼠标拖拽注入 |
| [249](./240-fluid-sim/index.html) | **GPU流体模拟 ★** | Navier-Stokes GPU求解、涡度约束、压力投影、ping-pong FBO、鼠标染料注入 |
| [250](./240-spline-interpolation/index.html) | **样条插值动画 ★** | CatmullRom插值、路径动画、摄像机运动、粒子轨迹 |
| [250](./250-audio-dsp-equalizer/index.html) | **音频DSP均衡器 ★** | 频谱可视化、音频DSP、实时均衡、FFT音频处理 |
| [251](./251-particle-sandstorm/index.html) | **粒子沙尘暴 ★** | GPU粒子风暴、粒子扩散、摩擦力场、沙漠效果 |
| [253](./253-physics-rigid-stack/index.html) | **刚体堆叠物理 ★** | cannon-es物理引擎、刚体堆叠、碰撞检测、堆塔物理 |
| [254](./254-geographic-heatmap/index.html) | **地理热力图 ★** | 地理数据可视化、热力图叠加、GIS数据映射 |
| [255](./255-molecular-dynamics/index.html) | **分子动力学 ★** | 原子弹簧系统、Verlet积分、Lennard-Jones势、UnrealBloom发光 |
| [256](./256-generative-art-forest/index.html) | **生成式艺术森林 ★** | L-system植物生长、程序化森林、分形几何 |
| [257](./257-performance-gpu-batching/index.html) | **GPU批量渲染 ★** | InstancedMesh批量渲染、Draw Call优化、GPU实例化 |
| [260](./260-particle-storm/index.html) | **粒子风暴 ★** | 湍流粒子场、GPU实例化、噪声速度场、鼠标扰动 |
| [261](./261-voronoi-shattering/index.html) | **Voronoi破碎效果 ★** | Voronoi碎片、爆炸物理模拟、Verlet积分、碰撞检测、火花粒子 |
| [262](./262-soft-body-water/index.html) | **软体水球模拟 ★** | 软体弹簧系统、浮力模拟、透明材质、水面着色器 |
| [263](./263-soft-body-cube/index.html) | **软体方块模拟 ★** | 软体物理、弹簧质点系统、形变着色器、弹性碰撞 |
| [266](./266-neural-gas/index.html) | **神经气算法 ★** | 神经气聚类、自组织映射、拓扑保持、竞争学习 |
| [267](./267-portal-sphere/index.html) | **传送门球体 ★** | 传送门特效、空间扭曲着色器、能量漩涡 |
| [268](./268-terrain-hydraulic-erosion/index.html) | **地形水力侵蚀 ★** | 水力侵蚀模拟、地形生成、顶点击穿、冲积扇 |
| [269](./269-wave-surface/index.html) | **波浪表面模拟 ★** | Gerstner波、海浪模拟、水面交互、水花粒子 |
| [270](./270-voxel-painter/index.html) | **体素画笔 ★** | 32³体素编辑、InstancedMesh、JSON导出、16色彩色板 |
| [271](./271-particle-sandbox/index.html) | **粒子沙盒 ★** | 粒子物珄编辑器、GPU粒子、交互控制、参数实时调节 |
| [272](./272-wave-particle/index.html) | **波动粒子系统 ★** | 波动方程、粒子同步振荡、群落行为、干涉图样 |
| [274](./274-fourier-series/index.html) | **傅里叶级数可视化 ★** | 傅里叶级数、频域分解、正弦波叠加、圆频运动 |
| [275](./275-mesh-fluid/index.html) | **网格流体模拟 ★** | 欧拉网格流体、Navier-Stokes、表面张力、网格变形 |
| [276](./276-koch-snowflake/index.html) | **科赫雪花分形 ★** | Koch雪花算法、分形几何、迭代细分、LineSegments顶点颜色 |
| [277](./277-kerning-glyph/index.html) | **字距调整可视化 ★** | 字体字距调整、TextGeometry、字间间距可视化、排版微调 |
| [278](./278-spring-lattice/index.html) | **弹簧晶格振子 ★** | 弹簧晶格物理、耦合振子、波传播、驻波模拟 |
| [273](./273-spherical-harmonics/index.html) | **球谐函数可视化 ★** | 球谐函数Y_lm、缔合Legendre多项式、量子数(l,m)、 lobe可视化 |
| [279](./279-particle-sph/index.html) | **粒子SPH流体 ★** | SPH光滑粒子流体、粒子间作用力、密度计算、 Navier-Stokes |
| [280](./280-webxr-grab/index.html) | **WebXR抓取交互 ★** | WebXR手势抓取、VR控制器、沉浸式3D交互 |
| [281](./281-procedural-clouds-volumetric/index.html) | **程序化体积云 ★** | 体积云渲染、光线步进、散射模拟、FBM噪声 |
| [282](./282-shader-water-caustic/index.html) | **焦散水面着色器 ★** | 实时焦散着色器、光线折射、水面波纹、水下光斑 |
| [283](./283-particle-constellation/index.html) | **粒子星座图 ★** | 粒子连线星座、3D星空、视差效果、星座连线 |
| [284](./284-sdf-raymarcher-advanced/index.html) | **高级SDF光线步进 ★** | 高级SDF渲染、smin/smax融合、软阴影、AO、三种预设场景 |
| [285](./285-procedural-terrain-erosion/index.html) | **程序化地形侵蚀 ★** | 地形生成、河流侵蚀模拟、沉积物传输、热侵蚀 |
| [286](./286-audio-visualizer-reactive/index.html) | **音频可视化反应 ★** | 音频频谱反应、实时FFT、粒子色彩响应、节拍检测 |
| [287](./287-sdf-boolean/index.html) | **SDF布尔运算 ★** | SDF联合/相减/相交、smooth blend、CSG几何 |
| [288](./288-gpu-ray-trace/index.html) | **GPU光线追踪 ★** | CubeCamera实时反射、菲涅尔反射、玻璃折射、 UnrealBloom |
| [289](./289-procedural-lava/index.html) | **程序化熔岩流 ★** | GPU粒子熔岩、温度着色、热力扭曲后处理、 InstancedMesh |
| [290](./290-interactive-water-fountain/index.html) | **交互水舞喷泉 ★** | Verlet粒子物理、音频反应、焦散光斑、MeshPhysicalMaterial水滴 |
| [291](./291-holographic-audio/index.html) | **全息音频可视化 ★** | 音频全息投影、波形渲染、三维频谱 |
| [292](./292-procedural-bonsai/index.html) | **程序化盆景树 ★** | L-system盆景、程序化植物、修剪模拟 |
| [293](./293-skeletal-rig/index.html) | **骨骼绑定系统 ★** | 骨骼动画、IK/FK、蒙皮权重、关键帧 |
| [294](./294-world-painter/index.html) | **世界画笔编辑器 ★** | 3D地形编辑、笔刷系统、实时渲染 |
| [295](./295-quantum-wave-function/index.html) | **量子波函数 ★** | 量子力学波函数、概率密度、3D可视化 |
| [296](./296-diffraction-grating/index.html) | **衍射光栅 ★** | 光栅衍射、光波干涉、光谱分解 |
| [297](./297-particle-beam/index.html) | **粒子束流 ★** | 高能粒子束、束流物理、光线追踪 |
| [298](./298-gravitational-lensing/index.html) | **引力透镜 ★** | 广义相对论、引力透镜、光线偏折 |
| [303](./303-gpu-particle-storm/index.html) | **GPU粒子风暴 ★** | 20万粒子、FBM湍流、UnrealBloom、鼠标力场 |
| [304](./304-webxr-hand-tracking/index.html) | **WebXR手势追踪 ★** | WebXR手势追踪、骨骼网格、VR交互 |
| [305](./305-procedural-terrain-biomes/index.html) | **程序化地形生物群落 ★** | 地形生物群落、气候带、程序化生态 |
| [306](./306-3d-graph-visualization/index.html) | **3D图形可视化 ★** | 3D图表、图形理论、网络可视化 |
| [307](./307-sdf-raymarching-scene/index.html) | **SDF光线步进场景 ★** | SDF场景构建、光线步进、距离场渲染 |
| [308](./308-soft-body-cloth/index.html) | **软体布料模拟 ★** | 布料物理、弹簧质点、碰撞检测 |
| [309](./309-particle-beam/index.html) | **粒子束流 ★** | 高能粒子束、CatmullRom曲线、UnrealBloom、鼠标点击粒子爆发 |
| [310](./310-gravitational-lensing/index.html) | **引力透镜 ★** | 黑洞透镜、吸积盘、爱因斯坦环、相对论喷流 |
| [311](./311-abel-inversion/index.html) | **Abel逆变换 ★** | Abel反演、轴对称可视化、等离子体诊断 |
| [312](./312-holographic-interference/index.html) | **全息干涉图样 ★** | 全息干涉、衍射光栅、光学干涉 |
| [313](./247-snowflake-crystal-generator/index.html) | **雪花晶体生成器 ★** | Koch雪花晶体、六重对称、递归细分、UnrealBloom发光、点击生成 |
| [259](./259-voxel-carving-terrain/index.html) | **体素地形雕刻 ★** | 32³体素编辑、InstancedMesh、噪声地形生成、左右键放/删体素 |
| [258](./258-sound-reactive-particles/index.html) | **音频反应粒子 ★** | FFT频谱驱动粒子、低/中/高频分层响应、AdditiveBlending、UnrealBloom |
| [314](./246-spherical-mesh-deformation/index.html) | **球面网格变形 ★** | 球谐函数Y_lm、Rodrigues公式、21个模式滑块、网格变形动画 |
| [315](./245-surface-tension-fluid/index.html) | **表面张力流体 ★** | Metaballs融合、smin平滑联合、表面张力物理、鼠标拖拽、Fresnel |
| [316](./249-mesh-wind-field/index.html) | **3D风场可视化 ★** | Simplex噪声风场、InstancedMesh箭头、点击阵风、速度颜色编码 |
| [321](./321-plasma-ball/index.html) | **等离子球 ★** | 等离子球闪电、电弧模拟、鼠标交互、UnrealBloom |
| [322](./322-soap-bubble/index.html) | **肥皂泡模拟 ★** | 薄膜干涉、彩虹色、MeshPhysicalMaterial、透明材质 |
| [323](./323-particle-sandpile/index.html) | **沙堆粒子模拟 ★** | 自组织临界、沙堆模型、粒子堆积、BTW模型 |
| [324](./324-knot-torus/index.html) | **结环面几何 ★** | 打结环面、拓扑结、三维曲线可视化 |
| [325](./325-wave-pendulum/index.html) | **波动摆模拟 ★** | 耦合摆波动、拍频现象、混沌摆 |
| [326](./326-shader-confetti/index.html) | **着色器彩屑 ★** | GLSL彩屑动画、粒子洒落、彩虹配色 |
| [327](./327-rorschach-inkblot/index.html) | **罗夏墨迹 ★** | 对称墨迹生成、随机图形、心理学投影 |
| [328](./328-mobius-strip/index.html) | **莫比乌斯环 ★** | 莫比乌斯带、非定向曲面、拓扑学 |
| [329](./329-spherical-harmonics-lighting/index.html) | **球谐光照 ★** | 球谐函数光照、PRT光照传输、环境光照 |
| [331](./331-particle-sandglider/index.html) | **粒子滑翔模拟 ★** | 粒子地形滑翔、SPH交互、粒子地形交互 |
| [332](./332-spline-railroad/index.html) | **程序化铁路轨道 ★** | CatmullRomCurve3铁轨生成、火车动画、Frenet帧 |
| [333](./333-voxel-maze-generator/index.html) | **体素迷宫生成器 ★** | 递归回溯迷宫、InstancedMesh渲染 |
| [334](./334-snowflake-generator/index.html) | **雪花生成器 ★** | 六重对称分形、Koch雪花 |
| [335](./335-fluid-shader-ink/index.html) | **着色器墨水 ★** | GPU墨水扩散、Navier-Stokes流体、ping-pong FBO |
| [336](./336-webgpu-renderer/index.html) | **WebGPU渲染器 ★** | WebGPU API、下一代Web图形、ComputeShader |
| [337](./337-procedural-architecture/index.html) | **程序化建筑学 ★** | 建筑程序生成、Algorithmic AIA、结构优化 |
| [338](./338-soft-body-physics/index.html) | **软体物理模拟 ★** | 软体物理、弹簧系统、形变动画 |
| [339](./339-audio-reactive-shader/index.html) | **音频反应着色器 ★** | 音频着色器、FFT频谱、实时图形渲染 |
| [340](./340-audio-dsp-equalizer/index.html) | **音频DSP均衡器 ★** | FFT频谱可视化、3D音频频谱、频率响应 |
| [341](./341-plasma-ball/index.html) | **等离子球 ★** | 等离子球闪电、电弧模拟、鼠标交互、UnrealBloom |
| [342](./342-soap-bubble/index.html) | **肥皂泡模拟 ★** | 薄膜干涉、彩虹色、MeshPhysicalMaterial |
| [343](./343-particle-sandpile/index.html) | **沙堆粒子模拟 ★** | 自组织临界、沙堆BTW模型、粒子堆积 |
| [344](./344-knot-torus/index.html) | **结环面几何 ★** | TorusKnotGeometry、p/q比率、拓扑结、wireframe |
| [345](./345-wave-pendulum/index.html) | **波动摆模拟 ★** | 耦合摆、拍频现象、混沌物理 |
| [346](./346-shader-confetti/index.html) | **着色器彩屑 ★** | GLSL彩屑、粒子洒落、彩虹配色 |
| [347](./347-rorschach-inkblot/index.html) | **罗夏墨迹 ★** | 对称墨迹、随机图形、心理投影 |
| [348](./348-audio-visualizer-3d/index.html) | **3D音频频谱可视化 ★** | Web Audio API、FFT驱动3D频谱柱、环形布局、音频文件加载 |
| [349](./349-procedural-terrain-biomes/index.html) | **程序化地形生物群系 ★** | FBM噪声地形、生物群落生成、气候带模拟 |
| [350](./350-3d-graph-visualization/index.html) | **3D图形可视化 ★** | 力导向图布局、Verlet物理、节点-边可视化、CSS2DRenderer标签 |
| [351](./351-sdf-raymarching-scene/index.html) | **SDF光线步进场景 ★** | SDF场景构建、光线步进、距离场渲染 |
| [352](./352-soft-body-cloth/index.html) | **软体布料模拟 ★** | 布料物理、弹簧质点、碰撞检测 |
| [353](./353-wind-erosion-terrain/index.html) | **风力侵蚀地形 ★** | FBM噪声地形、风力侵蚀模拟、顶点着色器位移、沙粒粒子漂流、暖色沙漠 |
| [354](./354-particle-settling/index.html) | **粒子沉降模拟 ★** | GPU InstancedMesh引力沉降、安息角堆积、点击倾倒、InstancedMesh |
| [356](./356-kinematic-chain/index.html) | **机械连杆运动链 ★** | 正逆运动学、多段连杆、旋转关节约束、点击控制 |

## 三十二、新示例（353~360）

| # | 章节 | 技术点 |
|---|------|-------|
| [353](./353-wind-erosion-terrain/index.html) | **风力侵蚀地形 ★** | FBM噪声地形、风力侵蚀模拟、沙粒粒子漂流、点击阵风 |
| [354](./354-particle-settling/index.html) | **粒子沉降模拟 ★** | GPU InstancedMesh引力沉降、安息角堆积、点击倾倒、碰撞物理 |
| [357](./357-reaction-diffusion-turing/index.html) | **反应扩散图灵斑图 ★** | Gray-Scott反应扩散、GPU FBO迭代、图灵生物图案、点击注入催化剂 |
| [358](./358-abel-inversion/index.html) | **Abel逆变换可视化 ★** | 轴对称投影、Abel反演重建、3D密度场可视化、等离子体诊断 |
| [359](./359-electromagnetic-wave/index.html) | **电磁波传播可视化 ★** | Maxwell平面波、偏振态可视化、E/B场箭头、线/圆/椭圆偏振切换 |
| [360](./360-voxel-extrusion-font/index.html) | **体素字体挤压 ★** | InstancedMesh体素动画、入场逐字弹出、赛博朋克霓虹风格 |

## 附录：全部示例索引

- **prism-rainbow** — [2898](./2898-prism-rainbow/index.html)
- **ferris-wheel-sim** — [2899](./2899-ferris-wheel-sim/index.html)
- **newton-cradle** — [2900](./2900-newton-cradle/index.html)
- **balloon-physics** — [2901](./2901-balloon-physics/index.html)
- **water-droplet** — [2902](./2902-water-droplet/index.html)
- **solar-system-sim** — [2903](./2903-solar-system-sim/index.html)
- **comet-tail-sim** — [2904](./2904-comet-tail-sim/index.html)
- **aurora-borealis-sim** — [2905](./2905-aurora-borealis-sim/index.html)
- **granular-sim** — [2908](./2908-granular-sim/index.html)

- **magnet-field-lines** — [2834](./2834-magnet-field-lines/index.html)
- **conway-life** — [2835](./2835-conway-life/index.html)
- **fractal-tree-gen** — [2836](./2836-fractal-tree-gen/index.html)
- **cloth-drape-sim** — [2837](./2837-cloth-drape-sim/index.html)
- **sand-particle-sim** — [2838](./2838-sand-particle-sim/index.html)
- **bubble-physics** — [2839](./2839-bubble-physics/index.html)
- **soap-film-sim** — [2840](./2840-soap-film-sim/index.html)
- **laser-reflection** — [2841](./2841-laser-reflection/index.html)

- **voxel-farm-builder** — [2803](./2803-voxel-farm-builder/index.html)
- **galaxy-cluster-sim** — [2804](./2804-galaxy-cluster-sim/index.html)
- **crystal-lattice-sim** — [2805](./2805-crystal-lattice-sim/index.html)
- **audio-waveform-3d** — [2806](./2806-audio-waveform-3d/index.html)
- **morphing-sphere** — [2807](./2807-morphing-sphere/index.html)
- **star-field-nav** — [2808](./2808-star-field-nav/index.html)
- **dna-helix-animation** — [2809](./2809-dna-helix-animation/index.html)
- **pendulum-wave** — [2810](./2810-pendulum-wave/index.html)
- **raymarch-sdf-scene** — [2811](./2811-raymarch-sdf-scene/index.html)
- **node-graph-visualizer** — [2812](./2812-node-graph-visualizer/index.html)
- **terrain-biome-gen** — [2813](./2813-terrain-biome-gen/index.html)
- **spring-physics** — [2814](./2814-spring-physics/index.html)
- **smoke-particle-sim** — [2815](./2815-smoke-particle-sim/index.html)
- **firework-burst** — [2816](./2816-firework-burst/index.html)
- **liquid-sim** — [2817](./2817-liquid-sim/index.html)

> 以下为由脚本自动生成的示例，每个类型收录最新版本，★ 表示该技术方向有多个版本。

- **3d-graph-visualization** — [350](./350-3d-graph-visualization/index.html) ★ (共2版)
- **3d-histogram** — [240](./240-3d-histogram/index.html)
- **abel-inversion** — [358](./358-abel-inversion/index.html) ★ (共2版)
- **advanced-skeletal-blend** — [240](./240-advanced-skeletal-blend/index.html)
- **afterimage-trails** — [91](./91-afterimage-trails/index.html)
- **animation-mixer** — [43](./43-animation-mixer/index.html)
- **ascii-effect** — [96](./96-ascii-effect/index.html)
- **atmospheric-scattering** — [193](./193-atmospheric-scattering/index.html)
- **audio-dsp-equalizer** — [340](./340-audio-dsp-equalizer/index.html) ★ (共2版)
- **audio-fft-visualizer** — [173](./173-audio-fft-visualizer/index.html)
- **audio-fingerprint** — [240](./240-audio-fingerprint/index.html)
- **audio-reactive** — [57](./57-audio-reactive/index.html)
- **audio-reactive-particles** — [2738](./2738-audio-reactive-particles/index.html) ★ (共10版)
- **audio-reactive-shader** — [339](./339-audio-reactive-shader/index.html)
- **audio-visualizer-3d** — [348](./348-audio-visualizer-3d/index.html)
- **audio-visualizer-reactive** — [286](./286-audio-visualizer-reactive/index.html)
- **audio-visualizer-webgl** — [192](./192-audio-visualizer-webgl/index.html)
- **audio-waveform** — [137](./137-audio-waveform/index.html)
- **aurora-borealis** — [75](./75-aurora-borealis/index.html)
- **billiards** — [140](./140-billiards/index.html)
- **black-hole-lensing** — [225](./225-black-hole-lensing/index.html)
- **blending-modes** — [17](./17-blending-modes/index.html)
- **bloom-postfx** — [29](./29-bloom-postfx/index.html)
- **bokeh-postfx** — [30](./30-bokeh-postfx/index.html)
- **boolean-geometry** — [58](./58-boolean-geometry/index.html)
- **bubble-pop** — [142](./142-bubble-pop/index.html)
- **camera-shake** — [54](./54-camera-shake/index.html)
- **camera-switch** — [41](./41-camera-switch/index.html)
- **camera-tween** — [42](./42-camera-tween/index.html)
- **canvas-texture** — [5](./05-canvas-texture/index.html)
- **car-physics** — [139](./139-car-physics/index.html)
- **character-controller** — [123](./123-character-controller/index.html)
- **clipping-planes** — [34](./34-clipping-planes/index.html)
- **cloth-flag** — [128](./128-cloth-flag/index.html)
- **cloth-physics** — [187](./187-cloth-physics/index.html)
- **cloth-simulation** — [67](./67-cloth-simulation/index.html)
- **convex-geometry** — [101](./101-convex-geometry/index.html)
- **crowd-simulation** — [184](./184-crowd-simulation/index.html)
- **crystal-gem** — [121](./121-crystal-gem/index.html)
- **crystal-growth** — [146](./146-crystal-growth/index.html)
- **crystal-lattice** — [221](./221-crystal-lattice/index.html)
- **csm-shadows** — [104](./104-csm-shadows/index.html)
- **css2d-labels** — [36](./36-css2d-labels/index.html)
- **css3d-cards** — [97](./97-css3d-cards/index.html)
- **cube-camera** — [28](./28-cube-camera/index.html)
- **curve-modifier** — [102](./102-curve-modifier/index.html)
- **curve-tube** — [12](./12-curve-tube/index.html)
- **custom-shader** — [19](./19-custom-shader/index.html)
- **data-bar-chart** — [119](./119-data-bar-chart/index.html)
- **decal** — [35](./35-decal/index.html)
- **diffraction-grating** — [296](./296-diffraction-grating/index.html)
- **diffusion-limited-aggregation** — [213](./213-diffusion-limited-aggregation/index.html)
- **dither-shader** — [138](./138-dither-shader/index.html)
- **dithered-transparency** — [70](./70-dithered-transparency/index.html)
- **dna-helix** — [202](./202-dna-helix/index.html)
- **domino-chain** — [147](./147-domino-chain/index.html)
- **drag-controls** — [38](./38-drag-controls/index.html)
- **dsp-audio-visualizer** — [241](./241-dsp-audio-visualizer/index.html)
- **earth-globe** — [112](./112-earth-globe/index.html)
- **ecosystem-sim** — [228](./228-ecosystem-sim/index.html)
- **edges-wireframe** — [49](./49-edges-wireframe/index.html)
- **electromagnetic-wave** — [359](./359-electromagnetic-wave/index.html)
- **environment-map** — [18](./18-environment-map/index.html)
- **extrude-shape** — [11](./11-extrude-shape/index.html)
- **fat-lines** — [48](./48-fat-lines/index.html)
- **film-grain** — [92](./92-film-grain/index.html)
- **fireflies-swarm** — [154](./154-fireflies-swarm/index.html)
- **fireworks** — [120](./120-fireworks/index.html)
- **first-person** — [40](./40-first-person/index.html)
- **flip-clock** — [134](./134-flip-clock/index.html)
- **fluid-dye** — [175](./175-fluid-dye/index.html)
- **fluid-fire** — [258](./258-fluid-fire/index.html)
- **fluid-shader** — [71](./71-fluid-shader/index.html)
- **fluid-shader-ink** — [335](./335-fluid-shader-ink/index.html) ★ (共2版)
- **fluid-shader-water** — [2736](./2736-fluid-shader-water/index.html) ★ (共10版)
- **fluid-sim** — [240](./240-fluid-sim/index.html) ★ (共2版)
- **fog-atmosphere** — [21](./21-fog-atmosphere/index.html)
- **force-graph** — [80](./80-force-graph/index.html)
- **fourier-series** — [274](./274-fourier-series/index.html)
- **fractal-mandelbrot** — [203](./203-fractal-mandelbrot/index.html)
- **fractal-tree** — [141](./141-fractal-tree/index.html)
- **fresnel-hologram** — [50](./50-fresnel-hologram/index.html)
- **galaxy** — [24](./24-galaxy/index.html)
- **galaxy-merger** — [239](./239-galaxy-merger/index.html)
- **game-of-life** — [73](./73-game-of-life/index.html)
- **generative-art-forest** — [256](./256-generative-art-forest/index.html)
- **geographic-heatmap** — [254](./254-geographic-heatmap/index.html)
- **geometry-material** — [2](./02-geometry-material/index.html)
- **geometry-merge** — [14](./14-geometry-merge/index.html)
- **glass-refraction** — [53](./53-glass-refraction/index.html)
- **glitch-postfx** — [95](./95-glitch-postfx/index.html)
- **gltf-loader** — [9](./09-gltf-loader/index.html)
- **gpu-particle-storm** — [303](./303-gpu-particle-storm/index.html)
- **gpu-particles** — [68](./68-gpu-particles/index.html)
- **gpu-particles-webgl** — [189](./189-gpu-particles-webgl/index.html)
- **gpu-ray-trace** — [288](./288-gpu-ray-trace/index.html)
- **graph-layout** — [200](./200-graph-layout/index.html) ★ (共2版)
- **gravitational-lensing** — [310](./310-gravitational-lensing/index.html) ★ (共2版)
- **grid-snap** — [108](./108-grid-snap/index.html)
- **gui-debug** — [44](./44-gui-debug/index.html)
- **hair-fur** — [90](./90-hair-fur/index.html)
- **halftone-postfx** — [93](./93-halftone-postfx/index.html)
- **heatmap-visualization** — [196](./196-heatmap-visualization/index.html)
- **hello-scene** — [1](./01-hello-scene/index.html)
- **holographic-audio** — [291](./291-holographic-audio/index.html)
- **holographic-comm** — [167](./167-holographic-comm/index.html)
- **holographic-display** — [74](./74-holographic-display/index.html)
- **holographic-interference** — [312](./312-holographic-interference/index.html)
- **holographic-shader** — [236](./236-holographic-shader/index.html)
- **holographic-ui** — [156](./156-holographic-ui/index.html)
- **ik-chain** — [191](./191-ik-chain/index.html)
- **instanced-mesh** — [20](./20-instanced-mesh/index.html)
- **interactive-piano** — [165](./165-interactive-piano/index.html)
- **interactive-water-fountain** — [290](./290-interactive-water-fountain/index.html)
- **isosurface** — [240](./240-isosurface/index.html)
- **kaleidoscope** — [155](./155-kaleidoscope/index.html)
- **kerning-glyph** — [277](./277-kerning-glyph/index.html)
- **kinect-pose** — [130](./130-kinect-pose/index.html)
- **kinematic-chain** — [356](./356-kinematic-chain/index.html)
- **knot-torus** — [344](./344-knot-torus/index.html) ★ (共2版)
- **koch-snowflake** — [276](./276-koch-snowflake/index.html)
- **lava-lamp** — [157](./157-lava-lamp/index.html)
- **lens-distortion** — [148](./148-lens-distortion/index.html)
- **lens-flare** — [76](./76-lens-flare/index.html)
- **lightning-effect** — [195](./195-lightning-effect/index.html)
- **lights-shadows** — [3](./03-lights-shadows/index.html)
- **loading-manager** — [10](./10-loading-manager/index.html)
- **lod** — [33](./33-lod/index.html)
- **lut-color-grading** — [99](./99-lut-color-grading/index.html)
- **magnetic-field** — [129](./129-magnetic-field/index.html)
- **magnetic-monopole** — [223](./223-magnetic-monopole/index.html)
- **marching-cubes** — [135](./135-marching-cubes/index.html) ★ (共2版)
- **marching-squares-contour** — [214](./214-marching-squares-contour/index.html)
- **mesh-fluid** — [275](./275-mesh-fluid/index.html)
- **mesh-surface-sampler** — [100](./100-mesh-surface-sampler/index.html)
- **mesh-wind-field** — [249](./249-mesh-wind-field/index.html)
- **metaballs** — [72](./72-metaballs/index.html)
- **mini-golf** — [160](./160-mini-golf/index.html)
- **mirror** — [27](./27-mirror/index.html)
- **mobius-strip** — [328](./328-mobius-strip/index.html)
- **molecular-dynamics** — [255](./255-molecular-dynamics/index.html)
- **morph-blob** — [171](./171-morph-blob/index.html)
- **morph-targets** — [16](./16-morph-targets/index.html)
- **morphing-blobs** — [118](./118-morphing-blobs/index.html)
- **motion-blur** — [180](./180-motion-blur/index.html)
- **music-visualizer-3d** — [216](./216-music-visualizer-3d/index.html)
- **neural-gas** — [266](./266-neural-gas/index.html)
- **neural-network** — [150](./150-neural-network/index.html)
- **neural-style-transfer** — [178](./178-neural-style-transfer/index.html)
- **node-material** — [188](./188-node-material/index.html)
- **noise-flow-field** — [78](./78-noise-flow-field/index.html)
- **obb-collision** — [105](./105-obb-collision/index.html)
- **ocean-waves** — [86](./86-ocean-waves/index.html)
- **orbit-controls** — [7](./07-orbit-controls/index.html)
- **origami-crane** — [152](./152-origami-crane/index.html)
- **outline-selection** — [31](./31-outline-selection/index.html)
- **packing-spheres** — [211](./211-packing-spheres/index.html)
- **parallax-mapping** — [85](./85-parallax-mapping/index.html)
- **parallax-scene** — [143](./143-parallax-scene/index.html)
- **particle-attractor** — [170](./170-particle-attractor/index.html) ★ (共2版)
- **particle-beam** — [309](./309-particle-beam/index.html) ★ (共2版)
- **particle-constellation** — [283](./283-particle-constellation/index.html)
- **particle-physics** — [234](./234-particle-physics/index.html)
- **particle-sandbox** — [271](./271-particle-sandbox/index.html)
- **particle-sandglider** — [331](./331-particle-sandglider/index.html) ★ (共2版)
- **particle-sandpile** — [343](./343-particle-sandpile/index.html) ★ (共2版)
- **particle-sandstorm** — [313](./313-particle-sandstorm/index.html) ★ (共2版)
- **particle-settling** — [354](./354-particle-settling/index.html)
- **particle-sph** — [279](./279-particle-sph/index.html)
- **particle-storm** — [260](./260-particle-storm/index.html)
- **particle-texture** — [158](./158-particle-texture/index.html)
- **particle-trails** — [194](./194-particle-trails/index.html)
- **particle-vortex** — [2741](./2741-particle-vortex/index.html) ★ (共10版)
- **particles** — [23](./23-particles/index.html)
- **path-recorder** — [107](./107-path-recorder/index.html)
- **peppers-ghost** — [98](./98-peppers-ghost/index.html)
- **performance-gpu-batching** — [257](./257-performance-gpu-batching/index.html)
- **perlin-flowmap** — [222](./222-perlin-flowmap/index.html)
- **physics** — [45](./45-physics/index.html)
- **physics-pendulum** — [164](./164-physics-pendulum/index.html)
- **physics-rigid-stack** — [253](./253-physics-rigid-stack/index.html)
- **pinball-machine** — [144](./144-pinball-machine/index.html)
- **ping-pong-physics** — [207](./207-ping-pong-physics/index.html)
- **planck-scale-universe** — [215](./215-planck-scale-universe/index.html)
- **plasma-ball** — [341](./341-plasma-ball/index.html) ★ (共2版)
- **plasma-physics** — [219](./219-plasma-physics/index.html)
- **portal-door** — [125](./125-portal-door/index.html)
- **portal-portal** — [177](./177-portal-portal/index.html)
- **portal-sphere** — [267](./267-portal-sphere/index.html)
- **portal-wormhole** — [64](./64-portal-wormhole/index.html)
- **procedural-architecture** — [337](./337-procedural-architecture/index.html) ★ (共2版)
- **procedural-bonsai** — [292](./292-procedural-bonsai/index.html)
- **procedural-canyon** — [235](./235-procedural-canyon/index.html)
- **procedural-city** — [183](./183-procedural-city/index.html) ★ (共2版)
- **procedural-clouds** — [166](./166-procedural-clouds/index.html)
- **procedural-clouds-volumetric** — [281](./281-procedural-clouds-volumetric/index.html)
- **procedural-coral** — [220](./220-procedural-coral/index.html)
- **procedural-crystal** — [208](./208-procedural-crystal/index.html)
- **procedural-fire** — [197](./197-procedural-fire/index.html)
- **procedural-lava** — [289](./289-procedural-lava/index.html)
- **procedural-planet** — [190](./190-procedural-planet/index.html)
- **procedural-planet-erosion** — [244](./244-procedural-planet-erosion/index.html)
- **procedural-terrain-biomes** — [349](./349-procedural-terrain-biomes/index.html) ★ (共2版)
- **procedural-terrain-erosion** — [285](./285-procedural-terrain-erosion/index.html)
- **procedural-terrain-lod** — [2737](./2737-procedural-terrain-lod/index.html) ★ (共10版)
- **procedural-tree** — [110](./110-procedural-tree/index.html)
- **puzzle-3d-slab** — [204](./204-puzzle-3d-slab/index.html)
- **puzzle-swap** — [136](./136-puzzle-swap/index.html)
- **qr-code-3d** — [116](./116-qr-code-3d/index.html)
- **quantum-circuit** — [240](./240-quantum-circuit/index.html)
- **quantum-entanglement** — [218](./218-quantum-entanglement/index.html)
- **quantum-viz** — [185](./185-quantum-viz/index.html)
- **quantum-wave-function** — [295](./295-quantum-wave-function/index.html)
- **qubit-viz** — [168](./168-qubit-viz/index.html)
- **rain-system** — [89](./89-rain-system/index.html)
- **ray-marching** — [59](./59-ray-marching/index.html)
- **raycaster** — [8](./08-raycaster/index.html)
- **reaction-diffusion** — [231](./231-reaction-diffusion/index.html)
- **reaction-diffusion-turing** — [357](./357-reaction-diffusion-turing/index.html)
- **render-target** — [32](./32-render-target/index.html)
- **rgb-shift-postfx** — [94](./94-rgb-shift-postfx/index.html)
- **rope-bridge** — [149](./149-rope-bridge/index.html)
- **rorschach-inkblot** — [347](./347-rorschach-inkblot/index.html) ★ (共2版)
- **rubiks-cube** — [113](./113-rubiks-cube/index.html)
- **sand-simulation** — [199](./199-sand-simulation/index.html)
- **sdf-boolean** — [287](./287-sdf-boolean/index.html)
- **sdf-garden** — [227](./227-sdf-garden/index.html)
- **sdf-raymarcher** — [174](./174-sdf-raymarcher/index.html)
- **sdf-raymarcher-advanced** — [284](./284-sdf-raymarcher-advanced/index.html)
- **sdf-raymarching-scene** — [351](./351-sdf-raymarching-scene/index.html) ★ (共2版)
- **sdf-sculptor** — [131](./131-sdf-sculptor/index.html)
- **sdf-spheres** — [2742](./2742-sdf-spheres/index.html) ★ (共10版)
- **shader-confetti** — [346](./346-shader-confetti/index.html) ★ (共2版)
- **shader-graph-visualizer** — [212](./212-shader-graph-visualizer/index.html)
- **shader-kaleidoscope** — [2740](./2740-shader-kaleidoscope/index.html) ★ (共10版)
- **shader-playground** — [111](./111-shader-playground/index.html)
- **shader-water-caustic** — [282](./282-shader-water-caustic/index.html)
- **shadow-mapping** — [55](./55-shadow-mapping/index.html)
- **shooting-gallery** — [114](./114-shooting-gallery/index.html)
- **simplify-modifier** — [103](./103-simplify-modifier/index.html)
- **skeletal-animation-blend** — [237](./237-skeletal-animation-blend/index.html)
- **skeletal-rig** — [293](./293-skeletal-rig/index.html)
- **sky-water** — [22](./22-sky-water/index.html)
- **skybox-procedural** — [243](./243-skybox-procedural/index.html)
- **smoke-fire** — [63](./63-smoke-fire/index.html)
- **snow-accumulation** — [66](./66-snow-accumulation/index.html)
- **snow-globe** — [151](./151-snow-globe/index.html)
- **snowflake-crystal-generator** — [247](./247-snowflake-crystal-generator/index.html)
- **snowflake-generator** — [334](./334-snowflake-generator/index.html) ★ (共2版)
- **soap-bubble** — [342](./342-soap-bubble/index.html) ★ (共2版)
- **soft-body** — [84](./84-soft-body/index.html)
- **soft-body-cloth** — [352](./352-soft-body-cloth/index.html) ★ (共2版)
- **soft-body-cloth-sim** — [2739](./2739-soft-body-cloth-sim/index.html) ★ (共10版)
- **soft-body-cube** — [263](./263-soft-body-cube/index.html)
- **soft-body-physics** — [338](./338-soft-body-physics/index.html)
- **soft-body-water** — [262](./262-soft-body-water/index.html)
- **solar-system** — [77](./77-solar-system/index.html) ★ (共2版)
- **solar-system-3d** — [205](./205-solar-system-3d/index.html)
- **solar-system-orbits** — [115](./115-solar-system-orbits/index.html)
- **sound-reactive-particles** — [258](./258-sound-reactive-particles/index.html)
- **sound-visualizer** — [88](./88-sound-visualizer/index.html)
- **space-debris** — [153](./153-space-debris/index.html)
- **spatial-hash** — [240](./240-spatial-hash/index.html)
- **spatial-hash-grid** — [240](./240-spatial-hash-grid/index.html)
- **spherical-harmonics** — [273](./273-spherical-harmonics/index.html)
- **spherical-harmonics-lighting** — [329](./329-spherical-harmonics-lighting/index.html)
- **spherical-mesh-deformation** — [246](./246-spherical-mesh-deformation/index.html)
- **spiral-galaxy** — [159](./159-spiral-galaxy/index.html)
- **splat-paint** — [145](./145-splat-paint/index.html)
- **spline-editor** — [206](./206-spline-editor/index.html)
- **spline-interp** — [240](./240-spline-interp/index.html)
- **spline-interpolation** — [240](./240-spline-interpolation/index.html)
- **spline-railroad** — [332](./332-spline-railroad/index.html) ★ (共2版)
- **spline-road** — [124](./124-spline-road/index.html)
- **splines-animation** — [83](./83-splines-animation/index.html)
- **spring-lattice** — [278](./278-spring-lattice/index.html)
- **sprite-animation** — [61](./61-sprite-animation/index.html)
- **sprites-billboards** — [37](./37-sprites-billboards/index.html)
- **ssao-postfx** — [52](./52-ssao-postfx/index.html)
- **sss-skin** — [186](./186-sss-skin/index.html)
- **stellar-collision** — [133](./133-stellar-collision/index.html)
- **string-theory** — [224](./224-string-theory/index.html)
- **subsurface-scatter** — [182](./182-subsurface-scatter/index.html)
- **surface-tension-fluid** — [245](./245-surface-tension-fluid/index.html)
- **sushi-plate** — [161](./161-sushi-plate/index.html)
- **terrain-blend** — [81](./81-terrain-blend/index.html)
- **terrain-carver** — [127](./127-terrain-carver/index.html)
- **terrain-erosion** — [176](./176-terrain-erosion/index.html) ★ (共2版)
- **terrain-flythrough** — [56](./56-terrain-flythrough/index.html)
- **terrain-hydraulic-erosion** — [268](./268-terrain-hydraulic-erosion/index.html)
- **terrain-lod** — [259](./259-terrain-lod/index.html)
- **terrain-perlin** — [25](./25-terrain-perlin/index.html)
- **tesseract-hypercube** — [210](./210-tesseract-hypercube/index.html)
- **text-geometry** — [13](./13-text-geometry/index.html)
- **textures** — [4](./04-textures/index.html)
- **time-dilation** — [169](./169-time-dilation/index.html)
- **toon-shading** — [47](./47-toon-shading/index.html)
- **topological-data-analysis** — [217](./217-topological-data-analysis/index.html)
- **topological-mesh** — [240](./240-topological-mesh/index.html)
- **transform-controls** — [39](./39-transform-controls/index.html)
- **vector-field-3d** — [277](./277-vector-field-3d/index.html)
- **vertex-animation** — [15](./15-vertex-animation/index.html)
- **video-texture** — [6](./06-video-texture/index.html)
- **virtual-joystick** — [106](./106-virtual-joystick/index.html)
- **volumetric-cloud** — [163](./163-volumetric-cloud/index.html)
- **volumetric-fog** — [179](./179-volumetric-fog/index.html)
- **volumetric-light** — [60](./60-volumetric-light/index.html)
- **volumetric-smoke** — [238](./238-volumetric-smoke/index.html)
- **voronoi-diagram** — [201](./201-voronoi-diagram/index.html)
- **voronoi-shatter** — [126](./126-voronoi-shatter/index.html)
- **voronoi-shattering** — [261](./261-voronoi-shattering/index.html)
- **voxel-carving-terrain** — [259](./259-voxel-carving-terrain/index.html)
- **voxel-character** — [87](./87-voxel-character/index.html)
- **voxel-city-builder** — [2735](./2735-voxel-city-builder/index.html) ★ (共10版)
- **voxel-editor** — [109](./109-voxel-editor/index.html)
- **voxel-extrusion-font** — [360](./360-voxel-extrusion-font/index.html)
- **voxel-fracture** — [172](./172-voxel-fracture/index.html)
- **voxel-maze-generator** — [333](./333-voxel-maze-generator/index.html) ★ (共2版)
- **voxel-painter** — [270](./270-voxel-painter/index.html)
- **voxel-terrain** — [62](./62-voxel-terrain/index.html)
- **water-caustics** — [181](./181-water-caustics/index.html)
- **water-ripple** — [65](./65-water-ripple/index.html)
- **water-surface-raymarching** — [330](./330-water-surface-raymarching/index.html)
- **wave-collapse** — [162](./162-wave-collapse/index.html)
- **wave-function-collapse-3d** — [209](./209-wave-function-collapse-3d/index.html)
- **wave-interference** — [117](./117-wave-interference/index.html)
- **wave-particle** — [272](./272-wave-particle/index.html)
- **wave-pendulum** — [345](./345-wave-pendulum/index.html) ★ (共2版)
- **wave-surface** — [269](./269-wave-surface/index.html)
- **weather-system** — [229](./229-weather-system/index.html)
- **webgpu-renderer** — [336](./336-webgpu-renderer/index.html)
- **webxr-grab** — [280](./280-webxr-grab/index.html)
- **webxr-hand-tracking** — [304](./304-webxr-hand-tracking/index.html)
- **webxr-vr** — [226](./226-webxr-vr/index.html)
- **wind-erosion-terrain** — [353](./353-wind-erosion-terrain/index.html)
- **wireframe-world** — [82](./82-wireframe-world/index.html)
- **world-painter** — [294](./294-world-painter/index.html)
