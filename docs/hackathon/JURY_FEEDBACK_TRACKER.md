# 📝 Smart Horizon Hackathon 2026: Jury Feedback & Resolution Tracker
**Event**: Smart Horizon 48-Hour International Hackathon (NHCE Bengaluru, Sept 3–5, 2026)  
**Track**: Defence & SpaceTech — Problem Statement: **SH-DST-05**  
**Team SUTRA**: Nikhil, Vedanth, Siva, Harika, Rohith  
**Mandatory Compliance**: NHCE Rule 6.1 (*"All solutions must be developed during the hackathon duration only and any updates insisted by the jury members must be incorporated fully."*)

---

## 🟢 EVALUATION 1 (Hours 12–16 / Day 1 Evening) — Max Score: 100 Marks

**Date & Time**: `2026-09-03T...`  
**Jury Members**:  
1. Judge 1: `[Name / Affiliation]`  
2. Judge 2: `[Name / Affiliation]`  

### Marks Awarded (Self-Estimate / Actual):
| Criteria | Max Marks | Awarded | Notes / Observations |
|:---|:---:|:---:|:---|
| System Architecture & Design | 25 | | |
| Problem Statement Alignment (SH-DST-05) | 20 | | |
| Baseline Prototype Execution | 25 | | |
| Technical Innovation & Math Rigor | 15 | | |
| Workstation Discipline & Pitch | 15 | | |
| **TOTAL EVAL 1** | **100** | | |

### Verbatim Feedback & Requested Modifications:
- [x] **Feedback Item 1 (Real-World Deployment & Execution Under Government Frameworks)**:  
  - *Jury Suggestion*: Heavy focus on real-world deployment, physical field execution, and institutional compatibility with government disaster management bodies (NDMA, NDRF, SDRF). How do exhausted jawans operate this? How do you overcome the 25-minute battery limit? How does it pack, transport, and deploy in real disasters like Wayanad or Kedarnath?
  - *Assigned To*: Nikhil (Tech Architect) & Rohith Kumar / Harika (Subsystem F CONOPS Leads)  
  - *Target Resolution by*: Eval 2 Start (Resolved Immediately for Eval 1 Defense)  
  - *Implemented Fix & Documentation*:
    1. Authored authoritative disaster operational audit: [`docs/conops/NDMA_IRS_FIELD_DEPLOYMENT_AUDIT.md`](../conops/NDMA_IRS_FIELD_DEPLOYMENT_AUDIT.md).
    2. Formally mapped SUTRA into the NDMA **Incident Response System (IRS)** as an **Autonomous Aerial Reconnaissance Unit (AARU)** reporting directly to the Operations Section Chief (OSC).
    3. Engineered the **180-Second Rapid Staging & Cold-Start SOP** (two IP67 Pelican 1650 cases, quick-release folding arms, automated sensor BIST).
    4. Engineered the **4+1 Leapfrog Swarm Rotation** solving battery flight limits for continuous 24-hour persistent search.
    5. Established the **Zero-Pilot Touchscreen UX** (bounding-box polygon tasking, zero manual joystick flying for stressed rescuers).
    6. Grounded regulatory and wireless spectrum compliance in **Rule 50 of DGCA Drone Rules 2021** (General power to exempt for disaster management), **Section 34/38 of the Disaster Management Act 2005**, and **WPC de-licensed 5.8 GHz / 865 MHz ISM bands**.

---

## 🟡 EVALUATION 2 (Hours 24–30 / Day 2 Midday) — Max Score: 100 Marks

**Date & Time**: `2026-09-04T...`  
**Jury Members**:  
1. Judge 1: `[Name / Affiliation]`  
2. Judge 2: `[Name / Affiliation]`  

### Marks Awarded (Self-Estimate / Actual):
| Criteria | Max Marks | Awarded | Notes / Observations |
|:---|:---:|:---:|:---|
| Eval 1 Feedback Incorporation (Rule 6.1) | 25 | | |
| Cross-Subsystem Integration | 30 | | |
| Robustness Under Failure & Disturbances | 25 | | |
| Deterministic Verification (232 Tests) | 20 | | |
| **TOTAL EVAL 2** | **100** | | |

### Eval 1 Feedback Closure Demonstration:
- [ ] Demonstrated Item 1: `[Proof / Test / Code diff]`
- [ ] Demonstrated Item 2: `[Proof / Test / Code diff]`

### Mid-Evaluation Feedback & Final Tuning Requests:
- [ ] **Feedback Item 1**:  
  - *Assigned To*:  
  - *Resolution for Grand Finale*:  

---

## 🔴 EVALUATION 3 (Hours 40–46 / Day 3 Finale) — Max Score: 100 Marks

**Date & Time**: `2026-09-05T...`  
**Jury Panel**: Grand Finale Evaluation Committee

### Marks Awarded:
| Criteria | Max Marks | Awarded | Notes / Observations |
|:---|:---:|:---:|:---|
| Live 5-UAV Ring Crossing Demo | 35 | | |
| Perception & Sub-0.32m Geolocation | 20 | | |
| Unit Economics & CONOPS Scalability | 15 | | |
| Jury Defense & Trap Q&A Mastery | 20 | | |
| Final Pitch Polish & Stage Timing | 10 | | |
| **TOTAL EVAL 3** | **100** | | |

### Final Cumulative Score:
- **Evaluation 1**: `/100`
- **Evaluation 2**: `/100`
- **Evaluation 3**: `/100`
- **GRAND TOTAL**: `/300`
