let cubeBuffer = null;
let sphereBuffer = null;
let sphereVertexCount = 0;

function drawCube(M, baseColor, useTexture) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.uniform4f(u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);

  gl.uniform1f(u_texColorWeight, useTexture ? 1.0 : 0.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function initCube() {
  const faces = [
    // Front
    [0,0,0, 0,0,  0, 0,-1],
    [1,0,0, 1,0,  0, 0,-1],
    [1,1,0, 1,1,  0, 0,-1],
    [0,0,0, 0,0,  0, 0,-1],
    [1,1,0, 1,1,  0, 0,-1],
    [0,1,0, 0,1,  0, 0,-1],

    // Back
    [0,0,1, 0,0,  0, 0, 1],
    [0,1,1, 0,1,  0, 0, 1],
    [1,1,1, 1,1,  0, 0, 1],
    [0,0,1, 0,0,  0, 0, 1],
    [1,1,1, 1,1,  0, 0, 1],
    [1,0,1, 1,0,  0, 0, 1],

    // Left
    [0,0,0, 0,0, -1, 0, 0],
    [0,1,1, 1,1, -1, 0, 0],
    [0,0,1, 1,0, -1, 0, 0],
    [0,0,0, 0,0, -1, 0, 0],
    [0,1,0, 0,1, -1, 0, 0],
    [0,1,1, 1,1, -1, 0, 0],

    // Right
    [1,0,0, 0,0,  1, 0, 0],
    [1,0,1, 1,0,  1, 0, 0],
    [1,1,1, 1,1,  1, 0, 0],
    [1,0,0, 0,0,  1, 0, 0],
    [1,1,1, 1,1,  1, 0, 0],
    [1,1,0, 0,1,  1, 0, 0],

    // Top
    [0,1,0, 0,0,  0, 1, 0],
    [1,1,0, 1,0,  0, 1, 0],
    [1,1,1, 1,1,  0, 1, 0],
    [0,1,0, 0,0,  0, 1, 0],
    [1,1,1, 1,1,  0, 1, 0],
    [0,1,1, 0,1,  0, 1, 0],

    // Bottom
    [0,0,0, 0,0,  0,-1, 0],
    [0,0,1, 0,1,  0,-1, 0],
    [1,0,1, 1,1,  0,-1, 0],
    [0,0,0, 0,0,  0,-1, 0],
    [1,0,1, 1,1,  0,-1, 0],
    [1,0,0, 1,0,  0,-1, 0],
  ];

  const flat = [];
  for (const v of faces) {
    flat.push(...v);
  }

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  const stride = 8;

  cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flat), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * stride, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * stride, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);

  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * stride, FSIZE * 5);
  gl.enableVertexAttribArray(a_Normal);
}

function drawCube(M, baseColor, useTexture) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
  gl.uniform1f(u_texColorWeight, useTexture ? 1.0 : 0.0);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  const stride = 8;

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * stride, 0);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, FSIZE * stride, FSIZE * 3);
  gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, FSIZE * stride, FSIZE * 5);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function initSphere(latBands = 30, lonBands = 30) {
  const verts = [];

  for (let lat = 0; lat <= latBands; lat++) {
    // 0 to pi
    const theta = (lat / latBands) * Math.PI;
    const sinT  = Math.sin(theta);
    const cosT  = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      // 0 to 2pi
      const phi  = (lon / lonBands) * 2 * Math.PI;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      // position scaled
      const nx = cosP * sinT;
      const ny = cosT;
      const nz = sinP * sinT;

      const x = 0.5 * nx;
      const y = 0.5 * ny;
      const z = 0.5 * nz;

      const u = 1 - lon / lonBands;
      const v = 1 - lat / latBands;

      verts.push(x, y, z, u, v, nx, ny, nz);
    }
  }

  // Build triangle
  const triangle = [];

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const stride = lonBands + 1;
      const i0 = lat * stride + lon;
      const i1 = i0 + 1;
      const i2 = (lat + 1) * stride + lon;
      const i3 = i2 + 1;

      const floats = 8;
      // triangle 1
      triangle.push(...verts.slice(i0*floats, i0*floats+floats));
      triangle.push(...verts.slice(i2*floats, i2*floats+floats));
      triangle.push(...verts.slice(i1*floats, i1*floats+floats));
      // triangle 2
      triangle.push(...verts.slice(i1*floats, i1*floats+floats));
      triangle.push(...verts.slice(i2*floats, i2*floats+floats));

      triangle.push(...verts.slice(i3*floats, i3*floats+floats));
    }
  }
  sphereVertexCount = triangle.length / 8;

  sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle), gl.STATIC_DRAW);
}

function drawSphere(M, baseColor) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
  gl.uniform1f(u_texColorWeight, 0.0);  // spheres use flat color for now

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  const stride = 8;

  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * stride, 0);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, FSIZE * stride, FSIZE * 3);
  gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, FSIZE * stride, FSIZE * 5);
  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexCount);
}