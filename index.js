import "./style.css";
import "animate.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

import vertexShaderSource from "./shaders/vertex.glsl";
import fragmentShaderSource from "./shaders/fragment.glsl";

let mixers = [];

let scene, camera, renderer, controls;

const clock = new THREE.Clock();
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const gltfloader = new GLTFLoader(loadingManager);
const dLoader = new DRACOLoader(loadingManager);
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dLoader.setDecoderConfig({ type: "js" });
gltfloader.setDRACOLoader(dLoader);

let audioContext, audioElement, audioSource, audioGainNode;
let jaudioContext, jaudioElement, jaudioSource, jaudioGainNode;
let bgAudioContext, bgAudioElement, bgAudioSource, bgAudioGainNode;

let threeJsLoadProgress = 0;
let totalLoadProgress = 0;
let assetsLoaded = 0;

const raycaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();
let intersects;

let uniforms = {
    u_time: { type: "f", value: 1.0 },
    u_resolution: { type: "v2", value: new THREE.Vector2() },
};

window.onload = () => {
    init();
    measure();
    createGlobe();
    setEnvironment();
    loadDancers();
    render();
    resize();
};

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioElement = new Audio("/earth.mp3");
    audioElement.loop = true;
    audioElement.playsInline = true;
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioGainNode = audioContext.createGain();
    audioSource.connect(audioGainNode).connect(audioContext.destination);
}
function initJAudio() {
    jaudioContext = new (window.AudioContext || window.webkitAudioContext)();
    jaudioElement = new Audio("/amon.mp3");
    jaudioElement.loop = true;
    jaudioElement.playsInline = true;
    jaudioSource = jaudioContext.createMediaElementSource(jaudioElement);
    jaudioGainNode = jaudioContext.createGain();
    jaudioSource.connect(jaudioGainNode).connect(jaudioContext.destination);
}

function initBackgroundAudio() {
    bgAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    bgAudioElement = new Audio("/space1.mp3");
    bgAudioElement.loop = true;
    bgAudioElement.playsInline = true;
    bgAudioSource = bgAudioContext.createMediaElementSource(bgAudioElement);
    bgAudioGainNode = bgAudioContext.createGain();
    bgAudioSource.connect(bgAudioGainNode).connect(bgAudioContext.destination);
    bgAudioGainNode.gain.value = 0.5;
    bgAudioElement.play();
}

function init() {
    loadingManager.onProgress = (url, loaded, total) => {
        threeJsLoadProgress = (loaded / total) * 100;
        updateTotalProgress();
    };

    function loadAudio(url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "auto";
        audio.oncanplaythrough = () => {
            assetsLoaded++;
        };
    }

    function updateTotalProgress() {
        totalLoadProgress = threeJsLoadProgress;
        const loadval = document.querySelector("#percent");
        const bar = document.querySelector(".loadingScreen_bar-fill");
        loadval.textContent = Math.round(totalLoadProgress);
        bar.style.width = `${totalLoadProgress}%`;
        if (totalLoadProgress >= 100) {
            setTimeout(() => {
                const loadbar = document.querySelector(".loadingScreen_wrap");
                const enter = document.querySelector(".enter");
                loadbar.classList.toggle("animate__fadeOut");
                enter.classList.toggle("animate__fadeIn");
                enter.style.visibility = "visible";
            }, 500);
        }
    }

    const btn = document.getElementById("openPage");
    btn.addEventListener("click", () => {
        loadAudio("/space1.mp3");
        loadAudio("/earth.mp3");
        const screen = document.querySelector(".loadingScreen");
        screen.classList.toggle("animate__slideOutUp");
        setTimeout(() => {
            screen.style.display = "none";
            initAudio();
            initJAudio();
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

const skipE = document.querySelector(".skip_earth");
skipE.addEventListener("click", () => {
    const targetPosition = new THREE.Vector3(0, 4, 4);
    zoomToTarget(targetPosition, 5000, new THREE.Vector3(0, 0, 0));
    skipE.classList.add("animate__fadeOut");
    setTimeout(() => {
        skipE.style.display = "none";
    });
});

const skipJ = document.querySelector(".skip_jup");
skipJ.addEventListener("click", () => {
    const targetPosition = new THREE.Vector3( 90 ,4, 25);
    zoomToTarget(targetPosition, 7000, new THREE.Vector3(100, -1, 35));
    skipJ.classList.add("animate__fadeOut");
    setTimeout(() => {
        skipJ.style.display = "none";
    });
});

function zoomToTarget(targetPosition, zoomDuration, planetPosition) {
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
            controls.target.copy(planetPosition);
            controls.update();
        }
    }
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
    outerSphere.name = "earth";
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
    Jupiter.name = "Jupiter";
    Jupiter.position.set(100, -1, 30);
    scene.add(Jupiter);

    gltfloader.load("/gltf/plastered_stone_wall_1k.gltf/plastered_stone_wall_1k.gltf", (g) => {
        let tex = g.scene.children[0].material.map;
        const insideJupiter = new THREE.Mesh(
            new THREE.SphereGeometry(29, 30, 30),
            new THREE.MeshBasicMaterial({
                map: tex,
            }),
        );

        insideJupiter.geometry.scale(1, -1, 1);
        insideJupiter.position.copy(Jupiter.position);
        scene.add(insideJupiter);
    });

    gltfloader.load("/gltf/rocks_ground_04_1k.gltf/rocks_ground_04_1k.gltf", (gltf) => {
        const texture = gltf.scene.children[0].material.map;
        const jupiterBase = new THREE.Mesh(
            new THREE.CircleGeometry(29, 42),
            new THREE.MeshPhongMaterial({
                map: texture,
                side: THREE.DoubleSide,
            }),
        );
        jupiterBase.rotation.x = Math.PI / 2;
        jupiterBase.position.set(100, 0, 30);
        scene.add(jupiterBase);
    });

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

function createGlobe() {
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

function loadDancers() {
    gltfloader.load("/gltf/badman/badman.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = 1;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/block/block.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.x = -1;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/bman/bman.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.scale.set(0.6, 0.6, 0.6);
        model.position.set(-1, 0, 2.5);
        model.rotation.y = 3;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/dancing_alien/dancing_alien.gltf", (glb) => {
        const model = glb.scene;
        scene.add(model);
        model.position.set(3, 0, -0.4);
        model.rotation.y = -2;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(glb.animations[0]);
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
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(glb.animations[0]);
        action.play();
        action.timeScale = 1.1;
    });

    gltfloader.load("/gltf/fem-v1/fem.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(0.011, 0.011, 0.011);
        model.position.set(-3.7, 0, 1);
        model.rotation.y = 1.6;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.timeScale = 1;
        setTimeout(() => {
            action.play();
        }, 500);
    });

    gltfloader.load("/gltf/creature/scene.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.position.set(109, 0, 33);
        model.scale.set(0.03, 0.03, 0.03);
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
        model.renderOrder = 1;

        const clone = SkeletonUtils.clone(model);
        clone.position.set(82, 0, 33);
        scene.add(clone);

        let mixerclone = new THREE.AnimationMixer(clone);
        mixers.push(mixerclone);
        let cloneAction = mixerclone.clipAction(gltf.animations[0]);
        cloneAction.play();
    });

    gltfloader.load("/gltf/techno/techno.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(0.12, 0.12, 0.12);
        model.position.set(92, 10, 37);
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
        action.timeScale = 0.4;
    });

    gltfloader.load("/gltf/alien_1/alien_1.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(2.4, 2.4, 2.4);
        model.position.set(106, 0, 27);
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });

    gltfloader.load("/gltf/alien_2/alien_2.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(2.4, 2.4, 2.4);
        model.position.set(96, 0, 29);
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });

    gltfloader.load("/gltf/alien_3/alien_3.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(1.2, 1.2, 1.2);
        model.position.set(101, 0, 36);
        model.rotation.y = 3;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });

    gltfloader.load("/gltf/alien_5/alien_5.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(2.4, 2.4, 2.4);
        model.position.set(97, 0, 36);
        model.rotation.y = 1.6;
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });

    gltfloader.load("/gltf/alien_6/alien_6.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(103, 0, 32);

        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });

    gltfloader.load("/gltf/alien_7/alien_7.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(2.5, 2.5, 2.5);
        model.position.set(107, 0, 38);
        let mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        model.rotation.y = -2;
        let action = mixer.clipAction(gltf.animations[0]);
        action.play();
    });
}

window.addEventListener("mousemove", (e) => {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePosition, camera);
    intersects = raycaster.intersectObjects(scene.children);
});

window.addEventListener("dblclick", () => {
    let jupiterPos = new THREE.Vector3(100, -1, 35);

    if (camera.position.distanceTo(jupiterPos < 50)) {
        return;
    }
    intersects.sort((a, b) => a.distance - b.distance);
    if (intersects.length > 0 && intersects[0].object.name === "Jupiter") {
        const targetPosition = new THREE.Vector3(100, 4, 30);
        zoomToTarget(targetPosition, 4000, jupiterPos);
    }
    if (intersects.length > 0 && intersects[0].object.name === "earth") {
        const targetPosition = new THREE.Vector3(0, 4, 4);
        zoomToTarget(targetPosition, 5000, new THREE.Vector3(0, 0, 0));
    }
});

let tapCount = 0;
let tapTimeout;

function onDoubleTap() {
    let jupiterPos = new THREE.Vector3(100, -1, 35);

    if (camera.position.distanceTo(jupiterPos < 50)) {
        return;
    }
    intersects.sort((a, b) => a.distance - b.distance);
    if (intersects.length > 0 && intersects[0].object.name === "Jupiter") {
        const targetPosition = new THREE.Vector3(100, 4, 30);
        zoomToTarget(targetPosition, 4000, jupiterPos);
    }
    if (intersects.length > 0 && intersects[0].object.name === "earth") {
        const targetPosition = new THREE.Vector3(0, 4, 4);
        zoomToTarget(targetPosition, 5000, new THREE.Vector3(0, 0, 0));
    }
}

window.addEventListener("touchend", () => {
    tapCount++;
    clearTimeout(tapTimeout);
    tapTimeout = setTimeout(() => tapCount = 0, 500);

    if (tapCount === 3) {
      onDoubleTap()
        tapCount = 0;
    }
});

function render() {
    const delta = clock.getDelta();
    uniforms.u_time.value = clock.getElapsedTime();
    controls.update();
    renderer.render(scene, camera);

    if (camera.position.distanceTo(new THREE.Vector3()) < 10) {
        if (skipE) {
            skipE.style.display = "none";
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
    if (camera.position.distanceTo(new THREE.Vector3(100, -1, 35)) < 30) {
        if (skipJ) {
            skipJ.style.display = "none";
        }
        if (jaudioElement.paused) {
            jaudioElement.play();
            if (bgAudioElement && !bgAudioElement.paused) {
                bgAudioElement.pause();
            }
        }
    } else {
        if (jaudioElement && !jaudioElement.paused) {
           jaudioElement.pause();
            if (bgAudioElement && bgAudioElement.paused) {
                bgAudioElement.play();
            }
        }
    }

    for (let i = 0; i < mixers.length; i++) {
        if (mixers[i]) {
            mixers[i].update(delta);
        }
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
