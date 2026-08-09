# Contributing to Smart Horizon Ground Control Station

Thank you for your interest in contributing to the **Smart Horizon Ground Control Station (GCS)** project! This document outlines our development guidelines, git branching workflows, and code standards.

---

## 1. Code of Conduct
We are committed to providing a welcoming, inclusive, and professional environment for all contributors.

---

## 2. Git Branching & Commit Conventions

### Branch Naming:
- Feature Branches: `feature/subsystem-d-gcs` or `feature/<feature-name>`
- Bug Fixes: `fix/<issue-name>`
- Documentation: `docs/<doc-name>`

### Commit Message Format:
Follow conventional commits:
- `feat(scope)`: New feature implementation
- `fix(scope)`: Bug fix
- `refactor(scope)`: Code refactoring without functionality changes
- `sec(scope)`: Defensive security hardening
- `docs(scope)`: Documentation updates

---

## 3. Quickstart Development Setup

```bash
# 1. Clone repository
git clone https://github.com/nikhil49023/SUTRA.git
cd SUTRA/sutra_ws/src/sutra_gnc/ground_station

# 2. Run automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Start development server
npm run dev
```

---

## 4. Submitting Pull Requests (PRs)
1. Ensure all unit and integration tests pass (`npm run build`).
2. Include clear descriptions and screenshots/videos for UI features.
3. Target PRs to branch `feature/subsystem-d-gcs` or `dev`.
