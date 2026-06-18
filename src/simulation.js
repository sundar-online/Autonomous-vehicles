import { Car } from "./car.js";
import { Road } from "./road.js";
import { Obstacle } from "./obstacle.js";
import { NeuralNetwork } from "./network.js";
import { Visualizer } from "./visualizer.js";

export class Simulation {
    constructor() {
        this.roadCanvas = document.getElementById("roadCanvas");
        this.roadCtx = this.roadCanvas.getContext("2d");
        
        this.networkCanvas = document.getElementById("networkCanvas");
        this.networkCtx = this.networkCanvas.getContext("2d");

        this.analyticsCanvas = document.getElementById("analyticsCanvas");
        this.analyticsCtx = this.analyticsCanvas.getContext("2d");

        // Fit canvas sizes to containers
        this.resizeCanvases();

        // Simulation parameters
        this.laneCount = 3;
        this.roadWidth = 280;
        this.road = new Road(this.roadCanvas.width / 2, this.roadWidth, this.laneCount);
        
        this.cohortSize = 100;
        this.mutationRate = 0.15;
        this.simulationSpeed = 1; // 1x, 2x, 4x
        this.isPaused = false;
        
        this.mode = "training"; // "training", "manual", "pretrained"
        this.weather = {
            rain: 0, // 0 to 1
            fog: 0,  // 0 to 1
            night: false
        };

        // State variables
        this.generation = 1;
        this.cars = [];
        this.bestCar = null;
        this.obstacles = [];
        this.fitnessHistory = [];
        this.nextSpawnY = -400;
        
        // Hand-crafted initial neural net weights for "Pretrained" mode
        // Helps the car avoid walls and simple obstacles out-of-the-box
        this.pretrainedBrainData = {
            levels: [
                {
                    inputs: [0, 0, 0, 0, 0],
                    outputs: [0, 0, 0, 0, 0, 0],
                    biases: [-0.15, -0.4, 0.4, -0.4, 0.15, 0.2],
                    weights: [
                        [-0.8, -0.9, -0.2, 0.9, 0.7, 0.1],   // Far left sensor: steer right, brake less
                        [-0.6, -0.8, -0.4, 0.8, 0.5, 0.1],   // Left sensor
                        [0.8, -0.1, -0.1, -0.1, 0.2, -0.8],   // Center sensor: forward, brake if close
                        [0.6, 0.8, 0.5, -0.8, -0.4, 0.1],    // Right sensor
                        [0.8, 0.9, 0.7, -0.9, -0.7, 0.1]     // Far right sensor: steer left
                    ]
                },
                {
                    inputs: [0, 0, 0, 0, 0, 0],
                    outputs: [0, 0, 0, 0],
                    biases: [-0.2, 0.2, 0.2, 0.4],
                    weights: [
                        [0.9, 0.1, -0.9, -0.5], // Forward
                        [-0.8, 0.9, -0.8, 0.3], // Left
                        [-0.8, -0.8, 0.9, 0.3], // Right
                        [-0.5, 0.2, 0.2, 0.8],  // Reverse/Brake
                        [0.7, -0.5, 0.5, -0.3],
                        [0.6, 0.5, -0.5, -0.3]
                    ]
                }
            ]
        };

        this.init();
        this.bindEvents();
        
        // Start animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    init() {
        this.obstacles = [];
        this.nextSpawnY = -300;
        this.resizeCanvases();

        // Build first traffic obstacle
        this.obstacles.push(new Obstacle(this.road.getLaneCenter(1), -250, 30, 50, "traffic", 1.5));

        if (this.mode === "manual") {
            this.generation = 1;
            this.cars = [new Car(this.road.getLaneCenter(1), 100, 30, 50, "KEYS")];
            this.bestCar = this.cars[0];
        } else if (this.mode === "pretrained") {
            this.generation = 1;
            const car = new Car(this.road.getLaneCenter(1), 100, 30, 50, "AI");
            car.brain = this.#loadBrainStructure(this.pretrainedBrainData);
            this.cars = [car];
            this.bestCar = this.cars[0];
        } else {
            // Training mode
            this.cars = [];
            for (let i = 0; i < this.cohortSize; i++) {
                this.cars.push(new Car(this.road.getLaneCenter(1), 100, 30, 50, "AI"));
            }
            
            // Check if there is a saved brain in localStorage
            const savedBrainString = localStorage.getItem("bestBrain");
            if (savedBrainString) {
                const savedBrainData = JSON.parse(savedBrainString);
                
                // Clone the saved brain to all cars, mutating cohort except the champion
                this.cars.forEach((car, index) => {
                    car.brain = this.#loadBrainStructure(savedBrainData);
                    if (index > 0) {
                        NeuralNetwork.mutate(car.brain, this.mutationRate);
                    }
                });
            }
            this.bestCar = this.cars[0];
        }
        
        this.updateHUD();
        this.drawAnalytics();
    }

    #loadBrainStructure(data) {
        const brain = new NeuralNetwork([5, 6, 4]);
        brain.levels.forEach((level, i) => {
            level.biases = [...data.levels[i].biases];
            level.weights = data.levels[i].weights.map(row => [...row]);
        });
        return brain;
    }

    bindEvents() {
        // Mode change buttons
        document.getElementById("btnTrainMode").addEventListener("click", () => {
            this.mode = "training";
            this.setActiveButton("btnTrainMode", ["btnManualMode", "btnPretrainedMode"]);
            document.getElementById("trainingParams").style.display = "block";
            this.init();
        });

        document.getElementById("btnManualMode").addEventListener("click", () => {
            this.mode = "manual";
            this.setActiveButton("btnManualMode", ["btnTrainMode", "btnPretrainedMode"]);
            document.getElementById("trainingParams").style.display = "none";
            this.init();
        });

        document.getElementById("btnPretrainedMode").addEventListener("click", () => {
            this.mode = "pretrained";
            this.setActiveButton("btnPretrainedMode", ["btnTrainMode", "btnManualMode"]);
            document.getElementById("trainingParams").style.display = "none";
            this.init();
        });

        // Speed Control
        document.getElementById("speedSlider").addEventListener("input", (e) => {
            this.simulationSpeed = parseInt(e.target.value);
            document.getElementById("lblSpeed").innerText = `${this.simulationSpeed}x`;
        });

        // Mutation Rate Slider
        document.getElementById("mutationSlider").addEventListener("input", (e) => {
            this.mutationRate = parseFloat(e.target.value);
            document.getElementById("lblMutation").innerText = `${Math.round(this.mutationRate * 100)}%`;
        });

        // Car Count Slider
        document.getElementById("cohortSlider").addEventListener("input", (e) => {
            this.cohortSize = parseInt(e.target.value);
            document.getElementById("lblCohort").innerText = this.cohortSize;
        });

        // Play / Pause / Reset
        document.getElementById("btnPlayPause").addEventListener("click", () => {
            this.isPaused = !this.isPaused;
            document.getElementById("btnPlayPause").innerHTML = this.isPaused 
                ? '<i class="fas fa-play"></i> Resume' 
                : '<i class="fas fa-pause"></i> Pause';
        });

        document.getElementById("btnReset").addEventListener("click", () => {
            this.isPaused = false;
            document.getElementById("btnPlayPause").innerHTML = '<i class="fas fa-pause"></i> Pause';
            if (this.mode === "training") {
                this.generation = 1;
                this.fitnessHistory = [];
                localStorage.removeItem("bestBrain");
            }
            this.init();
        });

        // Save and Discard brain buttons
        document.getElementById("btnSaveBrain").addEventListener("click", () => {
            if (this.bestCar && this.bestCar.brain) {
                localStorage.setItem("bestBrain", JSON.stringify(this.bestCar.brain));
                this.showNotification("Best brain saved to LocalStorage!", "success");
            }
        });

        document.getElementById("btnDiscardBrain").addEventListener("click", () => {
            localStorage.removeItem("bestBrain");
            this.showNotification("Saved brain cleared.", "warning");
        });

        // Weather controls
        document.getElementById("rainSlider").addEventListener("input", (e) => {
            this.weather.rain = parseFloat(e.target.value);
            document.getElementById("lblRain").innerText = `${Math.round(this.weather.rain * 100)}%`;
        });

        document.getElementById("fogSlider").addEventListener("input", (e) => {
            this.weather.fog = parseFloat(e.target.value);
            document.getElementById("lblFog").innerText = `${Math.round(this.weather.fog * 100)}%`;
        });

        document.getElementById("btnToggleNight").addEventListener("click", () => {
            this.weather.night = !this.weather.night;
            const btn = document.getElementById("btnToggleNight");
            if (this.weather.night) {
                btn.classList.add("active");
                btn.innerHTML = '<i class="fas fa-moon"></i> Night Mode: ON';
            } else {
                btn.classList.remove("active");
                btn.innerHTML = '<i class="fas fa-sun"></i> Night Mode: OFF';
            }
        });

        // Canvas Click Listener for Obstacle spawning
        this.roadCanvas.addEventListener("mousedown", (e) => {
            const rect = this.roadCanvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Map canvas Y click coordinate back to the scrolling road space coordinate
            const roadY = clickY + this.bestCar.y - this.roadCanvas.height * 0.7;

            // Snap obstacle to lane
            let minDistance = Infinity;
            let closestLane = 0;
            for (let i = 0; i < this.laneCount; i++) {
                const center = this.road.getLaneCenter(i);
                const dist = Math.abs(clickX - center);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestLane = i;
                }
            }

            const laneX = this.road.getLaneCenter(closestLane);
            // Alternate between spawning static barrier vs dynamic traffic
            const type = e.shiftKey ? "barrier" : "traffic";
            
            this.obstacles.push(new Obstacle(laneX, roadY, 30, type === "traffic" ? 50 : 30, type, 1.3));
            this.showNotification(`Spawned ${type} in Lane ${closestLane + 1}!`, "info");
        });

        // Window resize
        window.addEventListener("resize", () => this.resizeCanvases());
    }

    setActiveButton(activeId, inactiveIds) {
        document.getElementById(activeId).classList.add("active");
        inactiveIds.forEach(id => document.getElementById(id).classList.remove("active"));
    }

    resizeCanvases() {
        // Main road canvas dimensions matching the wrapper container height
        const roadWrapper = this.roadCanvas.parentElement;
        this.roadCanvas.width = 300;
        this.roadCanvas.height = roadWrapper.clientHeight || 550;

        // Neural network visualizer dimensions
        const networkWrapper = this.networkCanvas.parentElement;
        this.networkCanvas.width = networkWrapper.clientWidth || 320;
        this.networkCanvas.height = networkWrapper.clientHeight || 280;

        // Analytics canvas dimensions
        const analyticsWrapper = this.analyticsCanvas.parentElement;
        this.analyticsCanvas.width = analyticsWrapper.clientWidth || 320;
        this.analyticsCanvas.height = 100;
    }

    showNotification(msg, type = "success") {
        const container = document.getElementById("notificationContainer");
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        
        let icon = '<i class="fas fa-check-circle"></i>';
        if (type === "warning") icon = '<i class="fas fa-exclamation-triangle"></i>';
        if (type === "info") icon = '<i class="fas fa-info-circle"></i>';

        notification.innerHTML = `${icon} <span>${msg}</span>`;
        container.appendChild(notification);

        // Slide-in animation trigger
        setTimeout(() => notification.classList.add("show"), 10);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    #proceduralObstacles() {
        // Spawn obstacles ahead of the best car
        if (this.bestCar.y < this.nextSpawnY + 300) {
            this.nextSpawnY = this.bestCar.y - 400 - Math.random() * 200;
            
            // Randomly block 1 or 2 lanes (never block all lanes to keep it solvable)
            const lanesToBlock = [];
            const blockCount = Math.random() < 0.4 ? 2 : 1;
            
            while (lanesToBlock.length < blockCount) {
                const lane = Math.floor(Math.random() * this.laneCount);
                if (!lanesToBlock.includes(lane)) {
                    lanesToBlock.push(lane);
                }
            }

            lanesToBlock.forEach(lane => {
                const x = this.road.getLaneCenter(lane);
                const type = Math.random() < 0.35 ? "barrier" : "traffic";
                
                // Traffic moves slowly, barriers are static
                this.obstacles.push(new Obstacle(x, this.nextSpawnY, 30, type === "traffic" ? 50 : 30, type, 1.2));
            });

            // Clean up old obstacles far behind the best car
            this.obstacles = this.obstacles.filter(obs => obs.y > this.bestCar.y - 200 && obs.y < this.bestCar.y + 1200);
        }
    }

    nextGeneration() {
        // Save the best fitness of the current cohort to history
        this.fitnessHistory.push(Math.max(0, Math.round(this.bestCar.fitness)));
        // Cap history to 50 items
        if (this.fitnessHistory.length > 50) this.fitnessHistory.shift();

        this.generation++;
        this.showNotification(`Starting Generation ${this.generation}`, "info");

        const bestBrain = this.bestCar.brain;
        this.init();

        // Set the clone of the champion into index 0
        this.cars[0].brain = NeuralNetwork.clone(bestBrain);

        // Populate the rest of the cohort with mutated copies of the champion
        for (let i = 1; i < this.cars.length; i++) {
            this.cars[i].brain = NeuralNetwork.clone(bestBrain);
            NeuralNetwork.mutate(this.cars[i].brain, this.mutationRate);
        }

        this.drawAnalytics();
    }

    animate(time) {
        if (!this.isPaused) {
            // Support speed simulation multiplier
            for (let s = 0; s < this.simulationSpeed; s++) {
                // Update obstacles
                this.obstacles.forEach(obs => obs.update());

                // Update cars
                this.cars.forEach(car => car.update(this.road.borders, this.obstacles, this.weather));

                // Identify the champion car currently furthest up the road
                this.bestCar = this.cars.find(
                    c => c.fitness === Math.max(...this.cars.map(x => x.fitness))
                ) || this.cars[0];

                // Check for procedural obstacle spawning
                this.#proceduralObstacles();

                // Check if cohort has failed
                if (this.mode === "training" && this.cars.every(car => car.damaged)) {
                    this.nextGeneration();
                    break;
                }
            }
            this.updateHUD();
        }

        // Draw Stage
        this.roadCanvas.height = this.roadCanvas.height; // Resets & clears canvas
        
        this.roadCtx.save();
        // Camera translation: center road view around the best car's Y position
        this.roadCtx.translate(0, -this.bestCar.y + this.roadCanvas.height * 0.7);

        this.road.draw(this.roadCtx);
        this.obstacles.forEach(obs => obs.draw(this.roadCtx));

        // Draw cohort cars: draw translucent normal cars first, then draw the champion on top
        if (this.mode === "training") {
            this.cars.forEach(car => {
                if (car !== this.bestCar) car.draw(this.roadCtx, false);
            });
        }
        // Draw champion / active car with sensors and glow details
        this.bestCar.draw(this.roadCtx, true);

        this.roadCtx.restore();

        // Visual headlight effect under Night Mode
        if (this.weather.night) {
            this.#drawNightOverlay();
        }

        // Visual fog overlay
        if (this.weather.fog > 0) {
            this.roadCtx.fillStyle = `rgba(15, 23, 42, ${this.weather.fog * 0.75})`;
            this.roadCtx.fillRect(0, 0, this.roadCanvas.width, this.roadCanvas.height);
        }

        // Render Neural Network activation layers
        if (this.bestCar.brain) {
            this.networkCtx.clearRect(0, 0, this.networkCanvas.width, this.networkCanvas.height);
            Visualizer.drawNetwork(this.networkCtx, this.bestCar.brain);
        }

        requestAnimationFrame(this.animate);
    }

    #drawNightOverlay() {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = this.roadCanvas.width;
        tempCanvas.height = this.roadCanvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        // Fill canvas with deep night shade
        tempCtx.fillStyle = "rgba(10, 15, 30, 0.94)";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw radial lighting cone representing headlights
        // Translate the car coordinates to screen coordinates
        const screenCarY = this.roadCanvas.height * 0.7;
        const screenCarX = this.bestCar.x;

        tempCtx.save();
        tempCtx.globalCompositeOperation = "destination-out";

        // Headlight glow gradient
        const gradient = tempCtx.createRadialGradient(
            screenCarX, screenCarY - 30, 10,
            screenCarX, screenCarY - 100, 180
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.6)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

        tempCtx.fillStyle = gradient;
        tempCtx.beginPath();
        tempCtx.arc(screenCarX, screenCarY - 30, 180, 0, Math.PI * 2);
        tempCtx.fill();
        tempCtx.restore();

        // Draw the night overlay onto the main road canvas
        this.roadCtx.save();
        this.roadCtx.drawImage(tempCanvas, 0, 0);
        this.roadCtx.restore();
    }

    updateHUD() {
        // Updates DOM stats panel
        document.getElementById("lblGen").innerText = this.generation;
        
        const activeCohortCount = this.mode === "training" 
            ? this.cars.filter(c => !c.damaged).length 
            : this.bestCar.damaged ? 0 : 1;
        document.getElementById("lblActiveCount").innerText = `${activeCohortCount} / ${this.cars.length}`;
        
        const speedKmh = Math.round(Math.abs(this.bestCar.speed) * 35);
        document.getElementById("lblSpeedStat").innerText = `${speedKmh} km/h`;
        
        const distanceVal = Math.max(0, Math.round(this.bestCar.fitness));
        document.getElementById("lblDistanceStat").innerText = `${distanceVal} m`;

        const statusText = this.bestCar.damaged 
            ? "CRASHED" 
            : Math.abs(this.bestCar.speed) < 0.1 ? "IDLE" : "CRUISING";
        const statusEl = document.getElementById("lblStatusStat");
        statusEl.innerText = statusText;
        statusEl.className = this.bestCar.damaged ? "val-crashed" : "val-normal";
    }

    drawAnalytics() {
        const ctx = this.analyticsCtx;
        const width = this.analyticsCanvas.width;
        const height = this.analyticsCanvas.height;

        ctx.clearRect(0, 0, width, height);

        if (this.fitnessHistory.length === 0) {
            ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
            ctx.font = "italic 11px system-ui";
            ctx.textAlign = "center";
            ctx.fillText("Waiting for generation data...", width / 2, height / 2);
            return;
        }

        const maxFitness = Math.max(...this.fitnessHistory, 1);
        const padding = 12;

        ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#10b981";
        ctx.beginPath();

        for (let i = 0; i < this.fitnessHistory.length; i++) {
            const x = padding + (i / (this.fitnessHistory.length - 1 || 1)) * (width - padding * 2);
            const y = height - padding - (this.fitnessHistory[i] / maxFitness) * (height - padding * 2 - 8);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw last fitness text indicator
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "right";
        const lastX = width - padding;
        const lastY = height - padding - (this.fitnessHistory[this.fitnessHistory.length - 1] / maxFitness) * (height - padding * 2 - 8) - 4;
        ctx.fillText(
            `F:${this.fitnessHistory[this.fitnessHistory.length - 1]}`, 
            lastX, 
            Math.max(10, Math.min(height - 4, lastY))
        );
    }
}
