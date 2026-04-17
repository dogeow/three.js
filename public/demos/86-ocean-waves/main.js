import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 10000);
    camera.position.set(60, 30, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 10;
    controls.maxDistance = 500;

    // ─── Lighting ────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffcc88, 2.0);
    sunLight.position.set(100, 80, -200);
    scene.add(sunLight);

    // ─── Sky Gradient ────────────────────────────────────────────────────────
    function createSky() {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);

      // Dusk/dawn: deep blue top, orange/pink at horizon
      gradient.addColorStop(0.0, '#0a1628');
      gradient.addColorStop(0.3, '#1a3a5c');
      gradient.addColorStop(0.5, '#2a6a8a');
      gradient.addColorStop(0.65, '#5a9ab8');
      gradient.addColorStop(0.75, '#c4714a');
      gradient.addColorStop(0.82, '#e8a87c');
      gradient.addColorStop(0.88, '#f0c090');
      gradient.addColorStop(1.0, '#f5d0a0');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 512);

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.LinearFilter;

      const skyGeo = new THREE.SphereGeometry(4000, 32, 32);
      const skyMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        fog: false,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      scene.add(sky);
      return sky;
    }
    const sky = createSky();

    // ─── Ocean Shader ────────────────────────────────────────────────────────
    const oceanVertexShader = `
      #define PI 3.14159265359

      uniform float uTime;
      uniform float uWaveHeight;
      uniform float uWaveSpeed;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vViewDir;
      varying float vHeight;
      varying float vFoamFactor;

      // Gerstner wave function
      vec3 gerstnerWave(vec2 pos, vec2 dir, float steepness, float wavelength, float time) {
        float k = 2.0 * PI / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(dir);
        float f = k * (dot(d, pos) - c * time);
        float a = steepness / k;

        return vec3(
          d.x * (a * cos(f)),
          a * sin(f),
          d.y * (a * cos(f))
        );
      }

      // Compute partial derivatives for normal
      vec3 gerstnerWaveDeriv(vec2 pos, vec2 dir, float steepness, float wavelength, float time) {
        float k = 2.0 * PI / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(dir);
        float f = k * (dot(d, pos) - c * time);
        float a = steepness / k;
        float s = steepness;

        // Partial derivatives
        float dx = d.x * s * sin(f);
        float dz = d.y * s * sin(f);
        float dy = a * k * cos(f);

        return vec3(dx, dy, dz);
      }

      vec3 getWaveDisplacement(vec2 pos) {
        float time = uTime * uWaveSpeed;
        vec3 total = vec3(0.0);
        total += gerstnerWave(pos, vec2(1.0, 0.0), 0.15 * uWaveHeight, 60.0, time);
        total += gerstnerWave(pos, vec2(0.0, 1.0), 0.15 * uWaveHeight, 31.0, time);
        total += gerstnerWave(pos, normalize(vec2(1.0, 1.0)), 0.1 * uWaveHeight, 18.0, time);
        total += gerstnerWave(pos, normalize(vec2(-1.0, 0.7)), 0.08 * uWaveHeight, 12.0, time);
        total += gerstnerWave(pos, normalize(vec2(0.5, -1.0)), 0.05 * uWaveHeight, 8.0, time);
        total += gerstnerWave(pos, normalize(vec2(-0.7, -0.5)), 0.03 * uWaveHeight, 5.0, time);
        return total;
      }

      vec3 getWaveNormal(vec2 pos) {
        float time = uTime * uWaveSpeed;
        vec3 totalDeriv = vec3(0.0);
        totalDeriv += gerstnerWaveDeriv(pos, vec2(1.0, 0.0), 0.15 * uWaveHeight, 60.0, time);
        totalDeriv += gerstnerWaveDeriv(pos, vec2(0.0, 1.0), 0.15 * uWaveHeight, 31.0, time);
        totalDeriv += gerstnerWaveDeriv(pos, normalize(vec2(1.0, 1.0)), 0.1 * uWaveHeight, 18.0, time);
        totalDeriv += gerstnerWaveDeriv(pos, normalize(vec2(-1.0, 0.7)), 0.08 * uWaveHeight, 12.0, time);
        totalDeriv += gerstnerWaveDeriv(pos, normalize(vec2(0.5, -1.0)), 0.05 * uWaveHeight, 8.0, time);
        totalDeriv += gerstnerWaveDeriv(pos, normalize(vec2(-0.7, -0.5)), 0.03 * uWaveHeight, 5.0, time);

        float dHdx = totalDeriv.x;
        float dHdz = totalDeriv.z;
        return normalize(vec3(-dHdx, 1.0, -dHdz));
      }

      void main() {
        vec2 pos = position.xz;
        vec3 disp = getWaveDisplacement(pos);
        vec3 newPos = position + disp;

        vHeight = disp.y;
        vNormal = getWaveNormal(pos);
        vUv = uv;
        vWorldPosition = (modelMatrix * vec4(newPos, 1.0)).xyz;
        vViewDir = cameraPosition - vWorldPosition;

        // Foam factor
        vFoamFactor = smoothstep(0.3, 1.5, vHeight);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `;

    const oceanFragmentShader = `
      uniform vec3 uSunDirection;
      uniform float uFresnelStrength;
      uniform float uFoamThreshold;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uTime;
      uniform float uWaveHeight;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vViewDir;
      varying float vHeight;
      varying float vFoamFactor;

      // Simplex noise for foam detail
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);

        // Fresnel effect
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
        fresnel = mix(0.02, 1.0, fresnel * uFresnelStrength + (1.0 - uFresnelStrength) * 0.02);

        // Water color based on depth/height
        float heightFactor = clamp(vHeight * 0.3 + 0.5, 0.0, 1.0);
        vec3 waterColor = mix(uDeepColor, uShallowColor, heightFactor);

        // Subsurface scattering approximation
        float scatter = pow(max(dot(viewDir, -normal), 0.0), 3.0) * 0.3;
        waterColor += uShallowColor * scatter;

        // Sky reflection (dusk gradient)
        float skyY = clamp(viewDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 horizonColor = vec3(0.85, 0.55, 0.3);
        vec3 zenithColor = vec3(0.08, 0.15, 0.35);
        vec3 skyReflection = mix(horizonColor, zenithColor, skyY);

        // Sun glow in reflection
        vec3 sunDir = normalize(uSunDirection);
        float sunDot = max(dot(reflect(-viewDir, normal), sunDir), 0.0);
        float sunGlow = pow(sunDot, 64.0) * 2.0;
        vec3 sunColor = vec3(1.0, 0.85, 0.5);

        // Blend water and reflection
        vec3 color = mix(waterColor, skyReflection, fresnel);
        color += sunGlow * sunColor;

        // Specular highlight
        vec3 halfVec = normalize(sunDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), 256.0);
        color += spec * sunColor * 1.5;

        // Secondary specular (broader)
        float spec2 = pow(max(dot(normal, halfVec), 0.0), 32.0);
        color += spec2 * sunColor * 0.3;

        // Foam on wave peaks with noise detail
        float foamNoise = snoise(vWorldPosition.xz * 0.5 + uTime * 0.5) * 0.5 + 0.5;
        foamNoise += snoise(vWorldPosition.xz * 2.0 - uTime * 0.3) * 0.25;
        float foamMask = smoothstep(uFoamThreshold, uFoamThreshold + 0.4, vHeight + foamNoise * 0.3);
        foamMask = clamp(foamMask + vFoamFactor * 0.5, 0.0, 1.0);

        vec3 foamColor = vec3(0.95, 0.97, 1.0);
        float foamIntensity = smoothstep(0.0, 0.6, foamMask);
        color = mix(color, foamColor, foamIntensity * 0.7);

        // Edge foam (wave crests)
        float edgeFoam = smoothstep(0.8, 1.2, vHeight) * foamNoise;
        color = mix(color, vec3(1.0), edgeFoam * 0.5);

        // Atmospheric fog
        float dist = length(vWorldPosition - cameraPosition);
        float fogFactor = 1.0 - exp(-dist * 0.0015);
        vec3 fogColor = mix(zenithColor, horizonColor, 0.5);
        color = mix(color, fogColor, fogFactor * 0.4);

        // Alpha: more opaque at peaks, transparent in troughs
        float alpha = mix(0.85, 0.97, heightFactor);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // ─── Ocean Mesh ───────────────────────────────────────────────────────────
    const oceanGeometry = new THREE.PlaneGeometry(500, 500, 256, 256);
    oceanGeometry.rotateX(-Math.PI / 2);

    const oceanUniforms = {
      uTime: { value: 0 },
      uWaveHeight: { value: 1.0 },
      uWaveSpeed: { value: 1.0 },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.3, -0.8).normalize() },
      uFresnelStrength: { value: 0.5 },
      uFoamThreshold: { value: 0.3 },
      uDeepColor: { value: new THREE.Color(0.0, 0.05, 0.12) },
      uShallowColor: { value: new THREE.Color(0.0, 0.18, 0.28) },
    };

    const oceanMaterial = new THREE.ShaderMaterial({
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      uniforms: oceanUniforms,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    scene.add(ocean);

    // ─── CPU-side Wave Function (for floating objects) ────────────────────────
    function gerstnerY(x, z, time, waveHeight) {
      const wh = waveHeight;
      let y = 0;
      y += 0.15 * wh * Math.sin((x * 0.05 - time * 0.4));
      y += 0.15 * wh * Math.sin((z * 0.05 - time * 0.4));
      y += 0.10 * wh * Math.sin((x * 0.08 + z * 0.08 - time * 0.8));
      y += 0.08 * wh * Math.sin((x * 0.12 - z * 0.08 - time * 1.2));
      y += 0.05 * wh * Math.sin((z * 0.15 + x * 0.05 - time * 1.8));
      y += 0.03 * wh * Math.sin((x * 0.2 - z * 0.15 - time * 2.2));
      return y;
    }

    function getWaveHeight(x, z, time, waveHeight) {
      return gerstnerY(x, z, time * 1.0, waveHeight);
    }

    function getWaveNormal(x, z, time, waveHeight) {
      const eps = 0.5;
      const hL = getWaveHeight(x - eps, z, time, waveHeight);
      const hR = getWaveHeight(x + eps, z, time, waveHeight);
      const hD = getWaveHeight(x, z - eps, time, waveHeight);
      const hU = getWaveHeight(x, z + eps, time, waveHeight);
      return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
    }

    // ─── Buoys ───────────────────────────────────────────────────────────────
    const buoyData = [];
    const buoyColors = [0xff3333, 0xffaa00, 0xffffff, 0x33aaff, 0x00cc66, 0xff66aa, 0x88ff44, 0xcc88ff];

    function createBuoy(x, z, colorIdx) {
      const group = new THREE.Group();

      // Main body (cylinder)
      const bodyGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.8, 12);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: buoyColors[colorIdx % buoyColors.length],
        emissive: buoyColors[colorIdx % buoyColors.length],
        emissiveIntensity: 0.1,
        shininess: 80,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9;
      group.add(body);

      // White stripe
      const stripeGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.3, 12);
      const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 0.9;
      group.add(stripe);

      // Top light
      const topGeo = new THREE.SphereGeometry(0.25, 12, 12);
      const topMat = new THREE.MeshPhongMaterial({
        color: 0xffff88,
        emissive: 0xffff44,
        emissiveIntensity: 0.5,
        shininess: 120,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 1.85;
      group.add(top);

      group.position.set(x, 0, z);
      scene.add(group);

      return { group, x, z };
    }

    const buoyPositions = [
      [-20, -15], [15, -20], [-10, 25], [30, 10],
      [-35, 5], [20, -35], [5, 40], [-25, 30],
    ];
    buoyPositions.forEach(([x, z], i) => {
      buoyData.push(createBuoy(x, z, i));
    });

    // ─── Boat / Ship ─────────────────────────────────────────────────────────
    function createBoat() {
      const boat = new THREE.Group();

      // Hull
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-3, 0);
      hullShape.lineTo(-2.5, -1.5);
      hullShape.lineTo(2.5, -1.5);
      hullShape.lineTo(3, 0);
      hullShape.closePath();

      const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
        depth: 1.5,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.2,
        bevelSegments: 3,
      });
      hullGeo.rotateX(Math.PI / 2);
      hullGeo.translate(0, 0, -0.75);

      const hullMat = new THREE.MeshPhongMaterial({
        color: 0x8B4513,
        shininess: 30,
      });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      boat.add(hull);

      // Deck
      const deckGeo = new THREE.BoxGeometry(5.5, 0.15, 1.2);
      const deckMat = new THREE.MeshPhongMaterial({ color: 0xA0522D, shininess: 20 });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.position.set(0, 0.08, 0);
      boat.add(deck);

      // Cabin
      const cabinGeo = new THREE.BoxGeometry(2, 1.2, 1.0);
      const cabinMat = new THREE.MeshPhongMaterial({ color: 0xDEB887, shininess: 20 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0.5, 0.7, 0);
      boat.add(cabin);

      // Cabin roof
      const roofGeo = new THREE.BoxGeometry(2.2, 0.1, 1.1);
      const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B0000, shininess: 40 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0.5, 1.35, 0);
      boat.add(roof);

      // Mast
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 4, 8);
      const mastMat = new THREE.MeshPhongMaterial({ color: 0x5C4033 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(-0.5, 2.1, 0);
      boat.add(mast);

      // Sail
      const sailGeo = new THREE.PlaneGeometry(2.5, 3);
      const sailMat = new THREE.MeshPhongMaterial({
        color: 0xf5f5f5,
        side: THREE.DoubleSide,
        shininess: 10,
      });
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(-0.5, 3.5, 0);
      sail.rotation.y = Math.PI / 6;
      boat.add(sail);

      // Flag pole
      const flagPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
      const flagPole = new THREE.Mesh(flagPoleGeo, mastMat);
      flagPole.position.set(-0.5, 4.4, 0);
      boat.add(flagPole);

      // Flag
      const flagGeo = new THREE.PlaneGeometry(0.5, 0.3);
      const flagMat = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(-0.5, 4.65, 0.25);
      boat.add(flag);

      boat.position.set(0, 0, 0);
      scene.add(boat);
      return boat;
    }

    const boat = createBoat();

    // ─── GUI ──────────────────────────────────────────────────────────────────
    const params = {
      waveHeight: 1.0,
      waveSpeed: 1.0,
      foamThreshold: 0.3,
      fresnelStrength: 0.5,
      waterColor: 'deep',
      sunElevation: 25,
      sunAzimuth: 200,
      showBuoys: true,
      showBoat: true,
    };

    const colorMap = {
      deep: { deep: new THREE.Color(0.0, 0.05, 0.12), shallow: new THREE.Color(0.0, 0.18, 0.28) },
      blue: { deep: new THREE.Color(0.0, 0.08, 0.2), shallow: new THREE.Color(0.0, 0.3, 0.45) },
      green: { deep: new THREE.Color(0.0, 0.1, 0.08), shallow: new THREE.Color(0.05, 0.25, 0.15) },
      tropical: { deep: new THREE.Color(0.0, 0.12, 0.25), shallow: new THREE.Color(0.0, 0.45, 0.4) },
    };

    function updateSun() {
      const el = params.sunElevation * Math.PI / 180;
      const az = params.sunAzimuth * Math.PI / 180;
      const dir = new THREE.Vector3(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        Math.cos(az) * Math.cos(el)
      ).normalize();

      oceanUniforms.uSunDirection.value.copy(dir);
      sunLight.position.set(dir.x * 200, dir.y * 200, dir.z * 200);
      sunLight.color.setHSL(0.08, 0.7, Math.max(0.3, dir.y * 0.5 + 0.3));

      // Update sky colors based on sun position
      const t = Math.max(0, dir.y);
      if (t < 0.1) {
        // Sunset/sunrise
        ambientLight.color.setHSL(0.58, 0.3, 0.15);
        ambientLight.intensity = 0.3;
      } else {
        ambientLight.color.setHSL(0.58, 0.3, 0.3 + t * 0.2);
        ambientLight.intensity = 0.4;
      }
    }

    const gui = new GUI({ title: 'Ocean Controls' });
    gui.add(params, 'waveHeight', 0.5, 3.0).name('Wave Height').onChange(v => {
      oceanUniforms.uWaveHeight.value = v;
    });
    gui.add(params, 'waveSpeed', 0.1, 2.0).name('Wave Speed').onChange(v => {
      oceanUniforms.uWaveSpeed.value = v;
    });
    gui.add(params, 'foamThreshold', 0.2, 0.8).name('Foam Threshold').onChange(v => {
      oceanUniforms.uFoamThreshold.value = v;
    });
    gui.add(params, 'fresnelStrength', 0.1, 0.8).name('Fresnel Strength').onChange(v => {
      oceanUniforms.uFresnelStrength.value = v;
    });
    gui.add(params, 'waterColor', ['deep', 'blue', 'green', 'tropical']).name('Water Color').onChange(v => {
      const c = colorMap[v];
      oceanUniforms.uDeepColor.value.copy(c.deep);
      oceanUniforms.uShallowColor.value.copy(c.shallow);
    });
    gui.add(params, 'sunElevation', 0, 90).name('Sun Elevation').onChange(updateSun);
    gui.add(params, 'sunAzimuth', 0, 360).name('Sun Azimuth').onChange(updateSun);
    gui.add(params, 'showBuoys').name('Show Buoys').onChange(v => {
      buoyData.forEach(b => b.group.visible = v);
    });
    gui.add(params, 'showBoat').name('Show Boat').onChange(v => {
      boat.visible = v;
    });

    updateSun();

    // ─── Floating Objects Update ─────────────────────────────────────────────
    function updateFloatingObjects(time) {
      // Update buoys
      buoyData.forEach(buoy => {
        const y = getWaveHeight(buoy.x, buoy.z, time, params.waveHeight);
        buoy.group.position.y = y + 0.2;

        const normal = getWaveNormal(buoy.x, buoy.z, time, params.waveHeight);
        const up = new THREE.Vector3(0, 1, 0);
        buoy.group.quaternion.setFromUnitVectors(up, normal);

        // Gentle rocking
        buoy.group.rotation.y += Math.sin(time * 0.5 + buoy.x * 0.1) * 0.005;
      });

      // Update boat
      const boatX = 0, boatZ = 0;
      const boatY = getWaveHeight(boatX, boatZ, time, params.waveHeight);
      boat.position.y = boatY + 0.1;

      const boatNormal = getWaveNormal(boatX, boatZ, time, params.waveHeight);
      const boatUp = new THREE.Vector3(0, 1, 0);
      boat.quaternion.setFromUnitVectors(boatUp, boatNormal);

      // Subtle yaw rocking
      boat.rotation.y += Math.sin(time * 0.3) * 0.003;
    }

    // ─── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─── Animation Loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      oceanUniforms.uTime.value = elapsed;

      updateFloatingObjects(elapsed);

      // Slowly rotate sky to match... or keep static
      controls.update();
      renderer.render(scene, camera);
    }

    animate();