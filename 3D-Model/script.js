import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ==========================================================================
// 1. SCENE, CAMERA, LIGHTING & RENDERER SETUP (Conditional for Preview)
// ==========================================================================

const viewer = document.getElementById("viewer");
const loadingOverlay = document.getElementById("loading");

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let beaconGroup = null;
let matAvail = null;
let matBooked = null;
let matSelected = null;
let beaconPinGeo = null;
let ringGeo = null;

const DEFAULT_CAM_POS = new THREE.Vector3(68, 38, 68);
const DEFAULT_TARGET = new THREE.Vector3(0, -1, 0);

if (viewer) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.0035);

    camera = new THREE.PerspectiveCamera(
        42,
        viewer.clientWidth / viewer.clientHeight,
        0.5,
        1500
    );
    camera.position.copy(DEFAULT_CAM_POS);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    viewer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Don't go below floor
    controls.target.copy(DEFAULT_TARGET);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.6);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 2.5);
    mainSun.position.set(60, 90, 60);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 10;
    mainSun.shadow.camera.far = 300;
    const d = 70;
    mainSun.shadow.camera.left = -d;
    mainSun.shadow.camera.right = d;
    mainSun.shadow.camera.top = d;
    mainSun.shadow.camera.bottom = -d;
    mainSun.shadow.bias = -0.0005;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    fillLight.position.set(-60, 40, -50);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.8);
    scene.add(hemiLight);

    // Ground Grid & Subtle Shadow Plane
    const groundGeo = new THREE.PlaneGeometry(350, 350);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.85,
        metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -12.78;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const gridHelper = new THREE.GridHelper(300, 30, 0x334155, 0x1e293b);
    gridHelper.position.y = -12.75;
    scene.add(gridHelper);

    beaconGroup = new THREE.Group();
    scene.add(beaconGroup);

    beaconPinGeo = new THREE.CylinderGeometry(0.3, 0.05, 1.8, 12);
    beaconPinGeo.rotateX(Math.PI / 2); // point outward
    ringGeo = new THREE.RingGeometry(0.7, 1.1, 24);

    matAvail = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.8,
        roughness: 0.3
    });
    matBooked = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.8,
        roughness: 0.3
    });
    matSelected = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
        roughness: 0.2
    });
}

// ==========================================================================
// 2. ARCHITECTURAL ROOM ANCHORS (Exact Centered Geometry of Hostel.glb)
// ==========================================================================
// Centered model bounds:
// X: [-39.7, +39.7], Y: [-12.8, +12.8], Z: [-31.8, +31.8]
// Ground Floor room center: Y = -5.0
// 1st Floor room center:    Y = +3.5
// Front Wing outer wall (+Z): Z = +26.4 (center porch Z = +31.8)
// East Wing outer wall (+X):  X = +39.6
// Back Wing outer wall (-Z):  Z = -31.85
// West Wing outer wall (-X):  X = -39.7

const ALL_ROOM_ANCHORS = [
    // --- FRONT WING (Rooms 101-103, 201-203 | Facing South / +Z) ---
    { id: "F-G1", wing: "Front Wing", floor: "Ground Floor", pos: [-24.0, -5.0, 26.4], normal: [0, 0, 1] },
    { id: "F-G2", wing: "Front Wing", floor: "Ground Floor", pos: [  0.0, -5.0, 31.8], normal: [0, 0, 1] },
    { id: "F-G3", wing: "Front Wing", floor: "Ground Floor", pos: [ 24.0, -5.0, 26.4], normal: [0, 0, 1] },
    { id: "F-1F1", wing: "Front Wing", floor: "1st Floor",    pos: [-24.0,  3.5, 26.4], normal: [0, 0, 1] },
    { id: "F-1F2", wing: "Front Wing", floor: "1st Floor",    pos: [  0.0,  3.5, 31.8], normal: [0, 0, 1] },
    { id: "F-1F3", wing: "Front Wing", floor: "1st Floor",    pos: [ 24.0,  3.5, 26.4], normal: [0, 0, 1] },

    // --- EAST WING (Rooms 104-106, 204-206 | Facing East / +X) ---
    { id: "E-G1", wing: "East Wing", floor: "Ground Floor", pos: [39.6, -5.0,  11.0], normal: [1, 0, 0] },
    { id: "E-G2", wing: "East Wing", floor: "Ground Floor", pos: [39.6, -5.0,  -2.5], normal: [1, 0, 0] },
    { id: "E-G3", wing: "East Wing", floor: "Ground Floor", pos: [39.6, -5.0, -16.0], normal: [1, 0, 0] },
    { id: "E-1F1", wing: "East Wing", floor: "1st Floor",    pos: [39.6,  3.5,  11.0], normal: [1, 0, 0] },
    { id: "E-1F2", wing: "East Wing", floor: "1st Floor",    pos: [39.6,  3.5,  -2.5], normal: [1, 0, 0] },
    { id: "E-1F3", wing: "East Wing", floor: "1st Floor",    pos: [39.6,  3.5, -16.0], normal: [1, 0, 0] },

    // --- BACK WING (Rooms 107-109, 207-209 | Facing North / -Z) ---
    { id: "B-G1", wing: "Back Wing", floor: "Ground Floor", pos: [-24.0, -5.0, -31.85], normal: [0, 0, -1] },
    { id: "B-G2", wing: "Back Wing", floor: "Ground Floor", pos: [  0.0, -5.0, -31.85], normal: [0, 0, -1] },
    { id: "B-G3", wing: "Back Wing", floor: "Ground Floor", pos: [ 24.0, -5.0, -31.85], normal: [0, 0, -1] },
    { id: "B-1F1", wing: "Back Wing", floor: "1st Floor",    pos: [-24.0,  3.5, -31.85], normal: [0, 0, -1] },
    { id: "B-1F2", wing: "Back Wing", floor: "1st Floor",    pos: [  0.0,  3.5, -31.85], normal: [0, 0, -1] },
    { id: "B-1F3", wing: "Back Wing", floor: "1st Floor",    pos: [ 24.0,  3.5, -31.85], normal: [0, 0, -1] },

    // --- WEST WING (Rooms 110-112, 210-212 | Facing West / -X) ---
    { id: "W-G1", wing: "West Wing", floor: "Ground Floor", pos: [-39.7, -5.0, -16.0], normal: [-1, 0, 0] },
    { id: "W-G2", wing: "West Wing", floor: "Ground Floor", pos: [-39.7, -5.0,  -2.5], normal: [-1, 0, 0] },
    { id: "W-G3", wing: "West Wing", floor: "Ground Floor", pos: [-39.7, -5.0,  11.0], normal: [-1, 0, 0] },
    { id: "W-1F1", wing: "West Wing", floor: "1st Floor",    pos: [-39.7,  3.5, -16.0], normal: [-1, 0, 0] },
    { id: "W-1F2", wing: "West Wing", floor: "1st Floor",    pos: [-39.7,  3.5,  -2.5], normal: [-1, 0, 0] },
    { id: "W-1F3", wing: "West Wing", floor: "1st Floor",    pos: [-39.7,  3.5,  11.0], normal: [-1, 0, 0] }
];

// Room sharing configurations (e.g. 4 Sharing, 6 Sharing rooms)
const ROOM_SHARING_TYPES = [
    { sharing: "4 Sharing Room" },
    { sharing: "6 Sharing Room" },
    { sharing: "4 Sharing Room" },
    { sharing: "6 Sharing Room" },
    { sharing: "2 Sharing Room" }
];

// ==========================================================================
// 3. STATE & DATA MANAGEMENT
// ==========================================================================

let hostelModel = null;
let rooms = [];
let roomLabels = []; // Array of { number, element, position, normal, meshBeacon }
let selectedRoomNumber = null;
let showLabels = true;
let isRotating = false;
let currentFilter = "all";

// Camera Transition interpolation
let cameraTargetPos = null;
let cameraLookTarget = null;

// DOM Element References
const roomGrid = document.getElementById("roomGrid");
const bookingList = document.getElementById("bookingList");

// Stored bookings in localStorage
let bookings = JSON.parse(localStorage.getItem("hostelBookings")) || [];

// ==========================================================================
// 4. LOAD 3D HOSTEL MODEL
// ==========================================================================

if (viewer && scene) {
    const loader = new GLTFLoader();

    loader.load(
        "models/hostel.glb",
        function (gltf) {
            hostelModel = gltf.scene;

            // Enable shadows and enhance materials
            hostelModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = 0.7;
                        child.material.metalness = 0.15;
                    }
                }
            });

            // Center model at (0, 0, 0)
            const box = new THREE.Box3().setFromObject(hostelModel);
            const center = box.getCenter(new THREE.Vector3());
            hostelModel.position.sub(center);

            scene.add(hostelModel);
            console.log("3D Hostel loaded and centered successfully");

            // Hide loading screen smoothly
            if (loadingOverlay) {
                loadingOverlay.style.opacity = "0";
                setTimeout(() => {
                    loadingOverlay.style.display = "none";
                }, 400);
            }
        },
        function (xhr) {
            if (xhr.lengthComputable && loadingOverlay) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                const sub = loadingOverlay.querySelector(".loader-sub");
                if (sub) sub.textContent = `Downloading assets... ${percent}%`;
            }
        },
        function (error) {
            console.error("Unable to load hostel.glb", error);
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `<div style="color:#f43f5e;font-weight:bold;">Error loading 3D Model: ${error.message || 'File not found'}</div>`;
            }
        }
    );
}

// ==========================================================================
// 5. BALANCED ROOM SETUP (Equal Distribution on Ground Floor & 1st Floor)
// ==========================================================================

const DEFAULT_ROOMS_CONFIG = [
    // --- FRONT WING (3 Pairs = 6 Rooms) ---
    { number: "101", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "F-G1" },
    { number: "102", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "F-G2" },
    { number: "103", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "F-G3" },
    { number: "201", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "F-1F1" },
    { number: "202", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "F-1F2" },
    { number: "203", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "F-1F3" },

    // --- EAST WING (3 Pairs = 6 Rooms) ---
    { number: "104", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "E-G1" },
    { number: "105", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "E-G2" },
    { number: "106", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "E-G3" },
    { number: "204", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "E-1F1" },
    { number: "205", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "E-1F2" },
    { number: "206", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "E-1F3" },

    // --- BACK WING (3 Pairs = 6 Rooms) ---
    { number: "107", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "B-G1" },
    { number: "108", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "B-G2" },
    { number: "109", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "B-G3" },
    { number: "207", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "B-1F1" },
    { number: "208", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "B-1F2" },
    { number: "209", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "B-1F3" },

    // --- WEST WING (3 Pairs = 6 Rooms) ---
    { number: "110", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "W-G1" },
    { number: "111", floor: "Ground Floor", sharing: "4 Sharing Room", anchorId: "W-G2" },
    { number: "112", floor: "Ground Floor", sharing: "6 Sharing Room", anchorId: "W-G3" },
    { number: "210", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "W-1F1" },
    { number: "211", floor: "1st Floor",    sharing: "4 Sharing Room", anchorId: "W-1F2" },
    { number: "212", floor: "1st Floor",    sharing: "6 Sharing Room", anchorId: "W-1F3" }
];

function initializeRooms() {
    clearRoomLabels();
    rooms = [];

    DEFAULT_ROOMS_CONFIG.forEach(cfg => {
        const anchor = ALL_ROOM_ANCHORS.find(a => a.id === cfg.anchorId);
        if (!anchor) return;

        const isBooked = bookings.some(b => b.room === cfg.number);

        rooms.push({
            number: cfg.number,
            status: isBooked ? "booked" : "available",
            floor: cfg.floor,
            wing: anchor.wing,
            sharing: cfg.sharing,
            anchorId: cfg.anchorId,
            position: new THREE.Vector3(...anchor.pos),
            normal: new THREE.Vector3(...anchor.normal)
        });
    });

    createRoomVisuals();
    renderRoomGrid();
    updateStats();
    displayBookings();
}

// Initialize balanced rooms (6 Ground Floor + 6 1st Floor)
initializeRooms();

// ==========================================================================
// 6. CREATE 3D BEACONS & FLOATING HTML LABELS
// ==========================================================================

function clearRoomLabels() {
    // Remove HTML elements
    roomLabels.forEach(item => {
        if (item.element && item.element.parentNode) {
            item.element.parentNode.removeChild(item.element);
        }
    });
    roomLabels = [];

    // Clear 3D beacon group if it exists
    if (beaconGroup) {
        while (beaconGroup.children.length > 0) {
            const obj = beaconGroup.children[0];
            beaconGroup.remove(obj);
        }
    }
}

function createRoomVisuals() {
    if (!viewer || !beaconGroup || !matAvail) return;

    rooms.forEach(room => {
        // --- 1. Floating HTML Badge ---
        const labelEl = document.createElement("div");
        labelEl.className = `room-floating-label ${room.status}`;
        labelEl.dataset.room = room.number;
        labelEl.setAttribute("role", "button");
        labelEl.setAttribute("tabindex", "0");
        labelEl.title = `Room ${room.number} • ${room.wing} (${room.floor})`;

        labelEl.innerHTML = `
            <div class="label-pill">
                <span class="label-status-dot"></span>
                <span class="label-room-prefix">Room</span>
                <span class="label-room-num">${room.number}</span>
            </div>
        `;

        // Click event on badge
        labelEl.addEventListener("click", (e) => {
            e.stopPropagation();
            selectRoom(room.number, true);
        });

        viewer.appendChild(labelEl);

        // --- 2. 3D Beacon on Building Surface ---
        const beaconMesh = new THREE.Mesh(
            beaconPinGeo,
            room.status === "available" ? matAvail.clone() : matBooked.clone()
        );
        beaconMesh.position.copy(room.position);

        // Orient beacon along surface normal
        const normalVec = room.normal.clone().normalize();
        const lookTarget = room.position.clone().add(normalVec);
        beaconMesh.lookAt(lookTarget);

        // Pulsing ring around anchor
        const ringMat = new THREE.MeshBasicMaterial({
            color: room.status === "available" ? 0x10b981 : 0xf43f5e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(room.position).addScaledVector(normalVec, 0.1);
        ringMesh.lookAt(lookTarget);

        beaconGroup.add(beaconMesh);
        beaconGroup.add(ringMesh);

        // Floating offset for label: float 2.2 units above anchor in Y
        const floatingPos = room.position.clone();
        floatingPos.y += 2.2;
        floatingPos.addScaledVector(normalVec, 1.0);

        roomLabels.push({
            number: room.number,
            wing: room.wing,
            element: labelEl,
            position: floatingPos,
            anchorPos: room.position.clone(),
            normal: normalVec,
            meshBeacon: beaconMesh,
            ringBeacon: ringMesh
        });
    });
}

// ==========================================================================
// 7. REAL-TIME LABEL PROJECTION & DEPTH AWARENESS
// ==========================================================================

const tempVec = new THREE.Vector3();
const camDir = new THREE.Vector3();

function updateRoomLabels() {
    if (!viewer || !camera || !beaconGroup) return;

    if (!showLabels) {
        roomLabels.forEach(r => {
            r.element.style.display = "none";
        });
        beaconGroup.visible = false;
        return;
    }

    beaconGroup.visible = true;
    camera.getWorldDirection(camDir);

    const viewerWidth = viewer.clientWidth;
    const viewerHeight = viewer.clientHeight;
    // Check if camera is pointing down from high above (Top View)
    const isTopView = camDir.y < -0.65;

    roomLabels.forEach(room => {
        tempVec.copy(room.position);

        // Vector from camera to room
        const camToPoint = tempVec.clone().sub(camera.position);

        // Behind camera check
        const dotCam = camToPoint.dot(camDir);
        if (dotCam <= 0) {
            room.element.style.display = "none";
            if (room.meshBeacon) room.meshBeacon.visible = false;
            if (room.ringBeacon) room.ringBeacon.visible = false;
            return;
        }

        // Project 3D vector to screen 2D space
        tempVec.project(camera);

        // Check if outside viewer boundaries
        if (tempVec.x < -1.1 || tempVec.x > 1.1 || tempVec.y < -1.1 || tempVec.y > 1.1 || tempVec.z > 1) {
            room.element.style.display = "none";
            if (room.meshBeacon) room.meshBeacon.visible = false;
            if (room.ringBeacon) room.ringBeacon.visible = false;
            return;
        }

        // Surface Orientation / Visibility Culling
        const facingDot = room.normal.dot(camDir);
        const isFacingCamera = isTopView || (facingDot < 0.05);

        // Hide badges & beacons on walls facing away from the camera, unless currently selected
        if (!isFacingCamera && room.number !== selectedRoomNumber) {
            room.element.style.display = "none";
            if (room.meshBeacon) room.meshBeacon.visible = false;
            if (room.ringBeacon) room.ringBeacon.visible = false;
            return;
        }

        if (room.meshBeacon) room.meshBeacon.visible = true;
        if (room.ringBeacon) room.ringBeacon.visible = true;

        const screenX = (tempVec.x * 0.5 + 0.5) * viewerWidth;
        const screenY = (-tempVec.y * 0.5 + 0.5) * viewerHeight;

        room.element.style.left = `${screenX}px`;
        room.element.style.top = `${screenY}px`;
        room.element.style.display = "flex";

        const dist = camera.position.distanceTo(room.position);
        const scale = Math.max(0.78, Math.min(1.18, 85 / (dist + 22)));

        if (room.number === selectedRoomNumber) {
            room.element.style.opacity = "1";
            room.element.style.pointerEvents = "auto";
            room.element.style.transform = `translate(-50%, -50%) scale(${scale * 1.15})`;
        } else {
            room.element.style.opacity = "1";
            room.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
            room.element.style.pointerEvents = "auto";
        }
    });
}

// ==========================================================================
// 8. NAVIGATION TAB SWITCHING & ROUTING (3D Room Preview vs Room Booking)
// ==========================================================================

const navBtnPreview = document.getElementById("navBtnPreview");
const navBtnBooking = document.getElementById("navBtnBooking");
const viewPreview = document.getElementById("viewPreview");
const viewBooking = document.getElementById("viewBooking");
const btnGoToBooking = document.getElementById("btnGoToBooking");
const btnBackToPreview = document.getElementById("btnBackToPreview");
const previewActionDrawer = document.getElementById("previewActionDrawer");
const drawerRoomNum = document.getElementById("drawerRoomNum");
const drawerRoomMeta = document.getElementById("drawerRoomMeta");
const drawerRoomStatus = document.getElementById("drawerRoomStatus");
const btnDrawerBook = document.getElementById("btnDrawerBook");
const btnDrawerDismiss = document.getElementById("btnDrawerDismiss");

function switchTab(tabId) {
    if (tabId === "preview") {
        if (viewPreview && viewBooking) {
            // Combined page (index.html): switch visible view
            if (navBtnPreview) navBtnPreview.classList.add("active");
            if (navBtnBooking) navBtnBooking.classList.remove("active");
            viewPreview.classList.add("active");
            viewBooking.classList.remove("active");
            window.location.hash = "preview";

            // Resize 3D renderer smoothly when preview tab is shown
            setTimeout(() => {
                if (viewer && camera && renderer) {
                    camera.aspect = viewer.clientWidth / viewer.clientHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
                    updateRoomLabels();
                }
            }, 60);
        } else if (!viewPreview) {
            // Standalone booking page: navigate to standalone preview page
            window.location.href = selectedRoomNumber ? `room-preview.html?room=${selectedRoomNumber}` : "room-preview.html";
        }
    } else if (tabId === "booking") {
        if (viewPreview && viewBooking) {
            // Combined page (index.html): switch visible view
            if (navBtnBooking) navBtnBooking.classList.add("active");
            if (navBtnPreview) navBtnPreview.classList.remove("active");
            viewBooking.classList.add("active");
            viewPreview.classList.remove("active");
            window.location.hash = "booking";
        } else if (!viewBooking) {
            // Standalone preview page: navigate to standalone booking page
            window.location.href = selectedRoomNumber ? `room-booking.html?room=${selectedRoomNumber}` : "room-booking.html";
        }
    }
}

if (navBtnPreview) navBtnPreview.addEventListener("click", () => switchTab("preview"));
if (navBtnBooking) navBtnBooking.addEventListener("click", () => switchTab("booking"));
if (btnGoToBooking) btnGoToBooking.addEventListener("click", () => switchTab("booking"));
if (btnBackToPreview) btnBackToPreview.addEventListener("click", () => switchTab("preview"));

if (btnDrawerDismiss) {
    btnDrawerDismiss.addEventListener("click", () => {
        if (previewActionDrawer) previewActionDrawer.style.display = "none";
    });
}

if (btnDrawerBook) {
    btnDrawerBook.addEventListener("click", () => {
        if (viewBooking) {
            switchTab("booking");
            const bookingSection = document.getElementById("bookingSection");
            if (bookingSection) {
                bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            const studentNameInput = document.getElementById("studentName");
            if (studentNameInput) studentNameInput.focus();
        } else {
            window.location.href = `room-booking.html?room=${selectedRoomNumber}`;
        }
    });
}

// ==========================================================================
// 9. ROOM SELECTION, FOCUS & BOOKING FORM
// ==========================================================================

function selectRoom(roomNumber, flyCamera = false) {
    selectedRoomNumber = roomNumber;
    const room = rooms.find(r => r.number === roomNumber);

    if (!room) return;

    // Highlight floating label
    roomLabels.forEach(r => {
        if (r.number === roomNumber) {
            r.element.classList.add("selected");
            r.meshBeacon.material = matSelected;
        } else {
            r.element.classList.remove("selected");
            const rData = rooms.find(item => item.number === r.number);
            r.meshBeacon.material = rData && rData.status === "available" ? matAvail : matBooked;
        }
    });

    // Update 3D Preview Quick Action Drawer
    if (previewActionDrawer) {
        previewActionDrawer.style.display = "flex";
        if (drawerRoomNum) drawerRoomNum.textContent = `Room ${room.number}`;
        if (drawerRoomMeta) drawerRoomMeta.textContent = `${room.wing} • ${room.floor} • ${room.sharing}`;
        if (drawerRoomStatus) {
            drawerRoomStatus.textContent = room.status === "available" ? "Available" : "Booked";
            drawerRoomStatus.className = `drawer-status-pill ${room.status}`;
        }
        if (btnDrawerBook) {
            if (room.status === "available") {
                btnDrawerBook.textContent = "✅ Proceed to Book Room";
                btnDrawerBook.disabled = false;
                btnDrawerBook.style.opacity = "1";
                btnDrawerBook.style.cursor = "pointer";
            } else {
                btnDrawerBook.textContent = "⚠️ Room Already Booked";
                btnDrawerBook.disabled = true;
                btnDrawerBook.style.opacity = "0.6";
                btnDrawerBook.style.cursor = "not-allowed";
            }
        }
    }

    // Highlight Room Card in directory
    document.querySelectorAll(".room-card").forEach(card => {
        if (card.dataset.room === roomNumber) {
            card.classList.add("selected");
        } else {
            card.classList.remove("selected");
        }
    });

    // Update Viewer Hint
    const hint = document.getElementById("viewerSelectionHint");
    if (hint) {
        hint.innerHTML = `Selected: <strong>Room ${room.number}</strong> (${room.wing} • ${room.floor} • ${room.sharing} • ${room.status.toUpperCase()})`;
    }

    // Open & populate booking form in Room Booking tab
    const roomNumberHeader = document.getElementById("roomNumberHeader");
    const bookingRoomDetails = document.getElementById("bookingRoomDetails");
    const roomNumberInput = document.getElementById("roomNumber");

    if (roomNumberHeader) roomNumberHeader.textContent = `Room ${room.number}`;
    if (roomNumberInput) roomNumberInput.value = room.number;
    if (bookingRoomDetails) {
        bookingRoomDetails.textContent = `${room.wing} • ${room.floor} • ${room.sharing}`;
    }

    // If already booked, warn user
    const messageBox = document.getElementById("message");
    if (room.status === "booked") {
        const bookingInfo = bookings.find(b => b.room === room.number);
        const student = bookingInfo ? bookingInfo.name : "another student";
        if (messageBox) {
            messageBox.className = "booking-message error";
            messageBox.textContent = `Room ${room.number} is already booked by ${student}. Please choose an available room or cancel the existing booking below.`;
            messageBox.style.display = "block";
        }
    } else {
        if (messageBox) messageBox.style.display = "none";
    }

    // Smoothly fly camera to focus on this room if requested
    if (flyCamera) {
        flyCameraToRoom(room);
    }
}

/**
 * Smoothly interpolates the camera to frame the selected room
 */
function flyCameraToRoom(room) {
    if (!camera || !room || !room.normal || !room.position) return;
    const normal = room.normal.clone().normalize();
    const targetLook = room.position.clone();

    // Position camera cleanly in front of the room
    const targetCam = room.position.clone()
        .addScaledVector(normal, 36)
        .add(new THREE.Vector3(0, 7, 0));

    cameraTargetPos = targetCam;
    cameraLookTarget = targetLook;
}

// ==========================================================================
// 10. ROOM DIRECTORY RENDERING & STATS
// ==========================================================================

function renderRoomGrid() {
    if (!roomGrid) return;
    roomGrid.innerHTML = "";

    const filteredRooms = rooms.filter(room => {
        if (currentFilter === "all") return true;
        if (currentFilter === "available") return room.status === "available";
        if (currentFilter === "booked") return room.status === "booked";
        if (currentFilter === "ground") return room.floor === "Ground Floor";
        if (currentFilter === "1st") return room.floor === "1st Floor";
        return true;
    });

    if (filteredRooms.length === 0) {
        roomGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">No rooms match the selected filter.</div>`;
        return;
    }

    filteredRooms.forEach(room => {
        const card = document.createElement("div");
        card.className = `room-card status-${room.status} ${room.number === selectedRoomNumber ? "selected" : ""}`;
        card.dataset.room = room.number;

        card.innerHTML = `
            <div class="card-header">
                <span class="card-room-num">Room ${room.number}</span>
                <span class="card-status-badge">${room.status}</span>
            </div>

            <div class="card-meta">
                <span class="meta-chip">🏢 ${room.wing}</span>
                <span class="meta-chip">📍 ${room.floor}</span>
            </div>

            <div class="card-footer">
                <span class="card-type-tag">👥 ${room.sharing}</span>
                <div class="card-btn-group">
                    ${room.status === "available"
                        ? `<button type="button" class="btn-card-book btn-book-trigger" data-room="${room.number}">✅ Book Room</button>`
                        : `<button type="button" class="btn-card-book" disabled>Booked</button>`
                    }
                    <button type="button" class="btn-card-preview btn-preview-trigger" data-room="${room.number}">🏢 View in 3D</button>
                </div>
            </div>
        `;

        // Click on "Book Room" button: pre-fills form & scrolls up
        const bookBtn = card.querySelector(".btn-book-trigger");
        if (bookBtn) {
            bookBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                selectRoom(room.number, false);
                const bookingSec = document.getElementById("bookingSection");
                if (bookingSec) {
                    bookingSec.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                const nameInput = document.getElementById("studentName");
                if (nameInput) nameInput.focus();
            });
        }

        // Click on "View in 3D" button: switches to preview tab or navigates to room-preview.html
        const previewBtn = card.querySelector(".btn-preview-trigger");
        if (previewBtn) {
            previewBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (viewPreview) {
                    switchTab("preview");
                    selectRoom(room.number, true);
                } else {
                    window.location.href = `room-preview.html?room=${room.number}`;
                }
            });
        }

        // Click on card body: selects room
        card.addEventListener("click", () => {
            selectRoom(room.number, false);
        });

        roomGrid.appendChild(card);
    });
}

function updateStats() {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === "available").length;
    const booked = rooms.filter(r => r.status === "booked").length;
    const occupancy = total > 0 ? Math.round((booked / total) * 100) : 0;

    const elTotal = document.getElementById("statTotal");
    const elAvail = document.getElementById("statAvailable");
    const elBooked = document.getElementById("statBooked");
    const elOccupancy = document.getElementById("statOccupancy");
    const badgeBookingAvail = document.getElementById("badgeBookingAvail");

    if (elTotal) elTotal.textContent = total;
    if (elAvail) elAvail.textContent = available;
    if (elBooked) elBooked.textContent = booked;
    if (elOccupancy) elOccupancy.textContent = `${occupancy}%`;
    if (badgeBookingAvail) badgeBookingAvail.textContent = `${available} Available`;
}

// ==========================================================================
// 11. BOOKING FORM HANDLERS & PERSISTENCE
// ==========================================================================

const bookingForm = document.getElementById("bookingForm");
const messageBox = document.getElementById("message");
const btnCancelForm = document.getElementById("btnCancelForm");

if (btnCancelForm) {
    btnCancelForm.addEventListener("click", () => {
        if (bookingForm) bookingForm.reset();
        selectedRoomNumber = null;
        const roomNumberHeader = document.getElementById("roomNumberHeader");
        const bookingRoomDetails = document.getElementById("bookingRoomDetails");
        const roomNumberInput = document.getElementById("roomNumber");
        if (roomNumberHeader) roomNumberHeader.textContent = "Room ---";
        if (roomNumberInput) roomNumberInput.value = "";
        if (bookingRoomDetails) bookingRoomDetails.textContent = "Select a room from the directory below or click 'View in 3D' to inspect";
        if (messageBox) messageBox.style.display = "none";
        document.querySelectorAll(".room-card").forEach(c => c.classList.remove("selected"));
        roomLabels.forEach(l => {
            l.element.classList.remove("selected");
            const rData = rooms.find(item => item.number === l.number);
            l.meshBeacon.material = rData && rData.status === "available" ? matAvail : matBooked;
        });
        if (previewActionDrawer) previewActionDrawer.style.display = "none";
    });
}

if (bookingForm) {
    // Set default dates
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");

    if (checkInInput) checkInInput.min = today;
    if (checkOutInput) checkOutInput.min = today;

    bookingForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const roomNumber = document.getElementById("roomNumber")?.value;
        const name = document.getElementById("studentName")?.value.trim();
        const regNo = document.getElementById("registerNumber")?.value.trim();
        const checkIn = document.getElementById("checkIn")?.value;
        const checkOut = document.getElementById("checkOut")?.value;

        if (!roomNumber) {
            showToast("Please select a room to book first!", "error");
            return;
        }

        const room = rooms.find(r => r.number === roomNumber);
        if (!room) {
            showToast("Selected room was not found in the building!", "error");
            return;
        }

        if (room.status === "booked") {
            showToast(`Room #${roomNumber} is already booked. Please choose another!`, "error");
            return;
        }

        if (checkOut <= checkIn) {
            showToast("Check-out date must be after check-in date.", "error");
            return;
        }

        // Create booking object
        const newBooking = {
            room: roomNumber,
            name: name,
            registerNumber: regNo,
            checkIn: checkIn,
            checkOut: checkOut,
            wing: room.wing,
            floor: room.floor,
            sharing: room.sharing,
            bookingDate: new Date().toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        };

        bookings.push(newBooking);
        localStorage.setItem("hostelBookings", JSON.stringify(bookings));

        // Update Room Status
        room.status = "booked";

        // Update 3D Visuals
        const labelObj = roomLabels.find(l => l.number === roomNumber);
        if (labelObj) {
            labelObj.element.className = "room-floating-label booked selected";
            labelObj.meshBeacon.material = matBooked;
            labelObj.ringBeacon.material.color.setHex(0xf43f5e);
        }

        // Show feedback message
        if (messageBox) {
            messageBox.className = "booking-message success";
            messageBox.textContent = `🎉 Room ${roomNumber} booked successfully for ${name}!`;
            messageBox.style.display = "block";
        }

        showToast(`🎉 Room ${roomNumber} successfully confirmed!`);

        bookingForm.reset();
        renderRoomGrid();
        updateStats();
        displayBookings();

        setTimeout(() => {
            document.getElementById("bookingSection").style.display = "none";
        }, 1800);
    });
}

// ==========================================================================
// 11. CURRENT BOOKINGS DIRECTORY
// ==========================================================================

const btnClearBookings = document.getElementById("btnClearBookings");

function displayBookings() {
    if (!bookingList) return;
    bookingList.innerHTML = "";

    if (bookings.length === 0) {
        bookingList.innerHTML = `
            <div class="empty-bookings-hint">
                No active bookings found. Select any available room on the 3D model to book it!
            </div>
        `;
        return;
    }

    bookings.forEach((booking, index) => {
        const card = document.createElement("div");
        card.className = "booking-card";

        card.innerHTML = `
            <div class="booking-card-header">
                <span class="booking-student-name">👤 ${booking.name}</span>
                <span class="booking-room-badge">Room ${booking.room}</span>
            </div>

            <div class="booking-detail-row">
                <span>Registration:</span>
                <strong>${booking.registerNumber}</strong>
            </div>

            <div class="booking-detail-row">
                <span>Wing & Floor:</span>
                <strong>${booking.wing ? booking.wing + ' • ' : ''}${booking.floor}</strong>
            </div>

            <div class="booking-detail-row">
                <span>Room Type:</span>
                <strong>${booking.sharing || 'Sharing Room'}</strong>
            </div>

            <div class="booking-detail-row">
                <span>Duration:</span>
                <strong>${booking.checkIn} → ${booking.checkOut}</strong>
            </div>

            <div class="booking-detail-row">
                <span>Booked On:</span>
                <span style="font-size:11px;color:var(--text-muted);">${booking.bookingDate}</span>
            </div>

            <div style="margin-top:8px;">
                <button type="button" class="btn btn-danger-outline btn-cancel-booking" data-index="${index}" style="width:100%;">
                    Cancel Reservation
                </button>
            </div>
        `;

        bookingList.appendChild(card);
    });

    // Attach cancel listeners
    document.querySelectorAll(".btn-cancel-booking").forEach(btn => {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.dataset.index, 10);
            cancelBooking(idx);
        });
    });
}

function cancelBooking(index) {
    const booking = bookings[index];
    if (!booking) return;

    const roomNumber = booking.room;
    bookings.splice(index, 1);
    localStorage.setItem("hostelBookings", JSON.stringify(bookings));

    // Revert room status
    const room = rooms.find(r => r.number === roomNumber);
    if (room) {
        room.status = "available";

        const labelObj = roomLabels.find(l => l.number === roomNumber);
        if (labelObj) {
            labelObj.element.className = "room-floating-label available";
            labelObj.meshBeacon.material = matAvail;
            labelObj.ringBeacon.material.color.setHex(0x10b981);
        }
    }

    showToast(`Reservation for Room ${roomNumber} has been canceled.`);
    renderRoomGrid();
    updateStats();
    displayBookings();
}

if (btnClearBookings) {
    btnClearBookings.addEventListener("click", () => {
        if (bookings.length === 0) {
            showToast("No bookings to clear!");
            return;
        }

        if (confirm("Are you sure you want to clear all hostel bookings?")) {
            bookings = [];
            localStorage.removeItem("hostelBookings");

            rooms.forEach(room => {
                room.status = "available";
            });

            roomLabels.forEach(l => {
                l.element.className = "room-floating-label available";
                l.meshBeacon.material = matAvail;
                l.ringBeacon.material.color.setHex(0x10b981);
            });

            showToast("All bookings cleared. All rooms are now available!");
            renderRoomGrid();
            updateStats();
            displayBookings();
        }
    });
}

// ==========================================================================
// 12. CAMERA PRESETS, VIEW CONTROLS & EVENT LISTENERS
// ==========================================================================

// Camera Presets (tuned to centered hostel dimensions)
const CAMERA_PRESETS = {
    front: { pos: new THREE.Vector3(0, 22, 78), target: new THREE.Vector3(0, -1, 15) },
    east:  { pos: new THREE.Vector3(82, 22, -2.5), target: new THREE.Vector3(15, -1, -2.5) },
    west:  { pos: new THREE.Vector3(-82, 22, -2.5), target: new THREE.Vector3(-15, -1, -2.5) },
    back:  { pos: new THREE.Vector3(0, 22, -82), target: new THREE.Vector3(0, -1, -15) },
    top:   { pos: new THREE.Vector3(0, 105, 0), target: new THREE.Vector3(0, -1, -2.5) },
    reset: { pos: DEFAULT_CAM_POS.clone(), target: DEFAULT_TARGET.clone() }
};

document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        const view = this.dataset.view;
        const preset = CAMERA_PRESETS[view];
        if (preset) {
            cameraTargetPos = preset.pos.clone();
            cameraLookTarget = preset.target.clone();
        }
    });
});

// Toggle Labels button
const btnToggleLabels = document.getElementById("btnToggleLabels");
const labelToggleText = document.getElementById("labelToggleText");
if (btnToggleLabels) {
    btnToggleLabels.addEventListener("click", () => {
        showLabels = !showLabels;
        if (labelToggleText) labelToggleText.textContent = showLabels ? "On" : "Off";
        updateRoomLabels();
    });
}

// Auto-Rotate button
const btnAutoRotate = document.getElementById("btnAutoRotate");
if (btnAutoRotate) {
    btnAutoRotate.addEventListener("click", function () {
        isRotating = !isRotating;
        controls.autoRotate = isRotating;
        controls.autoRotateSpeed = 1.4;
        this.style.background = isRotating ? "var(--primary)" : "transparent";
        this.style.color = isRotating ? "white" : "var(--text-secondary)";
    });
}

// Filter Tabs
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        currentFilter = this.dataset.filter;
        renderRoomGrid();
    });
});

// Simple Toast Notification helper
function showToast(text, type = "info") {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "24px";
        toast.style.background = "rgba(15, 23, 42, 0.95)";
        toast.style.border = "1px solid rgba(99, 102, 241, 0.5)";
        toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
        toast.style.color = "white";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "10px";
        toast.style.fontSize = "13px";
        toast.style.fontWeight = "600";
        toast.style.zIndex = "999";
        toast.style.transition = "all 0.3s ease";
        toast.style.transform = "translateY(100px)";
        toast.style.opacity = "0";
        document.body.appendChild(toast);
    }

    toast.textContent = text;
    if (type === "error") {
        toast.style.border = "1px solid rgba(244, 63, 94, 0.6)";
    } else {
        toast.style.border = "1px solid rgba(99, 102, 241, 0.5)";
    }

    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.transform = "translateY(100px)";
        toast.style.opacity = "0";
    }, 3200);
}

// ==========================================================================
// 13. WINDOW RESIZE & ANIMATION LOOP
// ==========================================================================

window.addEventListener("resize", function () {
    if (!viewer || !camera || !renderer) return;
    camera.aspect = viewer.clientWidth / viewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
});

let clock = new THREE.Clock();

function animate() {
    if (!viewer || !renderer || !scene || !camera) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Smooth Camera Transition when clicking presets or rooms
    if (cameraTargetPos) {
        camera.position.lerp(cameraTargetPos, 0.06);
        if (camera.position.distanceTo(cameraTargetPos) < 0.2) {
            cameraTargetPos = null;
        }
    }

    if (cameraLookTarget && controls) {
        controls.target.lerp(cameraLookTarget, 0.06);
        if (controls.target.distanceTo(cameraLookTarget) < 0.2) {
            cameraLookTarget = null;
        }
    }

    // Pulse beacon rings in 3D scene
    roomLabels.forEach(r => {
        if (r.ringBeacon) {
            const scale = 1 + 0.18 * Math.sin(elapsedTime * 3 + parseFloat(r.number));
            r.ringBeacon.scale.set(scale, scale, 1);
        }
    });

    if (controls) controls.update();
    updateRoomLabels();

    renderer.render(scene, camera);
}

if (viewer) {
    animate();
}

// ==========================================================================
// 14. INITIAL URL PARAMETER & HASH ROUTING
// ==========================================================================

function handleInitialParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    const tabParam = urlParams.get("tab") || (window.location.hash ? window.location.hash.replace("#", "") : null);

    if (tabParam && viewPreview && viewBooking) {
        switchTab(tabParam);
    }

    if (roomParam) {
        setTimeout(() => {
            selectRoom(roomParam, !!viewer);
            if (!viewer && bookingForm) {
                const bookingSection = document.getElementById("bookingSection");
                if (bookingSection) {
                    bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                const nameInput = document.getElementById("studentName");
                if (nameInput) nameInput.focus();
            }
        }, 400);
    }
}

handleInitialParams();