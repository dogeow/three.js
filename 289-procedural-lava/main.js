import * as THREE from 'three';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ============ Configuration ============
    const config = {
      particleCount: 8000,
      flowSpeed: 1.2,
      turbulence: 0.6,
      spawnRate: 150,
      baseTemperature: 0.7,
      maxTemperature: 1.0,
      minTemperature: 0.2
    };

    // ============ Scene Setup ============
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0000);
    scene.fog = new THREE.FogExp2(0x1a0500, 0.015);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // ============ Terrain Path ============
    const terrainWidth = 50;
    const terrainDepth = 80;
    const terrainSegments = 64;

    function getTerrainHeight(x, z) {
      const nx = x / terrainWidth;
      const nz = (z + terrainDepth / 2) / terrainDepth;
      const channelWidth = 0.3 + 0.2 * Math.sin(nz * Math.PI * 2);
      const centerOffset = 3 * Math.sin(nz * Math.PI * 1.5);
      const channel = Math.max(0, 1 - Math.abs(nx - 0.5 - centerOffset / terrainWidth) / channelWidth);
      const depth = channel * 8 * (1 - nz * 0.3);
      return -depth;
    }

    // Create terrain geometry
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);
    const positions = terrainGeo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i + 1] = getTerrainHeight(x, z);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00,
      roughness: 0.95,
      metalness: 0.1
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // ============ Lava Particle System ============
    const lavaGeo = new THREE.SphereGeometry(0.15, 6, 4);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });

    const instancedLava = new THREE.InstancedMesh(lavaGeo, lavaMat, config.particleCount);
    instancedLava.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedLava);

    // Particle data
    const particleData = [];
    const dummy = new THREE.Object3D();
    const colorAttr = new Float32Array(config.particleCount * 3);
    const colorObj = new THREE.Color();

    // Temperature color gradient
    function getTemperatureColor(temp, target) {
      // temp: 0.0 = dark red, 0.33 = orange, 0.66 = yellow, 1.0 = white hot
      if (temp < 0.25) {
        colorObj.setRGB(0.3 + temp * 0.4, 0.0, 0.0);
      } else if (temp < 0.5) {
        const t = (temp - 0.25) / 0.25;
        colorObj.setRGB(0.4 + t * 0.5, 0.05 + t * 0.2, 0.0);
      } else if (temp < 0.75) {
        const t = (temp - 0.5) / 0.25;
        colorObj.setRGB(0.9, 0.25 + t * 0.5, 0.0);
      } else {
        const t = (temp - 0.75) / 0.25;
        colorObj.setRGB(1.0, 0.75 + t * 0.25, t * 0.5);
      }
      target.setRGB(colorObj.r, colorObj.g, colorObj.b);
    }

    // Initialize particles
    function initParticle(i) {
      const spawnX = (Math.random() - 0.5) * terrainWidth * 0.8;
      const spawnZ = terrainDepth * 0.4 + Math.random() * 5;
      const terrainY = getTerrainHeight(spawnX, spawnZ);
      
      particleData[i] = {
        position: new THREE.Vector3(spawnX, terrainY + 1 + Math.random() * 2, spawnZ),
        velocity: new THREE.Vector3(0, 0, 0),
        temperature: config.baseTemperature + Math.random() * 0.3,
        life: 1.0,
        turbulenceOffset: Math.random() * Math.PI * 2
      };
    }

    for (let i = 0; i < config.particleCount; i++) {
      initParticle(i);
      particleData[i].position.z = Math.random() * terrainDepth - terrainDepth / 2;
      particleData[i].life = Math.random();
    }

    // ============ Point Lights ============
    const lavaLights = [];
    const numLights = 5;
    for (let i = 0; i < numLights; i++) {
      const light = new THREE.PointLight(0xff4400, 2, 30);
      light.position.set(
        (Math.random() - 0.5) * 30,
        5,
        (Math.random() - 0.5) * 40
      );
      scene.add(light);
      lavaLights.push({
        light,
        baseIntensity: 1.5 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        zOffset: (i / numLights) * terrainDepth - terrainDepth / 2
      });
    }

    const ambientLight = new THREE.AmbientLight(0x220500, 0.5);
    scene.add(ambientLight);

    // ============ Heat Distortion Post-Processing ============
    const heatDistortionShader = {
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        distortionStrength: { value: 0.003 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float distortionStrength;
        varying vec2 vUv;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        void main() {
          vec2 distortedUv = vUv;
          float distortion = sin(vUv.y * 50.0 + time * 2.0) * distortionStrength;
          distortion += (random(vUv + time * 0.1) - 0.5) * distortionStrength * 0.5;
          distortedUv.x += distortion * (1.0 - vUv.y);
          
          vec4 color = texture2D(tDiffuse, distortedUv);
          
          // Add subtle heat shimmer to bright areas
          float brightness = (color.r + color.g + color.b) / 3.0;
          if (brightness > 0.3) {
            color.rgb += vec3(0.1, 0.03, 0.0) * brightness * distortion * 50.0;
          }
          
          gl_FragColor = color;
        }
      `
    };

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const heatPass = new ShaderPass(heatDistortionShader);
    composer.addPass(heatPass);

    // ============ GUI ============
    const gui = new GUI();
    gui.add(config, 'flowSpeed', 0.1, 3.0).name('Flow Speed');
    gui.add(config, 'turbulence', 0.0, 2.0).name('Turbulence');
    gui.add(config, 'spawnRate', 10, 300).name('Spawn Rate');
    gui.add(config, 'baseTemperature', 0.1, 1.0).name('Base Temperature');
    gui.add(config, 'maxTemperature', 0.5, 1.0).name('Max Temperature');
    gui.add(config, 'minTemperature', 0.0, 0.5).name('Min Temperature');
    gui.add(heatPass.uniforms, 'distortionStrength', 0, 0.01).name('Heat Distortion');

    // ============ Animation ============
    let lastTime = 0;
    let frameCount = 0;
    let fpsTime = 0;
    let spawnAccumulator = 0;

    function updateParticles(deltaTime) {
      const gravity = -15;
      const drag = 0.98;
      const time = performance.now() * 0.001;

      for (let i = 0; i < config.particleCount; i++) {
        const p = particleData[i];
        
        // Update life
        p.life -= deltaTime * 0.15;
        
        if (p.life <= 0) {
          // Respawn at top
          const spawnX = (Math.random() - 0.5) * terrainWidth * 0.6;
          const spawnZ = terrainDepth * 0.35 + Math.random() * 3;
          const terrainY = getTerrainHeight(spawnX, spawnZ);
          
          p.position.set(spawnX, terrainY + 2 + Math.random() * 3, spawnZ);
          p.velocity.set(0, 0, 0);
          p.temperature = config.baseTemperature + Math.random() * 0.2;
          p.life = 1.0;
          p.turbulenceOffset = Math.random() * Math.PI * 2;
        }
        
        // Get terrain height at current position
        const terrainY = getTerrainHeight(p.position.x, p.position.z);
        
        // Flow direction (downhill along terrain)
        const sampleDist = 0.5;
        const hLeft = getTerrainHeight(p.position.x - sampleDist, p.position.z);
        const hRight = getTerrainHeight(p.position.x + sampleDist, p.position.z);
        const hBack = getTerrainHeight(p.position.x, p.position.z - sampleDist);
        const hFront = getTerrainHeight(p.position.x, p.position.z + sampleDist);
        
        const flowDirX = (hRight - hLeft) * 10;
        const flowDirZ = (hBack - hFront) * 10;
        
        // Apply flow force
        const flowStrength = config.flowSpeed * 20;
        p.velocity.x += flowDirX * flowStrength * deltaTime;
        p.velocity.z += flowDirZ * flowStrength * deltaTime;
        p.velocity.z -= config.flowSpeed * 8 * deltaTime; // General downhill flow
        
        // Apply turbulence
        const turbFreq = 3.0;
        const turbAmp = config.turbulence * 5;
        p.velocity.x += Math.sin(time * turbFreq + p.turbulenceOffset) * turbAmp * deltaTime;
        p.velocity.x += Math.cos(time * turbFreq * 1.3 + p.turbulenceOffset) * turbAmp * 0.5 * deltaTime;
        
        // Gravity
        if (p.position.y > terrainY + 0.1) {
          p.velocity.y += gravity * deltaTime;
        } else {
          p.position.y = terrainY + 0.1 + Math.random() * 0.05;
          p.velocity.y *= -0.2;
        }
        
        // Drag
        p.velocity.multiplyScalar(drag);
        
        // Update position
        p.position.addScaledVector(p.velocity, deltaTime);
        
        // Constrain to terrain bounds
        p.position.x = Math.max(-terrainWidth / 2, Math.min(terrainWidth / 2, p.position.x));
        p.position.z = Math.max(-terrainDepth / 2, Math.min(terrainDepth / 2, p.position.z));
        
        // Cool down over time
        p.temperature -= deltaTime * 0.05;
        p.temperature = Math.max(p.temperature, config.minTemperature);
        
        // Update instance matrix
        dummy.position.copy(p.position);
        dummy.scale.setScalar(0.8 + p.temperature * 0.6);
        dummy.updateMatrix();
        instancedLava.setMatrixAt(i, dummy.matrix);
        
        // Update color
        getTemperatureColor(p.temperature, colorObj);
        colorAttr[i * 3] = colorObj.r;
        colorAttr[i * 3 + 1] = colorObj.g;
        colorAttr[i * 3 + 2] = colorObj.b;
      }
      
      instancedLava.instanceMatrix.needsUpdate = true;
      instancedLava.instanceColor = new THREE.InstancedBufferAttribute(colorAttr, 3);
    }

    function updateLights(time) {
      let totalDensity = 0;
      
      for (let i = 0; i < config.particleCount; i++) {
        if (particleData[i].temperature > 0.6) {
          totalDensity += particleData[i].temperature;
        }
      }
      
      const avgDensity = totalDensity / config.particleCount;
      
      for (let i = 0; i < lavaLights.length; i++) {
        const l = lavaLights[i];
        const flicker = Math.sin(time * 10 + l.phase) * 0.3 + 0.7;
        const flicker2 = Math.sin(time * 23 + l.phase * 2) * 0.2;
        l.light.intensity = l.baseIntensity * flicker + flicker2 + avgDensity * 3;
        
        // Move lights along flow
        l.light.position.z = l.zOffset + Math.sin(time * 0.5) * 5;
        l.light.position.x = Math.sin(time * 0.3 + i) * 15;
        
        // Color based on density
        const heat = Math.min(1.0, avgDensity * 2);
        l.light.color.setRGB(1.0, 0.3 + heat * 0.4, heat * 0.1);
      }
    }

    function animate(currentTime) {
      requestAnimationFrame(animate);
      
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      
      // FPS counter
      frameCount++;
      if (currentTime - fpsTime >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        document.getElementById('particleCount').textContent = config.particleCount;
        frameCount = 0;
        fpsTime = currentTime;
      }
      
      const time = currentTime * 0.001;
      heatPass.uniforms.time.value = time;
      
      updateParticles(deltaTime);
      updateLights(time);
      
      // Slowly rotate camera
      const camRadius = 50;
      camera.position.x = Math.sin(time * 0.1) * camRadius * 0.5;
      camera.position.z = Math.cos(time * 0.1) * camRadius;
      camera.lookAt(0, 0, 0);
      
      composer.render();
    }

    // ============ Resize Handler ============
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start animation
    animate(0);