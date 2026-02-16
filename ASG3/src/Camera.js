class Camera {
    constructor() {
        this.fov = 60;
        this.yaw = -90;
        this.pitch = 0;

        this.eye = new Vector3([16, 3, 16]);
        this.at  = new Vector3([16, 3, 15]);
        this.up  = new Vector3([0, 1, 0]);

        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();

        this.updateView();
        this.updateProjection();
        
    }

    updateView() {
        this.viewMatrix.setLookAt(
        this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
        this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
        this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
        );
    }

    updateProjection() {
        this.projectionMatrix.setPerspective(
        this.fov,
        canvas.width / canvas.height,
        0.1,
        1000
        );
    }

    moveForward() {
        let f = new Vector3([
            this.at.elements[0] - this.eye.elements[0],
            this.at.elements[1] - this.eye.elements[1],
            this.at.elements[2] - this.eye.elements[2]
        ]);

        f.normalize();

        let speed = 0.5;

        this.eye.elements[0] += f.elements[0] * speed;
        this.eye.elements[1] += f.elements[1] * speed;
        this.eye.elements[2] += f.elements[2] * speed;

        this.at.elements[0] += f.elements[0] * speed;
        this.at.elements[1] += f.elements[1] * speed;
        this.at.elements[2] += f.elements[2] * speed;

        this.updateView();
    }


    moveBackwards() {
        let f = new Vector3([
            this.eye.elements[0] - this.at.elements[0],
            this.eye.elements[1] - this.at.elements[1],
            this.eye.elements[2] - this.at.elements[2]
        ]);

        f.normalize();

        let speed = 0.5;

        this.eye.elements[0] += f.elements[0] * speed;
        this.eye.elements[1] += f.elements[1] * speed;
        this.eye.elements[2] += f.elements[2] * speed;

        this.at.elements[0] += f.elements[0] * speed;
        this.at.elements[1] += f.elements[1] * speed;
        this.at.elements[2] += f.elements[2] * speed;

        this.updateView();
    }

    moveLeft() {
        let f = [
            this.at.elements[0] - this.eye.elements[0],
            this.at.elements[1] - this.eye.elements[1],
            this.at.elements[2] - this.eye.elements[2]
        ];

        let s = new Vector3([
            this.up.elements[1] * f[2] - this.up.elements[2] * f[1],
            this.up.elements[2] * f[0] - this.up.elements[0] * f[2],
            this.up.elements[0] * f[1] - this.up.elements[1] * f[0]
        ]);

        s.normalize();

        let speed = 0.5;

        this.eye.elements[0] += s.elements[0] * speed;
        this.eye.elements[1] += s.elements[1] * speed;
        this.eye.elements[2] += s.elements[2] * speed;

        this.at.elements[0] += s.elements[0] * speed;
        this.at.elements[1] += s.elements[1] * speed;
        this.at.elements[2] += s.elements[2] * speed;

        this.updateView();
    }



    moveRight() {
        let f = [
            this.at.elements[0] - this.eye.elements[0],
            this.at.elements[1] - this.eye.elements[1],
            this.at.elements[2] - this.eye.elements[2]
        ];

        let s = new Vector3([
            f[1] * this.up.elements[2] - f[2] * this.up.elements[1],
            f[2] * this.up.elements[0] - f[0] * this.up.elements[2],
            f[0] * this.up.elements[1] - f[1] * this.up.elements[0]
        ]);

        s.normalize();

        let speed = 0.5;

        this.eye.elements[0] += s.elements[0] * speed;
        this.eye.elements[1] += s.elements[1] * speed;
        this.eye.elements[2] += s.elements[2] * speed;

        this.at.elements[0] += s.elements[0] * speed;
        this.at.elements[1] += s.elements[1] * speed;
        this.at.elements[2] += s.elements[2] * speed;

        this.updateView();
    }

    rotate(yawOffset, pitchOffset) {

        this.yaw += yawOffset;
        this.pitch += pitchOffset;

        // Prevent flipping
        if (this.pitch > 89) this.pitch = 89;
        if (this.pitch < -89) this.pitch = -89;

        let front = new Vector3([
            Math.cos(this.degToRad(this.yaw)) * Math.cos(this.degToRad(this.pitch)),
            Math.sin(this.degToRad(this.pitch)),
            Math.sin(this.degToRad(this.yaw)) * Math.cos(this.degToRad(this.pitch))
        ]);

        front.normalize();

        this.at.elements[0] = this.eye.elements[0] + front.elements[0];
        this.at.elements[1] = this.eye.elements[1] + front.elements[1];
        this.at.elements[2] = this.eye.elements[2] + front.elements[2];

        this.updateView();
    }

    degToRad(deg) {
        return deg * Math.PI / 180;
    }

    moveUp() {
        let speed = 0.5;

        this.eye.elements[1] += speed;
        this.at.elements[1] += speed;

        this.updateView();
    }

    moveDown() {
        let speed = 0.5;

        this.eye.elements[1] -= speed;
        this.at.elements[1] -= speed;

        this.updateView();
    }

    updateView() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }


}
