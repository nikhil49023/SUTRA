# 🤝 Contributing to Project SUTRA

Thank you for contributing to **Project SUTRA** (Swarm Unified Tactical Reconnaissance Architecture)! This guide details our git workflow, code standards, subsystem isolation rules, and pull request procedures.

---

## 📌 Team Role & Scope Discipline

To ensure clean execution and avoid merge conflicts across subsystems, adhere strictly to role assignments:

- **Subsystem A (Rohith)**: `sutra_ws/src/sutra_gnc/`
- **Subsystem B (Nikhil)**: `sutra_ws/src/sutra_comms/` & `sutra_ws/src/sutra_sim/`
- **Subsystem C (Vedanth)**: `sutra_ws/src/sutra_perception/`
- **Subsystem D (Siva Kesava)**: `sutra_ws/src/sutra_gcs/`
- **Subsystem E (Harika)**: `docs/` & `scripts/` verification gate audits

---

## 🌿 Git Branch Strategy

- **`main`**: Production & presentation-ready stable releases.
- **`dev`**: Daily integration branch.
- **`feature/subsystem-<letter>-<short-description>`**: Dedicated feature branches.

### Naming Examples:
- `feature/subsystem-a-orca-avoidance`
- `feature/subsystem-b-deep-jscc-encoder`
- `feature/subsystem-c-yolov8-tensorrt`
- `feature/subsystem-d-mapbox-3d-hud`
- `feature/subsystem-e-verification-g1-g6`

---

## 🔄 Workflow Steps

1. **Pull latest `dev` branch**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/subsystem-a-px4-offboard
   ```

3. **Develop & Test locally**:
   ```bash
   cd sutra_ws
   colcon build --packages-select sutra_gnc
   colcon test --packages-select sutra_gnc
   ```

4. **Commit using conventional commits**:
   - `feat(gnc): add ORCA 3D collision avoidance node`
   - `fix(comms): adjust packet loss fallback threshold`
   - `docs(subsystem-e): add G2 verification gate report`

5. **Push and create Pull Request**:
   - Create PR from `feature/...` into `dev`.
   - Complete the PR template checklist.
   - Require CI pass before merging.

---

## 🧪 Code Quality & Style Standards

- **Python**: PEP 8 compliant, type hints enforced, `ruff` / `black` formatting.
- **C++ / ROS 2**: ROS 2 C++ Style Guide, `clang-format`.
- **TypeScript / React**: ESLint, Prettier.
