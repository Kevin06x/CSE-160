var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;
  uniform vec3 u_PointLightPos;

  varying vec2 v_UV;
  varying vec3 v_NormalDir;
  varying vec3 v_LightDir;
  varying vec3 v_FragPos;

  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_UV = a_UV;
    v_FragPos = vec3(worldPos);
    v_NormalDir = normalize(mat3(u_NormalMatrix) * a_Normal);
    v_LightDir = u_PointLightPos - vec3(worldPos);
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;

  // Textures
  uniform vec4 u_BaseColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_TextureType;
  uniform float u_texColorWeight;

  // Lighting
  uniform bool u_LightingOn;
  uniform bool u_NormalViz;

  // Point Light
  uniform bool u_PointLightOn;
  uniform vec3 u_PointLightPos;
  uniform vec3 u_PointLightColor;

  // SpotLight
  uniform bool u_SpotLightOn;
  uniform vec3 u_SpotLightPos;
  uniform vec3 u_SpotLightDir;
  uniform float u_SpotLightCutoff;
  uniform vec3 u_SpotLightColor;

  // Camera
  uniform vec3 u_CameraPos;
  varying vec2 v_UV;
  varying vec3 v_NormalDir;
  varying vec3 v_LightDir;
  varying vec3 v_FragPos;

  // Phong contribution from one light source
  vec3 phongLight(vec3 lightDir, vec3 lightColor,
                  vec3 normal, vec3 viewDir,
                  vec3 diffColor) {
    vec3 L = normalize(lightDir);

    // Ambient
    vec3 ambient = 0.15 * lightColor * diffColor;

    // Diffuse
    float diff    = max(dot(normal, L), 0.0);
    vec3 diffuse  = diff * lightColor * diffColor;

    // Specular
    vec3  halfDir  = normalize(L + viewDir);
    float spec     = pow(max(dot(normal, halfDir), 0.0), 64.0);
    vec3  specular = spec * lightColor * 0.5;

    return ambient + diffuse + specular;
  }

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

    vec4 surfaceColor = (1.0 - u_texColorWeight) * u_BaseColor + u_texColorWeight  * texColor;
    if (u_NormalViz) {
      gl_FragColor = vec4(abs(v_NormalDir), 1.0);
      return;
    }

    // No lighting
    if (!u_LightingOn) {
      gl_FragColor = surfaceColor;
      return;
    }

    vec3 N = normalize(v_NormalDir);
    vec3 viewDir = normalize(u_CameraPos - v_FragPos);
    vec3 diffCol = surfaceColor.rgb;
    vec3 result = vec3(0.0);

    // Point Light
    if (u_PointLightOn) {
      result += phongLight(v_LightDir, u_PointLightColor, N, viewDir, diffCol);
    } else {
      result += 0.1 * diffCol;
    }

    // Spot Light
    if (u_SpotLightOn) {
      vec3  toFrag   = normalize(v_FragPos - u_SpotLightPos);
      float cosAngle = dot(toFrag, normalize(u_SpotLightDir));
      if (cosAngle > u_SpotLightCutoff) {
        float spot = (cosAngle - u_SpotLightCutoff) / (1.0 - u_SpotLightCutoff);
        vec3 spotDir = u_SpotLightPos - v_FragPos;
        result += spot * phongLight(spotDir, u_SpotLightColor, N, viewDir, diffCol);
      }
    }
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), surfaceColor.a);
}
`;

// Global variables
let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
let u_BaseColor, u_Sampler0, u_Sampler1, u_TextureType, u_texColorWeight;
let u_LightingOn, u_NormalViz;
let u_PointLightColor, u_PointLightOn, u_PointLightPos;
let u_SpotLightColor, u_SpotLightPos, u_SpotLightDir, u_SpotLightCutoff, u_SpotLightOn;
let u_CameraPos;

let gLastFPSUpdate = 0;
let gFrameCount = 0;
let gFPS = 0;
let lastTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;

let camera;

const WORLD_SIZE = 32;
const WORLD_HEIGHT = 5;

let g_world = [];
let worldMatrices = [];
let groundMatrix;

// Lighting state
let g_lightingOn = true;
let g_normalViz= false;
let g_pointLightOn = true;
let g_spotLightOn = true;

let g_lightAngle = 0;
let g_lightPos   = [16, 6, 16];

const g_spotPos  = [16, 10, 16];
const g_spotDir  = [0, -1, 0];   // straight down
const g_spotCutoff = Math.cos((30 * Math.PI) / 180);

let g_lightColor = [1.0, 1.0, 0.9];
let g_model = null;


function main() {
  setupWebGL();
  connectVariablesToGLSL();

  gl.enable(gl.DEPTH_TEST); 
  gl.clearColor(0.53, 0.81, 0.98, 1.0);
  camera = new Camera();

  initCube();
  initSphere();
  initTextures();
  generateWorld();
  buildWorld();

  let spawn = findSafeSpawn();
  camera.eye = new Vector3([spawn.x + 0.5, 1.5, spawn.z + 0.5]);
  camera.at  = new Vector3([spawn.x + 0.5, 1.5, spawn.z - 1]);
  camera.updateView();

  groundMatrix = new Matrix4();
  groundMatrix.translate(WORLD_SIZE/2, -0.5, WORLD_SIZE/2);
  groundMatrix.scale(WORLD_SIZE, 1, WORLD_SIZE);
  groundMatrix.translate(-0.5, 0, -0.5);

  g_model = new Model('bunny.obj');

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

  document.getElementById('Lighting').onclick = function() {
    g_lightingOn = !g_lightingOn;
    this.textContent = 'Lighting: ' + (g_lightingOn ? 'ON' : 'OFF');
  };
  document.getElementById('NormalViz').onclick = function() {
    g_normalViz = !g_normalViz;
    this.textContent = 'Normal Viz: ' + (g_normalViz ? 'ON' : 'OFF');
  };
  document.getElementById('PointLight').onclick = function() {
    g_pointLightOn = !g_pointLightOn;
    this.textContent = 'Point Light: ' + (g_pointLightOn ? 'ON': 'OFF');
  };
  document.getElementById('SpotLight').onclick = function() {
    g_spotLightOn = !g_spotLightOn;
    this.textContent = 'Spot Light: ' + (g_spotLightOn ? 'ON' : 'OFF');
  };

  document.getElementById('sliderLight').oninput = function() {
    g_lightAngle = parseFloat(this.value);
  };

  document.getElementById('sliderLightColor').oninput = function() {
    let t = parseFloat(this.value) / 100.0;
    if (t < 0.5) {
      let s = t / 0.5;
      g_lightColor = [1.0, s, 0.0];
    } else {
      let s = (t - 0.5) / 0.5;
      g_lightColor = [1.0, 1.0, s];
    }
  };

  requestAnimationFrame(tick);
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

  a_Position = gl.getAttribLocation(gl.program,  'a_Position');
  a_UV = gl.getAttribLocation(gl.program,  'a_UV');
  a_Normal = gl.getAttribLocation(gl.program,  'a_Normal');

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');

  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_Sampler0= gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_TextureType = gl.getUniformLocation(gl.program, 'u_TextureType');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');

  u_LightingOn = gl.getUniformLocation(gl.program, 'u_LightingOn');
  u_NormalViz = gl.getUniformLocation(gl.program, 'u_NormalViz');

  u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_PointLightPos = gl.getUniformLocation(gl.program, 'u_PointLightPos');
  u_PointLightColor = gl.getUniformLocation(gl.program, 'u_PointLightColor');

  u_SpotLightOn = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
  u_SpotLightPos = gl.getUniformLocation(gl.program, 'u_SpotLightPos');
  u_SpotLightDir = gl.getUniformLocation(gl.program, 'u_SpotLightDir');
  u_SpotLightCutoff = gl.getUniformLocation(gl.program, 'u_SpotLightCutoff');
  u_SpotLightColor = gl.getUniformLocation(gl.program, 'u_SpotLightColor');

  u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos'); 

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

function uploadNormalMatrix(modelMatrix) {
  let nm = new Matrix4(modelMatrix);
  nm.invert();
  nm.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
}

function uploadLightUniforms() {
  gl.uniform1i(u_LightingOn,  g_lightingOn);
  gl.uniform1i(u_NormalViz,   g_normalViz);

  gl.uniform1i(u_PointLightOn,  g_pointLightOn);
  gl.uniform3fv(u_PointLightPos, new Float32Array(g_lightPos));
  gl.uniform3fv(u_PointLightColor, new Float32Array(g_lightColor));

  gl.uniform1i(u_SpotLightOn,    g_spotLightOn);
  gl.uniform3fv(u_SpotLightPos,  new Float32Array(g_spotPos));
  gl.uniform3fv(u_SpotLightDir,  new Float32Array(g_spotDir));
  gl.uniform1f(u_SpotLightCutoff, g_spotCutoff);
  gl.uniform3f(u_SpotLightColor,  0.5, 0.7, 1.0);

  gl.uniform3f(u_CameraPos,
    camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
}

// Render
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  
  uploadLightUniforms();
  
  gl.uniform1i(u_TextureType, 1);
  gl.uniform1f(u_texColorWeight, 1.0);
  uploadNormalMatrix(groundMatrix);
  drawCube(groundMatrix, [1,1,1,1], true);

  // Walls
  gl.uniform1i(u_TextureType, 0);
  gl.uniform1f(u_texColorWeight, 1.0);
  for (let i = 0; i < worldMatrices.length; i++) {
    drawCube(worldMatrices[i], [1,1,1,1], true);
  }

  let demoCubeM = new Matrix4();
  demoCubeM.translate(16, 0.5, 16);
  demoCubeM.scale(1.5, 1.5, 1.5);
  demoCubeM.translate(-0.5, 0, -0.5);
  gl.uniform1i(u_TextureType, -1);  // fallback white
  gl.uniform1f(u_texColorWeight, 0.0);
  uploadNormalMatrix(demoCubeM);
  drawCube(demoCubeM, [0.9, 0.4, 0.2, 1], false);

  // Demo Spheres
  let sphere1 = new Matrix4();
  sphere1.translate(14, 1.5, 16);
  sphere1.scale(2, 2, 2);
  uploadNormalMatrix(sphere1);
  drawSphere(sphere1, [0.2, 0.6, 1.0, 1]);

  let sphere2 = new Matrix4();
  sphere2.translate(18, 1.5, 16);
  sphere2.scale(2, 2, 2);
  uploadNormalMatrix(sphere2);
  drawSphere(sphere2, [0.9, 0.3, 0.3, 1]);

  if (g_model && g_model.isFullyLoaded) {
    let objM = new Matrix4();
    objM.translate(16, 1.6, 16);
    objM.scale(0.5, 0.5, 0.5);
    g_model.draw(objM, [0.7, 0.8, 0.5, 1]);
  }

  // Small Cube at point light
  let large = new Matrix4();
  large.translate(g_lightPos[0] - 0.15, g_lightPos[1] - 0.15, g_lightPos[2] - 0.15);
  large.scale(0.3, 0.3, 0.3);
  gl.uniform1i(u_LightingOn, false);
  uploadNormalMatrix(large);
  drawCube(large, [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1], false);
  gl.uniform1i(u_LightingOn, g_lightingOn);


  // Small Cube at spot light
  let small = new Matrix4();
  small.translate(g_spotPos[0] - 0.15, g_spotPos[1] - 0.15, g_spotPos[2] - 0.15);
  small.scale(0.3, 0.3, 0.3);
  gl.uniform1i(u_LightingOn, false);
  uploadNormalMatrix(small);
  drawCube(small, [0.5, 0.7, 1.0, 1], false);
  gl.uniform1i(u_LightingOn, g_lightingOn);
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

    g_lightAngle += 0.5;
    let sliderVal = parseFloat(document.getElementById('sliderLight').value);
    let totalAngle = (g_lightAngle + sliderVal) * (Math.PI / 180);
    let radius = 8;
    g_lightPos = [
      16 + radius * Math.cos(totalAngle), 5, 16 + radius * Math.sin(totalAngle)
    ];
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