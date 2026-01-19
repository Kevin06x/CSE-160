var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;

  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4 u_FragColor;

  void main() {
    gl_FragColor = u_FragColor;
  }
`;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

let shapesList = [];

var POINT = 0;
var TRIANGLE = 1;
var CIRCLE = 2;
var currentShape = POINT;

let redoStack = [];

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  canvas.onmousedown = handleClicks;
  canvas.onmousemove = handleClicks;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// Setup 

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
}

function setPoint() {
  currentShape = POINT;
  console.log("Mode: POINT");
}

function setTriangle() {
  currentShape = TRIANGLE;
  console.log("Mode: TRIANGLE");
}

function setCircle() {
  currentShape = CIRCLE;
  console.log("Mode: CIRCLE");
}

function handleClicks(ev) {
  if (ev.buttons !== 1) {
    return;
  }

  let rect = ev.target.getBoundingClientRect();

   // Convert mouse positions
  let x = ((ev.clientX - rect.left) / canvas.width) * 2 - 1;
  let y = 1 - ((ev.clientY - rect.top) / canvas.height) * 2;

  let red = document.getElementById('red').value / 100;
  let green = document.getElementById('green').value / 100;
  let blue = document.getElementById('blue').value / 100;
  let size = document.getElementById('size').value;
  let segments = document.getElementById('segments')?.value || 10;

  let shape;
  if (currentShape === POINT) {
    shape = new Point([x, y], [red, green, blue, 1.0], size);
  } else if (currentShape === TRIANGLE) {
    shape = new Triangle([x, y], [red, green, blue, 1.0], size);
  } else if (currentShape === CIRCLE) {
    shape = new Circle([x, y], [red, green, blue, 1.0], size, segments);
  }

  // Call to draw
  shapesList.push(shape);
  redoStack = [];
  renderAllShapes();
}

function renderAllShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let shape of shapesList) {
      shape.render();
    }
}

// Cleans canvas
function clearCanvas() {
  shapesList = [];
  renderAllShapes();
}

function undo() {
  if (shapesList.length === 0) return;
  const shape = shapesList.pop(); // remove last drawn shape
  redoStack.push(shape);
  renderAllShapes();
}

function redo() {
  if (redoStack.length === 0) return;

  const shape = redoStack.pop();
  shapesList.push(shape);

  renderAllShapes();
}

function drawImage() {
  shapesList = [];

  // Tree
  shapesList.push(new Point([0.0, -0.5], [0.5, 0.2, 0.1, 1], 60));
  shapesList.push(new Triangle([0.0, 0.5], [0.0, 0.5, 0.0, 1], 40));
  shapesList.push(new Triangle([0.0, 0.2], [0.0, 0.5, 0.0, 1], 60));
  shapesList.push(new Triangle([0.0, -0.1], [0.0, 0.5, 0.0, 1], 80));
  
  // Ornaments
  shapesList.push(new Circle([0.0, 0.7], [1.0, 1.0, 0.0, 1], 20, 4));
  shapesList.push(new Circle([0.2, -0.4], [1.0, 0.5, 0.0, 1], 10, 20));
  shapesList.push(new Circle([-0.2, -0.35], [0.0, 0.5, 1.0, 1], 10, 20));
  shapesList.push(new Circle([0.12, -0.2], [0.7, 0.0, 0.2, 1], 10, 20));
  shapesList.push(new Circle([-0.05, -0.2], [0.2, 0.0, 0.2, 1], 10, 20));
  shapesList.push(new Circle([-0.05, 0.2], [0.5, 0.0, 0.5, 1], 10, 20));
  shapesList.push(new Circle([0.1, 0.05], [0.2, 0.0, 0.8, 1], 10, 20));
  shapesList.push(new Circle([-0.085, 0.0], [0.7, 0.2, 0.3, 1], 10, 20));
  shapesList.push(new Circle([-0.02, 0.5], [0.7, 0.2, 0.7, 1], 10, 20));
  shapesList.push(new Circle([0.05, 0.35], [0.9, 0.2, 0.3, 1], 10, 20));

  renderAllShapes();
}