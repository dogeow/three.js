import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.esm.js';

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a05);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;

    // Main sphere with SSS skin material
    const sphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const skinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffccaa,
      roughness: 0.45,
      metalness: 0.0,
      transmission: 0.0,
      thickness: 1.5,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
      attenuationColor: new THREE.Color(0xffb899),
      attenuationDistance: 2.5,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xffaa88),
      // SSS key parameters
      subsurfaceScattering: 1.0,
      subsurfaceColor: new THREE.Color(0xff6644),
    });

    const sphere = new THREE.Mesh(sphereGeometry, skinMaterial);
    scene.add(sphere);

    // Orbiting point light (acts as the light source that penetrates skin)
    const pointLight = new THREE.PointLight(0xffddbb, 80, 20);
    pointLight.position.set(3, 2, 3);
    scene.add(pointLight);

    // Secondary fill light
    const fillLight = new THREE.PointLight(0x8899ff, 10, 20);
    fillLight.position.set(-4, -1, -3);
    scene.add(fillLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x221108, 3);
    scene.add(ambientLight);

    // Subtle rim light from behind
    const rimLight = new THREE.PointLight(0xff7744, 30, 15);
    rimLight.position.set(-2, 1, -4);
    scene.add(rimLight);

    // Small spheres to visualize light positions
    const lightSphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const mainLightVis = new THREE.Mesh(lightSphereGeo, new THREE.MeshBasicMaterial({ color: 0xffddbb }));
    mainLightVis.position.copy(pointLight.position);
    scene.add(mainLightVis);

    const rimLightVis = new THREE.Mesh(lightSphereGeo, new THREE.MeshBasicMaterial({ color: 0xff7744 }));
    rimLightVis.position.copy(rimLight.position);
    scene.add(rimLightVis);

    // GUI
    const gui = new GUI({ title: 'SSS Skin Controls' });

    const params = {
      scatterColor: '#ff6644',
      thickness: 1.5,
      roughness: 0.45,
      metalness: 0.0,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
      attenuationColor: '#ffb899',
      attenuationDistance: 2.5,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: '#ffaa88',
      lightIntensity: 80,
      rimIntensity: 30,
    };

    gui.addColor(params, 'scatterColor').name('Scatter Color').onChange(v => {
      skinMaterial.subsurfaceColor.set(v);
    });
    gui.add(params, 'thickness', 0.1, 5.0, 0.05).name('Thickness').onChange(v => {
      skinMaterial.thickness = v;
    });
    gui.add(params, 'roughness', 0.0, 1.0, 0.01).name('Roughness').onChange(v => {
      skinMaterial.roughness = v;
    });
    gui.add(params, 'metalness', 0.0, 1.0, 0.01).name('Metalness').onChange(v => {
      skinMaterial.metalness = v;
    });
    gui.add(params, 'clearcoat', 0.0, 1.0, 0.01).name('Clearcoat').onChange(v => {
      skinMaterial.clearcoat = v;
    });
    gui.add(params, 'clearcoatRoughness', 0.0, 1.0, 0.01).name('Clearcoat Roughness').onChange(v => {
      skinMaterial.clearcoatRoughness = v;
    });
    gui.addColor(params, 'attenuationColor').name('Attenuation Color').onChange(v => {
      skinMaterial.attenuationColor.set(v);
    });
    gui.add(params, 'attenuationDistance', 0.1, 5.0, 0.1).name('Attenuation Dist').onChange(v => {
      skinMaterial.attenuationDistance = v;
    });
    gui.add(params, 'sheen', 0.0, 1.0, 0.01).name('Sheen').onChange(v => {
      skinMaterial.sheen = v;
    });
    gui.add(params, 'sheenRoughness', 0.0, 1.0, 0.01).name('Sheen Roughness').onChange(v => {
      skinMaterial.sheenRoughness = v;
    });
    gui.addColor(params, 'sheenColor').name('Sheen Color').onChange(v => {
      skinMaterial.sheenColor.set(v);
    });
    gui.add(params, 'lightIntensity', 0, 200, 1).name('Light Intensity').onChange(v => {
      pointLight.intensity = v;
    });
    gui.add(params, 'rimIntensity', 0, 100, 1).name('Rim Light Intensity').onChange(v => {
      rimLight.intensity = v;
    });

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Slowly orbit the point light for dramatic SSS effect
      pointLight.position.x = Math.sin(t * 0.3) * 4;
      pointLight.position.y = Math.sin(t * 0.2) * 2 + 1;
      pointLight.position.z = Math.cos(t * 0.3) * 4;
      mainLightVis.position.copy(pointLight.position);

      controls.update();
      renderer.render(scene, camera);
    }
    animate();