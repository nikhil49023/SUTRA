# 🧠 SUTRA Agent Skills — Context-Window Governance Protocol

> **Purpose:** Make the downloaded skill arsenal (337 files, 11 MB) usable WITHOUT flooding the agent context window.
> **Status:** Adopted 2026-08-09. Applies to all agents working on Project SUTRA.

---

## 1. The Flood Risk (measured)

| Risk | Source | Impact |
|---|---|---|
| 209 ros2-copilot SKILL.md files auto-loaded | Auto-discovered skills | Full repos average ~15-30 KB per SKILL.md → **3-6 MB / ~1M+ tokens** — catastrophic context blowout |
| 72 KB claude-api.md style deep docs | anthropic pack | Single skill can consume an entire context window |
| Skill stacking by agents | Bad agent behavior | 2-3 skills × 30 KB each = instant degradation of reasoning quality |
| `git clone` of vendor repos into project root | Convenience copy | Every session scanner picks them up (not just skill loaders) |

## 2. Adopted Architecture — Layered Skill Loading

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 0  sutra-gnc-catalog (gatekeeper)  ~2 KB  ALWAYS      │
│   Tiny index: skill name + trigger + size. Never content.   │
├─────────────────────────────────────────────────────────────┤
│ LAYER 1  Curated skills in .opencode/skills/  (8 skills)    │
│   Loaded ONLY when description matches task (lazy).         │
│   Each: SKILL.md ≤ 150 lines + references/ for depth.       │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2  Full packs in .firecrawl/skills-research/downloaded│
│   OFF the auto-load path. Accessed by explicit path only.   │
│   Agent reads ONE specific file when the task demands it.   │
└─────────────────────────────────────────────────────────────┘
```

## 3. Binding Rules for Agents

1. **One skill per task phase.** Never stack 2+ SKILL.md bodies in one message.
2. **Never paste skill content** into the conversation — always read via tool, reference by name.
3. **Read, apply, discard.** After applying a skill's guidance, drop it from active context (do not keep re-referencing).
4. **Lean authoring:** any new SUTRA skill MUST be ≤ 150 lines; deep detail goes to `references/` (lazy-loaded on explicit request).
5. **Trigger-first descriptions:** the first phrase of `description:` must state exactly when the skill applies; opencode/claude match on this phrase.
6. **No bulk clones into the workspace.** Vendor packs live only under `.firecrawl/` (gitignored).
7. **Catalog maintenance:** every added/removed curated skill updates `sutra-gnc-catalog` in the same commit.

## 4. Why This Works (mechanism)

- opencode + Claude Code both **list only skill metadata** (name + description) until invoked — descriptions are tiny.
- **Progressive disclosure**: SKILL.md loads on match; `references/` loads only on explicit read. Anthropic's own guidance: "loads only the minimal information and files needed."
- The gatekeeper pattern (mirrors NVIDIA's `nvidia-skill-finder` router) centralizes routing in a ~2 KB file instead of scattered discovery.

## 5. Curated Install Set (Layer 1 — to be created)

| Skill | Derived from | Purpose |
|---|---|---|
| sutra-vio-factor-graph | cuVSLAM onboard + Kimera-VIO | Loop closure, factor graph ops |
| sutra-nmpc-trajectory | ros2-copilot (cpp-node + control refs) | Setpoint/trajectory/MPC work |
| sutra-orca-avoidance | RVO2/ORCA references | Avoidance + Gate G5 |
| sutra-octomap | ros2-copilot voxel-layer | Voxel mapping, downsampling |
| sutra-ros2-node-patterns | ros2-copilot topic-pub-sub | Multi-drone wiring, namespaces |
| sutra-emergency-landing | arXiv 2505.20423 workflow | Landing FSM, risk map |
| sutra-swarm-frame | cuVSLAM + CoVOR-SLAM refs | Range fusion, CILC security |
| sutra-gazebo-sim | ros2-copilot gz-sim-setup | SITL launch + verification |

Each to be authored from the downloaded originals (NOT copied verbatim — trimmed to ≤150 lines with references).

## 6. Escalation Path

- Skill content needed for a one-off: read the file under Layer 2 path directly, apply, discard.
- Skill content needed repeatedly: promote to Layer 1 (trim + catalog update).
- Pack-level research: delegate to a subagent (subagent contexts are isolated — the flood stays out of the main agent).
