import { Sensor } from "./sensor.js";
import { NeuralNetwork } from "./network.js";
import { polysIntersect } from "./utils.js";

export class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 3) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;

        this.useBrain = controlType === "AI";
        this.fitness = 0;

        if (controlType !== "DUMMY") {
            // Setup sensors for AI and player cars
            this.sensor = new Sensor(this);
            if (this.useBrain) {
                // Input size = 5 (sensors), Hidden layer = 6, Output size = 4 (Forward, Left, Right, Reverse)
                this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
            }
        }

        this.controls = new Controls(controlType);
        this.polygon = [];
    }

    update(roadBorders, obstacles, weatherEffects = {}) {
        if (!this.damaged) {
            this.#move(weatherEffects);
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, obstacles);
            this.fitness = -this.y; // Standard fitness is distance driven up the lane
        }

        if (this.sensor) {
            this.sensor.update(roadBorders, obstacles, weatherEffects);
            
            if (this.useBrain) {
                // Prepare inputs: 0 (clear path) to 1 (touching obstacle)
                const inputs = this.sensor.readings.map(
                    s => s == null ? 0 : 1 - s.offset
                );
                
                const outputs = NeuralNetwork.feedForward(inputs, this.brain);
                
                // Map neural activations to controls
                this.controls.forward = outputs[0] === 1;
                this.controls.left = outputs[1] === 1;
                this.controls.right = outputs[2] === 1;
                this.controls.reverse = outputs[3] === 1;
            }
        }
    }

    #assessDamage(roadBorders, obstacles) {
        // Border collisions
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }

        // Obstacle collisions
        for (let i = 0; i < obstacles.length; i++) {
            if (polysIntersect(this.polygon, obstacles[i].polygon)) {
                return true;
            }
        }
        return false;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + Math.PI - alpha) * rad,
            y: this.y - Math.cos(this.angle + Math.PI - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + Math.PI + alpha) * rad,
            y: this.y - Math.cos(this.angle + Math.PI + alpha) * rad
        });

        return points;
    }

    #move(weatherEffects) {
        // Apply weather adjustments
        let currentFriction = this.friction;
        let currentAcceleration = this.acceleration;
        let currentMaxSpeed = this.maxSpeed;

        if (weatherEffects.rain) {
            // Rain decreases road friction (creating a slick, driftier feel) and decreases acceleration slightly
            currentFriction = this.friction * (1 - weatherEffects.rain * 0.6); // 0.05 -> 0.02
            currentAcceleration = this.acceleration * (1 - weatherEffects.rain * 0.2);
            currentMaxSpeed = this.maxSpeed * (1 - weatherEffects.rain * 0.15); // Reduce top speed slightly
        }

        // Acceleration and speed updates
        if (this.controls.forward) {
            this.speed += currentAcceleration;
        }
        if (this.controls.reverse) {
            this.speed -= currentAcceleration;
        }

        // Friction capping
        if (this.speed > currentMaxSpeed) {
            this.speed = currentMaxSpeed;
        }
        if (this.speed < -currentMaxSpeed / 2) {
            this.speed = -currentMaxSpeed / 2;
        }

        if (this.speed > 0) {
            this.speed -= currentFriction;
        }
        if (this.speed < 0) {
            this.speed += currentFriction;
        }

        if (Math.abs(this.speed) < currentFriction) {
            this.speed = 0;
        }

        // Steering physics based on current speed
        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            let steerFactor = 0.03;
            
            if (weatherEffects.rain) {
                // Less traction means slightly reduced steering response (drift)
                steerFactor *= (1 - weatherEffects.rain * 0.35);
            }

            if (this.controls.left) {
                this.angle += steerFactor * flip;
            }
            if (this.controls.right) {
                this.angle -= steerFactor * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, isBest = false) {
        ctx.save();
        
        // Pick visual color based on state
        if (this.damaged) {
            ctx.fillStyle = "rgba(100, 116, 139, 0.4)"; // Slate translucent gray
            ctx.strokeStyle = "rgba(100, 116, 139, 0.6)";
        } else if (this.useBrain) {
            if (isBest) {
                ctx.fillStyle = "rgba(16, 185, 129, 0.9)"; // Vibrant emerald for best car
                ctx.strokeStyle = "#10b981";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#10b981";
            } else {
                ctx.fillStyle = "rgba(16, 185, 129, 0.2)"; // Soft green for other cohort cars
                ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
            }
        } else {
            // Player manual drive
            ctx.fillStyle = "rgba(0, 243, 255, 0.85)"; // Neon Cyan
            ctx.strokeStyle = "#00f3ff";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00f3ff";
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw details for the best or manual car (windscreens, headlights)
        if (!this.damaged && (isBest || !this.useBrain)) {
            // Cabin windscreen
            ctx.beginPath();
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            
            const frontLeft = this.polygon[0];
            const frontRight = this.polygon[1];
            const backLeft = this.polygon[3];
            const backRight = this.polygon[2];

            const cabinFrontLeft = {
                x: frontLeft.x + (backLeft.x - frontLeft.x) * 0.2,
                y: frontLeft.y + (backLeft.y - frontLeft.y) * 0.2
            };
            const cabinFrontRight = {
                x: frontRight.x + (backRight.x - frontRight.x) * 0.2,
                y: frontRight.y + (backRight.y - frontRight.y) * 0.2
            };
            const cabinBackLeft = {
                x: frontLeft.x + (backLeft.x - frontLeft.x) * 0.6,
                y: frontLeft.y + (backLeft.y - frontLeft.y) * 0.6
            };
            const cabinBackRight = {
                x: frontRight.x + (backRight.x - frontRight.x) * 0.6,
                y: frontRight.y + (backRight.y - frontRight.y) * 0.6
            };

            ctx.moveTo(cabinFrontLeft.x, cabinFrontLeft.y);
            ctx.lineTo(cabinFrontRight.x, cabinFrontRight.y);
            ctx.lineTo(cabinBackRight.x, cabinBackRight.y);
            ctx.lineTo(cabinBackLeft.x, cabinBackLeft.y);
            ctx.closePath();
            ctx.fill();

            // Headlights glowing
            ctx.fillStyle = isBest ? "rgba(255, 253, 220, 0.95)" : "rgba(230, 245, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(frontLeft.x + (frontRight.x - frontLeft.x) * 0.2, frontLeft.y + (frontRight.y - frontLeft.y) * 0.2, 3, 0, Math.PI * 2);
            ctx.arc(frontLeft.x + (frontRight.x - frontLeft.x) * 0.8, frontLeft.y + (frontRight.y - frontLeft.y) * 0.8, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Draw sensor if the car is manual or the current best
        if (this.sensor && (isBest || !this.useBrain)) {
            this.sensor.draw(ctx);
        }
    }
}

class Controls {
    constructor(type) {
        this.forward = false;
        this.left = false;
        this.right = false;
        this.reverse = false;

        switch (type) {
            case "KEYS":
                this.#addKeyboardListeners();
                break;
            case "DUMMY":
                this.forward = true; // Simple traffic car moves forward
                break;
        }
    }

    #addKeyboardListeners() {
        document.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "ArrowUp":
                case "w":
                case "W":
                    this.forward = true;
                    break;
                case "ArrowLeft":
                case "a":
                case "A":
                    this.left = true;
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    this.right = true;
                    break;
                case "ArrowDown":
                case "s":
                case "S":
                    this.reverse = true;
                    break;
            }
        });

        document.addEventListener("keyup", (e) => {
            switch (e.key) {
                case "ArrowUp":
                case "w":
                case "W":
                    this.forward = false;
                    break;
                case "ArrowLeft":
                case "a":
                case "A":
                    this.left = false;
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    this.right = false;
                    break;
                case "ArrowDown":
                case "s":
                case "S":
                    this.reverse = false;
                    break;
            }
        });
    }
}
