var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_BaseColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_TextureType;
  uniform float u_texColorWeight;

  varying vec2 v_UV;

  void main() {
    vec4 texColor;
    if (u_TextureType == 0) {
      texColor = texture2D(u_Sampler0, v_UV);
    } 
    else if (u_TextureType == 1) {
      texColor = texture2D(u_Sampler1, v_UV);
    } 
    else {
      texColor = vec4(1.0); // fallback
    }
    gl_FragColor = (1.0 - u_texColorWeight) * u_BaseColor + u_texColorWeight * texColor;
  }
`;

// Global variables
let canvas, gl;
let a_Position;
let u_ModelMatrix, u_GlobalRotation;

let gLastFPSUpdate = 0;
let gFrameCount = 0;
let gFPS = 0;
let lastTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;

let a_UV;
let u_Sampler0;
let u_Sampler1;
let u_TextureType;
let u_BaseColor;
let u_texColorWeight;
let u_ViewMatrix;
let u_ProjectionMatrix;

let camera;
let lastMouseX = null;
let sensitivity = 0.3;

const WORLD_SIZE = 32;

let g_world = [];
const WORLD_HEIGHT = 5;
let worldMatrices = [];
let groundMatrix;

let koalaPos = null;
let koalaFound = false;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCube();

  gl.enable(gl.DEPTH_TEST); 
  gl.clearColor(0.53, 0.81, 0.98, 1.0);
  camera = new Camera();

  document.onkeydown = function(ev) {
  switch(ev.key) {
      case 'w': camera.moveForward(); break;
      case 's': camera.moveBackwards(); break;
      case 'a': camera.moveLeft(); break;
      case 'd': camera.moveRight(); break;
      case 'q': camera.rotate(-5, 0); break;
      case 'e': camera.rotate(5, 0); break;
      case 'f': addBlock(); break;
      case 'r': removeBlock(); break;
      case ' ': camera.moveUp(); break; // Spacebar
      case 'Control': camera.moveDown(); break;
    }
  };

  initTextures();
  generateWorld();

  let spawn = findSafeSpawn();

  camera.eye = new Vector3([spawn.x + 0.5, 1.5, spawn.z + 0.5]);
  camera.at  = new Vector3([spawn.x + 0.5, 1.5, spawn.z - 1]);
  camera.updateView();

  spawnKoala();

  groundMatrix = new Matrix4();
  groundMatrix.translate(WORLD_SIZE/2, -0.5, WORLD_SIZE/2);
  groundMatrix.scale(WORLD_SIZE, 1, WORLD_SIZE);
  groundMatrix.translate(-0.5, 0, -0.5);
  drawCube(groundMatrix, [1,1,1,1], true);

  buildWorld();
  requestAnimationFrame(tick);

  canvas.onclick = function() {
    canvas.requestPointerLock();
  };

  canvas.addEventListener('mousemove', function(event) {

    if (document.pointerLockElement === canvas) {

      let xoffset = event.movementX;
      let yoffset = event.movementY;

      let sensitivity = 0.1;

      xoffset *= sensitivity;
      yoffset *= sensitivity;

      camera.rotate(xoffset, -yoffset);
    
    }
  });
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');

  if (!gl) {
    console.log('Failed to get WebGL context');
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');

  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_TextureType = gl.getUniformLocation(gl.program, 'u_TextureType');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

}

function generateWorld() {

  for (let x = 0; x < WORLD_SIZE; x++) {
    g_world[x] = [];

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      g_world[x][y] = [];

      for (let z = 0; z < WORLD_SIZE; z++) {
        g_world[x][y][z] = 0;
      }
    }
  }

  // Outer walls
  for (let i = 0; i < WORLD_SIZE; i++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      g_world[0][y][i] = 1;
      g_world[WORLD_SIZE - 1][y][i] = 1;
      g_world[i][y][0] = 1;
      g_world[i][y][WORLD_SIZE - 1] = 1;
    }
  }

  // inner walls
  for (let x = 2; x < WORLD_SIZE - 2; x += 6) {
    for (let z = 2; z < WORLD_SIZE - 2; z++) {

      if (Math.random() > 0.4) {

        let height = 2 + Math.floor(Math.random() * 2); // 2–3 tall

        for (let y = 0; y < height; y++) {
          g_world[x][y][z] = 1;
        }
      }
    }
  }

  // Exit
  let exitZ = Math.floor(WORLD_SIZE / 2);

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    g_world[WORLD_SIZE - 1][y][exitZ] = 0;
  }
}

function findSafeSpawn() {

  let x, z;
  let safe = false;

  while (!safe) {

    x = Math.floor(Math.random() * WORLD_SIZE);
    z = Math.floor(Math.random() * WORLD_SIZE);

    safe = true;

    // Check 3 blocks tall space for player
    for (let y = 0; y < 3; y++) {
      if (g_world[x][y][z] !== 0) {
        safe = false;
        break;
      }
    }
  }

  return { x, z };
}

function buildWorld() {
  worldMatrices = [];

  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < WORLD_SIZE; z++) {

        if (g_world[x][y][z] == 1) {
          let block = new Matrix4();
          block.translate(x + 0.5, y + 0.5, z + 0.5);
          worldMatrices.push(block);
        }
      }
    }
  }
}

function initTextures() {
  // Dirt
  loadTexture('block.jpg', 0);
  loadTexture('grass.jpg', 1);
}

function loadTexture(src, texUnit) {
  const image = new Image();

  image.onload = function() {
    const texture = gl.createTexture();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      image
    );

    if (texUnit === 0) {
        gl.uniform1i(u_Sampler0, 0);
      } else {
        gl.uniform1i(u_Sampler1, 1);
      }
  };
  image.src = src;
}

// Render
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  
  gl.uniform1i(u_TextureType, 1);
  gl.uniform1f(u_texColorWeight, 1.0);
  drawCube(groundMatrix, [1,1,1,1], true);

  // Walls
  gl.uniform1i(u_TextureType, 0);
  gl.uniform1f(u_texColorWeight, 1.0);
  for (let i = 0; i < worldMatrices.length; i++) {
    drawCube(worldMatrices[i], [1,1,1,1], true);
  }

  if (koalaPos) {
    drawKoala(koalaPos.x, koalaPos.z);
  }

}

function showMessage(text) {
  const h1 = document.getElementById("gameMessage");
  h1.textContent = text;
}

function tick(currentTime) {
  if (currentTime - lastTime >= frameTime) {

    gFrameCount++;

    let seconds = performance.now() / 1000;
    if (seconds - gLastFPSUpdate > 1) {
      gFPS = gFrameCount;
      gFrameCount = 0;
      gLastFPSUpdate = seconds;
      document.getElementById("fps").innerText = "FPS: " + gFPS;
    }

    if (koalaPos && !koalaFound) {
      let dx = camera.eye.elements[0] - (koalaPos.x + 0.5);
      let dz = camera.eye.elements[2] - (koalaPos.z + 0.5);

      let dist = Math.sqrt(dx*dx + dz*dz);

      if (dist < 1.5) {
        koalaFound = true;
        showMessage("It appears to be lost! Bring it to the exit to set it free.");
      }
    }

    let playerX = Math.floor(camera.eye.elements[0]);

    if (koalaFound && playerX === WORLD_SIZE - 1) {
      showMessage("You rescued the koala! Well done!");
      koalaFound = false;
    }

      renderScene();
      lastTime = currentTime;
  }

  requestAnimationFrame(tick);
}

function getBlockInFront() {

  let forward = new Vector3([
    camera.at.elements[0] - camera.eye.elements[0],
    camera.at.elements[1] - camera.eye.elements[1],
    camera.at.elements[2] - camera.eye.elements[2]
  ]);

  forward.normalize();

  let maxDistance = 5;
  let step = 0.05;

  for (let t = 0.2; t < maxDistance; t += step) {

    let x = camera.eye.elements[0] + forward.elements[0] * t;
    let y = camera.eye.elements[1] + forward.elements[1] * t;
    let z = camera.eye.elements[2] + forward.elements[2] * t;

    x += forward.elements[0] * 0.01;
    y += forward.elements[1] * 0.01;
    z += forward.elements[2] * 0.01;

    let gridX = Math.floor(x);
    let gridY = Math.floor(y);
    let gridZ = Math.floor(z);

    if (
      gridX >= 0 && gridX < WORLD_SIZE &&
      gridY >= 0 && gridY < WORLD_HEIGHT &&
      gridZ >= 0 && gridZ < WORLD_SIZE
    ) {
      if (g_world[gridX][gridY][gridZ] === 1) {
        return { x: gridX, y: gridY, z: gridZ };
      }
    }
  }

  return null;
}

function addBlock() {

  let forward = new Vector3([
    camera.at.elements[0] - camera.eye.elements[0],
    camera.at.elements[1] - camera.eye.elements[1],
    camera.at.elements[2] - camera.eye.elements[2]
  ]);

  forward.normalize();

  let maxDistance = 4;
  let step = 0.1;
  let lastEmpty = null;

  for (let t = 0; t < maxDistance; t += step) {

    let x = camera.eye.elements[0] + forward.elements[0] * t;
    let y = camera.eye.elements[1] + forward.elements[1] * t;
    let z = camera.eye.elements[2] + forward.elements[2] * t;

    let gridX = Math.floor(x);
    let gridY = Math.floor(y);
    let gridZ = Math.floor(z);

    if (
      gridX >= 0 && gridX < WORLD_SIZE &&
      gridY >= 0 && gridY < WORLD_HEIGHT &&
      gridZ >= 0 && gridZ < WORLD_SIZE
    ) {

      if (g_world[gridX][gridY][gridZ] == 0) {
        lastEmpty = { x: gridX, y: gridY, z: gridZ };
      } else {
        break;
      }
    }
  }

  if (lastEmpty) {
    g_world[lastEmpty.x][lastEmpty.y][lastEmpty.z] = 1;
    buildWorld();
  }
}

function removeBlock() {
  let block = getBlockInFront();
  if (!block) return;

  g_world[block.x][block.y][block.z] = 0;
  buildWorld();
}

function spawnKoala() {

  let forward = new Vector3([
    camera.at.elements[0] - camera.eye.elements[0],
    0,
    camera.at.elements[2] - camera.eye.elements[2]
  ]);

  forward.normalize();

  let x = Math.floor(camera.eye.elements[0] + forward.elements[0] * 3);
  let z = Math.floor(camera.eye.elements[2] + forward.elements[2] * 3);

  if (x >= 0 && x < WORLD_SIZE && z >= 0 && z < WORLD_SIZE &&
      g_world[x][0][z] === 0 && g_world[x][1][z] === 0) {
    koalaPos = { x, z };
  } else {
    koalaPos = findSafeSpawn();
  }
}

function drawKoala(x, z) {

  let base = new Matrix4();
  base.translate(x + 0.5, 0.5, z + 0.5);

  // Body
  let body = new Matrix4(base);
  body.scale(0.5, 0.7, 0.4);
  body.translate(-0.5, -0.5, -0.5);
  drawCube(body, [0.5,0.5,0.55,1], false);

  // Head
  let head = new Matrix4(base);
  head.translate(0, 0.6, 0);
  head.scale(0.4,0.4,0.4);
  head.translate(-0.5,-0.6,-0.5);
  drawCube(head, [0.6,0.6,0.65,1], false);

  // Ears
  let earL = new Matrix4(head);
  earL.translate(-0.3,0.8,0);
  earL.scale(0.4,0.4,0.4);
  drawCube(earL, [0.7,0.7,0.7,1], false);
  let earR = new Matrix4(head);
  earR.translate(0.9,0.8,0);
  earR.scale(0.4,0.4,0.4);
  drawCube(earR, [0.7,0.7,0.7,1], false);
}