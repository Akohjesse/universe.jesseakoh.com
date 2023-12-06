import "./style.css";
import "animate.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import vertexShaderSource from './shaders/vertex.glsl';
import fragmentShaderSource from './shaders/fragment.glsl';

let scene, camera, renderer, controls, uniforms, mixer1, mixer2, mixer3, mixer4, mixer5, mixer6;
const clock = new THREE.Clock();
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const gltfloader = new GLTFLoader(loadingManager);
const dLoader = new DRACOLoader(loadingManager);
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dLoader.setDecoderConfig({ type: "js" });
gltfloader.setDRACOLoader(dLoader);

let audioContext, audioElement, audioSource, audioGainNode;
let bgAudioContext, bgAudioElement, bgAudioSource, bgAudioGainNode;

const targetPosition = new THREE.Vector3(0, 4, 4);
const zoomDuration = 5000;

let threeJsLoadProgress = 0;
let audioLoadProgress = 0;
let totalLoadProgress = 0;

const totalAssetsToLoad = 2;
let assetsLoaded = 0;

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioElement = new Audio("/earth.mp3");
    audioElement.loop = true;
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioGainNode = audioContext.createGain();
    audioSource.connect(audioGainNode).connect(audioContext.destination);
}

function initBackgroundAudio() {
    bgAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    bgAudioElement = new Audio("/space1.mp3");
    bgAudioElement.loop = true;
    bgAudioSource = bgAudioContext.createMediaElementSource(bgAudioElement);
    bgAudioGainNode = bgAudioContext.createGain();
    bgAudioSource.connect(bgAudioGainNode).connect(bgAudioContext.destination);
    bgAudioGainNode.gain.value = 0.5;
    bgAudioElement.play();
}

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
        threeJsLoadProgress = (loaded / total) * 50;
        updateTotalProgress();
    };

    function loadAudio(url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "auto";
        audio.oncanplaythrough = () => {
            assetsLoaded++;
            audioLoadProgress = (assetsLoaded / totalAssetsToLoad) * 50;
            updateTotalProgress();
        };
    }

    function updateTotalProgress() {
        totalLoadProgress = threeJsLoadProgress + audioLoadProgress;
        const loadval = document.querySelector("#percent");
        const bar = document.querySelector(".loadingScreen_bar-fill");
        loadval.textContent = Math.round(totalLoadProgress);
        bar.style.width = `${totalLoadProgress}%`;
        if (totalLoadProgress >= 50) {
            setTimeout(() => {
                const loadbar = document.querySelector(".loadingScreen_wrap");
                const enter = document.querySelector(".enter");
                loadbar.classList.toggle("animate__fadeOut");
                enter.classList.toggle("animate__fadeIn");
                enter.style.visibility = "visible";
            }, 500);
        }
    }
    loadAudio("/space1.mp3");
    loadAudio("/earth.mp3");

    const btn = document.getElementById("openPage");
    btn.addEventListener("click", () => {
        const screen = document.querySelector(".loadingScreen");
        screen.classList.toggle("animate__slideOutUp");
        setTimeout(() => {
            screen.style.display = "none";
            initAudio();
            initBackgroundAudio();
        }, 500);
    });

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 6000);
    camera.position.set(0, 4, 2800);
    camera.lookAt(0, 4, 2800);

    scene = new THREE.Scene();
    scene.add(camera);
    scene.position.y = -1.4;

    renderer = new THREE.WebGLRenderer({});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;

    document.body.appendChild(renderer.domElement);
    setLighting();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.5;

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

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const skipButton = document.querySelector(".skip");
skipButton.addEventListener("click", zoomToTarget);

function zoomToTarget() {
    const startPosition = camera.position.clone();
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const fraction = elapsed / zoomDuration;
        if (fraction < 1) {
            const easedFraction = easeInOutQuad(fraction);
            camera.position.lerpVectors(startPosition, targetPosition, easedFraction);
            requestAnimationFrame(animate);
        } else {
            camera.position.copy(targetPosition);
        }
    }
    skipButton.classList.add("animate__fadeOut");
    setTimeout(() => {
        skipButton.style.display = "none";
    });
    animate();
}

function setEnvironment() {
    const outerSphereGeometry = new THREE.SphereGeometry(10, 60, 40);
    const innerSphereGeometry = new THREE.SphereGeometry(9, 60, 40);
    innerSphereGeometry.scale(-1, 1, 1);

    const textures = [textureLoader.load("/mountain.jpg"), textureLoader.load("/marble.jpeg"), textureLoader.load("/abs.jpeg")];

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
    gltfloader.load("/gltf/badman/badman.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = 1;
        mixer1 = new THREE.AnimationMixer(model);
        let action = mixer1.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/block/block.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = -1;
        mixer3 = new THREE.AnimationMixer(model);
        let action = mixer3.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/bman.glb", (glb) => {
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

    gltfloader.load("/gltf/dancing_alien/dancing_alien.gltf", (glb) => {
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

    gltfloader.load("/gltf/mohammed/mohammed.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.5, 0.5, 0.5);
        model.position.z = -2;
        mixer6 = new THREE.AnimationMixer(model);
        let action = mixer6.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/fem-v1/fem.gltf", (gltf) => {
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
        vertexShader: vertexShaderSource,
        fragmentShader: fragmentShaderSource,
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1000, 52, 16), material);
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(650, 60, 40), new THREE.MeshBasicMaterial({ map: textureLoader.load("/8k_stars_milky_way.jpg") }));
    sphere2.geometry.scale(1, 1, -1);
    scene.add(sphere2);
    scene.add(sphere);
}

function render() {
    const delta = clock.getDelta();
    uniforms.u_time.value = clock.getElapsedTime();
    controls.update();
    renderer.render(scene, camera);
    const outerSphereRadius = 10;
    const outerSphereCenter = new THREE.Vector3();

    if (camera.position.distanceTo(outerSphereCenter) < outerSphereRadius) {
        if (skipButton) {
            skipButton.style.display = "none";
        }
        if (audioElement.paused) {
            audioElement.play();
            if (bgAudioElement && !bgAudioElement.paused) {
                bgAudioElement.pause();
            }
        }
    } else {
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
            if (bgAudioElement && bgAudioElement.paused) {
                bgAudioElement.play();
            }
        }
    }

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

document.addEventListener("mousedown", () => {
    document.body.classList.add("grabbing");
});

document.addEventListener("mouseup", () => {
    document.body.classList.remove("grabbing");
});
