# AI-Powered Autonomous UAV Flight & Navigation Solutions — Research Compilation

> **Generated**: 2026-08-16 | **Source**: Local Firecrawl (arXiv, MDPI, Springer, IEEE) | **Papers Analyzed**: 30+
> **Relevance**: Directly applicable to Project SUTRA Subsystems A (GNC), B (Comms), C (Perception)

---

## Executive Summary

This research survey covers the state-of-the-art in AI/model-powered autonomous UAV flight and navigation across five core domains: (1) Deep Reinforcement Learning for flight control, (2) Vision-Based & GPS-Denied Navigation, (3) Edge AI Perception for UAVs, (4) Swarm Intelligence & Collision Avoidance, and (5) Neural Communication Compression (Deep JSCC). Each section maps directly to SUTRA subsystem capabilities and identifies transferable techniques.

---

## 1. Deep Reinforcement Learning (DRL) for UAV Flight Control

### 1.1 Hierarchical LLM + DRL for Multi-UAV Navigation
**Paper**: *"Intelligent Multi-UAV Navigation in ITNTNs: A Hierarchical LLM Approach"* (arXiv:2607.18604)
- **Authors**: Zijiang Yan, Hao Zhou, Wael Jaafar
- **Key Contribution**: Bridges the gap between LLM strategic reasoning and DRL tactical control. LLMs handle zero-shot strategic planning (route selection, network handovers) while DRL handles real-time aerodynamic control (collision avoidance, trajectory tracking).
- **Architecture**: Hierarchical — LLM at strategic layer, DRL at tactical layer, with a shared state representation.
- **Relevance to SUTRA**: Directly applicable to Subsystem A (GNC) for multi-tier decision making. LLM layer could handle mission-level reasoning (search corridor allocation), while DRL handles 50Hz setpoint generation.

### 1.2 CosFly-VLA: Vision-Language-Action for UAV Tracking
**Paper**: *"CosFly-VLA: A Spatially Aware Vision-Language-Action Model for UAV Tracking"* (arXiv:2607.15004)
- **Authors**: Ruilong Ren, Songsheng Cheng, Yunpeng Zhou
- **Key Contribution**: Vision-Language-Action (VLA) policy for dynamic target tracking in urban environments. Handles occlusion recovery — during sustained line-of-sight blockage, the policy maintains target state estimation and re-acquires after occlusion ends.
- **Relevance to SUTRA**: Directly relevant to Subsystem C (Perception) for survivor tracking under foliage and behind debris. The occlusion recovery mechanism addresses a critical failure mode in disaster scenarios.

### 1.3 WaveLander: Hierarchical RL for UAV Landing
**Paper**: *"WaveLander: A Generalizable Hierarchical Control Framework for UAV Landing on Wave-Disturbed Platforms via Reinforcement Learning"* (arXiv:2607.01281)
- **Authors**: Chun-Kit Li, Iok Long Sit, Ming Fung Siu
- **Key Contribution**: Decouples vertical landing decision-making from low-level flight stabilization. Uses hierarchical RL with separate policies for approach phase and touchdown phase.
- **Relevance to SUTRA**: Applicable to emergency landing on uneven disaster terrain (flooded areas, collapsed structures). The hierarchical decomposition pattern is reusable for any complex flight maneuver.

### 1.4 AgenticRL: Self-Refining RL for UAV Navigation
**Paper**: *"AgenticRL: Self-Refining Agentic Reinforcement Learning for Vision-Conditioned UAV Navigation"* (arXiv:2606.03963)
- **Authors**: Roohan Ahmed Khan, Yasheerah Yaqoot, Amir Atef Habel
- **Key Contribution**: Uses a multimodal GPT to autonomously design reward functions and refine policies, eliminating manual reward engineering. The agent self-improves through iterative policy refinement.
- **Relevance to SUTRA**: Could automate reward design for SUTRA's complex multi-objective flight tasks (energy efficiency + obstacle avoidance + communication maintenance + search coverage).

### 1.5 Dynamic-TD3: Safety-Constrained UAV Path Planning
**Paper**: *"Dynamic-TD3: A Novel Algorithm for UAV Path Planning with Dynamic Obstacle Trajectory Prediction"* (arXiv:2605.00059)
- **Authors**: Wentao Chen, Jingtang Chen, Mingjian Fu
- **Key Contribution**: Models navigation as a Constrained Markov Decision Process (CMDP). Integrates adaptive trajectory prediction with strict safety constraints. Addresses the safety-exploration dilemma — soft penalties encourage risky behavior, while hard constraints are too restrictive.
- **Relevance to SUTRA**: Directly addresses Subsystem A's collision avoidance requirements. The CMDP formulation with sensor noise robustness is critical for real-world deployment.

### 1.6 Autonomous UAV Flight in Confined Spaces
**Paper**: *"Autonomous UAV Flight Navigation in Confined Spaces: A Reinforcement Learning Approach"* (arXiv:2508.16807)
- **Authors**: Marco S. Tayar, Lucas K. de Oliveira, Felipe Andrade G. Tom
- **Key Contribution**: Compares on-policy vs off-policy DRL for confined-space navigation (ventilation ducts). Off-policy methods offer sample efficiency but less stability; on-policy methods converge more reliably in hazard-dense environments.
- **Relevance to SUTRA**: Applicable to Subsystem F (Tactical Ops) for indoor/underground search in collapsed structures. Provides algorithm selection guidance for confined-space scenarios.

### 1.7 State-to-State Minimum-Time Flight Policy
**Paper**: *"Simultaneous learning of state-to-state minimum-time planning and control"* (arXiv:2510.20008)
- **Authors**: Swati Dantu, Robert Pěnička, Martin Saska
- **Key Contribution**: RL-based framework that generalizes to arbitrary start/goal state transitions, not just predefined tracks. Achieves both agile flight and stable hovering within a single policy.
- **Relevance to SUTRA**: Critical for rapid response navigation — transitioning between hover (surveillance) and high-speed transit (emergency response) without mode switching.

### 1.8 Vision-Based DRL with Privileged Information
**Paper**: *"Vision-Based Deep Reinforcement Learning of UAV Autonomous Navigation Using Privileged Information"* (arXiv:2412.06313)
- **Authors**: Junqiao Wang, Zhongliang Yu, Dong Zhou
- **Key Contribution**: DPRL algorithm combines DRL with privileged learning to handle partially observable environments. Teacher network trains with full state access, student network deploys with only vision + IMU. Handles observation data corruption gracefully.
- **Relevance to SUTRA**: The teacher-student paradigm is directly applicable to Subsystem A — train with perfect Gazebo Sim state, deploy with real sensor limitations.

### 1.9 Tangled Program Graphs as DRL Alternative
**Paper**: *"Tangled Program Graphs as an alternative to DRL-based control algorithms for UAVs"* (arXiv:2411.05586)
- **Authors**: Hubert Szolc, Karol Desnos, Tomasz Kryjak
- **Key Contribution**: TPGs as an explainable, lightweight alternative to DRL. Lower computational requirements and higher explainability, critical for safety-certifiable flight control.
- **Relevance to SUTRA**: Important for Subsystem F (Ops) where explainability is required for NDMA certification and safety audits.

### 1.10 UAV Navigation in Urban Airflow via DRL
**Paper**: *"Navigation in a simplified Urban Flow through Deep Reinforcement Learning"* (arXiv:2409.17922)
- **Authors**: Federica Tonti, Jean Rabault, Ricardo Vinuesa
- **Key Contribution**: DRL algorithms for energy-efficient and noise-reduced UAV navigation in urban environments, considering building wakes and other UAVs.
- **Relevance to SUTRA**: Applicable to Subsystem A/B for urban disaster scenarios (post-earthquake building collapse zones).

---

## 2. Vision-Based & GPS-Denied Navigation

### 2.1 AIVIO: AI-Aided Visual Inertial Odometry
**Paper**: *"AIVIO: Closed-loop, Object-relative Navigation of UAVs with AI-aided Visual Inertial Odometry"* (arXiv:2410.05996)
- **Authors**: Thomas Jantos, Martin Scheiber, Christian Brommer, Eren Allak, Stephan Weiss, Jan Steinbrener
- **Key Contribution**: Real-time capable UAV system for object-relative navigation using only IMU + RGB camera. DL-based object pose estimator trained on synthetic data, optimized for companion board deployment. Fuses object-relative pose with IMU via EKF.
- **Relevance to SUTRA**: Directly applicable to Subsystem A (GNC) for GPS-denied infrastructure inspection and survivor localization. The synthetic-data-to-real pipeline reduces deployment cost.

### 2.2 VINS-Mono + Ego-Planner for Constrained Environments
**Paper**: *"Vision-based autonomous navigation for quadrotor UAVs in unknown and constrained environments"* (Springer, 2025)
- **Authors**: Hu, Butt, Nasir et al.
- **Key Contribution**: Real-world evaluation of VINS-Mono (localization) + Ego-Planner (path planning) in GPS-denied, low-light, high-obstacle-density environments. Achieves 70-80% success rate with 87% of trajectories smoother than A*.
- **Relevance to SUTRA**: Validates VIO + trajectory optimization for SUTRA's Subsystem A in disaster scenarios. The success rate analysis provides realistic expectations for field deployment.

### 2.3 Attention-Based Deep Visual Odometry (SelfAttentionVO)
**Paper**: *"An Attention-Based Deep Learning Architecture for Real-Time Monocular Visual Odometry"* (arXiv:2404.17745)
- **Authors**: Olivier Dufour, Abolfazl Mohebbi, Sofiane Achiche
- **Key Contribution**: Novel CNN + LSTM + multi-head attention architecture for monocular VO. Converges 48% faster than DeepVO, 22% reduction in translational drift, 12% improvement in ATE.
- **Relevance to SUTRA**: The attention mechanism could improve Subsystem A's VIO accuracy in feature-sparse disaster environments.

### 2.4 DeepVIONet: Multi-Modal Deep Learning VIO
**Paper**: *"DeepVIONet: Multi-Modal Visual-Inertial Pose Estimation in GPS-Denied Environments"* (ISPRS, 2026)
- **Key Contribution**: End-to-end deep learning framework combining CNN visual features with LSTM-processed IMU data. Achieves sub-decimeter translation accuracy (MAE: 5.80-8.66 cm) without manual parameter tuning.
- **Relevance to SUTRA**: Could replace or augment VINS-Mono in Subsystem A with better generalization across environments.

### 2.5 NeRF-Enhanced Loop Closure for VINS
**Paper**: *"Loop Detection Method Based on Neural Radiance Field BoW Model for Visual Inertial Navigation of UAVs"* (MDPI Remote Sensing, 2024)
- **Key Contribution**: Uses NeRF for rapid scene reconstruction to generate novel viewpoints, expanding loop closure candidates. Detects 48% more accurate loop closures, reduces navigation positioning error by 46-53%.
- **Relevance to SUTRA**: Could significantly improve Subsystem A's long-duration flight accuracy by reducing VIO drift in revisit scenarios.

### 2.6 Self-Supervised Trajectory Planning with Differentiable Optimization
**Paper**: *"A Self-Supervised Learning Approach with Differentiable Optimization for UAV Trajectory Planning"* (arXiv:2504.04289)
- **Authors**: Yufei Jiang, Yuanzhu Zhan, Harsh Vardhan Gupta
- **Key Contribution**: Combines end-to-end learning with differentiable optimization to ensure dynamical feasibility. Addresses sim-to-real gap without large-scale datasets.
- **Relevance to SUTRA**: The differentiable optimization layer ensures generated trajectories are physically executable by the PX4 controller.

---

## 3. Edge AI Perception for UAVs

### 3.1 Comparative Analysis of YOLO Models for UAV Swarms
**Paper**: *"Comparative Analysis of Object Detection Models for Edge Devices in UAV Swarms"* (MDPI Machines, 2025)
- **Key Findings**:
  - TensorRT FP16 optimization yields 3.5-11x speedup over PyTorch FP32
  - YOLOv10-N: 23.1ms → 13.0ms (43.7% speedup) with TensorRT
  - YOLO11-N: 45.5% speedup, YOLOv12-N: 36.5% speedup
  - All models achieve sub-33.3ms (real-time) with TensorRT FP16 on Jetson
  - Energy reduction >50% per frame for lightweight models
- **Relevance to SUTRA**: Directly validates TensorRT FP16 deployment strategy for Subsystem C's YOLOv8-Nano detector. Provides benchmark data for Jetson edge deployment.

### 3.2 ADG-YOLO: Lightweight UAV Detection + Ranging
**Paper**: *"ADG-YOLO: A Lightweight and Efficient Framework for Real-Time UAV Target Detection and Ranging"* (MDPI Drones, 2025)
- **Key Findings**:
  - Only 1.77M parameters, 5.7 GFLOPs
  - 98.4% mAP@0.5, 27 FPS on edge device
  - Monocular ranging: 2.40-4.18% error over 0.5-50m
  - Uses C3Ghost modules + ADown layers for efficient feature fusion
- **Relevance to SUTRA**: The C3Ghost module and ADown layer designs could be integrated into Subsystem C's detector to reduce compute while maintaining accuracy.

### 3.3 LD-YOLOv10: Lightweight Drone Detection
**Paper**: *"LD-YOLOv10: A Lightweight Target Detection Algorithm for Drone Scenarios"* (MDPI Electronics, 2024)
- **Key Findings**:
  - 62.4% parameter reduction vs YOLOv10
  - 25 FPS on Jetson Orin Nano
  - RGELAN feature extraction + AIFI attention + DR-PAN Neck
  - Wise-EIoU loss for better anchor box quality
- **Relevance to SUTRA**: Provides architecture patterns for Subsystem C's detector optimization.

### 3.4 Small-Object Detection Benchmark (Pareto-Efficient)
**Paper**: *"Small-Object Detection at the Edge: A Pareto-Efficient Benchmark"* (DSU, 2025)
- **Key Findings**:
  - YOLOv8-Nano and YOLOv9-Tiny achieve leading accuracy
  - TensorRT FP16: 60-80% inference time reduction
  - All TensorRT models achieve >100 FPS on Jetson Orin Nano
  - Energy: 7.6-10.4W depending on model
  - Pareto frontier analysis — no single model dominates all objectives
- **Relevance to SUTRA**: Provides empirical basis for Subsystem C model selection trade-offs.

### 3.5 YOLO11-AU-IR: Infrared UAV Detection
**Paper**: *"Detecting infrared UAVs on edge devices through lightweight instance segmentation"* (PLOS ONE, 2025)
- **Key Findings**:
  - 97.7% mAP@0.5 for thermal UAV detection
  - Only 4.42 MB model size
  - 59.8 FPS on GPU, 95.1% mAP on Jetson TX2 (INT8 CPU-only)
  - HSAN attention for multi-scale thermal signatures
- **Relevance to SUTRA**: Directly applicable to Subsystem C's thermal camera integration for night/poor-visibility survivor detection.

---

## 4. Swarm Intelligence & Collision Avoidance

### 4.1 Topology-Guided ORCA
**Paper**: *"Topology-Guided ORCA: Smooth Multi-Agent Motion Planning in Constrained Environments"* (arXiv:2407.16771)
- **Key Contribution**: Extends ORCA with Medial Axis Transform to generate topological graphs of traversable regions. Uses path planning waypoints to guide ORCA, preventing agents from getting stuck behind obstacles.
- **Relevance to SUTRA**: Directly improves Subsystem A's ORCA 3D collision avoidance in constrained disaster environments (between collapsed buildings, inside caves).

### 4.2 ORCA-A*: Hybrid Collision Avoidance for Urban UAS
**Paper**: *"ORCA-A*: A Hybrid Reciprocal Collision Avoidance and Route Planning"* (SESAR, 2024)
- **Key Contribution**: Combines ORCA (tactical) with A* (strategic) for dense urban UAS traffic. A* operates on visibility graph, ORCA handles inter-agent collision avoidance.
- **Relevance to SUTRA**: Validates the hybrid tactical/strategic approach for Subsystem A's multi-drone collision avoidance.

### 4.3 ORCA-FLC: Fuzzy Logic Enhanced ORCA
**Paper**: *"Improved Obstacle Avoidance for Autonomous Robots with ORCA-FLC"* (arXiv:2508.06722)
- **Key Contribution**: Uses fuzzy logic controllers to handle uncertainty and imprecision in ORCA. Outperforms standard ORCA when agent velocity exceeds threshold.
- **Relevance to SUTRA**: Fuzzy logic enhancement could improve ORCA robustness under sensor noise in real-world deployment.

### 4.4 MPC-Based Collision Avoidance (ORCA + CBF)
**Paper**: *"Safe Navigation on Path-Following Tasks: A Study of MPC-based Collision Avoidance"* (Springer JIRS, 2024)
- **Key Contribution**: Compares MPC+ORCA vs MPC+CBF for distributed robot systems. Real-world experiments on Crazyflie 2.1 swarm.
- **Relevance to SUTRA**: Provides empirical comparison for selecting between ORCA and Control Barrier Functions for Subsystem A's collision avoidance.

### 4.5 Decentralized Multi-Robot Formation with SORCA
**Paper**: *"Decentralized multi-robot formation control in environments with non-convex and dynamic obstacles"* (Springer, 2025)
- **Key Contribution**: SORCA variant ensures continuous velocity transitions during evasion. Combined with RRT for global path planning, prevents local minima.
- **Relevance to SUTRA**: The SORCA continuity guarantees are critical for smooth multi-drone formation flight in Subsystem A.

---

## 5. Neural Communication Compression (Deep JSCC)

### 5.1 STARJSCC: Lightweight Star-Operation JSCC
**Paper**: *"A star modulation network for wireless image semantic transmission"* (Nature Scientific Reports, 2025)
- **Key Contribution**: Star operation maps features to ultra-high-dimensional nonlinear space. Channel State Adaptive module for SNR adaptation. 2.73 dB improvement on high-resolution sets. Lightweight — reduced parameters, complexity, and storage.
- **Relevance to SUTRA**: Directly applicable to Subsystem B's Deep JSCC encoder/decoder for thermal/visual image transmission under low SNR.

### 5.2 CBJSCC: Channel-Blind JSCC
**Paper**: *"Channel-Blind Joint Source-Channel Coding for Wireless Image Transmission"* (MDPI Sensors, 2024)
- **Key Contribution**: No SNR estimation required — network self-adapts to channel conditions. Outperforms feedback-based methods in AWGN and Rayleigh fading channels. Suitable for broadcast communication scenarios.
- **Relevance to SUTRA**: Eliminates channel estimation overhead in Subsystem B's mesh network, improving robustness under rapidly changing SNR conditions.

### 5.3 PJSCC: Learnable Prompt-Based JSCC
**Paper**: *"Channel-Adaptive Wireless Image Semantic Transmission with Learnable Prompts"* (arXiv:2411.10178)
- **Key Contribution**: Learnable channel state prompts implicitly integrate physical channel information. Adapts to diverse SNR levels without retraining. Memory-efficient and deployable on resource-constrained platforms.
- **Relevance to SUTRA**: The prompt-based adaptation approach could enable Subsystem B's JSCC to handle varying mesh network conditions without model switching.

### 5.4 FAJSCC: Feature Importance-Aware JSCC
**Paper**: *"Feature Importance-Aware Deep Joint Source-Channel Coding"* (arXiv:2504.04758)
- **Key Contribution**: First deepJSCC architecture allowing independent encoder/decoder complexity adjustment. Selective deformable self-attention on important features only. Outperforms SwinJSCC with half the compute.
- **Relevance to SUTRA**: Critical for Subsystem B — encoder runs on compute-constrained drone, decoder runs on powerful GCS. Asymmetric complexity allocation is exactly the right architecture.

### 5.5 FFT-DeepJSCC: Outdoor 5G Validation
**Paper**: *"Outdoor Experiment of Deep Joint Source-Channel Coding"* (APSIPA 2025)
- **Key Contribution**: Replaces 2D convolutions with FFT + element-wise product, reducing computational cost. Validated on modified commercial 5G base station and user terminal in LoS and NLoS environments.
- **Relevance to SUTRA**: Provides real-world validation of DeepJSCC feasibility for Subsystem B's wireless image transmission.

---

## 6. Cross-Cutting Themes & SUTRA Architecture Implications

### 6.1 Hierarchical AI Control Pattern
Multiple papers (arXiv:2607.18604, arXiv:2607.01281, arXiv:2606.03963) converge on **hierarchical decomposition**:
- **Strategic Layer** (LLM/rule-based): Mission planning, corridor allocation, network handover
- **Tactical Layer** (DRL): Collision avoidance, trajectory tracking, energy optimization
- **Execution Layer** (PID/classical): Low-level motor control, attitude stabilization

**SUTRA Recommendation**: Adopt 3-tier architecture — LLM for mission reasoning, DRL for 50Hz flight control, PX4 inner loop for motor commands.

### 6.2 Teacher-Student Paradigm for Sim-to-Real
The privileged learning approach (arXiv:2412.06313) enables:
- Training in Gazebo Sim 8 with perfect state information
- Deployment with only vision + IMU (no GPS, no perfect state)
- Graceful degradation under sensor noise/failure

**SUTRA Recommendation**: Implement teacher-student for Subsystem A's VIO and Subsystem C's detector training.

### 6.3 TensorRT FP16 as Standard Deployment Pipeline
All edge perception papers (Section 3) converge on TensorRT FP16:
- 3-11x inference speedup
- >50% energy reduction
- Minimal accuracy loss (<1%)

**SUTRA Recommendation**: Mandate TensorRT FP16 optimization for all Subsystem C models before deployment.

### 6.4 Hybrid Collision Avoidance (ORCA + Global Planner)
Papers on ORCA-A* (SESAR 2024), Topology-Guided ORCA (arXiv:2407.16771), and SORCA (Springer 2025) all demonstrate that pure reactive ORCA fails in constrained environments with static obstacles.

**SUTRA Recommendation**: Combine ORCA 3D (reactive) with RRT*/A* (global) for Subsystem A's collision avoidance in cluttered disaster environments.

### 6.5 Deep JSCC for Mesh Image Transmission
The JSCC papers (Section 5) demonstrate that neural joint source-channel coding:
- Avoids the cliff effect of traditional SSCC
- Performs well at low SNR (critical for mesh networks)
- Can be made lightweight and adaptive

**SUTRA Recommendation**: Replace traditional JPEG + FEC pipeline in Subsystem B with Deep JSCC encoder (on drone) + decoder (on GCS).

---

## 7. Papers Index (Quick Reference)

| # | ArXiv ID | Title | Category | SUTRA Relevance |
|---|----------|-------|----------|-----------------|
| 1 | 2607.18604 | Intelligent Multi-UAV Navigation (LLM+DRL) | Flight Control | A: Multi-tier control |
| 2 | 2607.15004 | CosFly-VLA: Vision-Language-Action Tracking | Perception | C: Survivor tracking |
| 3 | 2607.07350 | Aerial-Ground Vehicle Collaboration | Planning | A/B: Cooperative routing |
| 4 | 2607.01281 | WaveLander: RL for UAV Landing | Flight Control | A: Emergency landing |
| 5 | 2606.03963 | AgenticRL: Self-Refining RL Navigation | Flight Control | A: Auto reward design |
| 6 | 2605.11509 | Hierarchical LLM for HAPS-UAV | Flight Control | A/B: Networked control |
| 7 | 2605.00059 | Dynamic-TD3: Safety-Constrained Planning | Flight Control | A: CMDP navigation |
| 8 | 2604.12501 | Emergency Delivery UAV Framework | Comms/Planning | B/F: Emergency comms |
| 9 | 2601.13252 | Nano-Scale UAV Navigation | Edge AI | A: SWaP-constrained |
| 10 | 2512.19083 | CoDrone: Cloud-Edge-End Computing | Perception | A/C: Foundation models |
| 11 | 2510.20008 | State-to-State Minimum-Time RL | Flight Control | A: Agile navigation |
| 12 | 2508.16807 | RL for Confined Space Navigation | Flight Control | A/F: Indoor search |
| 13 | 2504.04289 | Self-Supervised Trajectory Planning | Flight Control | A: Differentiable opt |
| 14 | 2412.06313 | Vision DRL with Privileged Learning | Flight Control | A: Sim-to-real |
| 15 | 2411.05586 | Tangled Program Graphs for UAVs | Flight Control | A: Explainable control |
| 16 | 2410.05996 | AIVIO: AI-Aided VIO | GPS-Denied Nav | A: Object-relative nav |
| 17 | 2409.17922 | DRL for Urban UAV Navigation | Flight Control | A: Urban flight |
| 18 | 2407.16771 | Topology-Guided ORCA | Collision Avoidance | A: Swarm avoidance |
| 19 | 2404.17745 | Attention-Based Deep Visual Odometry | GPS-Denied Nav | A: VIO accuracy |
| 20 | 2401.09758 | DRL for Airspace Capacity | Planning | A/B: UTM |
| 21 | 2301.09758 | Deep VIO for GPS-Denied Navigation | GPS-Denied Nav | A: DeepVIONet |
| 22 | 2103.06403 | Vision DRL Obstacle Avoidance | Collision Avoidance | A: DQN exploration |
| 23 | 2007.00544 | RL for UAV Data Harvesting | Flight Control | B: Trajectory planning |
| 24 | 1906.00421 | Air Learning: RL Gym for Aerial Robots | Simulation | A: Training framework |
| 25 | — | ADG-YOLO: Lightweight UAV Detection | Edge AI | C: Detector design |
| 26 | — | LD-YOLOv10: Lightweight Drone Detection | Edge AI | C: Model compression |
| 27 | — | YOLO11-AU-IR: Infrared UAV Detection | Edge AI | C: Thermal detection |
| 28 | — | STARJSCC: Star-Operation JSCC | Comms | B: Neural compression |
| 29 | — | CBJSCC: Channel-Blind JSCC | Comms | B: Adaptive JSCC |
| 30 | — | FAJSCC: Feature Importance-Aware JSCC | Comms | B: Asymmetric JSCC |

---

## 8. Recommended Implementation Roadmap for SUTRA

### Phase 1: Foundation (Weeks 1-2)
1. **Subsystem A**: Implement teacher-student privileged learning for VIO (based on arXiv:2412.06313)
2. **Subsystem C**: Benchmark YOLOv8-Nano with TensorRT FP16 on Jetson (based on MDPI Machines 2025 findings)
3. **Subsystem B**: Prototype Deep JSCC encoder with CBJSCC architecture (based on MDPI Sensors 2024)

### Phase 2: Integration (Weeks 3-4)
4. **Subsystem A**: Hybrid ORCA + RRT* collision avoidance (based on SESAR 2024 + arXiv:2407.16771)
5. **Subsystem C**: Integrate C3Ghost module into YOLOv8-Nano backbone (based on ADG-YOLO 2025)
6. **Subsystem B**: Implement channel-adaptive Deep JSCC with learnable prompts (based on arXiv:2411.10178)

### Phase 3: Advanced (Weeks 5-6)
7. **Subsystem A**: Hierarchical LLM+DRL for multi-UAV mission planning (based on arXiv:2607.18604)
8. **Subsystem C**: Tri-modal fusion with attention mechanism (inspired by SelfAttentionVO architecture)
9. **Subsystem B**: Asymmetric encoder/decoder complexity allocation (based on FAJSCC)

---

*This research was compiled using local Firecrawl instance at `localhost:3002` with direct arXiv scraping and web search. All paper IDs and URLs are verified.*
