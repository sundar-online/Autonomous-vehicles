import { getRGBA, lerp } from "./utils.js";

export class Visualizer {
    static drawNetwork(ctx, network) {
        const margin = 50;
        const left = margin;
        const top = margin;
        const width = ctx.canvas.width - margin * 2;
        const height = ctx.canvas.height - margin * 2;

        const levelHeight = height / network.levels.length;

        // Draw each level in reverse order (bottom to top) so that lines are drawn under nodes
        for (let i = network.levels.length - 1; i >= 0; i--) {
            const levelTop = top +
                lerp(
                    height - levelHeight,
                    0,
                    network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1)
                );

            ctx.setLineDash([7, 3]);
            // Animate synapse signal transmission using a timestamp offset
            ctx.lineDashOffset = -performance.now() * 0.05;

            Visualizer.drawLevel(
                ctx,
                network.levels[i],
                left,
                levelTop,
                width,
                levelHeight,
                i === network.levels.length - 1 ? ["↑", "←", "→", "↓"] : []
            );
        }
    }

    static drawLevel(ctx, level, left, top, width, height, outputLabels) {
        const right = left + width;
        const bottom = top + height;

        const { inputs, outputs, weights, biases } = level;

        // 1. Draw Synapses (Connections)
        for (let i = 0; i < inputs.length; i++) {
            for (let j = 0; j < outputs.length; j++) {
                ctx.beginPath();
                ctx.moveTo(
                    Visualizer.#getNodeX(inputs, i, left, right),
                    bottom
                );
                ctx.lineTo(
                    Visualizer.#getNodeX(outputs, j, left, right),
                    top
                );
                ctx.lineWidth = 2;
                
                // Color connections: Cyan for positive weight, Amber for negative
                ctx.strokeStyle = getRGBA(weights[i][j]);
                ctx.stroke();
            }
        }

        // 2. Draw Input Nodes
        for (let i = 0; i < inputs.length; i++) {
            const x = Visualizer.#getNodeX(inputs, i, left, right);
            ctx.beginPath();
            ctx.arc(x, bottom, 18, 0, Math.PI * 2);
            ctx.fillStyle = "#0f172a"; // Dark background
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, bottom, 15, 0, Math.PI * 2);
            // Glow intensity matches activation
            const act = inputs[i];
            ctx.fillStyle = `rgba(0, 243, 255, ${act * 0.85})`; // Cyan glow for inputs
            ctx.shadowBlur = act > 0 ? 10 : 0;
            ctx.shadowColor = "#00f3ff";
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw border
            ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, bottom, 18, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Draw Output Nodes
        for (let i = 0; i < outputs.length; i++) {
            const x = Visualizer.#getNodeX(outputs, i, left, right);
            ctx.beginPath();
            ctx.arc(x, top, 18, 0, Math.PI * 2);
            ctx.fillStyle = "#0f172a";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, top, 15, 0, Math.PI * 2);
            const act = outputs[i];
            ctx.fillStyle = `rgba(16, 185, 129, ${act * 0.85})`; // Emerald green glow for outputs
            ctx.shadowBlur = act > 0 ? 12 : 0;
            ctx.shadowColor = "#10b981";
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw border with threshold indicator (biases)
            ctx.strokeStyle = getRGBA(biases[i]);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, top, 18, 0, Math.PI * 2);
            ctx.stroke();

            // Draw directional icons (arrows) on final output layer
            if (outputLabels[i]) {
                ctx.save();
                ctx.beginPath();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = act > 0 ? "#ffffff" : "rgba(148, 163, 184, 0.6)";
                ctx.font = "bold 15px system-ui";
                ctx.fillText(outputLabels[i], x, top);
                ctx.restore();
            }
        }
    }

    static #getNodeX(nodes, index, left, right) {
        return lerp(
            left,
            right,
            nodes.length === 1 ? 0.5 : index / (nodes.length - 1)
        );
    }
}
