const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const titleEl = document.querySelector(".hud h1");
const descriptionEl = document.querySelector(".hud p");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartButton = document.getElementById("restart");
const actionButton = document.getElementById("actionButton");
const gameModeSelect = document.getElementById("gameMode");
const contraptionTypeWrap = document.getElementById("contraptionTypeWrap");
const contraptionTypeSelect = document.getElementById("contraptionType");
const dominoLevelWrap = document.getElementById("dominoLevelWrap");
const dominoLevelSelect = document.getElementById("dominoLevelSelect");
const easyModeToggle = document.getElementById("easyMode");
const bugDensityWrap = document.querySelector(".density-toggle");
const bugDensitySlider = document.getElementById("bugDensity");
const bugDensityValueEl = document.getElementById("bugDensityValue");
const musicEnabledToggle = document.getElementById("musicEnabled");
const sfxEnabledToggle = document.getElementById("sfxEnabled");
const pinballSpeedWrap = document.getElementById("pinballSpeedWrap");
const pinballSpeedSlider = document.getElementById("pinballSpeed");
const pinballSpeedValueEl = document.getElementById("pinballSpeedValue");
const touchOverlayEl = document.querySelector(".touch-overlay");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const expandButton = document.getElementById("expandButton");
const jumpButton = document.getElementById("jumpButton");
const swatButton = document.getElementById("swatButton");
const gameStageEl = document.querySelector(".game-stage");
const ASSET_VERSION = "20260314j";

const world = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.48,
};

const keys = {
  left: false,
  right: false,
  jump: false,
  swat: false,
};

const touchState = { immersiveMode: false };

const levels = [
  {
    name: "Sunny Start",
    background: {
      skyTop: "#6ec2ff",
      skyBottom: "#dff7ff",
      grass: "#6bbb5a",
      hill: "#9ddb75",
      hillFar: "#c7ec98",
      sun: "#ffd35c",
      cloud: "rgba(255,255,255,0.82)",
      platformTop: "#5cb85c",
      platformBody: "#8c5a36",
      puddle: "#67a9d9",
      accent: "#ffb703",
      theme: "meadow",
    },
    start: { x: 40, y: 408 },
    platforms: [
      { x: 0, y: 470, width: 960, height: 70, type: "ground" },
      { x: 120, y: 390, width: 180, height: 16, type: "platform" },
      { x: 390, y: 320, width: 180, height: 16, type: "platform" },
      { x: 650, y: 250, width: 170, height: 16, type: "platform" },
      { x: 700, y: 390, width: 150, height: 16, type: "platform" },
    ],
    rainbows: [
      { x: 205, y: 345 },
      { x: 470, y: 275 },
      { x: 730, y: 205 },
      { x: 790, y: 345 },
      { x: 900, y: 425 },
    ],
    bugs: [
      { x: 150, y: 448, minX: 40, maxX: 300, speed: 1.4, species: "beetle", color: "#e76f51" },
      { x: 460, y: 298, minX: 390, maxX: 540, speed: 1.2, species: "caterpillar", color: "#43aa8b" },
      { x: 720, y: 368, minX: 700, maxX: 820, speed: 1.7, species: "spider", color: "#577590" },
    ],
    fireflies: [
      { x: 820, y: 160, minY: 120, maxY: 280, speed: 1.6, species: "firefly", color: "#f9c74f" },
    ],
    puddles: [],
    springs: [],
    breezes: [],
  },
  {
    name: "Cloudy Garden",
    background: {
      skyTop: "#88b8ff",
      skyBottom: "#f5f1ff",
      grass: "#5cae63",
      hill: "#9fd77f",
      hillFar: "#d8efb4",
      sun: "#fff1c1",
      cloud: "rgba(247,244,255,0.86)",
      platformTop: "#7dc06d",
      platformBody: "#76503c",
      puddle: "#7bb4ea",
      accent: "#ff8fab",
      theme: "garden",
    },
    start: { x: 30, y: 408 },
    platforms: [
      { x: 0, y: 470, width: 960, height: 70, type: "ground" },
      { x: 90, y: 400, width: 130, height: 16, type: "platform" },
      { x: 280, y: 345, width: 140, height: 16, type: "platform" },
      { x: 470, y: 292, width: 135, height: 16, type: "platform" },
      { x: 670, y: 238, width: 120, height: 16, type: "platform" },
      { x: 800, y: 330, width: 110, height: 16, type: "platform" },
    ],
    rainbows: [
      { x: 150, y: 355 },
      { x: 340, y: 300 },
      { x: 525, y: 247 },
      { x: 725, y: 193 },
      { x: 855, y: 285 },
      { x: 925, y: 425 },
    ],
    bugs: [
      { x: 110, y: 448, minX: 20, maxX: 230, speed: 1.8, species: "beetle", color: "#f94144" },
      { x: 315, y: 323, minX: 280, maxX: 420, speed: 1.5, species: "caterpillar", color: "#90be6d" },
      { x: 690, y: 216, minX: 670, maxX: 790, speed: 2.1, species: "spider", color: "#9b5de5" },
      { x: 855, y: 308, minX: 800, maxX: 910, speed: 1.6, species: "ladybug", color: "#f15bb5" },
    ],
    fireflies: [
      { x: 560, y: 180, minY: 140, maxY: 300, speed: 1.6, species: "firefly", color: "#fee440" },
      { x: 845, y: 160, minY: 120, maxY: 320, speed: 2.1, species: "dragonfly", color: "#00bbf9" },
    ],
    puddles: [
      { x: 610, y: 454, width: 110, height: 16 },
    ],
    springs: [],
    breezes: [],
  },
  {
    name: "Rainbow Ridge",
    background: {
      skyTop: "#7f8cff",
      skyBottom: "#ffd9a8",
      grass: "#4b944b",
      hill: "#c5d96d",
      hillFar: "#f5c973",
      sun: "#ff9f1c",
      cloud: "rgba(255,231,210,0.7)",
      platformTop: "#7fd06f",
      platformBody: "#7d4d33",
      puddle: "#5fa8d3",
      accent: "#ff4d6d",
      theme: "sunset",
    },
    start: { x: 20, y: 408 },
    platforms: [
      { x: 0, y: 470, width: 960, height: 70, type: "ground" },
      { x: 70, y: 410, width: 95, height: 16, type: "platform" },
      { x: 220, y: 355, width: 105, height: 16, type: "platform" },
      { x: 385, y: 300, width: 115, height: 16, type: "platform" },
      { x: 555, y: 250, width: 115, height: 16, type: "platform" },
      { x: 720, y: 195, width: 110, height: 16, type: "platform" },
      { x: 815, y: 330, width: 90, height: 16, type: "platform" },
    ],
    rainbows: [
      { x: 115, y: 365 },
      { x: 270, y: 310 },
      { x: 438, y: 255 },
      { x: 610, y: 205 },
      { x: 775, y: 150 },
      { x: 860, y: 285 },
      { x: 930, y: 425 },
    ],
    bugs: [
      { x: 70, y: 448, minX: 0, maxX: 160, speed: 2.2, species: "beetle", color: "#f3722c" },
      { x: 235, y: 333, minX: 220, maxX: 325, speed: 1.9, species: "ladybug", color: "#ff006e" },
      { x: 575, y: 228, minX: 555, maxX: 670, speed: 2.3, species: "spider", color: "#8338ec" },
      { x: 828, y: 308, minX: 815, maxX: 905, speed: 2.1, species: "caterpillar", color: "#06d6a0" },
      { x: 435, y: 448, minX: 360, maxX: 500, speed: 2.4, species: "bee", color: "#ffbe0b" },
    ],
    fireflies: [
      { x: 350, y: 160, minY: 120, maxY: 330, speed: 2.2, species: "dragonfly", color: "#3a86ff" },
      { x: 700, y: 120, minY: 90, maxY: 250, speed: 2.5, species: "firefly", color: "#ffd166" },
    ],
    puddles: [
      { x: 505, y: 454, width: 90, height: 16 },
      { x: 660, y: 454, width: 95, height: 16 },
    ],
    springs: [],
    breezes: [],
  },
  {
    name: "Moonbeam Marsh",
    background: {
      skyTop: "#22356f",
      skyBottom: "#9cc8ff",
      grass: "#46754f",
      hill: "#6aa06c",
      hillFar: "#98c49c",
      sun: "#f5f3c1",
      cloud: "rgba(223,236,255,0.72)",
      platformTop: "#79c776",
      platformBody: "#5d3f2d",
      puddle: "#83b7f0",
      accent: "#8ecae6",
      theme: "moon",
    },
    start: { x: 28, y: 408 },
    platforms: [
      { x: 0, y: 470, width: 960, height: 70, type: "ground" },
      { x: 120, y: 404, width: 120, height: 16, type: "platform" },
      { x: 295, y: 350, width: 110, height: 16, type: "platform" },
      { x: 468, y: 298, width: 125, height: 16, type: "platform" },
      { x: 650, y: 244, width: 135, height: 16, type: "platform" },
      { x: 785, y: 334, width: 120, height: 16, type: "platform" },
    ],
    rainbows: [
      { x: 176, y: 360 },
      { x: 350, y: 305 },
      { x: 530, y: 252 },
      { x: 710, y: 199 },
      { x: 845, y: 288 },
      { x: 928, y: 423 },
    ],
    bugs: [
      { x: 80, y: 448, minX: 18, maxX: 220, speed: 1.9, species: "beetle", color: "#f3722c" },
      { x: 320, y: 328, minX: 295, maxX: 405, speed: 1.7, species: "spider", color: "#5e60ce" },
      { x: 492, y: 276, minX: 468, maxX: 593, speed: 1.8, species: "ladybug", color: "#ff006e" },
      { x: 680, y: 222, minX: 650, maxX: 785, speed: 2.2, species: "bee", color: "#ffd166" },
      { x: 815, y: 312, minX: 785, maxX: 905, speed: 1.9, species: "caterpillar", color: "#80ed99" },
    ],
    fireflies: [
      { x: 245, y: 172, minY: 124, maxY: 300, speed: 1.8, species: "firefly", color: "#ffee93" },
      { x: 610, y: 145, minY: 90, maxY: 280, speed: 2.1, species: "dragonfly", color: "#90e0ef" },
      { x: 855, y: 142, minY: 100, maxY: 330, speed: 2.3, species: "firefly", color: "#ffd166" },
    ],
    puddles: [
      { x: 235, y: 454, width: 90, height: 16 },
      { x: 586, y: 454, width: 118, height: 16 },
    ],
    springs: [
      { x: 418, y: 452, width: 48, height: 18, power: 16.6 },
      { x: 915, y: 452, width: 42, height: 18, power: 15.7 },
    ],
    breezes: [
      { x: 728, y: 170, width: 70, height: 190, forceX: 0.16, forceY: -0.44 },
    ],
  },
  {
    name: "Skybridge Shuffle",
    background: {
      skyTop: "#54b9ff",
      skyBottom: "#fff0b8",
      grass: "#4d9954",
      hill: "#88c977",
      hillFar: "#c9ec9b",
      sun: "#ffcf56",
      cloud: "rgba(255,255,255,0.84)",
      platformTop: "#71cb91",
      platformBody: "#7e5938",
      puddle: "#75b9e8",
      accent: "#fb8500",
      theme: "skybridge",
    },
    start: { x: 18, y: 408 },
    platforms: [
      { x: 0, y: 470, width: 960, height: 70, type: "ground" },
      { x: 80, y: 414, width: 92, height: 16, type: "platform" },
      { x: 215, y: 360, width: 98, height: 16, type: "platform" },
      { x: 370, y: 308, width: 102, height: 16, type: "platform" },
      { x: 535, y: 252, width: 108, height: 16, type: "platform" },
      { x: 706, y: 205, width: 104, height: 16, type: "platform" },
      { x: 834, y: 320, width: 92, height: 16, type: "platform" },
    ],
    rainbows: [
      { x: 122, y: 369 },
      { x: 264, y: 315 },
      { x: 421, y: 263 },
      { x: 589, y: 207 },
      { x: 759, y: 160 },
      { x: 878, y: 275 },
      { x: 936, y: 423 },
    ],
    bugs: [
      { x: 48, y: 448, minX: 8, maxX: 170, speed: 2.4, species: "beetle", color: "#e76f51" },
      { x: 236, y: 338, minX: 215, maxX: 313, speed: 2.0, species: "ladybug", color: "#ff4d6d" },
      { x: 390, y: 286, minX: 370, maxX: 472, speed: 2.3, species: "spider", color: "#6a4c93" },
      { x: 553, y: 230, minX: 535, maxX: 643, speed: 2.2, species: "caterpillar", color: "#52b788" },
      { x: 725, y: 183, minX: 706, maxX: 810, speed: 2.6, species: "bee", color: "#ffbe0b" },
      { x: 850, y: 298, minX: 834, maxX: 926, speed: 2.1, species: "spider", color: "#4361ee" },
    ],
    fireflies: [
      { x: 318, y: 138, minY: 88, maxY: 278, speed: 2.4, species: "dragonfly", color: "#4cc9f0" },
      { x: 640, y: 114, minY: 74, maxY: 230, speed: 2.5, species: "firefly", color: "#fff08a" },
      { x: 900, y: 128, minY: 80, maxY: 330, speed: 2.7, species: "dragonfly", color: "#90f1ef" },
    ],
    puddles: [
      { x: 482, y: 454, width: 96, height: 16 },
      { x: 648, y: 454, width: 104, height: 16 },
    ],
    springs: [
      { x: 176, y: 452, width: 40, height: 18, power: 15.8 },
      { x: 657, y: 452, width: 40, height: 18, power: 17.2 },
    ],
    breezes: [
      { x: 336, y: 118, width: 74, height: 252, forceX: 0.12, forceY: -0.48 },
      { x: 810, y: 110, width: 68, height: 232, forceX: -0.18, forceY: -0.42 },
    ],
  },
];

let player;
let bugs;
let rainbows;
let fireflies;
let puddles;
let springs;
let breezes;
let levelIndex;
let levelState;
let audioState;
let easyMode = false;
let gameMode = "platformer";
let dominoLevelIndex = 0;
let dominoState;
let dominoTotalScore = 0;
let selectedContraptionType = "domino";
let musicEnabled = true;
let sfxEnabled = true;
let dominoDragState = null;
let bugDensity = 100;
let pinballState;
let pinballSpeed = 100;
const boySpritePaths = {
  idle: `assets/boy-idle.png?v=${ASSET_VERSION}`,
  happy: `assets/boy-happy.png?v=${ASSET_VERSION}`,
  excited: `assets/boy-happy.png?v=${ASSET_VERSION}`,
  sad: `assets/boy-sad.png?v=${ASSET_VERSION}`,
};
const boySprites = {};
const boySpriteStatus = {};
const contraptionOrder = ["domino", "ramp", "marble", "funnel", "car"];
const contraptionStats = {
  domino: { label: "Domino", short: "D", reach: 60, score: 12 },
  ramp: { label: "Ramp", short: "R", reach: 92, score: 20 },
  marble: { label: "Marble", short: "M", reach: 78, score: 18 },
  funnel: { label: "Funnel", short: "F", reach: 70, score: 22 },
  car: { label: "Car", short: "C", reach: 96, score: 26 },
};

const dominoLevels = [
  {
    name: "Snack Bridge",
    palette: {
      skyTop: "#ffe7ba",
      skyBottom: "#fff8ef",
      floor: "#d7a86e",
      accent: "#ff9f1c",
      obstacle: "#9c6644",
      cookie: "#d39b54",
    },
    boyX: 105,
    trackY: 440,
    switchX: 640,
    gateX: 780,
    cookieStartX: 860,
    pieceMinX: 175,
    pieceMaxX: 615,
    inventory: { domino: 3, ramp: 1, marble: 1, funnel: 1, car: 0 },
    maxGap: 62,
    switchReachX: 560,
    smashReachX: 0,
    bugX: 515,
    boostPads: [
      { x: 420, kind: "fan", bonusReach: 24, affects: ["domino", "ramp", "funnel"] },
    ],
    bonusStars: [
      { x: 455, y: 368, points: 20 },
    ],
    hint: "A simple bridge works here. Save specialty pieces for bonus points.",
    targets: { bronze: 120, silver: 155, gold: 185 },
  },
  {
    name: "Marble Kitchen",
    palette: {
      skyTop: "#daf0ff",
      skyBottom: "#fff6fd",
      floor: "#b8c4d6",
      accent: "#ef476f",
      obstacle: "#6c7a89",
      cookie: "#c78b4f",
    },
    boyX: 95,
    trackY: 430,
    switchX: 610,
    gateX: 760,
    cookieStartX: 850,
    pieceMinX: 165,
    pieceMaxX: 660,
    inventory: { domino: 3, ramp: 1, marble: 1, funnel: 1, car: 1 },
    maxGap: 78,
    switchReachX: 575,
    smashReachX: 715,
    bugX: 655,
    boostPads: [
      { x: 360, kind: "fan", bonusReach: 22, affects: ["ramp", "funnel"] },
      { x: 565, kind: "rocket", bonusReach: 38, affects: ["marble", "car"] },
    ],
    bonusStars: [
      { x: 392, y: 352, points: 25 },
      { x: 620, y: 336, points: 35 },
    ],
    hint: "The wider middle gap rewards a ramp into marble or car finish.",
    targets: { bronze: 145, silver: 185, gold: 225 },
  },
  {
    name: "Rocket Picnic",
    palette: {
      skyTop: "#bdb2ff",
      skyBottom: "#ffe5ec",
      floor: "#9ad17b",
      accent: "#3a86ff",
      obstacle: "#735d78",
      cookie: "#d9a15f",
    },
    boyX: 100,
    trackY: 435,
    switchX: 665,
    gateX: 805,
    cookieStartX: 885,
    pieceMinX: 175,
    pieceMaxX: 720,
    inventory: { domino: 2, ramp: 2, marble: 1, funnel: 1, car: 1 },
    maxGap: 82,
    switchReachX: 650,
    smashReachX: 785,
    bugX: 735,
    boostPads: [
      { x: 330, kind: "fan", bonusReach: 20, affects: ["domino", "ramp", "funnel"] },
      { x: 545, kind: "rocket", bonusReach: 34, affects: ["marble", "car"] },
      { x: 690, kind: "rocket", bonusReach: 30, affects: ["car"] },
    ],
    bonusStars: [
      { x: 350, y: 342, points: 25 },
      { x: 585, y: 318, points: 30 },
      { x: 735, y: 300, points: 40 },
    ],
    hint: "This one wants a combo. Try using momentum pieces late for a big finish.",
    targets: { bronze: 165, silver: 210, gold: 255 },
  },
  {
    name: "Pantry Pinball",
    palette: {
      skyTop: "#fff0cc",
      skyBottom: "#ffe1f0",
      floor: "#d7b47d",
      accent: "#ff6b6b",
      obstacle: "#7c5535",
      cookie: "#c98c53",
    },
    boyX: 96,
    trackY: 434,
    switchX: 662,
    gateX: 814,
    cookieStartX: 892,
    pieceMinX: 172,
    pieceMaxX: 744,
    inventory: { domino: 3, ramp: 2, marble: 1, funnel: 2, car: 1 },
    maxGap: 80,
    switchReachX: 670,
    smashReachX: 792,
    bugX: 706,
    boostPads: [
      { x: 296, kind: "fan", bonusReach: 24, affects: ["domino", "ramp", "funnel"] },
      { x: 486, kind: "rocket", bonusReach: 36, affects: ["marble", "car"] },
      { x: 628, kind: "fan", bonusReach: 18, affects: ["funnel", "ramp"] },
    ],
    bonusStars: [
      { x: 318, y: 350, points: 20 },
      { x: 518, y: 328, points: 30 },
      { x: 650, y: 310, points: 40 },
    ],
    hint: "This layout likes a mixed chain. Use the fan pads to stretch ordinary pieces before a strong finish.",
    targets: { bronze: 190, silver: 240, gold: 290 },
  },
  {
    name: "Comet Cookie Lab",
    palette: {
      skyTop: "#d9f4ff",
      skyBottom: "#e8dbff",
      floor: "#b8c6d8",
      accent: "#3a86ff",
      obstacle: "#5a6472",
      cookie: "#d0a05d",
    },
    boyX: 104,
    trackY: 428,
    switchX: 690,
    gateX: 835,
    cookieStartX: 910,
    pieceMinX: 184,
    pieceMaxX: 768,
    inventory: { domino: 2, ramp: 2, marble: 2, funnel: 1, car: 1 },
    maxGap: 84,
    switchReachX: 700,
    smashReachX: 820,
    bugX: 748,
    boostPads: [
      { x: 278, kind: "fan", bonusReach: 22, affects: ["domino", "ramp"] },
      { x: 438, kind: "rocket", bonusReach: 34, affects: ["marble", "car"] },
      { x: 586, kind: "fan", bonusReach: 24, affects: ["funnel", "ramp"] },
      { x: 720, kind: "rocket", bonusReach: 26, affects: ["car", "marble"] },
    ],
    bonusStars: [
      { x: 300, y: 344, points: 25 },
      { x: 468, y: 322, points: 30 },
      { x: 618, y: 300, points: 35 },
      { x: 770, y: 282, points: 45 },
    ],
    hint: "This one is built around chaining multiple boost pads. A careless bridge works, but a clever route scores much higher.",
    targets: { bronze: 225, silver: 280, gold: 335 },
  },
];

function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    width: 40,
    height: 58,
    vx: 0,
    vy: 0,
    speed: 4.4,
    jumpPower: 11.35,
    onGround: false,
    facing: 1,
    invincibleTimer: 0,
    mood: "happy",
    moodTimer: 0,
    swatTimer: 0,
  };
}

function loadBoySprites() {
  Object.entries(boySpritePaths).forEach(([mood, path]) => {
    const image = new Image();
    boySpriteStatus[mood] = "loading";
    image.onload = () => {
      boySpriteStatus[mood] = "loaded";
    };
    image.onerror = () => {
      boySpriteStatus[mood] = "error";
    };
    image.src = path;
    boySprites[mood] = image;
  });
}

function drawBoyFromSheet(mood) {
  const spriteMood = boySprites[mood] ? mood : "idle";
  const sprite = boySprites[spriteMood];
  if (!sprite || !sprite.complete || sprite.naturalWidth <= 0) {
    return false;
  }
  ctx.drawImage(
    sprite,
    -46,
    -48,
    92,
    92,
  );

  return true;
}

function isBoySpriteReady(mood) {
  return boySpriteStatus[mood] === "loaded";
}

function isAnyBoySpriteLoading() {
  return Object.values(boySpriteStatus).some((status) => status === "loading");
}

function createDominoPiece(type, x, y) {
  return {
    id: Math.random().toString(36).slice(2, 10),
    pieceType: type,
    x,
    y,
    angle: 0,
    triggered: false,
    failed: false,
  };
}

function loadDominoLevel(index) {
  const level = dominoLevels[index];
  dominoLevelIndex = index;
  dominoState = {
    pieces: [],
    inventory: { ...level.inventory },
    chainStarted: false,
    elapsed: 0,
    activeIndex: -1,
    attempts: 0,
    switchHit: false,
    gateOpen: false,
    gateLift: 0,
    cookieX: level.cookieStartX,
    cookieY: level.trackY - 18,
    cookieReleased: false,
    won: false,
    outcome: null,
    bugHit: false,
    lastScore: 0,
    medal: null,
    points: dominoTotalScore,
    solvable: false,
    collectedBonusPoints: 0,
    bonusStars: (level.bonusStars || []).map((star) => ({
      ...star,
      collected: false,
    })),
    message: `${level.hint} Select a piece, tap the lane to place it, drag to move it, tap matching piece to remove it.`,
  };
  dominoState.solvable = isDominoLevelSolvable(level);
  dominoDragState = null;
  dominoLevelSelect.value = String(index);
  updateHud();
}

function resetDominoGame() {
  loadDominoLevel(0);
}

function restartDominoLevel() {
  loadDominoLevel(dominoLevelIndex);
}

function ensureAudio() {
  if (audioState) {
    if (audioState.context.state === "suspended") {
      audioState.context.resume();
    }
    return audioState;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }

  const context = new AudioCtx();
  const master = context.createGain();
  master.gain.value = 0.42;
  master.connect(context.destination);

  const musicGain = context.createGain();
  musicGain.gain.value = musicEnabled ? 0.32 : 0;
  musicGain.connect(master);

  const sfxGain = context.createGain();
  sfxGain.gain.value = sfxEnabled ? 1 : 0;
  sfxGain.connect(master);

  audioState = {
    context,
    master,
    musicGain,
    sfxGain,
    started: false,
    nextNoteTime: 0,
    noteIndex: 0,
    beatLength: 0.25,
    chordLength: 1,
    melody: [76, 79, 81, 79, 74, 76, 79, 83, 81, 79, 76, 74, 72, 74, 76, 79],
    bass: [48, 48, 53, 53, 45, 45, 50, 50],
  };

  return audioState;
}

function midiToHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function playTone(frequency, startTime, duration, type, volume, destination) {
  const osc = destination.context.createOscillator();
  const gain = destination.context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playEventSound(kind) {
  const audio = ensureAudio();
  if (!audio) {
    return;
  }

  const now = audio.context.currentTime;
  if (kind === "rainbow") {
    playTone(midiToHz(79), now, 0.2, "triangle", 0.12, audio.sfxGain);
    playTone(midiToHz(83), now + 0.08, 0.24, "triangle", 0.1, audio.sfxGain);
    playTone(midiToHz(86), now + 0.16, 0.3, "sine", 0.08, audio.sfxGain);
  } else if (kind === "bug") {
    playTone(midiToHz(52), now, 0.18, "sawtooth", 0.1, audio.sfxGain);
    playTone(midiToHz(47), now + 0.07, 0.24, "square", 0.08, audio.sfxGain);
  }
}

function scheduleMusic() {
  const audio = ensureAudio();
  if (!audio || !audio.started) {
    return;
  }

  const scheduleAhead = 0.8;
  while (audio.nextNoteTime < audio.context.currentTime + scheduleAhead) {
    const melodyNote = audio.melody[audio.noteIndex % audio.melody.length];
    const bassNote = audio.bass[Math.floor(audio.noteIndex / 2) % audio.bass.length];
    const start = audio.nextNoteTime;

    playTone(midiToHz(bassNote), start, 0.32, "square", 0.05, audio.musicGain);
    playTone(midiToHz(melodyNote), start, 0.18, "triangle", 0.045, audio.musicGain);

    if (audio.noteIndex % 4 === 2) {
      playTone(midiToHz(melodyNote + 7), start, 0.14, "sine", 0.02, audio.musicGain);
    }

    audio.nextNoteTime += audio.beatLength;
    audio.noteIndex += 1;
  }
}

function startMusic() {
  const audio = ensureAudio();
  if (!audio || audio.started) {
    return;
  }

  audio.started = true;
  audio.nextNoteTime = audio.context.currentTime + 0.05;
  audio.noteIndex = 0;
}

function loadLevel(index, resetLives) {
  const level = levels[index];
  levelIndex = index;
  player = createPlayer(level.start);

  const safeZone = {
    x: Math.max(0, level.start.x - 70),
    y: Math.max(0, level.start.y - 84),
    width: 180,
    height: 130,
  };

  bugs = buildScaledBugs(level.bugs, bugDensity).map((bug) => ({
    ...bug,
    width: 34,
    height: 22,
    direction: 1,
    bobPhase: Math.random() * Math.PI * 2,
    swatted: false,
  })).map((bug) => keepGroundHazardOutOfSafeZone(bug, safeZone));

  rainbows = level.rainbows.map((rainbow) => ({
    ...rainbow,
    width: 36,
    height: 20,
    collected: false,
  }));

  fireflies = buildScaledFireflies(level.fireflies, bugDensity).map((firefly) => ({
    ...firefly,
    width: 24,
    height: 24,
    direction: 1,
    baseX: firefly.x,
    bobPhase: Math.random() * Math.PI * 2,
    swatted: false,
  })).map((firefly) => keepFlyingHazardOutOfSafeZone(firefly, safeZone));

  puddles = level.puddles.map((puddle) => ({
    ...puddle,
  }));

  springs = (level.springs || []).map((spring) => ({
    ...spring,
    bounceTimer: 0,
  }));

  breezes = (level.breezes || []).map((breeze) => ({
    ...breeze,
  }));

  levelState = {
    lives: resetLives ? 3 : levelState.lives,
    collected: 0,
    total: rainbows.length,
    levelWon: false,
    gameWon: false,
    gameOver: false,
    message: `Level ${index + 1}: ${level.name}`,
  };

  updateHud();
}

function resetGame() {
  levelState = { lives: 3 };
  loadLevel(0, true);
}

function restartCurrentLevel() {
  levelState = { lives: 3 };
  loadLevel(levelIndex, true);
}

function createPinballBumpers() {
  return [
    { x: 240, y: 150, radius: 28, color: "#ff6b6b", value: 25 },
    { x: 480, y: 112, radius: 30, color: "#ffd166", value: 35 },
    { x: 710, y: 166, radius: 28, color: "#4cc9f0", value: 25 },
    { x: 345, y: 262, radius: 24, color: "#80ed99", value: 20 },
    { x: 620, y: 278, radius: 24, color: "#c77dff", value: 20 },
  ];
}

function createPinballBugTargets() {
  return [
    { x: 180, y: 248, radius: 18, species: "ladybug", color: "#ff5d8f", value: 60, active: true },
    { x: 780, y: 248, radius: 18, species: "beetle", color: "#f3722c", value: 60, active: true },
    { x: 480, y: 336, radius: 20, species: "bee", color: "#ffbe0b", value: 80, active: true },
  ];
}

function resetPinballGame() {
  pinballState = {
    score: 0,
    ballsLeft: 3,
    bumpers: createPinballBumpers(),
    bugTargets: createPinballBugTargets(),
    posts: [
      { x: 126, y: 212, radius: 12, color: "#ffffff", bounce: 1.04 },
      { x: 834, y: 212, radius: 12, color: "#ffffff", bounce: 1.04 },
      { x: 302, y: 398, radius: 14, color: "#ffd166", bounce: 1.08 },
      { x: 658, y: 398, radius: 14, color: "#ffd166", bounce: 1.08 },
      { x: 480, y: 432, radius: 16, color: "#ffffff", bounce: 1.1 },
    ],
    slingshots: [
      { points: [{ x: 284, y: 446 }, { x: 360, y: 414 }, { x: 332, y: 474 }], impulseX: -3.4, impulseY: -6.4, color: "#ff7a59" },
      { points: [{ x: 676, y: 446 }, { x: 600, y: 414 }, { x: 628, y: 474 }], impulseX: 3.4, impulseY: -6.4, color: "#c77dff" },
    ],
    flippers: {
      left: { pivotX: 360, pivotY: 485, length: 95, angle: -0.42, activeAngle: -1.02, active: false },
      right: { pivotX: 600, pivotY: 485, length: 95, angle: Math.PI + 0.42, activeAngle: Math.PI + 1.02, active: false },
    },
    ball: null,
    launchCharge: 0,
    launchHeld: false,
    gameOver: false,
    laneAwards: { left: false, right: false },
    message: "Hold launch and release to fire the rainbow ball.",
  };
  spawnPinballBall();
  updateHud();
}

function spawnPinballBall() {
  if (!pinballState || pinballState.ballsLeft <= 0) {
    return;
  }
  pinballState.ball = {
    x: 888,
    y: 438,
    vx: 0,
    vy: 0,
    radius: 12,
    inLauncher: true,
    alive: true,
  };
  pinballState.launchCharge = 0;
  pinballState.launchHeld = false;
  pinballState.laneAwards = { left: false, right: false };
  pinballState.bugTargets = createPinballBugTargets();
  pinballState.message = "Hold launch and release to fire the rainbow ball.";
}

function updateModeUi() {
  const platformerMode = gameMode === "platformer";
  const dominoMode = gameMode === "domino";
  const pinballMode = gameMode === "pinball";
  document.body.classList.toggle("pinball-mode", pinballMode);
  easyModeToggle.parentElement.style.display = platformerMode ? "inline-flex" : "none";
  bugDensityWrap.style.display = platformerMode ? "inline-flex" : "none";
  pinballSpeedWrap.style.display = pinballMode ? "inline-flex" : "none";
  contraptionTypeWrap.style.display = dominoMode ? "inline-flex" : "none";
  dominoLevelWrap.style.display = dominoMode ? "inline-flex" : "none";
  touchOverlayEl.style.display = platformerMode || pinballMode ? "flex" : "none";
  jumpButton.textContent = pinballMode ? "⤴" : "↑";
  swatButton.textContent = pinballMode ? "↺" : "✋";
  actionButton.style.display = "inline-flex";
  actionButton.textContent = platformerMode ? "Swat" : pinballMode ? "Launch" : "Start Chain";

  if (platformerMode) {
    titleEl.textContent = "J-Bug Version 1: Julian Searches for Rainbows";
    descriptionEl.textContent = "Help the little boy collect every rainbow, dodge bugs, and clear each level.";
  } else if (pinballMode) {
    titleEl.textContent = "J-Bug Version 3: Rainbow Pinball";
    descriptionEl.textContent = "Flip the rainbow ball through bumpers, bug targets, and glowing lanes to chase a big score.";
  } else {
    titleEl.textContent = "J-Bug Version 2: Julian's Domino Cookie Rescue";
    descriptionEl.textContent = "Place and drag dominos, ramps, marbles, funnels, and toy cars into a clever cookie rescue contraption.";
  }
}

function updateHud() {
  if (gameMode === "domino") {
    const level = dominoLevels[dominoLevelIndex];
    const inventoryText = contraptionOrder
      .map((type) => `${contraptionStats[type].short}:${dominoState.inventory[type]}`)
      .join(" ");
    levelEl.textContent = `Puzzle: ${dominoLevelIndex + 1} / ${dominoLevels.length}`;
    scoreEl.textContent = `Points: ${dominoTotalScore} | ${inventoryText}`;
    actionButton.textContent = dominoState.won ? "Next Puzzle" : "Start Chain";

    if (dominoState.won) {
      statusEl.textContent = `${dominoState.medal} result${dominoState.bugHit ? " with J-bug bonus" : ""}. ${
        dominoLevelIndex + 1 < dominoLevels.length ? "Press Start Chain for next puzzle." : "Every cookie rescued."
      }`;
      return;
    }

    const solvableText = dominoState.solvable ? "Validated solvable." : "This level needs tuning.";
    statusEl.textContent = `${dominoState.message} ${solvableText}`;
    return;
  }

  if (gameMode === "pinball") {
    levelEl.textContent = "Mode: Rainbow Pinball";
    scoreEl.textContent = `Score: ${pinballState.score} | Balls: ${pinballState.ballsLeft}`;
    actionButton.textContent = pinballState.gameOver ? "Play Again" : pinballState.ball?.inLauncher ? "Launch" : "Nudge";
    statusEl.textContent = pinballState.gameOver ? "Game over. Restart or Launch to play again." : pinballState.message;
    return;
  }

  levelEl.textContent = `Level: ${levelIndex + 1} / ${levels.length}`;
  scoreEl.textContent = `Rainbows: ${levelState.collected} / ${levelState.total} | Lives: ${levelState.lives}`;

  if (levelState.gameWon) {
    statusEl.textContent = "You cleared every level. Restart to play again.";
    return;
  }

  if (levelState.gameOver) {
    statusEl.textContent = "The bugs and hazards won. Restart to try again.";
    return;
  }

  if (levelState.levelWon) {
    statusEl.textContent = levelIndex + 1 < levels.length ? "Level cleared. Press jump to continue." : "All levels cleared.";
    return;
  }

  if (easyMode) {
    statusEl.textContent = `${levelState.message} Easy Mode is on.`;
    return;
  }

  statusEl.textContent = levelState.message;
}

function populateDominoLevelSelect() {
  dominoLevelSelect.innerHTML = "";
  dominoLevels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index + 1}. ${level.name}`;
    dominoLevelSelect.appendChild(option);
  });
  dominoLevelSelect.value = String(dominoLevelIndex);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scaleCount(baseCount, densityPercent) {
  return Math.max(0, Math.round(baseCount * (densityPercent / 100)));
}

function buildScaledBugs(baseBugs, densityPercent) {
  if (baseBugs.length === 0) {
    return [];
  }
  const targetCount = scaleCount(baseBugs.length, densityPercent);
  const result = [];

  for (let i = 0; i < targetCount; i += 1) {
    const base = { ...baseBugs[i % baseBugs.length] };
    if (i >= baseBugs.length) {
      const wave = Math.floor(i / baseBugs.length);
      const range = base.maxX - base.minX;
      const shift = 18 + wave * 26 + (i % baseBugs.length) * 10;
      base.minX = clamp(base.minX + shift, 0, world.width - range - 40);
      base.maxX = base.minX + range;
      base.x = clamp(base.x + shift, base.minX, base.maxX - 34);
      base.speed *= 1 + wave * 0.08;
    }
    result.push(base);
  }

  return result;
}

function buildScaledFireflies(baseFireflies, densityPercent) {
  if (baseFireflies.length === 0) {
    return [];
  }
  const targetCount = scaleCount(baseFireflies.length, densityPercent);
  const result = [];

  for (let i = 0; i < targetCount; i += 1) {
    const base = { ...baseFireflies[i % baseFireflies.length] };
    if (i >= baseFireflies.length) {
      const wave = Math.floor(i / baseFireflies.length);
      const shift = ((i + 1) * 37) % 120;
      base.x = clamp(base.x + shift - 40, 24, world.width - 48);
      base.minY = Math.max(70, base.minY - wave * 8);
      base.maxY = Math.min(world.height - 120, base.maxY + wave * 10);
      base.speed *= 1 + wave * 0.06;
    }
    result.push(base);
  }

  return result;
}

function overlapsSafeZone(rect, safeZone) {
  return (
    rect.x < safeZone.x + safeZone.width &&
    rect.x + rect.width > safeZone.x &&
    rect.y < safeZone.y + safeZone.height &&
    rect.y + rect.height > safeZone.y
  );
}

function keepGroundHazardOutOfSafeZone(bug, safeZone) {
  const hazardRect = { x: bug.x, y: bug.y, width: bug.width, height: bug.height };
  const patrolTouchesSafeZone = bug.maxX >= safeZone.x && bug.minX <= safeZone.x + safeZone.width;
  if (!overlapsSafeZone(hazardRect, safeZone) && !patrolTouchesSafeZone) {
    return bug;
  }

  const patrolWidth = bug.maxX - bug.minX;
  const preferredMinX = safeZone.x + safeZone.width + 18;
  const maxAllowedMinX = Math.max(0, world.width - patrolWidth - bug.width);

  if (preferredMinX <= maxAllowedMinX) {
    bug.minX = preferredMinX;
    bug.maxX = preferredMinX + patrolWidth;
    bug.x = clamp(bug.x, bug.minX, bug.maxX - bug.width);
    if (bug.x < bug.minX + 10) {
      bug.x = bug.minX + 10;
    }
    return bug;
  }

  const fallbackMaxX = Math.max(bug.width + patrolWidth, safeZone.x - 18);
  bug.maxX = fallbackMaxX;
  bug.minX = Math.max(0, fallbackMaxX - patrolWidth);
  bug.x = clamp(bug.x, bug.minX, bug.maxX - bug.width);
  if (bug.x > bug.maxX - bug.width - 10) {
    bug.x = bug.maxX - bug.width - 10;
  }
  return bug;
}

function keepFlyingHazardOutOfSafeZone(firefly, safeZone) {
  const flightTouchesSafeZoneX =
    firefly.baseX + 12 >= safeZone.x && firefly.baseX - 12 <= safeZone.x + safeZone.width;
  const flightTouchesSafeZoneY =
    firefly.maxY >= safeZone.y && firefly.minY <= safeZone.y + safeZone.height;

  if (!flightTouchesSafeZoneX || !flightTouchesSafeZoneY) {
    return firefly;
  }

  const preferredBaseX = safeZone.x + safeZone.width + 32;
  if (preferredBaseX <= world.width - 36) {
    firefly.baseX = preferredBaseX;
    firefly.x = preferredBaseX;
  } else {
    const fallbackBaseX = Math.max(36, safeZone.x - 32);
    firefly.baseX = fallbackBaseX;
    firefly.x = fallbackBaseX;
  }

  if (firefly.minY < safeZone.y + safeZone.height) {
    const lift = safeZone.y + safeZone.height - firefly.minY + 14;
    firefly.minY += lift;
    firefly.maxY += lift;
  }

  firefly.maxY = Math.min(firefly.maxY, world.height - 120);
  firefly.minY = Math.min(firefly.minY, firefly.maxY - 60);
  return firefly;
}

function getDominoComboReach(type, previousType) {
  let reach = contraptionStats[type].reach;
  if (type === "marble" && previousType === "ramp") {
    reach += 34;
  }
  if (type === "funnel" && previousType === "marble") {
    reach += 42;
  }
  if (type === "car" && previousType === "ramp") {
    reach += 48;
  }
  if (type === "ramp" && previousType === "funnel") {
    reach += 20;
  }
  return reach;
}

function getPadBonusForSegment(level, pieceType, startX, endX) {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  return (level.boostPads || []).reduce((sum, pad) => {
    if (pad.x < minX || pad.x > maxX || !pad.affects.includes(pieceType)) {
      return sum;
    }
    return sum + pad.bonusReach;
  }, 0);
}

function getSortedDominoPieces() {
  return [...dominoState.pieces].sort((a, b) => a.x - b.x);
}

function getPieceBounds(piece) {
  return {
    left: piece.x - 16,
    right: piece.x + 16,
    top: piece.y - 38,
    bottom: piece.y + 6,
  };
}

function findPieceAt(canvasX, canvasY) {
  if (!dominoState) {
    return null;
  }

  const pieces = [...dominoState.pieces].reverse();
  for (const piece of pieces) {
    const bounds = getPieceBounds(piece);
    if (canvasX >= bounds.left && canvasX <= bounds.right && canvasY >= bounds.top && canvasY <= bounds.bottom) {
      return piece;
    }
  }
  return null;
}

function isDominoLevelSolvable(level) {
  const inventoryEntries = contraptionOrder
    .map((type) => [type, level.inventory[type] || 0])
    .filter(([, count]) => count > 0);

  const memo = new Map();
  function search(previousType, targetType, counts, reachX) {
    if (reachX >= targetType) {
      return true;
    }

    const key = `${previousType}|${reachX}|${counts.join(",")}`;
    if (memo.has(key)) {
      return memo.get(key);
    }

    let solved = false;
    for (let i = 0; i < inventoryEntries.length; i += 1) {
      if (counts[i] <= 0) {
        continue;
      }
      const [type] = inventoryEntries[i];
      const nextCounts = [...counts];
      nextCounts[i] -= 1;
      const segmentEnd = reachX + getDominoComboReach(type, previousType);
      const nextReach = segmentEnd + getPadBonusForSegment(level, type, reachX, segmentEnd);
      if (search(type, targetType, nextCounts, nextReach)) {
        solved = true;
        break;
      }
    }

    memo.set(key, solved);
    return solved;
  }

  const counts = inventoryEntries.map(([, count]) => count);
  return search("start", level.switchReachX, counts, level.pieceMinX);
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function takeHit(message) {
  if (player.invincibleTimer > 0 || levelState.levelWon || levelState.gameOver || levelState.gameWon) {
    return;
  }

  levelState.lives -= 1;
  player.mood = "sad";
  player.moodTimer = 90;
  playEventSound("bug");
  if (levelState.lives <= 0) {
    levelState.gameOver = true;
    levelState.message = `${message} Try this level again.`;
    updateHud();
    return;
  }

  const start = levels[levelIndex].start;
  player.x = start.x;
  player.y = start.y;
  player.vx = 0;
  player.vy = 0;
  player.invincibleTimer = 120;
  levelState.message = `${message} Lives left: ${levelState.lives}`;
  updateHud();
}

function updatePlayer() {
  if (levelState.levelWon || levelState.gameWon || levelState.gameOver) {
    if (keys.jump && levelState.levelWon && levelIndex + 1 < levels.length) {
      loadLevel(levelIndex + 1, false);
    } else if (keys.jump && levelState.gameOver) {
      restartCurrentLevel();
    }
    return;
  }

  if (keys.left) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (keys.right) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx *= 0.72;
    if (Math.abs(player.vx) < 0.05) {
      player.vx = 0;
    }
  }

  if (keys.jump && player.onGround) {
    startMusic();
    player.vy = -player.jumpPower;
    player.onGround = false;
  }

  player.vy += world.gravity;
  player.x += player.vx;
  player.x = clamp(player.x, 0, world.width - player.width);

  player.y += player.vy;
  player.onGround = false;

  for (const platform of levels[levelIndex].platforms) {
    const landing =
      player.vy >= 0 &&
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      player.y + player.height >= platform.y &&
      player.y + player.height - player.vy <= platform.y;

    if (landing) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  for (const spring of springs) {
    if (spring.bounceTimer > 0) {
      spring.bounceTimer -= 1;
    }

    const landingOnSpring =
      player.vy >= 0 &&
      player.x + player.width > spring.x &&
      player.x < spring.x + spring.width &&
      player.y + player.height >= spring.y &&
      player.y + player.height - player.vy <= spring.y + 10;

    if (landingOnSpring) {
      player.y = spring.y - player.height;
      player.vy = -spring.power;
      player.onGround = false;
      spring.bounceTimer = 14;
      levelState.message = "Boing! Spring pad boost.";
    }
  }

  for (const breeze of breezes) {
    if (
      player.x + player.width > breeze.x &&
      player.x < breeze.x + breeze.width &&
      player.y + player.height > breeze.y &&
      player.y < breeze.y + breeze.height
    ) {
      player.vx += breeze.forceX;
      player.vy += breeze.forceY;
      if (player.vy < -player.jumpPower - 4) {
        player.vy = -player.jumpPower - 4;
      }
    }
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= 1;
  }

  if (keys.swat && player.swatTimer === 0) {
    performPlayerSwat();
  }

  if (player.swatTimer > 0) {
    player.swatTimer -= 1;
  }

  if (player.moodTimer > 0) {
    player.moodTimer -= 1;
  } else if (player.mood !== "happy") {
    player.mood = "happy";
  }
}

function updateBugs() {
  if (levelState.levelWon || levelState.gameOver || levelState.gameWon) {
    return;
  }

  for (const bug of bugs) {
    if (bug.swatted) {
      continue;
    }
    bug.x += bug.speed * bug.direction;
    if (bug.x <= bug.minX || bug.x + bug.width >= bug.maxX) {
      bug.direction *= -1;
    }

    if (bug.species === "bee") {
      bug.bobPhase += 0.08;
      bug.y += Math.sin(bug.bobPhase) * 0.9;
    }

    if (!easyMode && intersects(player, bug)) {
      takeHit("A bug got you.");
    }
  }
}

function updateFireflies() {
  if (levelState.levelWon || levelState.gameOver || levelState.gameWon) {
    return;
  }

  for (const firefly of fireflies) {
    if (firefly.swatted) {
      continue;
    }
    firefly.y += firefly.speed * firefly.direction;
    if (firefly.y <= firefly.minY || firefly.y + firefly.height >= firefly.maxY) {
      firefly.direction *= -1;
    }

    firefly.bobPhase += 0.12;
    firefly.x = firefly.baseX + Math.sin(firefly.bobPhase) * 12;

    if (!easyMode && intersects(player, firefly)) {
      takeHit("A buzzing bug flew into you.");
    }
  }
}

function updatePuddles() {
  if (levelState.levelWon || levelState.gameOver || levelState.gameWon) {
    return;
  }

  for (const puddle of puddles) {
    if (!easyMode && intersects(player, puddle)) {
      takeHit("You slipped in a muddy puddle.");
      break;
    }
  }
}

function updateRainbows() {
  if (levelState.levelWon || levelState.gameOver || levelState.gameWon) {
    return;
  }

  for (const rainbow of rainbows) {
    if (!rainbow.collected && intersects(player, rainbow)) {
      rainbow.collected = true;
      levelState.collected += 1;
      levelState.message = "Nice catch. Keep going.";
      player.mood = "excited";
      player.moodTimer = 75;
      playEventSound("rainbow");

      if (levelState.collected === levelState.total) {
        levelState.levelWon = true;
        if (levelIndex === levels.length - 1) {
          levelState.gameWon = true;
        }
      }

      updateHud();
    }
  }
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = levels[levelIndex].background.cloud;
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 18 * scale, y - 12 * scale, 22 * scale, Math.PI, 0);
  ctx.arc(x + 44 * scale, y, 18 * scale, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawBackground() {
  const palette = levels[levelIndex].background;
  const skyGradient = ctx.createLinearGradient(0, 0, 0, world.height);
  skyGradient.addColorStop(0, palette.skyTop);
  skyGradient.addColorStop(0.6, palette.skyBottom);
  skyGradient.addColorStop(0.6, palette.grass);
  skyGradient.addColorStop(1, palette.grass);

  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(860, 90, palette.theme === "sunset" ? 52 : palette.theme === "moon" ? 34 : 42, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(90, 100, 1.2);
  drawCloud(300, 70, 0.9);
  drawCloud(580, 120, 1.1);

  ctx.fillStyle = palette.hillFar;
  ctx.beginPath();
  ctx.arc(100, 560, 210, Math.PI, Math.PI * 2);
  ctx.arc(360, 545, 180, Math.PI, Math.PI * 2);
  ctx.arc(670, 560, 240, Math.PI, Math.PI * 2);
  ctx.arc(930, 550, 170, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.hill;
  ctx.beginPath();
  ctx.arc(170, 520, 170, Math.PI, Math.PI * 2);
  ctx.arc(460, 540, 210, Math.PI, Math.PI * 2);
  ctx.arc(820, 520, 180, Math.PI, Math.PI * 2);
  ctx.fill();

  if (palette.theme === "garden") {
    for (let i = 0; i < 10; i += 1) {
      const flowerX = 40 + i * 95;
      const flowerY = 462 + (i % 2) * 4;
      ctx.strokeStyle = "#4a8f45";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(flowerX, flowerY);
      ctx.lineTo(flowerX, flowerY - 18);
      ctx.stroke();
      ctx.fillStyle = i % 2 === 0 ? palette.accent : "#ffd166";
      ctx.beginPath();
      ctx.arc(flowerX, flowerY - 21, 5, 0, Math.PI * 2);
      ctx.arc(flowerX - 4, flowerY - 17, 4, 0, Math.PI * 2);
      ctx.arc(flowerX + 4, flowerY - 17, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (palette.theme === "sunset") {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(720 + i * 12, 60);
      ctx.lineTo(930 + i * 4, 130 + i * 8);
      ctx.stroke();
    }
  } else if (palette.theme === "moon") {
    for (let i = 0; i < 18; i += 1) {
      const starX = 40 + (i * 51) % 900;
      const starY = 38 + (i % 6) * 22;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.92)" : "rgba(255,248,200,0.86)";
      ctx.beginPath();
      ctx.arc(starX, starY, i % 4 === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(197, 225, 255, 0.35)";
    ctx.fillRect(0, 0, world.width, 150);
  } else if (palette.theme === "skybridge") {
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,210,120,0.2)";
      ctx.fillRect(58 + i * 132, 188 - i * 8, 96, 6);
      ctx.fillRect(72 + i * 132, 204 - i * 8, 68, 4);
    }
  } else {
    for (let i = 0; i < 8; i += 1) {
      const sparkleX = 70 + i * 110;
      const sparkleY = 70 + (i % 3) * 18;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sparkleX - 4, sparkleY);
      ctx.lineTo(sparkleX + 4, sparkleY);
      ctx.moveTo(sparkleX, sparkleY - 4);
      ctx.lineTo(sparkleX, sparkleY + 4);
      ctx.stroke();
    }
  }

  for (const platform of levels[levelIndex].platforms.slice(1)) {
    ctx.fillStyle = palette.platformBody;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = palette.platformTop;
    ctx.fillRect(platform.x, platform.y - 8, platform.width, 8);
  }

  for (const puddle of puddles) {
    ctx.fillStyle = palette.puddle;
    ctx.beginPath();
    ctx.ellipse(puddle.x + puddle.width / 2, puddle.y + puddle.height / 2, puddle.width / 2, puddle.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const spring of springs) {
    const topLift = spring.bounceTimer > 0 ? 4 : 0;
    ctx.fillStyle = "#d7263d";
    ctx.fillRect(spring.x, spring.y + 6, spring.width, 12);
    ctx.fillStyle = "#ffdf6b";
    ctx.fillRect(spring.x + 2, spring.y - topLift, spring.width - 4, 8);
    ctx.strokeStyle = "#5f0f40";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const coilX = spring.x + 10 + i * ((spring.width - 20) / 2);
      ctx.beginPath();
      ctx.moveTo(coilX - 5, spring.y + 16);
      ctx.lineTo(coilX, spring.y + 10 - topLift * 0.4);
      ctx.lineTo(coilX + 5, spring.y + 16);
      ctx.stroke();
    }
  }

  for (const breeze of breezes) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(breeze.x, breeze.y, breeze.width, breeze.height);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const lineY = breeze.y + 18 + i * 42;
      ctx.beginPath();
      ctx.moveTo(breeze.x + 10, lineY);
      ctx.bezierCurveTo(
        breeze.x + breeze.width * 0.35,
        lineY - 12,
        breeze.x + breeze.width * 0.65,
        lineY + 12,
        breeze.x + breeze.width - 10,
        lineY
      );
      ctx.stroke();
    }
  }
}

function drawPlayer() {
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 6) % 2 === 0) {
    return;
  }

  const spriteMood = player.mood === "excited" ? "excited" : player.mood === "sad" ? "sad" : "idle";
  if (isBoySpriteReady(spriteMood) || isBoySpriteReady("idle")) {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.scale(-player.facing, 1);
    if (drawBoyFromSheet(spriteMood)) {
      ctx.restore();
      return;
    }
    ctx.restore();
  }

  if (isAnyBoySpriteLoading()) {
    return;
  }

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.scale(player.facing, 1);
  ctx.strokeStyle = "#1b1120";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.fillStyle = "#ffcf9a";
  ctx.beginPath();
  ctx.ellipse(0, -18, 15, 15.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5b2f15";
  ctx.beginPath();
  ctx.moveTo(-18, -28);
  ctx.quadraticCurveTo(0, -39, 18, -28);
  ctx.quadraticCurveTo(21, -14, 16, -4);
  ctx.quadraticCurveTo(12, 4, 6, 8);
  ctx.quadraticCurveTo(3, 2, 0, 0);
  ctx.quadraticCurveTo(-3, 2, -6, 8);
  ctx.quadraticCurveTo(-12, 4, -16, -4);
  ctx.quadraticCurveTo(-21, -14, -18, -28);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-16, -20);
  ctx.quadraticCurveTo(-25, -4, -19, 15);
  ctx.quadraticCurveTo(-13, 20, -7, 12);
  ctx.quadraticCurveTo(-8, 3, -8, -10);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16, -20);
  ctx.quadraticCurveTo(25, -4, 19, 15);
  ctx.quadraticCurveTo(13, 20, 7, 12);
  ctx.quadraticCurveTo(8, 3, 8, -10);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, -25);
  ctx.quadraticCurveTo(-6, -8, -2, -2);
  ctx.quadraticCurveTo(-7, -4, -11, -10);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1, -25);
  ctx.quadraticCurveTo(2, -8, 6, -3);
  ctx.quadraticCurveTo(3, -5, 0, -10);
  ctx.fill();

  ctx.fillStyle = "#ffcf9a";
  ctx.beginPath();
  ctx.arc(-13.5, -12, 3.2, 0, Math.PI * 2);
  ctx.arc(13.5, -12, 3.2, 0, Math.PI * 2);
  ctx.fill();

  const eyeY = -18;
  const eyeOffset = 5.5;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-eyeOffset, eyeY, 4.8, 6.8, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeOffset, eyeY, 4.8, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b140c";
  ctx.beginPath();
  ctx.ellipse(-eyeOffset, eyeY + 0.3, 2.8, 4.6, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeOffset, eyeY + 0.3, 2.8, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-eyeOffset - 0.8, eyeY - 2.2, 1.3, 0, Math.PI * 2);
  ctx.arc(eyeOffset - 0.8, eyeY - 2.2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8f4d30";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0.5, -14);
  ctx.quadraticCurveTo(-1, -11, 0.5, -9.5);
  ctx.stroke();

  ctx.fillStyle = "#ff9a7a";
  ctx.beginPath();
  ctx.arc(-10.5, -11, 2.2, 0, Math.PI * 2);
  ctx.arc(10.5, -11, 2.2, 0, Math.PI * 2);
  ctx.fill();

  if (player.mood === "sad") {
    ctx.strokeStyle = "#6f352f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-8.5, -24);
    ctx.lineTo(-3.5, -22);
    ctx.moveTo(3.5, -22);
    ctx.lineTo(8.5, -24);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -7.2, 5.2, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();
  } else if (player.mood === "excited") {
    ctx.strokeStyle = "#6f352f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-8.5, -22);
    ctx.lineTo(-3.5, -24);
    ctx.moveTo(3.5, -24);
    ctx.lineTo(8.5, -22);
    ctx.stroke();
    ctx.fillStyle = "#2e1410";
    ctx.beginPath();
    ctx.ellipse(0, -7.5, 6.2, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5a4f";
    ctx.beginPath();
    ctx.ellipse(0, -6.1, 4.7, 3.5, 0, 0, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = "#2e1410";
    ctx.beginPath();
    ctx.ellipse(0, -7.6, 5.8, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5a4f";
    ctx.beginPath();
    ctx.ellipse(0, -6.6, 4.1, 2.8, 0, 0, Math.PI, 0);
    ctx.fill();
  }

  ctx.fillStyle = "#0d63df";
  ctx.beginPath();
  ctx.moveTo(-13, -1);
  ctx.quadraticCurveTo(0, -7, 13, -1);
  ctx.lineTo(15, 18);
  ctx.quadraticCurveTo(0, 26, -15, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(0, 4, 7, 0);
  ctx.stroke();

  ctx.strokeStyle = "#1f2a44";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, 3);
  ctx.quadraticCurveTo(-20, 8, -18, 18);
  ctx.moveTo(12, 3);
  ctx.quadraticCurveTo(20, 8, 18, 18);
  ctx.moveTo(-6, 20);
  ctx.lineTo(-8, 34);
  ctx.moveTo(6, 20);
  ctx.lineTo(8, 34);
  ctx.stroke();

  ctx.fillStyle = "#e52a18";
  ctx.beginPath();
  ctx.moveTo(-13, 19);
  ctx.lineTo(-1, 19);
  ctx.lineTo(-2, 30);
  ctx.lineTo(-14, 30);
  ctx.closePath();
  ctx.moveTo(1, 19);
  ctx.lineTo(13, 19);
  ctx.lineTo(14, 30);
  ctx.lineTo(2, 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffcf9a";
  ctx.fillRect(-8, 30, 4, 6);
  ctx.fillRect(4, 30, 4, 6);

  ctx.fillStyle = "#e73624";
  ctx.beginPath();
  ctx.rect(-13, 34, 12, 7);
  ctx.rect(1, 34, 12, 7);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-12, 37, 11, 3);
  ctx.fillRect(1, 37, 11, 3);

  if (player.swatTimer > 0) {
    ctx.strokeStyle = "#ffb703";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.facing > 0 ? 12 : -12, -6);
    ctx.lineTo(player.facing > 0 ? 28 : -28, -18);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRainbow(rainbow) {
  if (rainbow.collected) {
    return;
  }

  const colors = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rainbow.x, rainbow.y, 18 - index * 2.2, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
}

function drawBug(bug) {
  if (bug.swatted) {
    return;
  }
  ctx.save();
  ctx.translate(bug.x, bug.y);
  const shell = bug.color;
  const dark = "#2f241d";
  const light = "rgba(255,255,255,0.45)";

  if (bug.species === "beetle") {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(17, 12, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(17, 3);
    ctx.lineTo(17, 21);
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const legY = 8 + i * 4;
      ctx.beginPath();
      ctx.moveTo(10, legY);
      ctx.lineTo(0, legY - 6);
      ctx.moveTo(24, legY);
      ctx.lineTo(34, legY - 6);
      ctx.stroke();
    }
  } else if (bug.species === "caterpillar") {
    ctx.fillStyle = shell;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(8 + i * 7, 13, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(7 + i * 7, 18);
      ctx.lineTo(5 + i * 7, 24);
      ctx.moveTo(10 + i * 7, 18);
      ctx.lineTo(12 + i * 7, 24);
      ctx.stroke();
    }
  } else if (bug.species === "spider") {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(17, 13, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(17, 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const offset = i * 3;
      ctx.beginPath();
      ctx.moveTo(11, 10 + offset);
      ctx.lineTo(1, 4 + offset);
      ctx.moveTo(23, 10 + offset);
      ctx.lineTo(33, 4 + offset);
      ctx.stroke();
    }
  } else if (bug.species === "ladybug") {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(17, 13, 11, Math.PI, 0);
    ctx.lineTo(28, 13);
    ctx.arc(17, 13, 11, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(17, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(17, 4);
    ctx.lineTo(17, 24);
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(12, 13, 2, 0, Math.PI * 2);
    ctx.arc(21, 16, 2, 0, Math.PI * 2);
    ctx.arc(21, 10, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (bug.species === "bee") {
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(17, 12, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 5);
    ctx.lineTo(12, 19);
    ctx.moveTo(18, 4);
    ctx.lineTo(18, 20);
    ctx.moveTo(24, 5);
    ctx.lineTo(24, 19);
    ctx.stroke();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(10, 7, 6, 4, -0.5, 0, Math.PI * 2);
    ctx.ellipse(24, 7, 6, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(12, 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFirefly(firefly) {
  if (firefly.swatted) {
    return;
  }
  ctx.save();
  ctx.translate(firefly.x, firefly.y);
  if (firefly.species === "dragonfly") {
    ctx.strokeStyle = firefly.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(12, 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(5, 9, 8, 3, -0.3, 0, Math.PI * 2);
    ctx.ellipse(19, 9, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.ellipse(5, 15, 8, 3, 0.3, 0, Math.PI * 2);
    ctx.ellipse(19, 15, 8, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = firefly.color;
    ctx.beginPath();
    ctx.arc(12, 12, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = firefly.color;
    ctx.beginPath();
    ctx.ellipse(12, 12, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(6, 10, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.ellipse(18, 10, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBoySpriteAt(x, y, mood = "happy", facing = 1) {
  const originalPlayer = player;
  player = {
    x,
    y,
    width: 40,
    height: 58,
    invincibleTimer: 0,
    mood,
    facing,
    swatTimer: 0,
  };
  drawPlayer();
  player = originalPlayer;
}

function swatRectNearPlayer(target) {
  const reach = 60;
  const swatX = player.x + player.width / 2 + player.facing * 36;
  const swatY = player.y + player.height / 2 - 16;
  const targetX = target.x + target.width / 2;
  const targetY = target.y + target.height / 2;
  return Math.abs(targetX - swatX) <= reach && Math.abs(targetY - swatY) <= 38;
}

function performPlayerSwat() {
  if (gameMode !== "platformer" || player.swatTimer > 0) {
    return;
  }

  player.swatTimer = 14;
  let swatted = false;

  for (const bug of bugs) {
    if (!bug.swatted && swatRectNearPlayer(bug)) {
      bug.swatted = true;
      swatted = true;
    }
  }

  for (const firefly of fireflies) {
    if (!firefly.swatted && swatRectNearPlayer(firefly)) {
      firefly.swatted = true;
      swatted = true;
    }
  }

  if (swatted) {
    player.mood = "excited";
    player.moodTimer = 45;
    levelState.message = "Bug swatted.";
  } else {
    levelState.message = "Swat missed.";
  }
  updateHud();
}

function swatPuzzleBugAt(canvasX, canvasY) {
  if (gameMode !== "domino" || dominoState.bugHit) {
    return false;
  }

  const level = dominoLevels[dominoLevelIndex];
  const dx = canvasX - level.bugX;
  const dy = canvasY - (level.trackY - 24);
  if (Math.abs(dx) <= 18 && Math.abs(dy) <= 16) {
    dominoState.bugHit = true;
    dominoTotalScore += 15;
    dominoState.points = dominoTotalScore;
    dominoState.message = "J-bug swatted. +15 points.";
    updateHud();
    return true;
  }

  return false;
}

function startDominoDrag(canvasX, canvasY) {
  if (gameMode !== "domino" || dominoState.chainStarted || dominoState.won) {
    return false;
  }

  const piece = findPieceAt(canvasX, canvasY);
  if (!piece) {
    return false;
  }

  dominoDragState = {
    pieceId: piece.id,
    offsetX: canvasX - piece.x,
    moved: false,
  };
  dominoState.message = `Dragging ${contraptionStats[piece.pieceType].label}.`;
  updateHud();
  return true;
}

function moveDominoDrag(canvasX) {
  if (!dominoDragState || gameMode !== "domino") {
    return;
  }

  const level = dominoLevels[dominoLevelIndex];
  const piece = dominoState.pieces.find((entry) => entry.id === dominoDragState.pieceId);
  if (!piece) {
    dominoDragState = null;
    return;
  }

  piece.x = clamp(canvasX - dominoDragState.offsetX, level.pieceMinX, level.pieceMaxX);
  dominoDragState.moved = true;
}

function endDominoDrag() {
  if (!dominoDragState) {
    return;
  }

  const piece = dominoState.pieces.find((entry) => entry.id === dominoDragState.pieceId);
  if (piece && !dominoDragState.moved && piece.pieceType === selectedContraptionType) {
    removeDominoPiece(piece);
    dominoState.message = "Piece removed.";
    dominoDragState = null;
    updateHud();
    return;
  }

  dominoState.message = "Piece moved.";
  dominoDragState = null;
  updateHud();
}

function removeDominoPiece(piece) {
  dominoState.inventory[piece.pieceType] += 1;
  dominoState.pieces = dominoState.pieces.filter((entry) => entry.id !== piece.id);
}

function placeDominoPiece(type, canvasX) {
  const level = dominoLevels[dominoLevelIndex];
  if (dominoState.inventory[type] <= 0) {
    dominoState.message = `No ${contraptionStats[type].label.toLowerCase()} left.`;
    updateHud();
    return null;
  }

  const piece = createDominoPiece(type, clamp(canvasX, level.pieceMinX, level.pieceMaxX), level.trackY);
  dominoState.inventory[type] -= 1;
  dominoState.pieces.push(piece);
  dominoState.message = `${contraptionStats[type].label} placed. Drag it to reposition.`;
  updateHud();
  return piece;
}

function placeDominoAt(canvasX) {
  if (gameMode !== "domino" || dominoState.chainStarted || dominoState.won) {
    return;
  }
  placeDominoPiece(selectedContraptionType, canvasX);
}

function startDominoChain() {
  if (gameMode !== "domino") {
    return;
  }

  if (dominoState.won) {
    if (dominoLevelIndex + 1 < dominoLevels.length) {
      loadDominoLevel(dominoLevelIndex + 1);
    } else {
      resetDominoGame();
    }
    return;
  }

  if (dominoState.chainStarted) {
    dominoState.message = "The chain is already moving.";
    updateHud();
    return;
  }

  if (dominoState.pieces.length === 0) {
    dominoState.message = "Place at least one contraption piece first.";
    updateHud();
    return;
  }

  dominoState.chainStarted = true;
  dominoState.elapsed = 0;
  dominoState.activeIndex = -1;
  dominoState.attempts += 1;
  dominoState.pieces.forEach((piece) => {
    piece.angle = 0;
    piece.triggered = false;
    piece.failed = false;
  });
  dominoState.message = "Chain reaction in motion.";
  playEventSound("rainbow");
  updateHud();
}

function updateDominoGame() {
  const level = dominoLevels[dominoLevelIndex];

  if (!dominoState.chainStarted) {
    return;
  }

  dominoState.elapsed += 1;
  const pieces = getSortedDominoPieces();
  const currentSlot = dominoState.activeIndex >= 0 ? pieces[dominoState.activeIndex] : null;

  if (dominoState.activeIndex === -1) {
    if (pieces.length === 0) {
      dominoState.chainStarted = false;
      dominoState.message = "No contraption pieces in the lane.";
      updateHud();
      return;
    }
    dominoState.activeIndex = 0;
  }

  const active = pieces[dominoState.activeIndex];
  if (active && active.pieceType) {
    const animationStep = active.pieceType === "marble" || active.pieceType === "car" ? 0.17 : 0.11;
    active.angle = Math.min(Math.PI * 0.48, active.angle + animationStep);
    active.triggered = true;

    if (active.angle >= Math.PI * 0.48 - 0.001) {
      const previous = currentSlot && currentSlot !== active ? currentSlot : dominoState.activeIndex > 0 ? pieces[dominoState.activeIndex - 1] : null;
      const currentType = active.pieceType;
      const baseReach = getDominoComboReach(currentType, previous?.pieceType || "start");
      const reach = baseReach + getPadBonusForSegment(level, currentType, active.x, active.x + baseReach);
      const endReachX = active.x + reach;
      const nextIndex = dominoState.activeIndex + 1 < pieces.length ? dominoState.activeIndex + 1 : -1;

      dominoState.bonusStars.forEach((star) => {
        if (!star.collected && endReachX >= star.x) {
          star.collected = true;
          dominoState.collectedBonusPoints += star.points;
          dominoState.message = `Bonus star popped. +${star.points} points.`;
          updateHud();
        }
      });

      if (nextIndex === -1) {
        if (!dominoState.bugHit && endReachX >= level.bugX) {
          dominoState.bugHit = true;
          dominoState.message = "Bonus J-bug bonked. Nice shot.";
          updateHud();
        }
        if (!dominoState.switchHit && endReachX >= level.switchReachX) {
          dominoState.switchHit = true;
          dominoState.gateOpen = true;
          dominoState.outcome = "switch";
          dominoState.message = "The obstacle moved. The cookie is free.";
          updateHud();
        } else if (!dominoState.switchHit && currentType === "car" && endReachX >= level.smashReachX) {
          dominoState.switchHit = true;
          dominoState.gateOpen = true;
          dominoState.outcome = "smash";
          dominoState.message = "The toy car smashed the obstacle free.";
          updateHud();
        } else if (!dominoState.switchHit) {
          dominoState.chainStarted = false;
          dominoState.message = "The chain missed the target. Try a stronger ending piece.";
          updateHud();
        }
      } else {
        const next = pieces[nextIndex];
        const gap = next.x - active.x;
        if (gap <= Math.max(level.maxGap, reach)) {
          dominoState.activeIndex = nextIndex;
        } else {
          next.failed = true;
          dominoState.chainStarted = false;
          dominoState.message = "The gap is too wide for that piece. Try a ramp, marble, funnel, or car.";
          updateHud();
        }
      }
    }
  }

  if (dominoState.gateOpen) {
    dominoState.gateLift = Math.min(78, dominoState.gateLift + 3.5);
    dominoState.cookieReleased = true;
  }

  if (dominoState.cookieReleased) {
    dominoState.cookieX -= 2.4;
    dominoState.cookieY = level.trackY - 18 + Math.sin(dominoState.cookieX * 0.04) * 1.5;

    if (dominoState.cookieX <= level.boyX + 35) {
      dominoState.won = true;
      dominoState.chainStarted = false;
      const usedPieces = dominoState.pieces.length;
      const varietyBonus = new Set(dominoState.pieces.map((slot) => slot.pieceType)).size * 12;
      const outcomeBonus = dominoState.outcome === "smash" ? 35 : 20;
      const efficiencyBonus = Object.values(dominoState.inventory).reduce((sum, count) => sum + count, 0) * 8;
      const bugBonus = dominoState.bugHit ? 30 : 0;
      const puzzleScore =
        80 +
        usedPieces * 10 +
        varietyBonus +
        outcomeBonus +
        efficiencyBonus +
        bugBonus +
        dominoState.collectedBonusPoints -
        (dominoState.attempts - 1) * 12;
      dominoState.lastScore = Math.max(40, puzzleScore);
      if (dominoState.lastScore >= level.targets.gold) {
        dominoState.medal = "Gold";
      } else if (dominoState.lastScore >= level.targets.silver) {
        dominoState.medal = "Silver";
      } else {
        dominoState.medal = "Bronze";
      }
      dominoTotalScore += dominoState.lastScore;
      dominoState.points = dominoTotalScore;
      dominoState.message = `Julian got the cookie. +${dominoState.lastScore} points`;
      updateHud();
    }
  }
}

function drawDominoBackground(level) {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, level.palette.skyTop);
  gradient.addColorStop(1, level.palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(130, 100, 70, Math.PI, Math.PI * 2);
  ctx.arc(220, 100, 90, Math.PI, Math.PI * 2);
  ctx.arc(320, 100, 70, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = level.palette.floor;
  ctx.fillRect(0, level.trackY + 18, world.width, world.height - (level.trackY + 18));

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(30 + i * 120, level.trackY + 40, 60, 4);
  }

  ctx.strokeStyle = "#6b4f3b";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(60, level.trackY + 10);
  ctx.lineTo(910, level.trackY + 10);
  ctx.stroke();

  ctx.strokeStyle = "rgba(34,48,74,0.28)";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(level.pieceMinX, level.trackY - 50);
  ctx.lineTo(level.pieceMaxX, level.trackY - 50);
  ctx.stroke();
  ctx.setLineDash([]);

  (level.boostPads || []).forEach((pad) => {
    ctx.save();
    ctx.translate(pad.x, level.trackY + 2);
    if (pad.kind === "rocket") {
      ctx.fillStyle = "rgba(58, 134, 255, 0.92)";
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(14, 8);
      ctx.lineTo(0, -14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 200, 87, 0.9)";
      ctx.beginPath();
      ctx.moveTo(-6, 10);
      ctx.lineTo(0, 22);
      ctx.lineTo(6, 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(0, 163, 196, 0.95)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-16, -8 + i * 7);
        ctx.bezierCurveTo(-6, -16 + i * 7, 6, 0 + i * 7, 16, -8 + i * 7);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

function drawDominoGame() {
  const level = dominoLevels[dominoLevelIndex];
  drawDominoBackground(level);

  ctx.fillStyle = "rgba(34, 48, 74, 0.16)";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText(level.name, 22, 34);

  drawBoySpriteAt(level.boyX, level.trackY - 58, dominoState.won ? "excited" : "happy", 1);

  ctx.fillStyle = "#ffcf56";
  ctx.beginPath();
  ctx.arc(level.switchX, level.trackY - 8, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#815f00";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(level.switchX - 18, level.trackY - 8);
  ctx.lineTo(level.switchX + 18, level.trackY - 8);
  ctx.stroke();

  ctx.fillStyle = level.palette.obstacle;
  ctx.fillRect(level.gateX, level.trackY - 82 - dominoState.gateLift, 28, 92);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(level.gateX + 4, level.trackY - 78 - dominoState.gateLift, 8, 84);
  if (dominoState.outcome === "smash") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(level.gateX - 6, level.trackY - 60);
    ctx.lineTo(level.gateX + 34, level.trackY - 26);
    ctx.moveTo(level.gateX + 4, level.trackY - 74);
    ctx.lineTo(level.gateX + 24, level.trackY - 36);
    ctx.stroke();
  }

  ctx.fillStyle = level.palette.cookie;
  ctx.beginPath();
  ctx.arc(dominoState.cookieX, dominoState.cookieY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8c5a36";
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(dominoState.cookieX - 6 + i * 5, dominoState.cookieY - (i % 2 === 0 ? 4 : -1), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(level.bugX, level.trackY - 24);
  ctx.fillStyle = dominoState.bugHit ? "#9ad17b" : "#ff5d8f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2030";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(-16, -8);
  ctx.moveTo(-8, 2);
  ctx.lineTo(-16, 8);
  ctx.moveTo(8, -2);
  ctx.lineTo(16, -8);
  ctx.moveTo(8, 2);
  ctx.lineTo(16, 8);
  ctx.stroke();
  ctx.restore();

  dominoState.bonusStars.forEach((star) => {
    if (star.collected) {
      return;
    }
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const outerAngle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      ctx.lineTo(Math.cos(outerAngle) * 10, Math.sin(outerAngle) * 10);
      ctx.lineTo(Math.cos(innerAngle) * 4.5, Math.sin(innerAngle) * 4.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(34,48,74,0.72)";
    ctx.font = "bold 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`+${star.points}`, 0, 24);
    ctx.restore();
  });

  getSortedDominoPieces().forEach((slot) => {
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.rotate(slot.angle * -1);
    const tint = slot.failed ? "#b56576" : level.palette.accent;

    if (slot.pieceType === "domino") {
      ctx.fillStyle = tint;
      ctx.fillRect(-5, -36, 10, 36);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-2, -32, 3, 24);
    } else if (slot.pieceType === "ramp") {
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(12, 0);
      ctx.lineTo(12, -18);
      ctx.closePath();
      ctx.fill();
    } else if (slot.pieceType === "marble") {
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(0, -10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(-3, -13, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (slot.pieceType === "funnel") {
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.moveTo(-12, -26);
      ctx.lineTo(12, -26);
      ctx.lineTo(4, -8);
      ctx.lineTo(4, 0);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-4, -8);
      ctx.closePath();
      ctx.fill();
    } else if (slot.pieceType === "car") {
      ctx.fillStyle = tint;
      ctx.fillRect(-12, -18, 24, 10);
      ctx.fillRect(-6, -24, 12, 7);
      ctx.fillStyle = "#1f2a44";
      ctx.beginPath();
      ctx.arc(-7, -6, 4, 0, Math.PI * 2);
      ctx.arc(7, -6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  ctx.textAlign = "left";
  ctx.font = "bold 15px Trebuchet MS";
  contraptionOrder.forEach((type, index) => {
    const x = 20 + index * 115;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(x, 485, 102, 34);
    ctx.fillStyle = "#22304a";
    ctx.fillText(`${contraptionStats[type].label}`, x + 10, 504);
    ctx.fillText(`${contraptionStats[type].short}:${dominoState.inventory[type]}`, x + 70, 504);
  });

  ctx.textAlign = "right";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillStyle = "rgba(34,48,74,0.78)";
  ctx.fillText(`Targets B/S/G: ${level.targets.bronze}/${level.targets.silver}/${level.targets.gold}`, world.width - 20, 500);
  ctx.fillText(`Stars: ${dominoState.bonusStars.filter((star) => star.collected).length}/${dominoState.bonusStars.length} · Bonus ${dominoState.collectedBonusPoints}`, world.width - 20, 522);
  ctx.textAlign = "left";
  ctx.fillText(`Hint: ${level.hint}`, 20, 500);
  ctx.fillText("Dashed lane = valid placement area · fans/rockets extend chain reach", 20, 522);

  ctx.fillStyle = "rgba(34,48,74,0.08)";
  ctx.fillRect(level.cookieStartX - 26, level.trackY - 34, 70, 28);

  if (dominoState.won) {
    ctx.fillStyle = "rgba(34, 48, 74, 0.35)";
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 38px Trebuchet MS";
    ctx.fillText("Cookie Rescue Complete!", world.width / 2, 210);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText(`${dominoState.medal} medal · ${dominoState.lastScore} points${dominoState.bugHit ? " · J-bug bonus" : ""}`, world.width / 2, 250);
    ctx.fillText(`Bonus stars: ${dominoState.bonusStars.filter((star) => star.collected).length}/${dominoState.bonusStars.length} · Extra ${dominoState.collectedBonusPoints}`, world.width / 2, 282);
    ctx.fillText(dominoLevelIndex + 1 < dominoLevels.length ? "Press Start Chain for the next puzzle" : "Press Start Chain to play again", world.width / 2, 314);
  }
}

function setPinballFlippers() {
  if (!pinballState) {
    return;
  }
  pinballState.flippers.left.currentAngle = keys.left ? pinballState.flippers.left.activeAngle : pinballState.flippers.left.angle;
  pinballState.flippers.right.currentAngle = keys.right ? pinballState.flippers.right.activeAngle : pinballState.flippers.right.angle;
}

function launchPinballBall() {
  if (!pinballState || pinballState.gameOver) {
    resetPinballGame();
    return;
  }
  const ball = pinballState.ball;
  if (!ball || !ball.inLauncher) {
    if (ball) {
      ball.vx += (Math.random() - 0.5) * 1.2;
      pinballState.message = "Nudge!";
      updateHud();
    }
    return;
  }
  const power = 11.4 + pinballState.launchCharge * 0.24;
  ball.inLauncher = false;
  ball.vx = -5.6;
  ball.vy = -power;
  pinballState.launchHeld = false;
  pinballState.launchCharge = 0;
  pinballState.message = "Rainbow ball launched.";
  playEventSound("rainbow");
  updateHud();
}

function drainPinballBall() {
  if (!pinballState || !pinballState.ball || !pinballState.ball.alive) {
    return;
  }
  pinballState.ballsLeft -= 1;
  pinballState.ball.alive = false;
  playEventSound("bug");
  if (pinballState.ballsLeft <= 0) {
    pinballState.gameOver = true;
    pinballState.message = "The ball drained. Final ball lost.";
  } else {
    pinballState.message = `Ball drained. ${pinballState.ballsLeft} left.`;
    spawnPinballBall();
  }
  updateHud();
}

function collideBallCircle(ball, target, bounce = 1.02) {
  const dx = ball.x - target.x;
  const dy = ball.y - target.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = ball.radius + target.radius;
  if (distance >= minDistance || distance === 0) {
    return false;
  }
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;
  const speedAlongNormal = ball.vx * nx + ball.vy * ny;
  if (speedAlongNormal < 0) {
    ball.vx -= (1 + bounce) * speedAlongNormal * nx;
    ball.vy -= (1 + bounce) * speedAlongNormal * ny;
  }
  return true;
}

function collideBallSegment(ball, x1, y1, x2, y2, bounce = 0.96) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = clamp(((ball.x - x1) * dx + (ball.y - y1) * dy) / lengthSq, 0, 1);
  const nearestX = x1 + dx * t;
  const nearestY = y1 + dy * t;
  const diffX = ball.x - nearestX;
  const diffY = ball.y - nearestY;
  const distance = Math.hypot(diffX, diffY);
  if (distance >= ball.radius || distance === 0) {
    return false;
  }
  const nx = diffX / distance;
  const ny = diffY / distance;
  const overlap = ball.radius - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;
  const normalSpeed = ball.vx * nx + ball.vy * ny;
  if (normalSpeed < 0) {
    ball.vx -= (1 + bounce) * normalSpeed * nx;
    ball.vy -= (1 + bounce) * normalSpeed * ny;
  }
  return true;
}

function pointInTriangle(px, py, a, b, c) {
  const area = (p1, p2, p3) => (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  const p = { x: px, y: py };
  const areaMain = Math.abs(area(a, b, c));
  const areaParts = Math.abs(area(p, b, c)) + Math.abs(area(a, p, c)) + Math.abs(area(a, b, p));
  return Math.abs(areaMain - areaParts) < 0.5;
}

function applyFlipperHit(ball, flipper, direction) {
  const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length;
  const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length;
  const nearestX = clamp(ball.x, Math.min(flipper.pivotX, tipX), Math.max(flipper.pivotX, tipX));
  const nearestY = clamp(ball.y, Math.min(flipper.pivotY, tipY) - 12, Math.max(flipper.pivotY, tipY) + 12);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  if (dx * dx + dy * dy > (ball.radius + 12) * (ball.radius + 12)) {
    return;
  }
  ball.vx = direction * (keys[direction < 0 ? "left" : "right"] ? 10.8 : 4.8);
  ball.vy = keys[direction < 0 ? "left" : "right"] ? -12.6 : -7.1;
  ball.y -= 6;
}

function updatePinballGame() {
  if (!pinballState) {
    return;
  }
  setPinballFlippers();

  if (pinballState.gameOver) {
    return;
  }

  const ball = pinballState.ball;
  if (!ball) {
    return;
  }

  const speedScale = pinballSpeed / 100;

  if (pinballState.launchHeld && ball.inLauncher) {
    pinballState.launchCharge = Math.min(34, pinballState.launchCharge + 0.55 * speedScale);
    ball.y = 438 + pinballState.launchCharge * 2.2;
  }

  if (ball.inLauncher) {
    return;
  }

  ball.vy += 0.21 * speedScale;
  ball.x += ball.vx * speedScale;
  ball.y += ball.vy * speedScale;
  ball.vx *= 0.998;
  ball.vy *= 0.998;

  if (ball.x <= 34 || ball.x >= 926) {
    ball.x = clamp(ball.x, 34, 926);
    ball.vx *= -0.92;
  }
  if (ball.y <= 30) {
    ball.y = 30;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }

  const guideRails = [
    [48, 56, 48, 506],
    [848, 268, 848, 476],
    [912, 56, 912, 506],
    [848, 56, 912, 56],
    [848, 476, 912, 476],
    [872, 64, 854, 138],
    [854, 138, 826, 176],
    [826, 176, 784, 214],
    [118, 216, 286, 452],
    [842, 216, 674, 452],
    [132, 454, 250, 500],
    [828, 454, 710, 500],
    [314, 392, 386, 482],
    [646, 392, 574, 482],
    [386, 482, 438, 506],
    [574, 482, 522, 506],
    [250, 500, 338, 500],
    [622, 500, 710, 500],
  ];
  guideRails.forEach(([x1, y1, x2, y2]) => {
    collideBallSegment(ball, x1, y1, x2, y2, 0.94);
  });

  pinballState.bumpers.forEach((bumper) => {
    if (collideBallCircle(ball, bumper, 1.18)) {
      pinballState.score += bumper.value;
      pinballState.message = `Rainbow bumper +${bumper.value}`;
      playEventSound("rainbow");
    }
  });

  pinballState.bugTargets.forEach((bug) => {
    if (bug.active && collideBallCircle(ball, bug, 1.12)) {
      bug.active = false;
      pinballState.score += bug.value;
      pinballState.message = `${bug.species} bonked +${bug.value}`;
      playEventSound("rainbow");
    }
  });

  pinballState.posts.forEach((post) => {
    collideBallCircle(ball, post, post.bounce);
  });

  pinballState.slingshots.forEach((sling) => {
    const [a, b, c] = sling.points;
    if (pointInTriangle(ball.x, ball.y, a, b, c)) {
      ball.vx += sling.impulseX * speedScale;
      ball.vy += sling.impulseY * speedScale;
      if (ball.y > 440) {
        ball.y -= 8;
      }
    }
  });

  if (ball.x > 846 && ball.y > 250 && ball.y < 478) {
    ball.vx = Math.min(ball.vx, -1.8);
  }
  if (ball.x > 800 && ball.y < 228) {
    ball.vx = Math.min(ball.vx, -4.2);
    ball.vy = Math.max(ball.vy, -4.8);
  }

  const laneBonus = [
    { key: "left", x: 120, y: 70, width: 80, height: 160, value: 75 },
    { key: "right", x: 760, y: 70, width: 80, height: 160, value: 75 },
  ];
  laneBonus.forEach((lane) => {
    if (ball.x > lane.x && ball.x < lane.x + lane.width && ball.y > lane.y && ball.y < lane.y + lane.height) {
      if (!pinballState.laneAwards[lane.key]) {
        pinballState.score += lane.value;
        pinballState.laneAwards[lane.key] = true;
        pinballState.message = `${lane.key === "left" ? "Unicorn" : "Rainbow"} lane +${lane.value}`;
      }
    } else if (ball.y > lane.y + lane.height + 30) {
      pinballState.laneAwards[lane.key] = false;
    }
  });

  applyFlipperHit(ball, pinballState.flippers.left, -1);
  applyFlipperHit(ball, pinballState.flippers.right, 1);

  if (ball.y > 500) {
    const inCenterDrain = ball.x > 440 && ball.x < 520;
    const inLeftOutlane = ball.x < 116;
    const inRightOutlane = ball.x > 844;
    if (inCenterDrain || inLeftOutlane || inRightOutlane) {
      drainPinballBall();
      return;
    }
    ball.y = 500;
    ball.vy = -Math.abs(ball.vy) * 0.72;
  }

  updateHud();
}

function drawPinballGame() {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#143b63");
  gradient.addColorStop(0.55, "#4cc9f0");
  gradient.addColorStop(1, "#fdf0a0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(180, 84, 90, 0, Math.PI * 2);
  ctx.arc(760, 96, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1b3556";
  ctx.lineWidth = 18;
  ctx.strokeRect(24, 24, 912, 492);

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 4;
  ctx.strokeRect(848, 52, 56, 430);

  const rainbowLanes = [
    { x: 120, y: 70, width: 80, height: 160 },
    { x: 760, y: 70, width: 80, height: 160 },
  ];
  rainbowLanes.forEach((lane, index) => {
    const laneGradient = ctx.createLinearGradient(lane.x, lane.y, lane.x + lane.width, lane.y);
    ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"].forEach((color, stopIndex, colors) => {
      laneGradient.addColorStop(stopIndex / (colors.length - 1), color);
    });
    ctx.fillStyle = laneGradient;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(lane.x, lane.y, lane.width, lane.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.strokeRect(lane.x, lane.y, lane.width, lane.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Trebuchet MS";
    ctx.fillText(index === 0 ? "UNICORN LANE" : "RAINBOW LANE", lane.x + 6, lane.y + 24);
  });

  ctx.strokeStyle = "rgba(255,255,255,0.52)";
  ctx.lineWidth = 6;
  [
    [48, 56, 48, 506],
    [848, 268, 848, 476],
    [912, 56, 912, 506],
    [848, 56, 912, 56],
    [848, 476, 912, 476],
    [872, 64, 854, 138],
    [854, 138, 826, 176],
    [826, 176, 784, 214],
    [118, 216, 286, 452],
    [842, 216, 674, 452],
    [132, 454, 250, 500],
    [828, 454, 710, 500],
    [314, 392, 386, 482],
    [646, 392, 574, 482],
    [386, 482, 438, 506],
    [574, 482, 522, 506],
    [250, 500, 338, 500],
    [622, 500, 710, 500],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(9,17,29,0.34)";
  ctx.fillRect(30, 506, 86, 16);
  ctx.fillRect(844, 506, 86, 16);
  ctx.fillRect(440, 506, 80, 18);
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "bold 12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("OUT", 72, 518);
  ctx.fillText("DRAIN", 480, 520);
  ctx.fillText("OUT", 886, 518);

  ctx.save();
  ctx.translate(480, 86);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffcf9a";
  ctx.beginPath();
  ctx.ellipse(22, 8, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8fab";
  ctx.beginPath();
  ctx.moveTo(-30, -24);
  ctx.lineTo(-16, -44);
  ctx.lineTo(-6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5, -24);
  ctx.lineTo(10, -46);
  ctx.lineTo(14, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(8, -10);
  ctx.lineTo(18, -58);
  ctx.lineTo(28, -12);
  ctx.closePath();
  ctx.fill();
  ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#c77dff"].forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-30 + index * 7, 12);
    ctx.quadraticCurveTo(-44 + index * 2, 2 + index * 2, -34 + index * 8, -26);
    ctx.stroke();
  });
  ctx.fillStyle = "#22304a";
  ctx.beginPath();
  ctx.arc(20, 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  pinballState.bumpers.forEach((bumper) => {
    const ring = ctx.createRadialGradient(bumper.x - 6, bumper.y - 6, 6, bumper.x, bumper.y, bumper.radius);
    ring.addColorStop(0, "#ffffff");
    ring.addColorStop(0.3, bumper.color);
    ring.addColorStop(1, "#1b3556");
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  pinballState.posts.forEach((post) => {
    ctx.fillStyle = post.color;
    ctx.beginPath();
    ctx.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#22304a";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  pinballState.slingshots.forEach((sling) => {
    ctx.fillStyle = sling.color;
    ctx.beginPath();
    ctx.moveTo(sling.points[0].x, sling.points[0].y);
    ctx.lineTo(sling.points[1].x, sling.points[1].y);
    ctx.lineTo(sling.points[2].x, sling.points[2].y);
    ctx.closePath();
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  pinballState.bugTargets.forEach((bug) => {
    ctx.save();
    ctx.globalAlpha = bug.active ? 1 : 0.28;
    ctx.translate(bug.x - 17, bug.y - 13);
    drawBug({ ...bug, x: 0, y: 0, swatted: false, width: 34, height: 26 });
    ctx.restore();
  });

  drawBoySpriteAt(86, 420, "happy", 1);

  const { left, right } = pinballState.flippers;
  [
    { flipper: left, color: "#ff7a59" },
    { flipper: right, color: "#c77dff" },
  ].forEach(({ flipper, color }) => {
    const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length;
    const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length;
    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(flipper.pivotX, flipper.pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 11, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("UNICORN JACKPOT", 362, 46);
  ctx.fillText(`Speed ${pinballSpeed}%`, 760, 46);

  if (pinballState.ball) {
    const ball = pinballState.ball;
    const ballGradient = ctx.createRadialGradient(ball.x - 4, ball.y - 4, 2, ball.x, ball.y, ball.radius);
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.3, "#ffca3a");
    ballGradient.addColorStop(0.6, "#ff595e");
    ballGradient.addColorStop(1, "#1982c4");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (pinballState.ball?.inLauncher) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("HOLD TO CHARGE", 876, 508);
  }

  if (pinballState.gameOver) {
    ctx.fillStyle = "rgba(9,17,29,0.44)";
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 42px Trebuchet MS";
    ctx.fillText("Rainbow Pinball Complete", world.width / 2, 220);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText(`Final Score ${pinballState.score}`, world.width / 2, 262);
    ctx.fillText("Press Launch or Restart to play again", world.width / 2, 296);
  }
}

function drawOverlay() {
  if (!levelState.levelWon && !levelState.gameWon && !levelState.gameOver) {
    return;
  }

  ctx.fillStyle = "rgba(34, 48, 74, 0.42)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 40px Trebuchet MS";

  if (levelState.gameWon) {
    ctx.fillText("You Found Every Rainbow!", world.width / 2, 210);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Restart to play from level one", world.width / 2, 260);
    return;
  }

  if (levelState.gameOver) {
    ctx.fillText("Out Of Lives", world.width / 2, 210);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("Press jump to retry this level", world.width / 2, 260);
    return;
  }

  ctx.fillText(`Level ${levelIndex + 1} Clear!`, world.width / 2, 210);
  ctx.font = "24px Trebuchet MS";
  ctx.fillText("Press jump to continue", world.width / 2, 260);
}

function drawGame() {
  drawBackground();
  rainbows.forEach(drawRainbow);
  bugs.forEach(drawBug);
  fireflies.forEach(drawFirefly);
  drawPlayer();

  ctx.fillStyle = "rgba(34, 48, 74, 0.16)";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText(levels[levelIndex].name, 22, 34);

  drawOverlay();
}

function loop() {
  scheduleMusic();
  if (gameMode === "platformer") {
    updatePlayer();
    updateBugs();
    updateFireflies();
    updatePuddles();
    updateRainbows();
    drawGame();
  } else if (gameMode === "pinball") {
    updatePinballGame();
    drawPinballGame();
  } else {
    updateDominoGame();
    drawDominoGame();
  }
  requestAnimationFrame(loop);
}

function setKeyState(code, isPressed) {
  if (code === "ArrowLeft" || code === "KeyA") {
    keys.left = isPressed;
  }

  if (code === "ArrowRight" || code === "KeyD") {
    keys.right = isPressed;
  }

  if (code === "ArrowUp" || code === "KeyW" || code === "Space") {
    keys.jump = isPressed;
  }

  if (code === "KeyE" || code === "KeyF") {
    keys.swat = isPressed;
  }
}

window.addEventListener("keydown", (event) => {
  const tracked = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyE", "KeyF"];
  if (tracked.includes(event.code)) {
    event.preventDefault();
    startMusic();
    if (gameMode === "platformer" || gameMode === "pinball") {
      setKeyState(event.code, true);
      if (gameMode === "pinball" && (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW")) {
        pinballState.launchHeld = true;
      }
    } else if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      startDominoChain();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (gameMode === "platformer" || gameMode === "pinball") {
    setKeyState(event.code, false);
    if (gameMode === "pinball" && (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW")) {
      launchPinballBall();
    }
  }
});

function bindTouchControl(element, keyName, options = {}) {
  const { sticky = true } = options;

  const start = (event) => {
    event.preventDefault();
    startMusic();
    if (gameMode === "platformer" || gameMode === "pinball") {
      keys[keyName] = true;
      if (gameMode === "pinball" && keyName === "jump") {
        pinballState.launchHeld = true;
      }
    } else if (keyName === "jump") {
      const rect = canvas.getBoundingClientRect();
      placeDominoAt(rect.width * 0.5);
    }
  };

  const end = (event) => {
    event.preventDefault();
    if (sticky && (gameMode === "platformer" || gameMode === "pinball")) {
      keys[keyName] = false;
      if (gameMode === "pinball" && keyName === "jump") {
        launchPinballBall();
      }
      if (gameMode === "pinball" && keyName === "swat" && pinballState?.ball && !pinballState.ball.inLauncher) {
        pinballState.ball.vx += (Math.random() - 0.5) * 2.8;
        pinballState.message = "Nudge!";
        updateHud();
      }
    }
  };

  element.addEventListener("pointerdown", start);
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
  element.addEventListener("pointerleave", end);
  element.addEventListener("touchstart", start, { passive: false });
  element.addEventListener("touchend", end, { passive: false });
  element.addEventListener("touchcancel", end, { passive: false });
}

bindTouchControl(jumpButton, "jump");
bindTouchControl(swatButton, "swat");
bindTouchControl(leftButton, "left");
bindTouchControl(rightButton, "right");

function updateExpandButton() {
  const expanded = touchState.immersiveMode || Boolean(document.fullscreenElement);
  expandButton.textContent = expanded ? "✕" : "⤢";
  expandButton.setAttribute("aria-label", expanded ? "Exit expanded view" : "Expand game");
}

function setImmersiveMode(active) {
  touchState.immersiveMode = active;
  document.body.classList.toggle("immersive-mode", active);
  updateExpandButton();
}

async function toggleExpandedView() {
  startMusic();
  const expanded = touchState.immersiveMode || Boolean(document.fullscreenElement);

  if (expanded) {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (_error) {
      }
    }
    setImmersiveMode(false);
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    return;
  }

  let fullscreenEntered = false;
  if (gameStageEl.requestFullscreen) {
    try {
      await gameStageEl.requestFullscreen();
      fullscreenEntered = true;
    } catch (_error) {
    }
  }

  if (!fullscreenEntered) {
    setImmersiveMode(true);
  } else {
    updateExpandButton();
  }

  if (screen.orientation && screen.orientation.lock) {
    try {
      await screen.orientation.lock("landscape");
    } catch (_error) {
    }
  }
}

expandButton.addEventListener("click", () => {
  toggleExpandedView();
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("immersive-mode");
    touchState.immersiveMode = false;
  }
  updateExpandButton();
});

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const point = "touches" in event && event.touches.length > 0
    ? event.touches[0]
    : "changedTouches" in event && event.changedTouches.length > 0
      ? event.changedTouches[0]
      : event;

  return {
    canvasX: (point.clientX - rect.left) * scaleX,
    canvasY: (point.clientY - rect.top) * scaleY,
  };
}

restartButton.addEventListener("click", () => {
  if (gameMode === "domino") {
    restartDominoLevel();
    return;
  }
  if (gameMode === "pinball") {
    resetPinballGame();
    return;
  }
  if (levelState && levelState.gameOver) {
    restartCurrentLevel();
    return;
  }
  resetGame();
});
actionButton.addEventListener("click", () => {
  if (gameMode === "platformer") {
    performPlayerSwat();
    return;
  }
  if (gameMode === "pinball") {
    launchPinballBall();
    return;
  }
  startDominoChain();
});
gameModeSelect.addEventListener("change", () => {
  gameMode = gameModeSelect.value;
  updateModeUi();
  if (gameMode === "platformer") {
    resetGame();
  } else if (gameMode === "pinball") {
    resetPinballGame();
  } else {
    resetDominoGame();
  }
});
contraptionTypeSelect.addEventListener("change", () => {
  selectedContraptionType = contraptionTypeSelect.value;
  if (gameMode === "domino" && dominoState && !dominoState.won) {
    dominoState.message = `${contraptionStats[selectedContraptionType].label} selected. Tap the lane to place it.`;
    updateHud();
  }
});
dominoLevelSelect.addEventListener("change", () => {
  const nextIndex = Number(dominoLevelSelect.value);
  if (Number.isNaN(nextIndex) || nextIndex < 0 || nextIndex >= dominoLevels.length) {
    return;
  }
  loadDominoLevel(nextIndex);
});
pinballSpeedSlider.addEventListener("input", () => {
  pinballSpeed = Number(pinballSpeedSlider.value);
  pinballSpeedValueEl.textContent = `${pinballSpeed}%`;
  if (gameMode === "pinball" && pinballState) {
    pinballState.message = `Game speed set to ${pinballSpeed}%.`;
    updateHud();
  }
});
easyModeToggle.addEventListener("change", () => {
  easyMode = easyModeToggle.checked;
  updateHud();
});
bugDensitySlider.addEventListener("input", () => {
  bugDensity = Number(bugDensitySlider.value);
  bugDensityValueEl.textContent = `${bugDensity}%`;
});
bugDensitySlider.addEventListener("change", () => {
  bugDensity = Number(bugDensitySlider.value);
  bugDensityValueEl.textContent = `${bugDensity}%`;
  if (gameMode === "platformer") {
    loadLevel(levelIndex, true);
    levelState.message = `Bug density set to ${bugDensity}%.`;
    updateHud();
  }
});
musicEnabledToggle.addEventListener("change", () => {
  musicEnabled = musicEnabledToggle.checked;
  musicEnabledToggle.parentElement.lastChild.textContent = musicEnabled ? " Music On" : " Music Off";
  if (audioState) {
    audioState.musicGain.gain.value = musicEnabled ? 0.32 : 0;
  }
});
sfxEnabledToggle.addEventListener("change", () => {
  sfxEnabled = sfxEnabledToggle.checked;
  sfxEnabledToggle.parentElement.lastChild.textContent = sfxEnabled ? " SFX On" : " SFX Off";
  if (audioState) {
    audioState.sfxGain.gain.value = sfxEnabled ? 1 : 0;
  }
});
canvas.addEventListener("pointerdown", (event) => {
  startMusic();
  const { canvasX, canvasY } = getCanvasPoint(event);

  if (gameMode === "domino") {
    if (swatPuzzleBugAt(canvasX, canvasY)) {
      return;
    }
    if (startDominoDrag(canvasX, canvasY)) {
      return;
    }
    placeDominoAt(canvasX);
    return;
  }

  if (gameMode === "pinball") {
    if (pinballState?.bugTargets) {
      for (const bug of pinballState.bugTargets) {
        if (
          bug.active &&
          Math.hypot(canvasX - bug.x, canvasY - bug.y) <= bug.radius + 8
        ) {
          bug.active = false;
          pinballState.score += 50;
          pinballState.message = "Bug target swatted +50.";
          updateHud();
          return;
        }
      }
    }
    return;
  }

  for (const bug of bugs) {
    if (!bug.swatted && canvasX >= bug.x && canvasX <= bug.x + bug.width && canvasY >= bug.y && canvasY <= bug.y + bug.height) {
      bug.swatted = true;
      player.mood = "excited";
      player.moodTimer = 45;
      levelState.message = "Bug swatted.";
      updateHud();
      return;
    }
  }

  for (const firefly of fireflies) {
    if (
      !firefly.swatted &&
      canvasX >= firefly.x &&
      canvasX <= firefly.x + firefly.width &&
      canvasY >= firefly.y &&
      canvasY <= firefly.y + firefly.height
    ) {
      firefly.swatted = true;
      player.mood = "excited";
      player.moodTimer = 45;
      levelState.message = "Bug swatted.";
      updateHud();
      return;
    }
  }
});
canvas.addEventListener("pointermove", (event) => {
  if (gameMode !== "domino" || !dominoDragState) {
    return;
  }

  const { canvasX } = getCanvasPoint(event);
  moveDominoDrag(canvasX);
});
canvas.addEventListener("pointerup", endDominoDrag);
canvas.addEventListener("pointercancel", endDominoDrag);
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  startMusic();
  const { canvasX, canvasY } = getCanvasPoint(event);

  if (gameMode === "domino") {
    if (swatPuzzleBugAt(canvasX, canvasY)) {
      return;
    }
    if (startDominoDrag(canvasX, canvasY)) {
      return;
    }
    placeDominoAt(canvasX);
    return;
  }

  if (gameMode === "pinball") {
    if (pinballState?.bugTargets) {
      for (const bug of pinballState.bugTargets) {
        if (
          bug.active &&
          Math.hypot(canvasX - bug.x, canvasY - bug.y) <= bug.radius + 8
        ) {
          bug.active = false;
          pinballState.score += 50;
          pinballState.message = "Bug target swatted +50.";
          updateHud();
          return;
        }
      }
    }
    return;
  }

  for (const bug of bugs) {
    if (!bug.swatted && canvasX >= bug.x && canvasX <= bug.x + bug.width && canvasY >= bug.y && canvasY <= bug.y + bug.height) {
      bug.swatted = true;
      player.mood = "excited";
      player.moodTimer = 45;
      levelState.message = "Bug swatted.";
      updateHud();
      return;
    }
  }

  for (const firefly of fireflies) {
    if (
      !firefly.swatted &&
      canvasX >= firefly.x &&
      canvasX <= firefly.x + firefly.width &&
      canvasY >= firefly.y &&
      canvasY <= firefly.y + firefly.height
    ) {
      firefly.swatted = true;
      player.mood = "excited";
      player.moodTimer = 45;
      levelState.message = "Bug swatted.";
      updateHud();
      return;
    }
  }
}, { passive: false });
canvas.addEventListener("touchmove", (event) => {
  if (gameMode !== "domino" || !dominoDragState) {
    return;
  }
  event.preventDefault();
  const { canvasX } = getCanvasPoint(event);
  moveDominoDrag(canvasX);
}, { passive: false });
canvas.addEventListener("touchend", (event) => {
  if (gameMode === "domino" && dominoDragState) {
    event.preventDefault();
  }
  endDominoDrag();
}, { passive: false });
canvas.addEventListener("touchcancel", endDominoDrag, { passive: false });

loadBoySprites();
bugDensityValueEl.textContent = `${bugDensity}%`;
pinballSpeedValueEl.textContent = `${pinballSpeed}%`;
populateDominoLevelSelect();
resetGame();
updateModeUi();
actionButton.style.display = "none";
updateExpandButton();
loop();
