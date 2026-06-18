import { lerp } from "./utils.js";

export class Road {
    constructor(x, width, laneCount = 3) {
        this.x = x;
        this.width = width;
        this.laneCount = laneCount;

        this.left = x - width / 2;
        this.right = x + width / 2;

        const infinity = 1000000;
        this.top = -infinity;
        this.bottom = infinity;

        const topLeft = { x: this.left, y: this.top };
        const topRight = { x: this.right, y: this.top };
        const bottomLeft = { x: this.left, y: this.bottom };
        const bottomRight = { x: this.right, y: this.bottom };

        this.borders = [
            [topLeft, bottomLeft],
            [topRight, bottomRight]
        ];
    }

    /**
     * Returns the horizontal center position of a given lane.
     */
    getLaneCenter(laneIndex) {
        const laneWidth = this.width / this.laneCount;
        const index = Math.max(0, Math.min(laneIndex, this.laneCount - 1));
        return this.left + laneWidth / 2 + index * laneWidth;
    }

    /**
     * Draws the road surface, lanes, markings, and side guards.
     */
    draw(ctx) {
        ctx.save();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";

        // Draw lane separators (dashed white/gray lines)
        for (let i = 1; i < this.laneCount; i++) {
            const x = lerp(
                this.left,
                this.right,
                i / this.laneCount
            );

            ctx.setLineDash([20, 20]);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.beginPath();
            ctx.moveTo(x, this.top);
            ctx.lineTo(x, this.bottom);
            ctx.stroke();
        }

        // Draw solid outer shoulders with a neon glow
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        
        // Left boundary (Neon Purple/Cyan)
        ctx.shadowColor = "rgba(180, 0, 255, 0.8)";
        ctx.strokeStyle = "#b400ff";
        ctx.beginPath();
        ctx.moveTo(this.left, this.top);
        ctx.lineTo(this.left, this.bottom);
        ctx.stroke();

        // Right boundary
        ctx.shadowColor = "rgba(180, 0, 255, 0.8)";
        ctx.strokeStyle = "#b400ff";
        ctx.beginPath();
        ctx.moveTo(this.right, this.top);
        ctx.lineTo(this.right, this.bottom);
        ctx.stroke();

        ctx.restore();
    }
}
