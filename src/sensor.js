import { getIntersection, lerp } from "./utils.js";

export class Sensor {
    constructor(car, rayCount = 5, rayLength = 150, raySpread = Math.PI / 2.2) {
        this.car = car;
        this.rayCount = rayCount;
        this.rayLength = rayLength;
        this.raySpread = raySpread;

        this.rays = [];
        this.readings = [];
    }

    update(roadBorders, obstacles, weatherEffects = {}) {
        // Apply weather impacts (fog reduces sensor range, heavy rain adds sensor noise)
        let visualRange = this.rayLength;
        if (weatherEffects.fog) {
            visualRange *= (1 - weatherEffects.fog * 0.5); // Fog reduces range up to 50%
        }

        this.#castRays(visualRange);
        this.readings = [];
        
        for (let i = 0; i < this.rays.length; i++) {
            let reading = this.#getReading(
                this.rays[i], 
                roadBorders, 
                obstacles,
                weatherEffects.rain // Adds sensor noise if raining
            );
            this.readings.push(reading);
        }
    }

    #getReading(ray, roadBorders, obstacles, rainStrength = 0) {
        let touches = [];

        // Check intersections with road borders
        for (let i = 0; i < roadBorders.length; i++) {
            const touch = getIntersection(
                ray[0],
                ray[1],
                roadBorders[i][0],
                roadBorders[i][1]
            );
            if (touch) touches.push(touch);
        }

        // Check intersections with obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const poly = obstacles[i].polygon;
            for (let j = 0; j < poly.length; j++) {
                const touch = getIntersection(
                    ray[0],
                    ray[1],
                    poly[j],
                    poly[(j + 1) % poly.length]
                );
                if (touch) touches.push(touch);
            }
        }

        if (touches.length === 0) {
            return null;
        } else {
            const offsets = touches.map(e => e.offset);
            const minOffset = Math.min(...offsets);
            let result = touches.find(e => e.offset === minOffset);

            // Simulate sensor noise in heavy rain (adds variance to the reading offset)
            if (rainStrength > 0 && result) {
                const noise = (Math.random() - 0.5) * 0.05 * rainStrength;
                result = {
                    ...result,
                    offset: Math.max(0, Math.min(1, result.offset + noise))
                };
            }
            return result;
        }
    }

    #castRays(rayLength) {
        this.rays = [];
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = lerp(
                this.raySpread / 2,
                -this.raySpread / 2,
                this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1)
            ) + this.car.angle;

            const start = { x: this.car.x, y: this.car.y };
            const end = {
                x: this.car.x - Math.sin(rayAngle) * rayLength,
                y: this.car.y - Math.cos(rayAngle) * rayLength
            };
            this.rays.push([start, end]);
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.rayCount; i++) {
            let end = this.rays[i][1];
            if (this.readings[i]) {
                end = this.readings[i];
            }

            // Draw line up to the sensor collision point (cyan/yellow glow)
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(0, 243, 255, 0.75)";
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Draw line beyond the sensor collision point (red indicator)
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 0, 110, 0.4)";
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y);
            ctx.stroke();

            // Draw intersection dot
            if (this.readings[i]) {
                ctx.beginPath();
                ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#ff006e";
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#ff006e";
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
}
