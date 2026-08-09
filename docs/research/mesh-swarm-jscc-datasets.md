# Mesh Networking, Swarm Coordination & Neural Compression Datasets

> Compiled from web search results — Firecrawl local search returned empty results (search provider API key likely not configured).

---

| # | Dataset / Resource | Source | Description | URL |
|---|---|---|---|---|
| 1 | **Real-Time Performance Dataset from a Mesh Network Testbed** | IEEE DataPort | 802.11s mesh testbed (5x GL.iNet GL-X3000 routers, OpenWRT), iperf3 UDP probing, RSSI & noise measurements | https://doi.org/10.21227/xj1z-cf88 |
| 2 | **RoutingMetricsIeee802-11s** | GitHub / Elsevier | NS-3 802.11s FANET routing metrics (SrFTime, CRP, Airtime) for swarm-of-drones, 60-node topologies, 3D mobility model | https://github.com/ogbautista/RoutingMetricsIeee802-11s |
| 3 | **NS-3 IEEE 802.11s Mesh Model** | ns-3 Official | Open-source 802.11s mesh networking model for NS-3 simulator (HWMP, PMP, proactive/reactive modes) | https://www.nsnam.org/docs/release/3.48/models/html/mesh-design.html |
| 4 | **Drone Swarm Coordination Dataset** | HuggingFace / Kaggle | Simulated multi-drone swarm flight paths with communication & collision logs (1.11 MB CSV) | https://huggingface.co/datasets/jason1966/ahsanneural_drone-swarm-coordination-dataset |
| 5 | **SynDrone-Swarm** | GitHub | Telemetry-rich synthetic UAV swarm dataset (A/B domains) for detection, multi-object tracking, and intent prediction | https://github.com/MehmetUnall/SynDrone-Swarm |
| 6 | **U2UData+** | GitHub / ACM MM 2024 | Large-scale swarm UAV autonomous flight dataset: 15 UAVs, 12 scenes, 720 traces, 4.32M LiDAR + 12.96M RGB frames | https://github.com/fengtt42/U2UData |
| 7 | **MuJoCo-drones-gym** | GitHub | Multi-drone RL environments with MuJoCo physics, GPU vectorization, wind models, PettingZoo MARL wrapper, 7 task envs | https://github.com/tau-intelligence/MuJoCo-drones-gym |
| 8 | **PyBullet Swarm Sim** | GitHub | Full-stack multi-drone swarm simulation: 10 algorithms (Boids, PSO, ACO, Consensus, MARL PPO), Gymnasium-compatible envs | https://github.com/alexseysua/pybullet-swarm-sim |
| 9 | **Decentralized Quadrotor Swarm RL** | PMLR / CoRL 2022 | Multi-agent end-to-end DRL for decentralized quadrotor swarms, zero-shot sim-to-real transfer | https://proceedings.mlr.press/v164/batra22a.html |
| 10 | **BALLAST (Raft Adaptation Benchmark)** | GitHub | Contextual bandit + discrete-event simulation for adaptive Raft election timeouts; etcd/raft prototype on Docker/AWS | https://github.com/Icemap/ballast |
| 11 | **EaaS Raft Evaluation** | Buffalo CSE Tech Report | Systematic Evaluation-as-a-Service framework for Raft: Zipfian/uniform workloads, cluster sizes 1–5, partitions, leader crashes | https://cse.buffalo.edu/tech-reports/2025-02.pdf |
| 12 | **Raft Refloated (OCaml Simulator)** | MIT / GitHub | Clean-slate Raft implementation + event-driven OCaml simulator; 100k+ traces validated against NFA model | https://github.com/heidi-ann/ocaml-raft-data |
| 13 | **raft-bench** | GitHub | Benchmark comparing etcd, hashicorp, and dragonboat Raft libraries for KV store throughput/latency | https://github.com/winstonleedev/raft-bench |
| 14 | **distrobench (Distributed Protocol Benchmarks)** | GitHub | Multi-protocol benchmark (Raft, Paxos, EPaxos, ZAB, etc.) with YCSB workloads, 5 replicas, Docker containers | https://github.com/fadhilkurnia/distro |
| 15 | **bft-consensus-bench** | GitHub | PBFT vs HotStuff vs Raft benchmark: throughput, fault tolerance, Byzantine fault injection | https://github.com/jdh847/bft-consensus-bench |
| 16 | **Deep-JSCC-PyTorch** | GitHub | PyTorch reimplementation of Deep JSCC for wireless image transmission (CIFAR-10, ImageNet → AWGN/Rayleigh channels) | https://github.com/chunbaobao/Deep-JSCC-PyTorch |
| 17 | **DeepJSCC TensorFlow** | GitHub | TensorFlow/Keras Deep JSCC pipeline with AWGN, Rayleigh, Rician channel layers, FiLM conditioning, perceptual losses | https://github.com/samhallSwin/DeepJSCC |
| 18 | **DeepJSCC-l++ (Swin Transformer)** | arXiv | Bandwidth + SNR adaptive JSCC using Swin Transformer backbone; single model adapts to all channel conditions | https://arxiv.org/abs/2305.13161 |
| 19 | **Channel-Blind JSCC (CBJSCC)** | MDPI Electronics | JSCC method requiring no SNR feedback; self-adaptive to dynamic channels, validated on ImageNet, iSAID, LFW, HRSID | https://pmc.ncbi.nlm.nih.gov/articles/PMC11209452/ |
| 20 | **Deep JSCC with OFDM** | arXiv | CNN-based JSCC with OFDM layers for multipath fading; CIFAR-10 + CelebA, robust to non-linear clipping | https://arxiv.org/abs/2101.03909 |

---

### Relevance to SUTRA Subsystems

| Subsystem | Most Relevant Datasets |
|---|---|
| **B — Comms & Sim (802.11s, SwarmRAFT)** | #1, #2, #3 (mesh networking), #10, #11, #12, #13, #14, #15 (Raft consensus) |
| **C — AI Perception (YOLO, sensor fusion)** | #4, #5, #6 (drone swarm perception data) |
| **B — Deep JSCC** | #16, #17, #18, #19, #20 (neural compression) |
| **A — GNC (ORCA, VIO)** | #7, #8, #9 (multi-drone coordination) |

### Note on Firecrawl Local

The four `curl -s http://localhost:3002/v0/search` queries all returned `{"success":true,"error":"No search results found"}`. This indicates the Firecrawl search endpoint requires a configured search provider API key (SerpAPI, Tavily, etc.) which is not currently set. The above table was compiled via web search fallback.
