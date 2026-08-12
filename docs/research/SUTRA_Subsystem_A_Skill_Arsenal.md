# 🤖 Agent Skill Arsenal — Subsystem A (GNC & Flight Control) Build Kit

> **Gathered:** 2026-08-09 via firecrawl-local deep research (web search + GitHub API/raw enumeration) + 4 deployed research subagents.
> **Purpose:** Curated, downloadable agent skills (SKILL.md packs) from official vendors (NVIDIA, Anthropic, PX4) and popular community collections to make Subsystem A (PX4 offboard nav, VIO/SLAM, ORCA avoidance, OctoMap, C++/Gazebo) more powerful.
> **Location of downloaded files:** `.firecrawl/skills-research/downloaded/` (280 markdown files, ~4.2 MB). **NOT committed** — these are external third-party assets.

---

## 1. 🏆 Top Picks for Subsystem A

| # | Skill Pack | Source | Type | Why it matters for Subsystem A |
|---|---|---|---|---|
| 1 | **ros2-copilot-skills** (209 skills) | github.com/wimblerobotics/ros2-copilot-skills | Community | **The single most valuable pack.** Covers the entire GNC surface: `ekf-sensor-fusion`, `ukf-sensor-fusion`, `visual-odometry`, `slam-toolbox-online`, `cartographer-tuning`, `voxel-layer` (3D occupancy), `costmap-architecture`, `gz-sim-setup`, `gz-ros2-bridge`, `cpp-node-boilerplate`, `coordinate-frames-and-tf`, `imu-integration`, `sim-time-management` |
| 2 | **cuVSLAM skills** (onboard / ci / troubleshoot) | github.com/nvidia-isaac/cuVSLAM (1.7k★) | **Official NVIDIA** | CUDA-accelerated visual SLAM (mono/stereo-inertial, loop closure) with **ROS 2 integration** — the production-grade VIO upgrade for `vio_localization.py` |
| 3 | **NVIDIA/skills — Jetson pack** (34 files pulled) | github.com/NVIDIA/skills (2.8k★) | **Official NVIDIA** | Companion-computer optimization: `jetson-quick-start`, `jetson-optimize-memory`, `jetson-customize-clocks` (DRAM/BCT carveouts), `jetson-headless-mode`, `jetson-customize-camera` (MIPI/GMSL VIO cameras), `jetson-memory-audit`, `jetson-customize-nvpmodel` (battery ops), `tilegym-improve-cutile-kernel-perf` (CUDA C++ kernels) |
| 4 | **PX4 official skills** (commit / pr / rebase / review-pr) | github.com/PX4/PX4-Autopilot `.claude/skills` | **Official PX4** | Vendor workflow skills for contributing to PX4 — essential if SUTRA patches the autopilot itself |
| 5 | **anthropics/skills** (skill-creator, template, format guide) | github.com/anthropics/skills (167k★) | **Official Anthropic** | The canonical SKILL.md authoring spec — use to write SUTRA's own internal GNC skills |
| 6 | **drone-cv-expert + drone-inspection-specialist** | github.com/curiositech/some_claude_skills | Community | SLAM, VO, MAVLink, Pixhawk, EKF fusion, A*/RRT planning knowledge — closest community analogue to Subsystem A |
| 7 | **agent-gpu-skills** (CUDA/CUTLASS) | github.com/slowlyC/agent-gpu-skills | Community | CUDA kernel development for the C++ offboard node & OctoMap GPU acceleration |
| 8 | **ros2-skill** (adityakamath) | github.com/adityakamath/ros2-skill | Community | Full ROS 2 robot-control discipline: topics/services/actions/params, Nav2, ros2_control, lifecycle |
| 9 | **superpowers** (269k★) | github.com/obra/superpowers | Community/Popular | General agentic-dev methodology (spec-driven, brainstorming, planning) — project-level workflow, not robotics-specific |
| 10 | **cuVSLAM + NVIDIA physical-ai-neural-reconstruction** | nvidia-isaac / NVIDIA/skills | Official | 3DGS/neural reconstruction from **drone + ROS 2 bag** recordings → photoreal digital twin for Gazebo validation (Gate G1) |

---

## 2. 📂 What Was Downloaded (evidence)

```
.firecrawl/skills-research/downloaded/
├── anthropic/         9 files  — skill-creator, template, pdf, docx, webapp-testing,
│                                 claude-api (72KB), skills-format-guide, opencode-vs-claude-skills,
│                                 blog-skills-announcement
├── nvidia/           34 files  — jetson-* (17), omniverse-*, physical-ai-*, deepstream-*,
│                                 tao-train-{depth-anything-v2,foundation-stereo,fast-foundation-stereo,pointpillars},
│                                 holoscan-*, holohub-*, tilegym-*, nvidia-skill-finder, skill-card-generator
└── community/       ~240 files
    ├── ros2-copilot-skills/   209 SKILL.md files (git clone, 3.2 MB)
    ├── cuvslam-skills/          3 SKILL.md files
    ├── px4-official-skills/     4 SKILL.md files
    ├── drone-cv/                2 SKILL.md + 6 reference files
    ├── agent-gpu-skills/        2 SKILL.md + quick-reference
    └── ros2-skill.md            1 SKILL.md
```

**Top-10 most Subsystem-A-relevant skills inside ros2-copilot-skills:** `ekf-sensor-fusion`, `ukf-sensor-fusion`, `visual-odometry`, `slam-toolbox-online`, `cartographer-tuning`, `voxel-layer`, `costmap-architecture`, `gz-sim-setup`, `gz-ros2-bridge`, `cpp-node-boilerplate` (+ `coordinate-frames-and-tf`, `imu-integration`, `world-building`, `sim-time-management`).

---

## 3. 🧩 SKILL.md Format Spec (portable subset — works in Claude Code AND opencode)

Distilled from Anthropic's official docs + skill-creator + opencode.ai/docs/skills:

```yaml
---
name: my-skill                 # lowercase-hyphenated; opencode: MUST match dir name (regex ^[a-z0-9]+(-[a-z0-9]+)*$)
description: "Trigger phrase FIRST — loaded only when relevant. ≤1024 chars (opencode) / ≤1536 (Claude)."
license: MIT                   # optional, portable
compatibility: "claude-code, opencode"   # optional, portable
metadata:                      # optional, portable
  author: SUTRA
allowed-tools: []              # optional, portable (Claude only; opencode ignores)
---
Body: step-by-step instructions, workflow gates, commands.
references/   # lazily loaded deep docs (keep SKILL.md < 500 lines)
scripts/      # executable code — more reliable than token generation
examples/
```

- opencode loads `.claude/skills/` natively and silently ignores unknown frontmatter.
- Keep SKILL.md < 500 lines; put deep detail in `references/` (lazy loading = fast agents).

---

## 4. 🗺️ Recommended Deployment into Project SUTRA

| Phase | Action | Skills to activate |
|---|---|---|
| Now | Create `.opencode/skills/sutra-gnc/` with SUTRA-authored SKILL.md (copy the `skill-creator` + `template` pattern) | anthropic assets |
| Sprint A (GNC) | Wire the 10 ros2-copilot-skills into the repo (e.g., `.opencode/skills/ros2/`) — EKF/VO/costmap/gz/cpp | ros2-copilot-skills |
| Sprint B (VIO upgrade) | Follow cuVSLAM `cuvslam-onboard` skill for CUDA VSLAM + ROS 2 port of `vio_localization.py` | cuVSLAM skills |
| Jetson bring-up | Companion computer optimization via jetson-* skills (headless, clocks, memory audit) | NVIDIA jetson pack |
| Gate G1 validation | `physical-ai-neural-reconstruction` to convert **ROS 2 bag → NCore** neural scenes for Gazebo digital twin | NVIDIA physical-ai |

> ⚠️ Third-party skills execute code — audit each SKILL.md before trusting it (per Anthropic guidance "stick to trusted sources"). All packs above are from official vendors or starred community repos; raw content is preserved under `.firecrawl/` for review.

---

## 5. 🔗 Master Source List (all verified live)

| URL | Stars | Notes |
|---|---|---|
| https://github.com/NVIDIA/skills | 2.8k | Official NVIDIA skill catalog (330 skills enumerated) |
| https://github.com/nvidia-isaac/cuVSLAM | 1.7k | Official CUDA VSLAM + cuvslam-skills/ |
| https://github.com/anthropics/skills | 167k | Official Anthropic skills |
| https://github.com/PX4/PX4-Autopilot | 83k | `.claude/skills/` — official PX4 workflow skills |
| https://github.com/wimblerobotics/ros2-copilot-skills | — | 209-skill ROS 2 pack |
| https://github.com/adityakamath/ros2-skill | — | ROS 2 control skill |
| https://github.com/curiositech/some_claude_skills | — | drone-cv-expert |
| https://github.com/slowlyC/agent-gpu-skills | — | CUDA/CUTLASS skills |
| https://github.com/obra/superpowers | 269k | Popular general agent framework |
| https://github.com/ComposioHQ/awesome-claude-skills | 72k | Skill directory index |
| https://skillsmp.com / skillsllm.com / glama.ai/skills / claudeskills.info | — | Marketplace indexes (resolved to GitHub) |
| https://code.claude.com/docs/en/skills | — | Official format spec |
| https://opencode.ai/docs/skills/ | — | opencode format + compat notes |
| https://claude.com/blog/skills | — | Announcement + best practices |

---

## 6. ⚠️ Honest Limitations

- **No SUTRA-measured benchmarks anywhere in this report** — this is a skill-cataloging task, per AGENTS.md the ABSOLUTE RULE is respected; star counts and skill counts come from live GitHub API responses.
- firecrawl search endpoint was flaky (~50%); GitHub API/raw downloads served as the reliable path. Raw JSON evidence preserved in `.firecrawl/skills-research/`.
- NVIDIA's catalog is AI/data-center-heavy; the robotics surface is Jetson/Omniverse/cuVSLAM — there is **no official NVIDIA ROS 2 or PX4 skill** (verified by subagent enumeration).
- Downloaded third-party content lives under `.firecrawl/` (gitignored area) — decide explicitly where SUTRA-owned copies should live.
