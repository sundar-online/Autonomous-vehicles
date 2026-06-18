export class Obstacle {
    constructor(x, y, width, height, type = "traffic", maxSpeed = 1.5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // "traffic" or "barrier"
        this.speed = type === "traffic" ? -maxSpeed : 0; // Negative moves up the canvas
        this.angle = 0;
        this.polygon = [];

        this.update();
    }

    update() {
        this.y += this.speed;
        this.polygon = this.#createPolygon();
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

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        
        if (this.type === "traffic") {
            // Draw traffic car
            ctx.fillStyle = "rgba(255, 46, 126, 0.85)"; // Ruby pink neon
            ctx.strokeStyle = "#ff2e7e";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#ff2e7e";

            // Move to first coordinate
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            for (let i = 1; i < this.polygon.length; i++) {
                ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw windshield/cabin overlay
            ctx.beginPath();
            ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
            
            // Interpolate coordinates for cabin
            const frontLeft = this.polygon[0];
            const frontRight = this.polygon[1];
            const backLeft = this.polygon[3];
            const backRight = this.polygon[2];

            const cabinFrontLeft = {
                x: frontLeft.x + (backLeft.x - frontLeft.x) * 0.25,
                y: frontLeft.y + (backLeft.y - frontLeft.y) * 0.25
            };
            const cabinFrontRight = {
                x: frontRight.x + (backRight.x - frontRight.x) * 0.25,
                y: frontRight.y + (backRight.y - frontRight.y) * 0.25
            };
            const cabinBackLeft = {
                x: frontLeft.x + (backLeft.x - frontLeft.x) * 0.65,
                y: frontLeft.y + (backLeft.y - frontLeft.y) * 0.65
            };
            const cabinBackRight = {
                x: frontRight.x + (backRight.x - frontRight.x) * 0.65,
                y: frontRight.y + (backRight.y - frontRight.y) * 0.65
            };

            ctx.moveTo(cabinFrontLeft.x, cabinFrontLeft.y);
            ctx.lineTo(cabinFrontRight.x, cabinFrontRight.y);
            ctx.lineTo(cabinBackRight.x, cabinBackRight.y);
            ctx.lineTo(cabinBackLeft.x, cabinBackLeft.y);
            ctx.closePath();
            ctx.fill();

            // Draw headlights
            ctx.fillStyle = "rgba(255, 240, 150, 0.9)";
            ctx.beginPath();
            ctx.arc(frontLeft.x + (frontRight.x - frontLeft.x) * 0.2, frontLeft.y + (frontRight.y - frontLeft.y) * 0.2, 3, 0, Math.PI*2);
            ctx.arc(frontLeft.x + (frontRight.x - frontLeft.x) * 0.8, frontLeft.y + (frontRight.y - frontLeft.y) * 0.8, 3, 0, Math.PI*2);
            ctx.fill();

        } else {
            // Draw static hazard block (stripe pattern)
            ctx.fillStyle = "#1e293b";
            ctx.strokeStyle = "#fbbf24"; // Amber neon
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#fbbf24";

            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            for (let i = 1; i < this.polygon.length; i++) {
                ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw hazard lines inside
            ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 8]);
            ctx.beginPath();
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            ctx.lineTo(this.polygon[2].x, this.polygon[2].y);
            ctx.moveTo(this.polygon[1].x, this.polygon[1].y);
            ctx.lineTo(this.polygon[3].x, this.polygon[3].y);
            ctx.stroke();
        }

        ctx.restore();
    }
}
