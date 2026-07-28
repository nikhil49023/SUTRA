# SUTRA Presentation Script — 4 Minutes Total

> **Speaking pace:** ~130 words per minute. Each slide has a time budget shown below.
> **Total word count target:** ~520 words across all slides.

---

## Slide 1 — Title: SUTRA
**⏱ Time: 20 seconds (~43 words)**

"Good morning everyone. Today I want to introduce SUTRA — Swarm Unified Tactical Reconnaissance Architecture. In simple terms, SUTRA is a group of drones that work together to find survivors in disaster zones — even when there is no internet, no signal, and no infrastructure left."

---

## Slide 2 — The Illusion of the Perfect Connection
**⏱ Time: 30 seconds (~65 words)**

"Current drone systems have one big problem. They depend on a strong, steady signal to send video back to the ground. In theory, that works perfectly. But in the real world — after a flood, an earthquake, or a building collapse — the signal drops. And when it drops, the drone is blind. The rescue team sees nothing. That failure can cost a life."

---

## Slide 3 — The SUTRA Paradigm Shift: Fail-Soft Design
**⏱ Time: 35 seconds (~75 words)**

"SUTRA solves this with what we call Fail-Soft Design. A normal drone crashes when the signal breaks. SUTRA does not crash — it adapts. When the connection is strong, it streams full video. When it gets weak, it switches to small thumbnails and text updates. When almost no signal exists, it only sends a tiny heartbeat message. And if it is fully cut off, it flies home safely on its own. It never just stops."

---

## Slide 4 — The Sovereign Modular Stack
**⏱ Time: 30 seconds (~65 words)**

"The hardware is built in three clean layers. At the bottom is the Flight Stack — this is the muscle. It runs ArduPilot and handles all the physical flying. In the middle is the Communication layer — this is the nervous system, using ROS 2 to route data. At the top is the AI Runtime — the eyes of the drone, running object detection right on the device, with no cloud needed."

---

## Slide 5 — The Triple-Link Architecture
**⏱ Time: 35 seconds (~75 words)**

"No single wireless technology works in every disaster. So SUTRA uses three at once. First is LoRa — long range, punches through walls, carries heartbeats and emergency commands. Second is Wi-Fi Mesh — faster, good for video clips and large map files. Third is UWB — ultra wide band — used for precise distance measurement between drones in a tight formation. If Wi-Fi fails, SUTRA falls back to LoRa. The mission does not stop."

---

## Slide 6 — The Metadata-First Approach
**⏱ Time: 30 seconds (~65 words)**

"Here is one of the smartest ideas in SUTRA. Instead of sending raw video — which is one megabyte per frame and kills any weak network — SUTRA sends just one hundred bytes. Instead of the image, it sends the conclusion: Human spotted. Confidence: 87 percent. Grid B4. Battery at 62 percent. That tiny packet travels through almost any condition. The network stays alive. The operator gets the key facts instantly."

---

## Slide 7 — SwarmRaft: Surviving Without a Ground Station
**⏱ Time: 35 seconds (~75 words)**

"What happens when the lead drone fails mid-mission? SUTRA uses a system called SwarmRaft. Normally, one drone acts as the leader — it assigns search zones to the others so they do not overlap. If that leader goes down, the surviving drones detect the silence within seconds. They exchange a tiny sixty-byte vote message over LoRa and elect a new leader. The search map is shared again. The mission continues — without any human input."

---

## Slide 8 — The Brain at the Edge: Why Local AI Matters
**⏱ Time: 30 seconds (~65 words)**

"Traditional drones are just flying cameras. They send raw video to a ground station, which processes it. In a disaster, that link fails and everything stops. SUTRA drones have the brain on board. The AI runs on the drone itself. It looks at the camera feed, identifies humans and SOS signs, and sends only the priority coordinates back. Smart drones. Dumb network. That is the design philosophy."

---

## Slide 9 — YOLOv11-N and Coral Edge TPU
**⏱ Time: 25 seconds (~54 words)**

"For the AI, we use YOLOv11-N — the Nano version of the YOLO detector. It is extremely fast, detecting objects in one single pass through the network. It runs on a Google Coral Edge chip, which is designed specifically to run AI math at very low power. The main processor stays free for flying. Battery life is preserved. Detection speed stays high."

---

## Slide 10 — Contextual SAHI
**⏱ Time: 25 seconds (~54 words)**

"Finding a person in a wide aerial image is hard. Standard methods slice the whole image into dozens of small tiles — which drains the battery fast. SUTRA uses Contextual SAHI. Step one: run a fast, low-resolution scan of the full image. Step two: if something suspicious appears, flag only that region. Step three: run the high-power, detailed scan on that small area only. Smart, efficient, and power-aware."

---

## Slide 11 — SUTRA in Action: Flood Rescue Scenario
**⏱ Time: 35 seconds (~76 words)**

"Let me show how all of this works together. A flood has happened. SUTRA drones are launched. Phase one: the swarm maps the area and divides it into search sectors. Phase two: Wi-Fi drops. Drones switch to LoRa heartbeats only. Phase three: a drone spots a survivor on a rooftop. The on-board AI confirms it using Contextual SAHI. Phase four: the drone sends one hundred bytes over LoRa. Phase five: the ground station receives exact GPS coordinates and alerts the rescue team. Mission accomplished — no video needed."

---

## Slide 12 — The SUTRA Promise
**⏱ Time: 20 seconds (~43 words)**

"SUTRA is resilient by design, intelligent at the edge, and built on sovereign, modular hardware ready for Indian RISC-V processors. It is not just a drone. It is an unbreakable web of intelligence — built for the moment when the world goes dark and lives depend on it. Thank you."

---

## ⏱ Timing Summary

| Slide | Topic | Time |
|-------|-------|------|
| 1 | Title — SUTRA | 0:20 |
| 2 | The Illusion of the Perfect Connection | 0:30 |
| 3 | Fail-Soft Design | 0:35 |
| 4 | Sovereign Modular Stack | 0:30 |
| 5 | Triple-Link Architecture | 0:35 |
| 6 | Metadata-First Approach | 0:30 |
| 7 | SwarmRaft | 0:35 |
| 8 | Brain at the Edge / Local AI | 0:30 |
| 9 | YOLOv11-N and Coral Edge TPU | 0:25 |
| 10 | Contextual SAHI | 0:25 |
| 11 | Flood Rescue Scenario | 0:35 |
| 12 | The SUTRA Promise | 0:20 |
| **TOTAL** | | **≈ 4:00** |

> **💡 Delivery tip:** Start moving to the next slide just as you say the last word of each section. Do not wait. Keep momentum. Speak clearly and slightly slower than normal on slides 5, 7, and 11 — those have the most technical detail.
