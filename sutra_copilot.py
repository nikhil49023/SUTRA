#!/usr/bin/env python3
"""
SUTRA Offline AI Copilot (Powered by Local Ollama)
Run directly in train/offline without any internet connection.
Usage:
    python3 sutra_copilot.py
"""

import sys
import subprocess
import json

SYSTEM_PROMPT = """You are Antigravity, the Lead GNC & Systems AI Copilot for Kilani Sai Nikhil in Project SUTRA (Swarm Unified Tactical Reconnaissance Architecture) for the Grand Finals.
You have complete first-principles knowledge of:
1. SUTRA-GNC: Orca3DSolver (with unconditional penetration push u = n * v_push - v_rel for parallel flight deadlock prevention), 3D Echelon cruising altitudes (3.5m to 4.6m), 2-Phase Takeoff state machine.
2. SUTRA-FSD: 32x32x16 3D Spatio-temporal Occupancy Grid (decay factor lambda=0.92), Quintic Polynomial Spline Trajectory Planner (continuous jerk < 4.20 m/s³), Control Barrier Functions (CBF) hard safety shield (R >= 2.80m).
3. SutraNeuroFlight: 0.04ms ONNX FP16 adaptive neural flight controller on Jetson/RTX, rejecting 18 m/s turbulent wind gusts.
4. Deep JSCC: Semantic autoencoder for video streaming with 96.9% bandwidth compression (512KB -> 16KB) and graceful analog degradation at -5 dB jamming (>= 41.5 dB PSNR).
5. Terrain Geolocation: Body-to-world rotation matrix (R_b^w) DEM raycasting (<0.32m error at 30m AGL).
6. ROS 2 Humble & PX4: 50Hz MicroXRCE-DDS agent on NuttX kernel, EKF2 VIO fusion, Best Effort QoS for high-frequency streaming.
7. WebGPU React GCS: Direct binary buffer canvas at 60 FPS.

Respond concisely, with razor-sharp mathematical and engineering precision, defending Nikhil's architecture against tough jury questions."""

def check_ollama():
    try:
        res = subprocess.run(["ollama", "list"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return res.returncode == 0
    except FileNotFoundError:
        return False

def chat_stream(prompt, model="qwen3.5:4b"):
    cmd = [
        "ollama", "run", model,
        f"{SYSTEM_PROMPT}\n\nUser Question: {prompt}\nAnswer:"
    ]
    try:
        process = subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr, text=True)
        process.wait()
    except KeyboardInterrupt:
        print("\n[Session paused]")

def main():
    print("=" * 70)
    print("🚁 SUTRA OFFLINE AI COPILOT (Local Ollama Engine)")
    print("=" * 70)
    print("Zero internet required. Ask any jury Q&A, math derivation, or code question.")
    print("Type 'exit' or 'quit' to close.\n")

    models = ["qwen3.5:4b", "qwen2.5-coder:3b", "gemma4:latest"]
    selected_model = models[0]

    while True:
        try:
            user_input = input("\n[SUTRA-Offline] ❯ ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit"]:
                print("Exiting SUTRA Copilot. Good luck at the Grand Finals!")
                break
            
            print("\n" + "-" * 50)
            chat_stream(user_input, model=selected_model)
            print("-" * 50)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting SUTRA Copilot.")
            break

if __name__ == "__main__":
    main()
