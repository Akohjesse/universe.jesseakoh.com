import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";

let scene, camera, renderer, controls, uniforms, mixer1, mixer2, mixer3, mixer4, mixer5, mixer6;
const clock = new THREE.Clock();
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const gltfloader = new GLTFLoader(loadingManager);
const dLoader = new DRACOLoader(loadingManager);
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dLoader.setDecoderConfig({ type: "js" });
gltfloader.setDRACOLoader(dLoader);

window.onload = () => {
    init();
    measure();
    createGlobe();
    setEnvironment();
    loadDancers();
    render();
    resize();
};

function init() {
    loadingManager.onProgress = (url, loaded, total) => {
        const loadval = document.querySelector("#percent");
        const bar = document.querySelector(".loadingScreen_bar-fill");
        const percent = Math.round((loaded / total) * 100);
        loadval.textContent = percent;
        bar.style.width = `${percent}%`;
    };

    loadingManager.onLoad = () => {
        setTimeout(() => {
            const loadscreen = document.querySelector(".loadingScreen");
            loadscreen.classList.toggle("remove");
        }, 500);
    };

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 4, 2800);
    camera.lookAt(0, 4, 2800);

    scene = new THREE.Scene();
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;

    document.body.appendChild(renderer.domElement);
    setLighting();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.movementSpeed = 30;
    controls.lookSpeed = 0.04;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 3.5;

    const sbg = textureLoader.load("/nebula.jpg");
    scene.background = sbg;
}

function setLighting() {
    const ambientLight = new THREE.AmbientLight("white", 3);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight("lightblue", 3);
    directionalLight.position.y = 3;
    directionalLight.position.x = -3;
    scene.add(directionalLight);
}

function measure() {
    const reflector = new Reflector(new THREE.PlaneGeometry(10, 10), {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: "gray",
    });

    reflector.rotation.x = -Math.PI / 2;
    scene.add(reflector);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: "gray", side: THREE.FrontSide }));
    plane.position.y = -0.2;
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);
}

function setEnvironment() {
    const outerSphereGeometry = new THREE.SphereGeometry(10, 60, 40);
    const innerSphereGeometry = new THREE.SphereGeometry(9, 60, 40);
    innerSphereGeometry.scale(-1, 1, 1);

    const textures = [textureLoader.load("/mountain.jpg"), textureLoader.load("/chalk.jpeg"), textureLoader.load("/marble.jpeg"), textureLoader.load("/abs.jpeg")];

    const outerSphere = new THREE.Mesh(outerSphereGeometry, new THREE.MeshBasicMaterial({ map: textureLoader.load("/earth_night.jpeg") }));
    const innerSphere = new THREE.Mesh(innerSphereGeometry, new THREE.MeshBasicMaterial({ map: textures[0] }));
    scene.add(innerSphere);

    scene.add(outerSphere);

    let currentTextureIndex = 0;
    function switchTexture() {
        currentTextureIndex = (currentTextureIndex + 1) % textures.length;
        innerSphere.material.map = textures[currentTextureIndex];
        innerSphere.material.needsUpdate = true;
    }

    setInterval(switchTexture, 2000);

    const mecury = new THREE.Mesh(
        new THREE.SphereGeometry(1, 30, 30),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/mercury.jpeg"),
        }),
    );
    mecury.position.set(0, 2, -20);
    scene.add(mecury);

    const venus = new THREE.Mesh(
        new THREE.SphereGeometry(10, 60, 40),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/venus.jpeg"),
        }),
    );
    venus.position.set(-100, -1, 10);
    scene.add(venus);

    const mars = new THREE.Mesh(
        new THREE.SphereGeometry(8, 60, 40),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/mars.jpeg"),
        }),
    );
    mars.position.set(-60, -1, 25);
    scene.add(mars);

    const Jupiter = new THREE.Mesh(
        new THREE.SphereGeometry(30, 30, 30),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/jupiter.jpeg"),
        }),
    );
    Jupiter.position.set(100, -1, 30);
    scene.add(Jupiter);

    const saturn = new THREE.Mesh(
        new THREE.SphereGeometry(10, 30, 30),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/saturn.jpeg"),
        }),
    );
    saturn.position.set(-50, -1, -20);
    scene.add(saturn);

    const neptune = new THREE.Mesh(
        new THREE.SphereGeometry(15, 30, 30),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load("/neptune.jpeg"),
        }),
    );
    neptune.position.set(50, -1, -20);
    scene.add(neptune);
}

function loadDancers() {
    gltfloader.load("/badman.glb", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = 1;
        mixer1 = new THREE.AnimationMixer(model);
        let action = mixer1.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/block/block.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = -1;
        mixer3 = new THREE.AnimationMixer(model);
        let action = mixer3.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/bman.glb", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.set(-1, 0, 2.5);
        model.rotation.y = 3;
        mixer2 = new THREE.AnimationMixer(model);
        let action = mixer2.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/dancing_alien/dancing_alien.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.position.set(3, 0, -0.4);
        model.rotation.y = -2;
        mixer5 = new THREE.AnimationMixer(model);
        let action = mixer5.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1;
        setTimeout(() => {
            action.play();
        }, 500);
    });

    gltfloader.load("/mohammed.glb", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.5, 0.5, 0.5);
        model.position.z = -2;
        mixer6 = new THREE.AnimationMixer(model);
        let action = mixer6.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/fem-v1/fem.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(0.011, 0.011, 0.011);
        mixer4 = new THREE.AnimationMixer(model);
        model.position.set(-3.7, 0, 1);
        model.rotation.y = 1.6;
        let action = mixer4.clipAction(gltf.animations[0]);
        action.timeScale = 1;
        setTimeout(() => {
            action.play();
        }, 500);
    });
}

function createGlobe() {
    uniforms = {
        u_time: { type: "f", value: 1.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById("vertex").textContent,
        fragmentShader: document.getElementById("fragment").textContent,
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1000, 52, 16), material);
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(650, 60, 40), new THREE.MeshBasicMaterial({ map: textureLoader.load("/8k_stars_milky_way.jpg") }));
    sphere2.geometry.scale(1, 1, -1);
    scene.add(sphere2);
    scene.add(sphere);
}

function render() {
    const delta = clock.getDelta();
    //  controls.update(delta);
    uniforms.u_time.value = clock.getElapsedTime();
    controls.update(delta);
    renderer.render(scene, camera);
    if (mixer1 && mixer2 && mixer3 && mixer4 && mixer5 && mixer6) {
        mixer1.update(delta);
        mixer2.update(delta);
        mixer3.update(delta);
        mixer4.update(delta);
        mixer5.update(delta);
        mixer6.update(delta);
    }
    requestAnimationFrame(render);
}

window.addEventListener("resize", resize);

function resize() {
    if (camera && uniforms && uniforms.u_resolution) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(renderer.domElement.width, renderer.domElement.height);
    }
}
