// Points
class Point {
  constructor(position, color, size) {
    this.position = position; // [x, y]
    this.color = color;       // [red, green, blue, 1.0]
    this.size = size;         // float
  }

  render() {
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(
      a_Position,
      this.position[0],
      this.position[1],
      0.0
    );

    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    gl.uniform1f(u_Size, this.size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

function drawTriangle(vertices) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position); // enable buffer mode
 
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawCube(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  const vertices = [
    // front
    0,0,0,  1,0,0,  1,1,0,
    0,0,0,  1,1,0,  0,1,0,
    // back
    0,0,1,  0,1,1,  1,1,1,
    0,0,1,  1,1,1,  1,0,1,
    // left
    0,0,0,  0,1,1,  0,0,1,
    0,0,0,  0,1,0,  0,1,1,
    // right
    1,0,0,  1,0,1,  1,1,1,
    1,0,0,  1,1,1,  1,1,0,
    // top
    0,1,0,  1,1,1,  0,1,1,
    0,1,0,  1,1,0,  1,1,1,
    // bottom
    0,0,0,  0,0,1,  1,0,1,
    0,0,0,  1,0,1,  1,0,0
  ];

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawCone(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_FragColor, ...color);

  const verts = [];
  const slices = 20;

  for (let i = 0; i < slices; i++) {
    let a = (i / slices) * 2 * Math.PI;
    let b = ((i + 1) / slices) * 2 * Math.PI;

    verts.push(
      0, 1, 0,
      Math.cos(a), 0, Math.sin(a),
      Math.cos(b), 0, Math.sin(b)
    );
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
}

// Triangles
class Triangle {
  constructor(position, color, size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render() {
    const [x, y] = this.position;
    const d = this.size / 200;

    const vertices = [
      x,     y + d,
      x - d, y - d,
      x + d, y - d
    ];

    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    drawTriangle(vertices);
  }
}

// Circles

class Circle {
  constructor(position, color, size, segments) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.segments = segments; // number of triangles in circle
  }

  render() {
    const [cx, cy] = this.position;
    const r = this.size / 200;
    const step = 360 / this.segments; // degrees per triangle


    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    // Build circle
    for (let a = 0; a < 360; a += step) {
      const a1 = a * Math.PI / 180;
      const a2 = (a + step) * Math.PI / 180;

      drawTriangle([
        cx, cy,
        cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
        cx + Math.cos(a2) * r, cy + Math.sin(a2) * r
      ]);
    }
  }
}