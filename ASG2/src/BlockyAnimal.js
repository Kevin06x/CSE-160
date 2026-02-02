var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;

  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;

  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// Global variables
let canvas, gl;
let a_Position, u_FragColor;
let u_ModelMatrix, u_GlobalRotation;

let gAnimalGlobalRotation = 0;
let gAnimalRotX = 0;
let gAnimalRotY = 180;

let gUpperArmAngleL = 0;
let gLowerArmAngleL= -45;
let gHandAngleL = 0;
let gUpperArmAngleR = 0;
let gLowerArmAngleR= 45;
let gHandAngleR = 0;
let gAnimate = false;
let gSeconds = 0;
let gHeadAngle = 0;
let gLegAngle = 0;

let gMouseX = 0;
let gMouseY = 0;
let gLastX = null;
let gLastY = null;
let gDragging = false;

let gPoke = false;
let gPokeStartTime = 0;

let gLastFPSUpdate = 0;
let gFrameCount = 0;
let gFPS = 0;


function main() {
  setupWebGL();
  connectVariablesToGLSL();

  gl.enable(gl.DEPTH_TEST);

  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

  gl.clearColor(0.416, 0.667, 0.294, 1.0);

  requestAnimationFrame(tick);

  canvas.onmousedown = function(ev) {
    gDragging = true;
    gLastX = ev.clientX;
    gLastY = ev.clientY;
  };

  canvas.onmouseup = function(ev) {
    gDragging = false;
  };

  canvas.onmousemove = function(ev) {
    if (!gDragging) return;

    let dx = ev.clientX - gLastX;
    let dy = ev.clientY - gLastY;

    gAnimalRotY -= dx * 0.5;
    gAnimalRotX -= dy * 0.5;

    gAnimalRotX = Math.max(-90, Math.min(90, gAnimalRotX));

    gLastX = ev.clientX;
    gLastY = ev.clientY;

    renderScene();
  };

  canvas.onclick = function(ev) {
  if (ev.shiftKey) {
    gPoke = true;
    gPokeStartTime = gSeconds;
  }
};
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
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
}

// Render
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let globalRot = new Matrix4();
  globalRot.rotate(gAnimalRotX, 1, 0, 0);
  globalRot.rotate(gAnimalRotY, 0, 1, 0);
  globalRot.rotate(gAnimalGlobalRotation, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRot.elements);

  // Torso
  let body = new Matrix4();
  body.translate(0, 0, 0);
  body.scale(0.5, 0.7, 0.4);
  body.translate(-0.5, -0.5, -0.5);
  drawCube(body, [0.498, 0.518, 0.537, 1.0]);

  let inner = new Matrix4();
  inner.translate(0, 0, 0.01);
  inner.scale(0.3, 0.5, 0.4);
  inner.translate(-0.5, -0.5, -0.5);
  drawCube(inner, [0.859, 0.863, 0.867, 1.0]);
  let bodyMatrix = new Matrix4(body);

  // Legs
  let rightLeg = new Matrix4();
  rightLeg.translate(0, 0, 0.15);
  rightLeg.rotate(gLegAngle, 1, 0, 0);
  rightLeg.scale(0.2, 0.25, 0.2);
  rightLeg.translate(1, -1.8, -0.5);
  drawCube(rightLeg, [0.498, 0.518, 0.537, 1.0]);
  let leftLeg = new Matrix4();
  leftLeg.translate(0, 0, 0.15);
  leftLeg.rotate(gLegAngle, 1, 0, 0);
  leftLeg.scale(0.2, 0.25, 0.2);
  leftLeg.translate(-2, -1.8, -0.5);
  drawCube(leftLeg, [0.498, 0.518, 0.537, 1.0]);

  // Head
  let head = new Matrix4();
  head = new Matrix4(bodyMatrix);
  head.translate(-0.1, 0.5, 0.0);
  head.rotate(gHeadAngle, 0, 1, 0);
  head.scale(1.2, 0.7, 1);
  head.translate(0.0, 0.7, 0.2);
  drawCube(head, [0.498, 0.518, 0.537, 1.0]);

  // Ears
  let leftEar = new Matrix4();
  leftEar = new Matrix4(head);
  leftEar.translate(0, 0, 0.15);
  leftEar.scale(0.3, 0.4, 0.25);
  leftEar.translate(-0.5, 1.8, -0.5);
  drawCube(leftEar, [0.7, 0.7, 0.7, 1]);

  let rightEar = new Matrix4();
  rightEar = new Matrix4(head);
  rightEar.translate(1, 0.9, 0.15);
  rightEar.scale(0.3, 0.4, 0.25);
  rightEar.translate(-0.5, -0.5, -0.5);
  drawCube(rightEar, [0.7, 0.7, 0.7, 1]);

  // Eyes
  let leftEye = new Matrix4();
  leftEye = new Matrix4(head);
  leftEye.translate(0, 0, 0.0);
  leftEye.scale(0.15, 0.15, 0.15);
  leftEye.translate(1, 3, 6.5);
  drawCube(leftEye, [0.0, 0.0, 0.0, 1]);
  let rightEye = new Matrix4();
  rightEye = new Matrix4(head);
  rightEye.translate(0, 0, 0);
  rightEye.scale(0.15, 0.15, 0.15);
  rightEye.translate(4.5, 3, 6.5);
  drawCube(rightEye, [0.0, 0.0, 0.0, 1]);

  // Nose
  let nose = new Matrix4();
  nose = new Matrix4(head);
  nose.translate(0, 0, 0);
  nose.scale(0.15, 0.3, 0.15);
  nose.translate(2.7, 0.5, 6.5);
  drawCube(nose, [0.95, 0.75, 0.7, 1]);

  // Left Arm
  let upperArmL = new Matrix4();
  upperArmL = new Matrix4(bodyMatrix);
  upperArmL.translate(-0.05, 0.9, 0.5);
  upperArmL.rotate(gUpperArmAngleL, 1, 0, 0);
  upperArmL.translate(0.0, -0.35, 0.0);
  let upperArmJoint = new Matrix4(upperArmL);
  upperArmL.scale(0.15, 0.35, 0.25);
  upperArmL.translate(-0.5, 0.0, -0.5);
  drawCube(upperArmL, [0.2, 0.208, 0.216, 1.0]);

  let lowerArmL = new Matrix4();
  lowerArmL = new Matrix4(upperArmJoint);
  lowerArmL.rotate(gLowerArmAngleL, 1, 0, 0);
  lowerArmL.translate(0.0, -0.25, 0.0);
  let wristJointL = new Matrix4(lowerArmL);
  lowerArmL.scale(0.13, 0.30, 0.15);
  lowerArmL.translate(-0.5, 0.0, -0.5);
  drawCube(lowerArmL, [0.2, 0.208, 0.216, 1.0]);

  let handL = new Matrix4();
  handL = new Matrix4(wristJointL);
  handL.translate(0.0, -0.12, 0.0);
  handL.rotate(gHandAngleL, 1, 0, 0);
  handL.scale(0.14, 0.12, 0.18);
  handL.translate(-0.5, 0.0, -0.5);
  drawCube(handL, [0.2, 0.208, 0.216, 1.0]);

  let upperArmR = new Matrix4();
  upperArmR = new Matrix4(bodyMatrix);
  upperArmR.translate(1.05, 0.9, 0.5);
  upperArmR.rotate(-gUpperArmAngleR, 1, 0, 0);
  upperArmR.translate(0.0, -0.35, 0.0);
  let upperArmJointR = new Matrix4(upperArmR);
  upperArmR.scale(0.15, 0.35, 0.25);
  upperArmR.translate(-0.5, 0.0, -0.5);
  drawCube(upperArmR, [0.2, 0.208, 0.216, 1.0]);

  let lowerArmR = new Matrix4();
  lowerArmR = new Matrix4(upperArmJointR);
  lowerArmR.rotate(-gLowerArmAngleR, 1, 0, 0);
  lowerArmR.translate(0.0, -0.25, 0.0);
  let wristJointR = new Matrix4(lowerArmR);
  lowerArmR.scale(0.13, 0.30, 0.15);
  lowerArmR.translate(-0.5, 0.0, -0.5);
  drawCube(lowerArmR, [0.2, 0.208, 0.216, 1.0]);

  let handR = new Matrix4();
  handR = new Matrix4(wristJointR);
  handR.translate(0.0, -0.12, 0.0);
  handR.rotate(gHandAngleR, 1, 0, 0);
  handR.scale(0.14, 0.12, 0.18);
  handR.translate(-0.5, 0.0, -0.5);
  drawCube(handR, [0.2, 0.208, 0.216, 1.0]);

  let cone = new Matrix4(head);
  cone.translate(0.5, 1, 0.6);
  cone.scale(0.3, 0.3, 0.4);
  drawCone(cone, [1, 0.5, 0.2, 1]);

}

function updateAnimationAngles() {
  if (!gAnimate && !gPoke) return;

  let swing = Math.sin(gSeconds * 2);

  if (gPoke) {
    let pokeTime = gSeconds - gPokeStartTime;

    if (pokeTime < 1.2) {
      let poke = Math.sin((pokeTime / 1.2) * Math.PI);

      gUpperArmAngleL = -100 * poke;
      gLowerArmAngleL = 10 * poke;

      gUpperArmAngleR = -60 * poke;
      gLowerArmAngleR = 120 * poke;

      gHeadAngle = -5 * poke;
      gHandAngle = 40 * poke;
      gLegAngle  = -30 * poke;
    } else {
      gPoke = false;
    }
    return;
  }

  gUpperArmAngleL = 30 * Math.sin(gSeconds);
  gLowerArmAngleL = -60 + 30 * Math.sin(gSeconds);

  gUpperArmAngleR = -30 * swing;
  gLowerArmAngleR = 60 - 30 * swing;

  gHeadAngle = 10 * Math.sin(gSeconds * 0.8);
  gLegAngle  = 20 * Math.sin(gSeconds);
  gHandAngle = 20 * Math.sin(gSeconds);
}

function tick() {
  gSeconds = performance.now() / 1000;

  gFrameCount++;
  if (gSeconds - gLastFPSUpdate > 1) {
    gFPS = gFrameCount;
    gFrameCount = 0;
    gLastFPSUpdate = gSeconds;
    document.getElementById("fps").innerText = "FPS: " + gFPS;
  }

  if (gAnimate || gPoke) {
    updateAnimationAngles();
  }
  renderScene();
  requestAnimationFrame(tick);
}
