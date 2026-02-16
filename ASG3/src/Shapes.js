let cubeBuffer = null;

function drawCube(M, baseColor, useTexture) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.uniform4f(u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);

  gl.uniform1f(u_texColorWeight, useTexture ? 1.0 : 0.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function initCube() {
  const vertices = [
    // x,y,z, u,v
    // Front
    0,0,0, 0,0,  1,0,0, 1,0,  1,1,0, 1,1,
    0,0,0, 0,0,  1,1,0, 1,1,  0,1,0, 0,1,
    // Back
    0,0,1, 0,0,  0,1,1, 0,1,  1,1,1, 1,1,
    0,0,1, 0,0,  1,1,1, 1,1,  1,0,1, 1,0,
    // Left
    0,0,0, 0,0,  0,1,1, 1,1,  0,0,1, 1,0,
    0,0,0, 0,0,  0,1,0, 0,1,  0,1,1, 1,1,
    // Right
    1,0,0, 0,0,  1,0,1, 1,0,  1,1,1, 1,1,
    1,0,0, 0,0,  1,1,1, 1,1,  1,1,0, 0,1,
    // Top
    0,1,0, 0,0,  1,1,1, 1,1,  0,1,1, 0,1,
    0,1,0, 0,0,  1,1,0, 1,0,  1,1,1, 1,1,
    // Bottom
    0,0,0, 0,0,  0,0,1, 0,1,  1,0,1, 1,1,
    0,0,0, 0,0,  1,0,1, 1,1,  1,0,0, 1,0
  ];

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;

  cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);
}