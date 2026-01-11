function drawVector(v, color) {
    const canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    const ctx = canvas.getContext('2d');

    const scale = 20;

    // Center
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
        cx + v.elements[0] * scale,
        cy - v.elements[1] * scale
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function handleDrawEvent() {
    const canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    const ctx = canvas.getContext('2d');

    // Create Canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x1 = Number(document.getElementById('x1').value);
    const y1 = Number(document.getElementById('y1').value);

    const x2 = Number(document.getElementById('x2').value);
    const y2 = Number(document.getElementById('y2').value);

    const v1 = new Vector3([x1, y1, 0]);
    const v2 = new Vector3([x2, y2, 0]);
    drawVector(v1, "red");
    drawVector(v2, "blue");
}

function angleBetween(v1, v2) {
    const dot = Vector3.dot(v1, v2);
    const magnitude1 = v1.magnitude();
    const magnitude2 = v2.magnitude();

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }

    // cos(alpha) = dot / (||v1|| * ||v2||)
    let cosAlpha = dot / (magnitude1 * magnitude2);
    cosAlpha = Math.min(1, Math.max(-1, cosAlpha));

    // radians to degrees
    const angleRadians = Math.acos(cosAlpha);
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees
}

function areaTriangle(v1, v2) {
    const cross = Vector3.cross(v1, v2);
    const parallelogramArea = cross.magnitude();
    const triangleArea = parallelogramArea / 2;
    return triangleArea;
}

function handleDrawOperationEvent() {
    const canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    const ctx = canvas.getContext('2d');

    // Create Canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x1 = Number(document.getElementById('x1').value);
    const y1 = Number(document.getElementById('y1').value);

    const x2 = Number(document.getElementById('x2').value);
    const y2 = Number(document.getElementById('y2').value);

    const v1 = new Vector3([x1, y1, 0]);
    const v2 = new Vector3([x2, y2, 0]);
    drawVector(v1, "red");
    drawVector(v2, "blue");

    const operation = document.getElementById('operation').value;
    const scalar = Number(document.getElementById('scalar').value);

    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);

    if (operation === "add"){
        v3.add(v2);
        drawVector(v3, "green");
    } else if (operation === "sub") {
        v3.sub(v2);
        drawVector(v3, "green");
    } else if (operation === "mul") {
        v3.mul(scalar);
        v4.mul(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "div") {
        v3.div(scalar);
        v4.div(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "mag") {
        console.log("Magnitude v1: ", v3.magnitude());
        console.log("Magnitude v2: ", v4.magnitude());
    } else if (operation === "nor") {
        v3.normalize();
        v4.normalize();
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "angle") {
        const angle = angleBetween(v1, v2);
        console.log("Angle: ", angle);
    } else if (operation === "area") {
        const area = areaTriangle(v1, v2);
        console.log("Area of the triangle: ", area);
    }
}


function main() {
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}