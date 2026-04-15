import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

        // ================================================================
        // 场景初始化
        // ================================================================
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);  // 天空蓝背景
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

        // 渲染器设置
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        // 相机
        const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(60, 50, 60);

        // 轨道控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.1;  // 限制俯视角，防止穿过地面
        controls.target.set(0, 0, 0);

        // ================================================================
        // 光照系统
        // ================================================================
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x6688cc, 0.5);
        scene.add(ambientLight);

        // 主方向光 (产生阴影)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
        dirLight.position.set(40, 60, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -80;
        dirLight.shadow.camera.right = 80;
        dirLight.shadow.camera.top = 80;
        dirLight.shadow.camera.bottom = -80;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        // 补光
        const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
        fillLight.position.set(-30, 20, -20);
        scene.add(fillLight);

        // ================================================================
        // 地形参数 (可由 GUI 调节)
        // ================================================================
        const terrainParams = {
            size: 100,          // 地形整体尺寸
            segments: 256,      // 最大细分片数 (用于最高 LOD)
            noiseScale: 0.03,   // 噪声缩放 (越小山峰越宽)
            amplitude: 22,      // 地形起伏幅度
            lodDistances: [0, 30, 60, 110, 180],  // LOD 切换距离阈值
        };

        // 噪声工具函数 (简化版 Perlin 噪声近似)
        // 使用多个正弦波叠加模拟自然地形
        function noise2D(x, z) {
            return (
                Math.sin(x * 0.5)   * Math.cos(z * 0.5)   * 0.5 +
                Math.sin(x * 1.2 + 0.3) * Math.cos(z * 0.9 + 0.7) * 0.3 +
                Math.sin(x * 2.5 + 1.1) * Math.cos(z * 2.3 + 0.4) * 0.15 +
                Math.sin(x * 5.0 + 2.0) * Math.cos(z * 4.7 + 1.2) * 0.05 +
                Math.sin(x * 10.0 + 0.5) * Math.cos(z * 9.5 + 2.0) * 0.02
            );
        }

        // 根据高度计算顶点颜色
        // 低 -> 草地绿, 中 -> 岩石灰, 高 -> 雪白
        function heightToColor(y, minY, maxY) {
            const t = (y - minY) / (maxY - minY);  // 归一化到 [0, 1]
            const color = new THREE.Color();
            if (t < 0.45) {
                // 草地: 深绿 -> 浅绿
                color.setHSL(0.35, 0.6, 0.2 + t * 0.3);
            } else if (t < 0.72) {
                // 岩石: 棕色 -> 灰褐色
                color.setHSL(0.08, 0.3, 0.35 + (t - 0.45) * 0.3);
            } else {
                // 积雪: 灰白 -> 纯白
                const snowT = (t - 0.72) / 0.28;
                color.setHSL(0.0, 0.1, 0.6 + snowT * 0.35);
            }
            return color;
        }

        // 生成地形几何体
        // segments: 平面每个方向的顶点数 (segments x segments)
        function buildTerrainGeometry(segments) {
            const geo = new THREE.PlaneGeometry(
                terrainParams.size,
                terrainParams.size,
                segments,
                segments
            );
            geo.rotateX(-Math.PI / 2);  // 转为 XZ 平面

            const positions = geo.attributes.position;
            const colors = [];
            let minY = Infinity, maxY = -Infinity;

            // 第一遍: 计算高度
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const y = noise2D(x * terrainParams.noiseScale, z * terrainParams.noiseScale) * terrainParams.amplitude;
                positions.setY(i, y);
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }

            // 第二遍: 根据高度设置颜色
            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                colors.push(...heightToColor(y, minY, maxY).toArray());
            }

            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geo.computeVertexNormals();
            return geo;
        }

        // ================================================================
        // LOD 地形对象
        // ================================================================
        // 定义每个 LOD 级别的细分片数
        const LOD_LEVELS = [
            { segments: 32,  label: 'LOD 0 (远)',  color: '#ff4444' },
            { segments: 64,  label: 'LOD 1',        color: '#ff8800' },
            { segments: 128, label: 'LOD 2',        color: '#ffcc00' },
            { segments: 256, label: 'LOD 3 (近)',  color: '#44ff44' },
        ];

        // 保存每个 LOD 级别的网格
        const lodMeshes = [];
        let currentLodIndex = -1;  // 当前激活的 LOD 索引

        LOD_LEVELS.forEach((level, index) => {
            const geo = buildTerrainGeometry(level.segments);
            const mat = new THREE.MeshStandardMaterial({
                vertexColors: true,   // 启用顶点颜色
                roughness: 0.85,
                metalness: 0.05,
                flatShading: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.visible = false;  // 初始全部隐藏
            mesh.userData.lodIndex = index;
            mesh.userData.segments = level.segments;
            scene.add(mesh);
            lodMeshes.push(mesh);
        });

        // 激活指定 LOD 级别
        function activateLod(index) {
            if (index === currentLodIndex) return;
            // 隐藏所有
            lodMeshes.forEach(m => { m.visible = false; });
            // 显示目标
            if (index >= 0 && index < lodMeshes.length) {
                lodMeshes[index].visible = true;
                currentLodIndex = index;
            }
        }

        // ================================================================
        // GUI 控制面板
        // ================================================================
        const gui = new GUI({ title: '🌍 地形 LOD 控制' });

        const folderMain = gui.addFolder('地形参数');
        folderMain.add(terrainParams, 'noiseScale', 0.005, 0.1, 0.001).name('噪声缩放').onChange(rebuildTerrain);
        folderMain.add(terrainParams, 'amplitude', 0, 50, 0.5).name('起伏幅度').onChange(rebuildTerrain);
        folderMain.open();

        const folderLod = gui.addFolder('LOD 距离阈值');
        folderLod.add(terrainParams.lodDistances, '0', 0, 50, 1).name('LOD 0 (<)').onChange(updateLodDistances);
        folderLod.add(terrainParams.lodDistances, '1', 10, 100, 1).name('LOD 1 (<)').onChange(updateLodDistances);
        folderLod.add(terrainParams.lodDistances, '2', 20, 150, 5).name('LOD 2 (<)').onChange(updateLodDistances);
        folderLod.add(terrainParams.lodDistances, '3', 50, 250, 5).name('LOD 3 (<)').onChange(updateLodDistances);
        folderLod.open();

        // 重建整个地形 (参数变化时调用)
        function rebuildTerrain() {
            LOD_LEVELS.forEach((level, index) => {
                // 更新几何体
                const newGeo = buildTerrainGeometry(level.segments);
                lodMeshes[index].geometry.dispose();
                lodMeshes[index].geometry = newGeo;
            });
        }

        // 更新 LOD 距离阈值
        function updateLodDistances() {
            // 确保数组有序
            terrainParams.lodDistances.sort((a, b) => a - b);
        }

        // ================================================================
        // LOD 切换逻辑
        // ================================================================
        function updateLod() {
            const target = controls.target;  // 地形中心点
            const dist = camera.position.distanceTo(target);
            const distances = terrainParams.lodDistances;

            // 根据距离选择 LOD 级别
            let newLodIndex = 0;
            for (let i = distances.length - 1; i >= 0; i--) {
                if (dist >= distances[i]) {
                    newLodIndex = i;
                    break;
                }
            }
            newLodIndex = Math.min(newLodIndex, LOD_LEVELS.length - 1);

            activateLod(newLodIndex);

            // 更新 UI 信息
            const mesh = lodMeshes[currentLodIndex];
            const segs = mesh ? mesh.userData.segments : 0;
            const tris = segs * segs * 2;
            document.getElementById('lod-level').textContent = LOD_LEVELS[currentLodIndex]?.label ?? '-';
            document.getElementById('lod-level').style.color = LOD_LEVELS[currentLodIndex]?.color ?? '#00ffcc';
            document.getElementById('lod-segments').textContent = segs + ' x ' + segs;
            document.getElementById('tri-count').textContent = tris.toLocaleString();
            document.getElementById('cam-dist').textContent = dist.toFixed(1) + ' 单位';
        }

        // ================================================================
        // 窗口大小变化处理
        // ================================================================
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ================================================================
        // 动画循环
        // ================================================================
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            updateLod();
            renderer.render(scene, camera);
        }

        // 初始化: 选择最远 LOD
        activateLod(LOD_LEVELS.length - 1);
        animate();

        console.log('🌍 地形 LOD 示例已启动');