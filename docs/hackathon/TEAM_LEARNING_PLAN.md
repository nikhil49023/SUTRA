# SUTRA Team Learning Plan — Hackathon Preparation

> **Timeline:** August 16 → September 2, 2026 (18 days)
> **Goal:** Every team member must understand their subsystem well enough to rebuild and defend it.

---

## Team Roster & Roles

| Member | Role | Primary Subsystem | Secondary Subsystem |
|--------|------|-------------------|---------------------|
| Nikhil | Tech Architect | A (GNC) + B (Comms) | All (oversight) |
| Vedanth | Perception Lead | C (Perception) | A (GNC) |
| Siva | GCS Lead | D (GCS - Flask) | B (Comms) |
| Harika | Docs Lead | E (Docs/Verification) | All (documentation) |
| Rohith | Ops Lead | F (Tactical Ops) | E (Documentation) |

---

## WEEK 1: Python Foundations & ROS2 Basics (Aug 16-22)

### ALL TEAM MEMBERS (Mandatory)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Python basics | Automate the Boring Stuff (Ch 1-10) | 6 hrs | Core language |
| Git branching | Git Handbook | 2 hrs | Team collaboration |
| Command line | LinuxCommand.org | 3 hrs | Development environment |
| VS Code setup | Official docs | 1 hr | Editor |

### NIKHIL (Subsystem A + B)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| ROS2 Humble basics | ROS2 Tutorials | 8 hrs | Core middleware |
| Gazebo Sim 8 | Gazebo Sim tutorials | 6 hrs | Simulation |
| Python socket programming | RealPython guide | 4 hrs | Mesh networking |
| PX4/MAVSDK basics | MAVSDK docs | 4 hrs | Flight control |

**Week 1 Deliverable:** Run SUTRA's existing nodes, explain what each does.

### VEDANTH (Subsystem C)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| PyTorch basics | PyTorch tutorials | 8 hrs | ML framework |
| OpenCV Python | OpenCV docs | 4 hrs | Image processing |
| YOLO basics | Ultralytics docs | 4 hrs | Object detection |
| ROS2 subscriber/publisher | ROS2 tutorials | 4 hrs | Data flow |

**Week 1 Deliverable:** Run YOLO on a webcam image, explain the pipeline.

### SIVA (Subsystem D)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Flask basics | Flask Mega-Tutorial (Ch 1-5) | 6 hrs | Web framework |
| HTML/CSS basics | MDN Web Docs | 4 hrs | Frontend |
| JavaScript basics | Eloquent JavaScript (Ch 1-5) | 4 hrs | Map interaction |
| Leaflet.js basics | Leaflet tutorial | 3 hrs | Map rendering |

**Week 1 Deliverable:** Build a Flask app that shows a map with one marker.

### HARIKA (Subsystem E)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Markdown mastery | Markdown Guide | 2 hrs | Documentation |
| pytest basics | pytest docs | 4 hrs | Testing |
| GitHub Actions basics | GitHub Actions docs | 3 hrs | CI/CD |
| Technical writing | Google Technical Writing course | 4 hrs | Docs quality |

**Week 1 Deliverable:** Write a test for one SUTRA Python function.

### ROHITH (Subsystem F)

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Markdown mastery | Markdown Guide | 2 hrs | Documentation |
| Disaster response basics | NDMA guidelines | 4 hrs | Domain knowledge |
| CONOPS template | Military planning docs | 3 hrs | Operational planning |
| Presentation design | Slide design principles | 3 hrs | Pitch deck |

**Week 1 Deliverable:** Draft CONOPS outline for Kedarnath flood scenario.

---

## WEEK 2: Subsystem Deep Dive (Aug 23-29)

### NIKHIL

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| ORCA algorithm | ORCA paper + code | 6 hrs | Collision avoidance |
| Swarm consensus basics | Raft paper summary | 4 hrs | Leader election |
| Deep JSCC concept | Autoencoder papers | 4 hrs | Neural compression |
| Gazebo SDF models | Gazebo docs | 4 hrs | World creation |

**Week 2 Deliverable:** Explain ORCA algorithm on whiteboard, draw SUTRA architecture from memory.

### VEDANTH

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| YOLOv8-Nano training | Ultralytics docs | 8 hrs | Edge detection |
| TensorRT basics | NVIDIA docs | 4 hrs | Model optimization |
| GPS raycasting concept | GIS tutorials | 4 hrs | Target geolocation |
| ROS2 image transport | ROS2 docs | 4 hrs | Camera data flow |

**Week 2 Deliverable:** Train YOLO on custom dataset, explain inference pipeline.

### SIVA

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Flask-SocketIO | Official docs | 4 hrs | Real-time WebSocket |
| Leaflet markers/popup | Leaflet docs | 4 hrs | Drone visualization |
| Bootstrap layout | Bootstrap docs | 3 hrs | Responsive design |
| JSON/API design | RESTful tutorial | 3 hrs | Data exchange |

**Week 2 Deliverable:** Build GCS prototype with 2 drone markers on map, real-time position update.

### HARIKA

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| pytest fixtures | pytest docs | 4 hrs | Test setup |
| Code coverage | coverage.py docs | 3 hrs | Test quality |
| Benchmark methodology | Performance testing guide | 4 hrs | Metrics |
| DOCS.md best practices | Markdown tables guide | 3 hrs | Documentation |

**Week 2 Deliverable:** Write 5 tests for SUTRA Python components.

### ROHITH

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| Kedarnath flood case study | Research papers | 6 hrs | Scenario understanding |
| Wayanad landslide analysis | News reports + papers | 4 hrs | Scenario understanding |
| SOP writing | Military SOP templates | 4 hrs | Procedure writing |
| Presentation storytelling | Pitch deck examples | 4 hrs | Narrative building |

**Week 2 Deliverable:** Complete CONOPS draft for both scenarios.

---

## WEEK 3: Integration & Practice (Aug 30 - Sep 2)

### ALL TEAM MEMBERS

| Skill | Resource | Time | Why |
|-------|----------|------|-----|
| SUTRA system architecture | Project docs | 4 hrs | Full understanding |
| Cross-subsystem interfaces | API docs | 4 hrs | Integration |
| Demo script practice | Rehearsal | 6 hrs | Presentation |
| Q&A preparation | Mock interviews | 4 hrs | Defense |

### NIKHIL

| Task | Time | Why |
|------|------|-----|
| Create boilerplate templates | 6 hrs | Fast hackathon start |
| Document all dependencies | 4 hrs | Quick setup |
| Practice explaining C++ in English | 6 hrs | Judge questions |
| Create architecture diagram | 4 hrs | Visual aid |

### VEDANTH

| Task | Time | Why |
|------|------|-----|
| Export trained YOLO model | 4 hrs | Ready for hackathon |
| Document model performance | 3 hrs | Metrics for judges |
| Practice explaining inference | 4 hrs | Technical defense |
| Create perception flowchart | 3 hrs | Visual aid |

### SIVA

| Task | Time | Why |
|------|------|-----|
| Finalize Flask GCS prototype | 8 hrs | Working demo |
| Create GCS mockups | 4 hrs | Design reference |
| Practice explaining WebSocket | 3 hrs | Technical defense |
| Document API endpoints | 3 hrs | API reference |

### HARIKA

| Task | Time | Why |
|------|------|-----|
| Create submission checklist | 3 hrs | Nothing missed |
| Document all test results | 4 hrs | Verification proof |
| Create benchmark templates | 3 hrs | Metrics format |
| Practice explaining testing | 3 hrs | Quality defense |

### ROHITH

| Task | Time | Why |
|------|------|-----|
| Finalize CONOPS document | 6 hrs | Complete operations plan |
| Create field deployment checklist | 4 hrs | Practical readiness |
| Practice presenting CONOPS | 4 hrs | Narrative defense |
| Create rescue scenario timeline | 3 hrs | Mission flow |

---

## Skill Matrix Summary

| Skill | Nikhil | Vedanth | Siva | Harika | Rohith |
|-------|--------|---------|------|--------|--------|
| Python | ✅ Advanced | ✅ Advanced | ✅ Advanced | ✅ Intermediate | ✅ Basic |
| ROS2 | ✅ Advanced | ✅ Intermediate | ✅ Basic | ⬜ None | ⬜ None |
| Gazebo Sim | ✅ Advanced | ✅ Basic | ⬜ None | ⬜ None | ⬜ None |
| PyTorch/DL | ✅ Intermediate | ✅ Advanced | ⬜ None | ⬜ None | ⬜ None |
| Flask | ⬜ None | ⬜ None | ✅ Advanced | ⬜ None | ⬜ None |
| JavaScript | ✅ Basic | ⬜ None | ✅ Intermediate | ⬜ None | ⬜ None |
| Git | ✅ Advanced | ✅ Intermediate | ✅ Intermediate | ✅ Intermediate | ✅ Basic |
| Technical Writing | ✅ Intermediate | ✅ Basic | ✅ Basic | ✅ Advanced | ✅ Intermediate |

---

## Minimum Viable Knowledge (Must-Know by Sep 2)

### Every team member MUST be able to:

1. **Explain SUTRA's mission** in 2 sentences
2. **Draw the system architecture** from memory (5 boxes = 5 subsystems)
3. **Describe their subsystem's role** in 30 seconds
4. **Answer:** "How does data flow from camera to GCS?"
5. **Answer:** "What happens when a drone detects a survivor?"
6. **Answer:** "How do drones avoid collisions?"
7. **Answer:** "What makes this different from existing solutions?"

### Red Flags (If you can't answer these, you're not ready):

- ❌ "I don't know how that function works"
- ❌ "I just copied it from somewhere"
- ❌ "I can't explain the algorithm"
- ❌ "I don't know what that import does"

---

## Daily Schedule (Aug 16 - Sep 2)

| Time | Activity |
|------|----------|
| 09:00 - 10:00 | Team standup (what did you learn yesterday?) |
| 10:00 - 12:00 | Individual learning (your subsystem) |
| 12:00 - 13:00 | Lunch break |
| 13:00 - 15:00 | Pair programming (teach each other) |
| 15:00 - 17:00 | Practice building (rebuild from memory) |
| 17:00 - 18:00 | Q&A practice (ask each other hard questions) |

---

## Progress Tracking

| Date | Nikhil | Vedanth | Siva | Harika | Rohith |
|------|--------|---------|------|--------|--------|
| Aug 16 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 18 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 20 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 22 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 24 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 26 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 28 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Aug 30 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Sep 1 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Mark:** ✅ = On track | ⚠️ = Behind | ❌ = Blocked

---

## Emergency Fallback

If any team member can't learn their subsystem in time:

| Situation | Solution |
|-----------|----------|
| Vedanth can't learn Perception | Nikhil handles C, Vedanth supports |
| Siva can't learn Flask GCS | Nikhil builds minimal GCS, Siva documents |
| Harika can't learn testing | Nikhil writes tests, Harika documents |
| Rohith can't learn CONOPS | Harika writes CONOPS, Rohith presents |

**The show must go on. Everyone must be able to present their part.**
