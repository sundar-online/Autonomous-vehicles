# Autonomous Vehicle Real-Time Decision-Making Simulator

A visually stunning, interactive dashboard demonstrating real-time decision-making systems in autonomous vehicles using custom feed-forward neural networks and genetic algorithms. Users can train a cohort of self-driving cars, drive manually, modify road/weather parameters, and inspect the brain’s activations at 60 FPS.

---

## 🚀 Key Features

* **Real-time Neural Visualizer**: See how every input sensor neuron maps to hidden layers, yielding control outputs (Accelerate, Turn Left, Turn Right, Brake/Reverse) with excitatory (cyan) and inhibitory (magenta) weights.
* **Genetic Algorithm Cohort Training**: Mutate brains generation-over-generation. If all cars crash, a new generation is spawned using mutated parameters of the previous generation's champion.
* **Procedural Traffic & Barricades**: Slower traffic and hazards spawn dynamically. Click the road to spawn manual traffic, or hold `Shift` and click to drop concrete hazard blocks to test vehicle responses in real-time.
* **Interactive Weather Engine**:
  * **Rain**: Slickens the asphalt, causing cars to lose steering traction and slip/drift.
  * **Fog**: Limits visual range, reducing sensor length and adding noise to readings.
  * **Night Mode**: Restricts global scene exposure, rendering custom composite headlight lighting cones ahead of vehicles.
* **Persistent Brain Save/Load**: Save the weights and biases of the leading vehicle to `localStorage` to resume training sessions later.

---

## 📁 File Structure

```
├── src/
│   ├── utils.js        # Mathematical helper scripts (segment intersections, polygon colliders)
│   ├── network.js      # Custom Machine Learning library (level weights, biases, propagation)
│   ├── sensor.js       # Raycasting sonar sweeps updating distance vectors
│   ├── road.js         # Road shoulder layout and lane indexing
│   ├── obstacle.js     # Traffic physics and static warning barricades
│   ├── car.js          # Kinematic speed models and steering configurations
│   ├── visualizer.js   # Canvas visual layers for neural synapse flows
│   └── simulation.js   # Cohort evolutionary loop and browser events binder
├── index.html          # Main HTML5 semantic page layouts
├── style.css           # Glassmorphic themes and glowing styling styles
└── package.json        # Vite dev-server config script
```

---

## 🛠️ Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed to run the local Vite web server.

### Installation & Run

1. Navigate to the project root directory:
   ```bash
   cd "d:/Git/Web Sides/Autonomous vehicles"
   ```

2. Install the lightweight development dependency:
   ```bash
   npm install
   ```

3. Spin up the local dev server:
   ```bash
   npm run dev
   ```

4. Open the displayed URL in your browser:
   * **[http://localhost:3000/](http://localhost:3000/)**

---

## 🧠 Neural Architecture Details

1. **Input Layer (5 Neurons)**: Derived from the 5 sensor rays casting forward. Inputs range from `0` (clear road segment) to `1` (obstacle touching the bumper).
2. **Hidden Layer (6 Neurons)**: Calculates non-linear patterns using weights and threshold biases.
3. **Output Layer (4 Neurons)**: Standard directional controls mapping directly to steering:
   * `↑` Forward acceleration
   * `←` Steer left
   * `→` Steer right
   * `↓` Reverse/Brake
