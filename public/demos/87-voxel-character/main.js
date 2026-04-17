import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Renderer ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // ─── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 60, 140);

    // ─── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 28, 45);

    // ─── Controls ──────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 8;
    controls.minDistance = 20;
    controls.maxDistance = 100;

    // ─── Lights ───────────────────────────────────────────────────────────────
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0x88aacc, 0.6);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x5a9e4a, 0.4);
    scene.add(hemi);

    // ─── Ground ────────────────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(200, 200, 80, 80);
    // Slight height variation for visual interest
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const h = Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.4 +
                Math.sin(x * 0.4 + y * 0.3) * 0.15;
      posAttr.setZ(i, h);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a9e4a,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dirt layer under grass
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 1 });
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 200), dirtMat);
    dirt.position.y = -1.2;
    dirt.receiveShadow = true;
    scene.add(dirt);

    // ─── Voxel Tree ───────────────────────────────────────────────────────────
    function createTree(x, z) {
      const group = new THREE.Group();

      // Trunk
      const trunkGeo = new THREE.BoxGeometry(1.2, 6, 1.2);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3;
      trunk.castShadow = true;
      group.add(trunk);

      // Foliage layers
      const leafColors = [0x2D6A2F, 0x3A8A3F, 0x4CAF50];
      const sizes = [5.5, 4.5, 3.5];
      const ys = [6.5, 9.5, 12];

      sizes.forEach((s, i) => {
        const leafGeo = new THREE.BoxGeometry(s, 3.5, s);
        const leafMat = new THREE.MeshStandardMaterial({
          color: leafColors[i],
          roughness: 0.85,
          flatShading: true,
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = ys[i];
        leaf.castShadow = true;
        group.add(leaf);
      });

      // Small top
      const topGeo = new THREE.BoxGeometry(2, 2.5, 2);
      const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: 0x3A8A3F, roughness: 0.85 }));
      top.position.y = 14.5;
      top.castShadow = true;
      group.add(top);

      group.position.set(x, 0, z);
      group.rotation.y = Math.random() * Math.PI * 2;
      return group;
    }

    // Scatter trees
    const treePositions = [
      [-18, -12], [15, -18], [-20, 8], [22, 5],
      [-10, 20], [18, 15], [-25, -5], [25, -8],
      [-8, -22], [12, 22], [-22, 18], [20, -22],
      [-15, -18], [14, 14], [-30, 10], [28, -15],
      [-12, 25], [10, -25], [-35, -10], [32, 12],
    ];
    treePositions.forEach(([x, z]) => {
      const t = createTree(x, z);
      scene.add(t);
    });

    // ─── Voxel Character ───────────────────────────────────────────────────────
    class VoxelCharacter {
      constructor() {
        this.group = new THREE.Group();
        this.group.position.set(0, 0, 0);

        // Body part dimensions (1 voxel = 1 unit)
        this.bodyColor = 0x3366dd;
        this.skinColor = 0xffcc99;
        this.pantsColor = 0x334466;
        this.bootColor = 0x5a3a1a;
        this.hairColor = 0x5a3010;
        this.eyeColor = 0x111111;

        // Animation state
        this.walkPhase = 0;
        this.isWalking = false;
        this.jumpPhase = 0;
        this.isJumping = false;
        this.crouchPhase = 0;
        this.isCrouching = false;

        // Position & movement
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.speed = 0;
        this.targetRotation = 0;

        // Idle breath
        this.idleTime = 0;

        // Dummy for matrix calculations
        this._dummy = new THREE.Object3D();

        this._buildParts();
      }

      _mat(color, roughness = 0.85) {
        return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
      }

      _buildParts() {
        // ── Head (8x8x8) ──
        const headGeo = new THREE.BoxGeometry(8, 8, 8);
        this.headMesh = new THREE.InstancedMesh(headGeo, this._mat(this.skinColor), 1);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Hair top (8x2x8 on top)
        const hairGeo = new THREE.BoxGeometry(8.2, 2.5, 8.2);
        this.hairMesh = new THREE.InstancedMesh(hairGeo, this._mat(this.hairColor), 1);
        this.hairMesh.castShadow = true;
        this.group.add(this.hairMesh);

        // Eyes (two small boxes)
        const eyeGeo = new THREE.BoxGeometry(1.5, 1.5, 0.5);
        this.leftEyeMesh = new THREE.InstancedMesh(eyeGeo, this._mat(this.eyeColor, 0.3), 1);
        this.rightEyeMesh = new THREE.InstancedMesh(eyeGeo, this._mat(this.eyeColor, 0.3), 1);
        this.group.add(this.leftEyeMesh);
        this.group.add(this.rightEyeMesh);

        // ── Torso (8x12x4) ──
        const torsoGeo = new THREE.BoxGeometry(8, 12, 4);
        this.torsoMesh = new THREE.InstancedMesh(torsoGeo, this._mat(this.bodyColor), 1);
        this.torsoMesh.castShadow = true;
        this.group.add(this.torsoMesh);

        // ── Arms (4x12x4 each) ──
        const armGeo = new THREE.BoxGeometry(4, 12, 4);

        const leftArmMat = this._mat(this.bodyColor);
        this.leftArm = new THREE.InstancedMesh(armGeo, leftArmMat, 1);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);

        // Left sleeve overlay (top part of arm)
        const sleeveGeo = new THREE.BoxGeometry(4.1, 5, 4.1);
        this.leftSleeve = new THREE.InstancedMesh(sleeveGeo, this._mat(this.bodyColor), 1);
        this.leftSleeve.castShadow = true;
        this.group.add(this.leftSleeve);

        const rightArmMat = this._mat(this.bodyColor);
        this.rightArm = new THREE.InstancedMesh(armGeo, rightArmMat, 1);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);

        const rightSleeveGeo = new THREE.BoxGeometry(4.1, 5, 4.1);
        this.rightSleeve = new THREE.InstancedMesh(rightSleeveGeo, this._mat(this.bodyColor), 1);
        this.rightSleeve.castShadow = true;
        this.group.add(this.rightSleeve);

        // Hands
        const handGeo = new THREE.BoxGeometry(4, 3, 3.5);
        this.leftHand = new THREE.InstancedMesh(handGeo, this._mat(this.skinColor), 1);
        this.leftHand.castShadow = true;
        this.group.add(this.leftHand);

        this.rightHand = new THREE.InstancedMesh(handGeo, this._mat(this.skinColor), 1);
        this.rightHand.castShadow = true;
        this.group.add(this.rightHand);

        // ── Legs (4x12x4 each) ──
        const legGeo = new THREE.BoxGeometry(4, 12, 4);
        const leftLegMat = this._mat(this.pantsColor);
        this.leftLeg = new THREE.InstancedMesh(legGeo, leftLegMat, 1);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);

        const rightLegMat = this._mat(this.pantsColor);
        this.rightLeg = new THREE.InstancedMesh(legGeo, rightLegMat, 1);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);

        // ── Feet (5x4x6 each) ──
        const footGeo = new THREE.BoxGeometry(5, 4, 6);
        const leftFootMat = this._mat(this.bootColor);
        this.leftFoot = new THREE.InstancedMesh(footGeo, leftFootMat, 1);
        this.leftFoot.castShadow = true;
        this.group.add(this.leftFoot);

        const rightFootMat = this._mat(this.bootColor);
        this.rightFoot = new THREE.InstancedMesh(footGeo, rightFootMat, 1);
        this.rightFoot.castShadow = true;
        this.group.add(this.rightFoot);

        this._initMatrices();
      }

      _initMatrices() {
        // Set initial rest-pose matrices
        const d = this._dummy;

        // Head rest
        d.position.set(0, 28, 0);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        this.headMesh.setMatrixAt(0, d.matrix);

        // Hair rest
        d.position.set(0, 31.2, 0);
        d.updateMatrix();
        this.hairMesh.setMatrixAt(0, d.matrix);

        // Eyes rest
        d.position.set(-2.2, 29, 4.1);
        d.updateMatrix();
        this.leftEyeMesh.setMatrixAt(0, d.matrix);
        d.position.set(2.2, 29, 4.1);
        d.updateMatrix();
        this.rightEyeMesh.setMatrixAt(0, d.matrix);

        // Torso rest
        d.position.set(0, 18, 0);
        d.updateMatrix();
        this.torsoMesh.setMatrixAt(0, d.matrix);

        // Arms rest (slightly away from torso)
        d.position.set(-6, 18, 0);
        d.updateMatrix();
        this.leftArm.setMatrixAt(0, d.matrix);

        d.position.set(6, 18, 0);
        d.updateMatrix();
        this.rightArm.setMatrixAt(0, d.matrix);

        // Sleeves
        d.position.set(-6, 20.5, 0);
        d.updateMatrix();
        this.leftSleeve.setMatrixAt(0, d.matrix);
        d.position.set(6, 20.5, 0);
        d.updateMatrix();
        this.rightSleeve.setMatrixAt(0, d.matrix);

        // Hands
        d.position.set(-6, 9, 0);
        d.updateMatrix();
        this.leftHand.setMatrixAt(0, d.matrix);
        d.position.set(6, 9, 0);
        d.updateMatrix();
        this.rightHand.setMatrixAt(0, d.matrix);

        // Legs rest
        d.position.set(-2.5, 6, 0);
        d.updateMatrix();
        this.leftLeg.setMatrixAt(0, d.matrix);
        d.position.set(2.5, 6, 0);
        d.updateMatrix();
        this.rightLeg.setMatrixAt(0, d.matrix);

        // Feet rest
        d.position.set(-2.5, 1, 1);
        d.updateMatrix();
        this.leftFoot.setMatrixAt(0, d.matrix);
        d.position.set(2.5, 1, 1);
        d.updateMatrix();
        this.rightFoot.setMatrixAt(0, d.matrix);

        this._markAllUpdate();
      }

      _markAllUpdate() {
        const meshes = [
          this.headMesh, this.hairMesh, this.leftEyeMesh, this.rightEyeMesh,
          this.torsoMesh, this.leftArm, this.rightArm,
          this.leftSleeve, this.rightSleeve,
          this.leftHand, this.rightHand,
          this.leftLeg, this.rightLeg,
          this.leftFoot, this.rightFoot,
        ];
        meshes.forEach(m => { if (m) m.instanceMatrix.needsUpdate = true; });
      }

      setColors(body, skin, pants, boots, hair) {
        const update = () => this._markAllUpdate();
        this.torsoMesh.material.color.set(body);
        this.leftArm.material.color.set(body);
        this.rightArm.material.color.set(body);
        this.leftSleeve.material.color.set(body);
        this.rightSleeve.material.color.set(body);
        this.headMesh.material.color.set(skin);
        this.leftHand.material.color.set(skin);
        this.rightHand.material.color.set(skin);
        this.leftLeg.material.color.set(pants);
        this.rightLeg.material.color.set(pants);
        this.leftFoot.material.color.set(boots);
        this.rightFoot.material.color.set(boots);
        this.hairMesh.material.color.set(hair);
        update();
      }

      update(delta, globalTime, walkSpeed) {
        const d = this._dummy;
        const speed = walkSpeed || 2.0;

        // ── Jumping / crouching ──
        let jumpOffset = 0;
        let crouchSquash = 1;
        let crouchStretch = 1;

        if (this.isJumping) {
          this.jumpPhase += delta * 5.5;
          if (this.jumpPhase < Math.PI) {
            // Crouch
            const t = this.jumpPhase / (Math.PI * 0.5);
            crouchSquash = 1 - t * 0.25;
            crouchStretch = 1 + t * 0.1;
            jumpOffset = -t * 1.5;
          } else if (this.jumpPhase < Math.PI * 2.2) {
            // Spring up
            const t = (this.jumpPhase - Math.PI) / (Math.PI * 1.2);
            const spring = Math.sin(t * Math.PI);
            jumpOffset = spring * 7;
            crouchSquash = 1 + spring * 0.1;
            crouchStretch = 1 - spring * 0.12;
          } else if (this.jumpPhase < Math.PI * 3.0) {
            // Fall
            const t = (this.jumpPhase - Math.PI * 2.2) / (Math.PI * 0.8);
            jumpOffset = Math.max(0, 7 * (1 - t * t));
            crouchSquash = 1 + (1 - t) * 0.15;
            crouchStretch = 1 - (1 - t) * 0.15;
          } else {
            this.isJumping = false;
            this.jumpPhase = 0;
            crouchSquash = 1;
            crouchStretch = 1;
          }
        }

        this.group.position.y = jumpOffset;

        // ── Idle animation ──
        if (!this.isWalking && !this.isJumping) {
          this.idleTime += delta;
          const breath = Math.sin(this.idleTime * 2.2) * 0.12;
          const headSway = Math.sin(this.idleTime * 1.3) * 0.03;
          const armSway = Math.sin(this.idleTime * 1.8) * 0.05;

          // Torso
          d.position.set(0, 18 + breath * 0.3, 0);
          d.rotation.set(0, 0, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.torsoMesh.setMatrixAt(0, d.matrix);

          // Head
          d.position.set(headSway, 28 + breath * 0.4 + breath * 0.2, 0);
          d.rotation.set(0, headSway, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.headMesh.setMatrixAt(0, d.matrix);

          // Hair
          d.position.set(headSway, 31.2 + breath * 0.4, 0);
          d.updateMatrix();
          this.hairMesh.setMatrixAt(0, d.matrix);

          // Eyes
          d.position.set(-2.2 + headSway, 29 + breath * 0.3, 4.1);
          d.updateMatrix();
          this.leftEyeMesh.setMatrixAt(0, d.matrix);
          d.position.set(2.2 + headSway, 29 + breath * 0.3, 4.1);
          d.updateMatrix();
          this.rightEyeMesh.setMatrixAt(0, d.matrix);

          // Arms hang slightly
          d.position.set(-6, 18, 0);
          d.rotation.set(armSway, 0, 0);
          d.updateMatrix();
          this.leftArm.setMatrixAt(0, d.matrix);
          d.position.set(-6, 20.5, 0);
          d.updateMatrix();
          this.leftSleeve.setMatrixAt(0, d.matrix);
          d.position.set(-6, 9 + armSway * 1, 0);
          d.updateMatrix();
          this.leftHand.setMatrixAt(0, d.matrix);

          d.position.set(6, 18, 0);
          d.rotation.set(-armSway, 0, 0);
          d.updateMatrix();
          this.rightArm.setMatrixAt(0, d.matrix);
          d.position.set(6, 20.5, 0);
          d.updateMatrix();
          this.rightSleeve.setMatrixAt(0, d.matrix);
          d.position.set(6, 9 - armSway * 1, 0);
          d.updateMatrix();
          this.rightHand.setMatrixAt(0, d.matrix);

          // Legs
          d.position.set(-2.5, 6, 0);
          d.rotation.set(0, 0, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.leftLeg.setMatrixAt(0, d.matrix);
          d.position.set(2.5, 6, 0);
          d.updateMatrix();
          this.rightLeg.setMatrixAt(0, d.matrix);

          // Feet
          d.position.set(-2.5, 1, 1);
          d.updateMatrix();
          this.leftFoot.setMatrixAt(0, d.matrix);
          d.position.set(2.5, 1, 1);
          d.updateMatrix();
          this.rightFoot.setMatrixAt(0, d.matrix);

        } else {
          // ── Walk animation ──
          const walkFreq = speed * 2.2;
          const phase = this.walkPhase;

          const legSwing = Math.sin(phase) * 0.55;
          const armSwing = Math.sin(phase) * 0.45;
          const bodyBob = Math.abs(Math.sin(phase)) * 0.4;
          const bodyTilt = Math.sin(phase) * 0.04;
          const headSway = Math.sin(phase * 0.5) * 0.04;
          const stepBounce = Math.sin(phase * 2) * 0.08; // foot lift

          // Torso
          d.position.set(0, 18 + bodyBob * crouchStretch, 0);
          d.rotation.set(bodyTilt, 0, bodyTilt * 0.5);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.torsoMesh.setMatrixAt(0, d.matrix);

          // Head
          d.position.set(headSway, 28 + bodyBob * 0.8 * crouchStretch, 0);
          d.rotation.set(0, headSway * 0.5, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.headMesh.setMatrixAt(0, d.matrix);

          // Hair
          d.position.set(headSway, 31.2 + bodyBob * 0.8, 0);
          d.updateMatrix();
          this.hairMesh.setMatrixAt(0, d.matrix);

          // Eyes
          d.position.set(-2.2 + headSway * 0.5, 29 + bodyBob * 0.5, 4.1);
          d.updateMatrix();
          this.leftEyeMesh.setMatrixAt(0, d.matrix);
          d.position.set(2.2 + headSway * 0.5, 29 + bodyBob * 0.5, 4.1);
          d.updateMatrix();
          this.rightEyeMesh.setMatrixAt(0, d.matrix);

          // Left arm (swings opposite to left leg)
          d.position.set(-6, 18 + bodyBob * 0.3, 0);
          d.rotation.set(-armSwing, 0, 0);
          d.updateMatrix();
          this.leftArm.setMatrixAt(0, d.matrix);
          d.position.set(-6, 20.5 + bodyBob * 0.3, 0);
          d.updateMatrix();
          this.leftSleeve.setMatrixAt(0, d.matrix);
          d.position.set(-6, 9 - armSwing * 2, 0);
          d.updateMatrix();
          this.leftHand.setMatrixAt(0, d.matrix);

          // Right arm
          d.position.set(6, 18 + bodyBob * 0.3, 0);
          d.rotation.set(armSwing, 0, 0);
          d.updateMatrix();
          this.rightArm.setMatrixAt(0, d.matrix);
          d.position.set(6, 20.5 + bodyBob * 0.3, 0);
          d.updateMatrix();
          this.rightSleeve.setMatrixAt(0, d.matrix);
          d.position.set(6, 9 + armSwing * 2, 0);
          d.updateMatrix();
          this.rightHand.setMatrixAt(0, d.matrix);

          // Left leg
          d.position.set(-2.5, 6, 0);
          d.rotation.set(-legSwing, 0, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.leftLeg.setMatrixAt(0, d.matrix);

          // Left foot (lift when leg goes back)
          const lfZ = Math.cos(phase) * stepBounce;
          const lfY = stepBounce > 0 ? stepBounce * 2 : 0;
          d.position.set(-2.5, 1 + lfY, 1 + lfZ);
          d.rotation.set(-legSwing * 0.3, 0, 0);
          d.updateMatrix();
          this.leftFoot.setMatrixAt(0, d.matrix);

          // Right leg
          d.position.set(2.5, 6, 0);
          d.rotation.set(legSwing, 0, 0);
          d.scale.set(1, crouchStretch, 1);
          d.updateMatrix();
          this.rightLeg.setMatrixAt(0, d.matrix);

          // Right foot
          const rfZ = -Math.cos(phase) * stepBounce;
          const rfY = -stepBounce > 0 ? -stepBounce * 2 : 0;
          d.position.set(2.5, 1 + rfY, 1 + rfZ);
          d.rotation.set(legSwing * 0.3, 0, 0);
          d.updateMatrix();
          this.rightFoot.setMatrixAt(0, d.matrix);
        }

        this._markAllUpdate();
      }
    }

    const character = new VoxelCharacter();
    scene.add(character.group);

    // ─── Third-Person Camera ──────────────────────────────────────────────────
    const cameraOffset = new THREE.Vector3(0, 18, 35);
    const cameraLookOffset = new THREE.Vector3(0, 14, 0);

    function updateCamera() {
      const charPos = character.group.position.clone();
      charPos.y += 0;

      // Rotate offset by character rotation
      const offset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), character.rotation);
      const targetPos = charPos.clone().add(offset);

      camera.position.lerp(targetPos, 0.06);
      controls.target.lerp(charPos.clone().add(cameraLookOffset), 0.08);
    }

    // ─── Input ─────────────────────────────────────────────────────────────────
    const keys = { w: false, s: false, a: false, d: false, space: false };
    let jumpPressed = false;

    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space':
          if (!jumpPressed && !character.isJumping) {
            keys.space = true;
            jumpPressed = true;
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyD': keys.d = false; break;
        case 'Space': jumpPressed = false; break;
      }
    });

    // ─── GUI ───────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Voxel Character Controls' });
    const params = {
      walkSpeed: 2.0,
      bodyColor: '#3366dd',
      skinColor: '#ffcc99',
      pantsColor: '#334466',
      bootColor: '#5a3a1a',
      hairColor: '#5a3010',
      showTerrain: true,
    };

    gui.add(params, 'walkSpeed', 0.5, 3.5, 0.1).name('Walk Speed');
    gui.addColor(params, 'bodyColor').name('Body Color').onChange(v => {
      const c = new THREE.Color(v);
      character.torsoMesh.material.color.set(c);
      character.leftArm.material.color.set(c);
      character.rightArm.material.color.set(c);
      character.leftSleeve.material.color.set(c);
      character.rightSleeve.material.color.set(c);
      character._markAllUpdate();
    });
    gui.addColor(params, 'skinColor').name('Skin Color').onChange(v => {
      const c = new THREE.Color(v);
      character.headMesh.material.color.set(c);
      character.leftHand.material.color.set(c);
      character.rightHand.material.color.set(c);
      character._markAllUpdate();
    });
    gui.addColor(params, 'pantsColor').name('Pants Color').onChange(v => {
      const c = new THREE.Color(v);
      character.leftLeg.material.color.set(c);
      character.rightLeg.material.color.set(c);
      character._markAllUpdate();
    });
    gui.addColor(params, 'bootColor').name('Boot Color').onChange(v => {
      const c = new THREE.Color(v);
      character.leftFoot.material.color.set(c);
      character.rightFoot.material.color.set(c);
      character._markAllUpdate();
    });
    gui.addColor(params, 'hairColor').name('Hair Color').onChange(v => {
      const c = new THREE.Color(v);
      character.hairMesh.material.color.set(c);
      character._markAllUpdate();
    });
    gui.add(params, 'showTerrain').name('Show Terrain').onChange(v => {
      ground.visible = v;
      treePositions.forEach((_, i) => {
        scene.children.filter(c => c.isGroup)[i] && (scene.children.filter(c => c.isGroup)[i].visible = v);
      });
    });

    // ─── Animation Loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    // Re-get tree references after adding to scene
    const treeGroups = scene.children.filter(c => c.isGroup && c !== character.group);

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Terrain visibility sync
      if (params.showTerrain) {
        ground.visible = true;
        treeGroups.forEach(t => { t.visible = true; });
      } else {
        ground.visible = false;
        treeGroups.forEach(t => { t.visible = false; });
      }

      // Movement
      let moving = false;
      const moveDir = new THREE.Vector3();

      if (keys.a) { character.rotation += 2.2 * delta; }
      if (keys.d) { character.rotation -= 2.2 * delta; }

      if (keys.w) {
        moveDir.set(Math.sin(character.rotation), 0, Math.cos(character.rotation));
        moving = true;
      }
      if (keys.s) {
        moveDir.set(-Math.sin(character.rotation), 0, -Math.cos(character.rotation));
        moving = true;
      }

      if (moving) {
        const spd = params.walkSpeed * 5;
        character.position.addScaledVector(moveDir, spd * delta);
        character.group.position.x = character.position.x;
        character.group.position.z = character.position.z;
        character.group.rotation.y = character.rotation;
        character.isWalking = true;
        character.walkPhase += delta * params.walkSpeed * 6;
      } else {
        character.isWalking = false;
      }

      // Jump
      if (keys.space && !character.isJumping) {
        character.isJumping = true;
        character.jumpPhase = 0;
        keys.space = false;
      }

      // Update character animation
      character.update(delta, elapsed, params.walkSpeed);

      // Update camera
      updateCamera();
      controls.update();

      renderer.render(scene, camera);
    }

    animate();

    // ─── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });