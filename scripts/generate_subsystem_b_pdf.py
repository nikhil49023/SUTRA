#!/usr/bin/env python3
"""Generate Subsystem B Teaching Document PDF with earthy tones and premium typography."""

import os
from weasyprint import HTML

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(OUTPUT_DIR, "..", "docs", "guides", "Subsystem_B_Teaching_Guide.pdf")

HTML_CONTENT = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-center {
      content: counter(page);
      font-family: sans-serif;
      font-size: 8pt;
      color: #8B5E3C;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: sans-serif;
    font-size: 10pt;
    line-height: 1.55;
    color: #2D2D2D;
    background: #FDFBF7;
  }
  /* COVER */
  .cover {
    page-break-after: always;
    text-align: center;
    background: linear-gradient(160deg, #2C1810 0%, #5C3D2E 40%, #8B5E3C 100%);
    color: #F5EDE0;
    margin: -18mm -16mm -18mm -16mm;
    padding: 55mm 22mm 35mm;
  }
  .cover h1 {
    font-size: 30pt;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 14px;
    color: #FDFBF7;
  }
  .cover h1 em { font-style: italic; color: #E8D5B7; font-weight: 600; }
  .cover-subtitle { font-size: 12pt; font-weight: 300; color: #C4956A; margin-bottom: 32px; }
  .cover-line { width: 70px; height: 2px; background: #C4956A; margin: 0 auto 24px; }
  .cover-meta { font-size: 8.5pt; color: #8B5E3C; line-height: 1.7; }
  .cover-project { font-family: monospace; font-size: 8pt; letter-spacing: 2.5px; text-transform: uppercase; color: #8B5E3C; margin-top: 40px; }
  /* TOC */
  .toc { page-break-after: always; }
  .toc h2 { font-size: 20pt; color: #2C1810; margin-bottom: 6px; margin-top: 0; }
  .toc-line { width: 50px; height: 2px; background: #C4956A; margin-bottom: 20px; }
  .toc-list { list-style: none; counter-reset: toc-counter; }
  .toc-list li {
    counter-increment: toc-counter;
    padding: 7px 0;
    border-bottom: 1px solid #E8D5B7;
  }
  .toc-list li::before {
    content: counter(toc-counter, decimal-leading-zero) "  ";
    font-family: monospace;
    font-size: 8.5pt;
    color: #8B5E3C;
  }
  .toc-part { font-size: 10.5pt; font-weight: 600; color: #2C1810; }
  /* HEADINGS */
  h2 { font-size: 16pt; font-weight: 700; color: #2C1810; margin-top: 20px; margin-bottom: 8px; page-break-after: avoid; }
  h3 { font-size: 12pt; font-weight: 600; color: #5C3D2E; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }
  h4 { font-size: 10.5pt; font-weight: 600; color: #8B5E3C; margin-top: 12px; margin-bottom: 6px; }
  .section-rule { width: 100%; height: 1px; background: linear-gradient(to right, #C4956A, transparent); border: none; margin: 10px 0; }
  /* BLOCKS */
  .analogy-box {
    background: linear-gradient(135deg, #D4E4CF 0%, #E8D5B7 100%);
    border-radius: 6px; padding: 12px 16px; margin: 10px 0;
    border-left: 3px solid #4A6741; page-break-inside: avoid;
  }
  .analogy-box .label { font-family: monospace; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #4A6741; margin-bottom: 4px; }
  .analogy-box p { font-size: 9.5pt; line-height: 1.5; color: #2C1810; margin-bottom: 6px; }
  .analogy-box p:last-child { margin-bottom: 0; }
  .problem-box {
    background: #FFF8F0; border: 1px solid #E8D5B7; border-left: 3px solid #A0522D;
    border-radius: 5px; padding: 10px 14px; margin: 8px 0; page-break-inside: avoid;
  }
  .problem-box .label { font-family: monospace; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #A0522D; margin-bottom: 3px; }
  .problem-box p { font-size: 9.5pt; margin-bottom: 0; }
  .innovation-box {
    background: linear-gradient(135deg, #F0F4EE 0%, #F5EDE0 100%);
    border-radius: 6px; padding: 12px 16px; margin: 10px 0;
    border-left: 3px solid #3D6B8E; page-break-inside: avoid;
  }
  .innovation-box .label { font-family: monospace; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #3D6B8E; margin-bottom: 3px; }
  .innovation-box p { font-size: 9.5pt; margin-bottom: 0; }
  .tech-deep {
    background: #F8F6F2; border: 1px solid #D4D0C8; border-radius: 5px;
    padding: 10px 14px; margin: 10px 0; font-size: 9pt; page-break-inside: avoid;
  }
  .tech-deep .label { font-family: monospace; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #4A4A4A; margin-bottom: 3px; }
  .tech-deep p { margin-bottom: 0; }
  /* TABLES */
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; page-break-inside: avoid; }
  thead th { background: #5C3D2E; color: #F5EDE0; font-weight: 600; text-align: left; padding: 7px 8px; font-size: 8.5pt; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #E8D5B7; }
  tbody tr:nth-child(even) { background: #FAF6EF; }
  /* CALLOUT */
  .callout {
    background: linear-gradient(135deg, #2C1810 0%, #5C3D2E 100%);
    color: #F5EDE0; border-radius: 6px; padding: 18px 22px; margin: 14px 0;
    text-align: center; page-break-inside: avoid;
  }
  .callout .big-text { font-size: 13pt; font-weight: 700; line-height: 1.35; color: #FDFBF7; }
  .callout .sub-text { font-size: 9pt; color: #C4956A; margin-top: 8px; line-height: 1.4; }
  /* PILLAR GRID */
  .pillar-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
  .pillar-card {
    background: #FDFBF7; border: 1px solid #E8D5B7; border-radius: 6px;
    padding: 12px; width: 48%; page-break-inside: avoid;
  }
  .pillar-card .number { font-family: monospace; font-size: 22pt; font-weight: 700; color: #C4956A; line-height: 1; }
  .pillar-card .name { font-size: 11pt; font-weight: 700; color: #2C1810; margin: 3px 0 2px; }
  .pillar-card .analogy-label { font-size: 8pt; color: #8B5E3C; font-style: italic; }
  .pillar-card .desc { font-size: 8.5pt; color: #4A4A4A; margin-top: 4px; line-height: 1.4; }
  /* ARCH */
  .arch-diagram {
    background: #F8F6F2; border: 1px solid #D4D0C8; border-radius: 6px;
    padding: 14px; margin: 12px 0; font-family: monospace; font-size: 7pt;
    line-height: 1.45; white-space: pre; page-break-inside: avoid;
  }
  .text-green { color: #4A6741; font-weight: 600; }
  .text-rust { color: #A0522D; font-weight: 600; }
  .page-break { page-break-before: always; }
  p { margin-bottom: 6px; }
  strong { color: #2C1810; }
  code { font-family: monospace; background: #F0ECE4; padding: 1px 3px; border-radius: 2px; font-size: 8.5pt; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <h1>Subsystem B<br><em>The Invisible Nervous System<br>of a Drone Swarm</em></h1>
  <div class="cover-subtitle">A Complete Guide to Swarm Communications,<br>Neural Compression &amp; Digital Twin Simulation</div>
  <div class="cover-line"></div>
  <div class="cover-meta">
    <strong>Project SUTRA</strong> &mdash; Swarm Unified Tactical Reconnaissance Architecture<br>
    Led by Nikhil, Tech Architect &amp; Subsystem B Lead
  </div>
  <div class="cover-project">Swarm Unified Tactical Reconnaissance Architecture</div>
</div>

<!-- TOC -->
<div class="toc">
  <h2>Contents</h2>
  <div class="toc-line"></div>
  <ol class="toc-list">
    <li><span class="toc-part">The One-Sentence Version</span></li>
    <li><span class="toc-part">The Problem We Solve</span></li>
    <li><span class="toc-part">Pillar 1 &mdash; The Mesh Network</span></li>
    <li><span class="toc-part">Pillar 2 &mdash; SwarmRaft Consensus</span></li>
    <li><span class="toc-part">Pillar 3 &mdash; Deep JSCC Neural Radio</span></li>
    <li><span class="toc-part">Pillar 4 &mdash; Binary Protocol</span></li>
    <li><span class="toc-part">Pillar 5 &mdash; Tactical Hardening</span></li>
    <li><span class="toc-part">The Complete Architecture</span></li>
    <li><span class="toc-part">The Digital Twin</span></li>
    <li><span class="toc-part">Innovation &amp; Uniqueness (SCRIR)</span></li>
    <li><span class="toc-part">Proof It Works &mdash; Evidence</span></li>
    <li><span class="toc-part">Honest Reflections</span></li>
    <li><span class="toc-part">The Philosophy</span></li>
  </ol>
</div>

<!-- PART 1 -->
<h2>01 &mdash; The One-Sentence Version</h2>
<hr class="section-rule">
<div class="callout">
  <div class="big-text">Subsystem B is the invisible nervous system that lets five drones think as one mind, talk through walls, and never go silent &mdash; even when the enemy jams their signals.</div>
  <div class="sub-text">Think of it as the automatic gear + power steering + ABS brakes of the drone swarm.<br>You never see it working, but without it, the car crashes.</div>
</div>

<!-- PART 2 -->
<h2>02 &mdash; The Problem We Solve</h2>
<hr class="section-rule">
<div class="analogy-box">
  <div class="label">The Chai Stall Analogy</div>
  <p>Imagine you're sitting at a chai stall in Kedarnath with four friends. You're all looking for a missing child in a flooded village nearby. You can't use phones (the tower is down). You can't see each other (the fog is thick). You can't shout (the river is roaring). <strong>What would you need?</strong></p>
  <p>You'd need a way to whisper to the nearest friend, who whispers to the next &mdash; like Chinese Whispers, but accurate. A way to agree on who leads the search without 20 minutes of arguing. A way to send a drawing of the child's last seen location even if the message gets garbled halfway. <strong>Subsystem B is exactly these things, built for drones instead of humans.</strong></p>
</div>
<h3>The Four Failures of Traditional Drone Systems</h3>
<div class="problem-box">
  <div class="label">Problem 1 &mdash; The Radio Blackout</div>
  <p>Buildings, terrain, and debris block signals. One drone flies behind a hill and goes silent. The team loses contact. In a Himalayan disaster zone, this means losing a survivor's location.</p>
</div>
<div class="problem-box">
  <div class="label">Problem 2 &mdash; The Single Point of Failure</div>
  <p>One drone is the "leader" that coordinates everything. If that drone crashes, the entire swarm becomes five confused, independent robots flying in circles. Like a cricket team losing its captain mid-over with no vice-captain designated.</p>
</div>
<div class="problem-box">
  <div class="label">Problem 3 &mdash; The Bandwidth Wall</div>
  <p>The drones see survivors with thermal cameras, but the video feed is too large to transmit through the tiny radios on board. By the time the image arrives, the survivor has moved &mdash; or the data arrived corrupted and unreadable.</p>
</div>
<div class="problem-box">
  <div class="label">Problem 4 &mdash; The Digital Cliff</div>
  <p>Traditional video compression works fine until the signal gets weak. Then it doesn't "get a little worse" &mdash; it freezes completely. At 15dB signal quality, you see a beautiful thermal image. At 7dB, the image turns to snow. The operator sees nothing.</p>
</div>
<p><strong>Subsystem B solves all four of these problems simultaneously.</strong></p>

<!-- PILLARS OVERVIEW -->
<h2>03&ndash;07 &mdash; The Five Pillars</h2>
<hr class="section-rule">
<div class="pillar-grid">
  <div class="pillar-card">
    <div class="number">01</div>
    <div class="name">Mesh Network</div>
    <div class="analogy-label">"The Web"</div>
    <div class="desc">Three-layer radio stack (Wi-Fi + ESP-NOW + LoRa) that lets drones communicate across 5km. Auto-switches like choosing auto/bike/train in Hyderabad.</div>
  </div>
  <div class="pillar-card">
    <div class="number">02</div>
    <div class="name">SwarmRaft Consensus</div>
    <div class="analogy-label">"The Vote"</div>
    <div class="desc">Democracy without a president. Leader election in under 50ms with Pre-Vote and BALLAST adaptive timeouts. Faster than a cricket umpire's decision.</div>
  </div>
  <div class="pillar-card">
    <div class="number">03</div>
    <div class="name">Deep JSCC Neural Radio</div>
    <div class="analogy-label">"The Brain"</div>
    <div class="desc">Neural network that compresses AND encodes images for noisy channels simultaneously. 96.8% compression. Zero digital cliff. Like Mumbai dabbawalas.</div>
  </div>
  <div class="pillar-card">
    <div class="number">04</div>
    <div class="name">Binary Protocol</div>
    <div class="analogy-label">"The Code"</div>
    <div class="desc">9-byte header with CRC integrity. 95% less overhead than JSON. Like cricket hand signals instead of full sentences.</div>
  </div>
</div>
<div class="pillar-card" style="width: 48%; margin-bottom: 14px;">
  <div class="number">05</div>
  <div class="name">Tactical Hardening</div>
  <div class="analogy-label">"The Armor"</div>
  <div class="desc">AES-128-GCM encryption, TDMA scheduling, delta compression, dynamic quorum, anti-entropy gossip. The Humvee of drone communication.</div>
</div>

<!-- PILLAR 1 -->
<h2 class="page-break">Pillar 1 &mdash; The Mesh Network</h2>
<hr class="section-rule">
<h3>The Auto-Rickshaw Analogy</h3>
<div class="analogy-box">
  <div class="label">Indian Lifestyle Parallel</div>
  <p>Think of the three radio layers like choosing transport in Hyderabad. <strong>Auto-rickshaw</strong> (802.11s Wi-Fi): fast, 54 Mbps, up to 75m &mdash; like taking an auto from Jubilee Hills to Banjara Hills. <strong>Bike</strong> (ESP-NOW): medium, 10 Mbps, 75&ndash;120m &mdash; like riding from Gachibowli to HITEC City. <strong>Train</strong> (LoRa): slow but reaches far, 250 Kbps, up to 5km &mdash; like the Hyderabad&ndash;Chennai Express. <strong>The magic: the drone automatically switches between these, like how you choose transport based on where you need to go.</strong></p>
</div>
<div class="tech-deep">
  <div class="label">Technical Truth</div>
  <p>The selection algorithm runs every millisecond: Wi-Fi when distance &lt; 70m and SNR &ge; 15dB. ESP-NOW for 75&ndash;120m at SNR &ge; 8dB. LoRa for anything up to 2km. The Free Space Path Loss formula <code>Loss = 20&times;log&#8321;&#8320;(d) + 20&times;log&#8321;&#8320;(f) + 32.44</code> determines signal degradation &mdash; like how a flashlight dims with distance.</p>
</div>
<div class="innovation-box">
  <div class="label">Innovation</div>
  <p><strong>Status Quo:</strong> Most drones use ONE radio. <strong>Challenge:</strong> Wi-Fi is fast but short-range; LoRa is long-range but slow. <strong>Revolution:</strong> Three radios simultaneously with automatic switching. <strong>Impact:</strong> 5km coverage across Himalayan terrain. <strong>Resilience:</strong> Jam 2.4 GHz &rarr; falls back to LoRa 433 MHz automatically.</p>
</div>

<!-- PILLAR 2 -->
<h2>Pillar 2 &mdash; SwarmRaft Consensus</h2>
<hr class="section-rule">
<h3>The Cricket Captain Analogy</h3>
<div class="analogy-box">
  <div class="label">Indian Cricket Parallel</div>
  <p>Imagine Virat Kohli (the captain/leader drone) gets injured mid-over. The team (swarm) needs a new captain IMMEDIATELY &mdash; the next ball is coming. <strong>Traditional approach:</strong> "Everyone stop playing! Let's call a team meeting!" &mdash; 3 overs wasted. <strong>Subsystem B approach:</strong> "Rohit Sharma quietly asks Bumrah and Jadeja: 'If I take charge, do you support me?' They nod. Rohit takes the cap. Play continues without a single ball missed."</p>
</div>
<h3>The Pre-Vote Innovation</h3>
<p>Before starting a formal election, the candidate drone first checks if it has enough support &mdash; like a politician gauging support before filing nomination papers. This prevents the "thundering herd" problem where all drones try to become leader simultaneously.</p>
<div class="tech-deep">
  <div class="label">The BALLAST Formula</div>
  <p>The election timeout adapts: <code>timeout = max(0.15, min(0.6, 2.5 &times; RTT/1000 + 0.15)) + jitter</code>. Like adjusting braking distance based on road conditions &mdash; more rain means more distance needed.</p>
</div>
<table>
  <thead><tr><th>State</th><th>Description</th><th>Analogy</th></tr></thead>
  <tbody>
    <tr><td>FOLLOWER</td><td>Normal state, receives heartbeats</td><td>Team player following the captain</td></tr>
    <tr><td>PRE_CANDIDATE</td><td>Gauging support before election</td><td>Rohit asking Bumrah quietly</td></tr>
    <tr><td>CANDIDATE</td><td>Formal election, requesting votes</td><td>Filing nomination papers</td></tr>
    <tr><td>LEADER</td><td>Coordinates the swarm</td><td>Captain leading from the front</td></tr>
  </tbody>
</table>

<!-- PILLAR 3 -->
<h2>Pillar 3 &mdash; Deep JSCC Neural Radio</h2>
<hr class="section-rule">
<h3>The All India Radio Analogy</h3>
<div class="analogy-box">
  <div class="label">AIR Monsoon Season Parallel</div>
  <p>Remember All India Radio during monsoon season? The signal crackles, static fills the room, the newsreader's voice fades in and out. Now imagine if AIR had a special encoding &mdash; the newsreader speaks in a code DESIGNED for static. Even if half the words get garbled, you reconstruct the full news because the code was BUILT for noise. <strong>That is Deep JSCC.</strong></p>
</div>
<h3>The Dabbawala Analogy</h3>
<div class="analogy-box">
  <div class="label">Mumbai Dabbawala Parallel</div>
  <p><strong>Traditional method (H.264):</strong> Pack the lunch box carefully. Add bubble wrap. Send through Mumbai locals. If train is too crowded &rarr; lunch box CRUSHED (Digital Cliff). <strong>Dabbawala method (Deep JSCC):</strong> Pack lunch AND design the box to survive the journey &mdash; ONE step, not two. Even if box gets bumped &rarr; food is still edible. The key insight: packing AND wrapping are ONE process, designed together to survive Mumbai's chaos.</p>
</div>
<table>
  <thead><tr><th>Signal (SNR)</th><th>Traditional H.264</th><th>Deep JSCC (SUTRA)</th></tr></thead>
  <tbody>
    <tr><td>20 dB (great)</td><td>Crystal clear</td><td>Crystal clear</td></tr>
    <tr><td>10 dB (weak)</td><td>Blocking artifacts</td><td>Clear, slight softening</td></tr>
    <tr><td>5 dB (poor)</td><td><strong>Frozen / black</strong></td><td>Blurry but visible</td></tr>
    <tr><td>0 dB (terrible)</td><td class="text-rust">Complete snow</td><td class="text-green">Still visible!</td></tr>
    <tr><td>-5 dB (worst)</td><td class="text-rust">Impossible</td><td class="text-green">Still recognizable</td></tr>
  </tbody>
</table>
<div class="tech-deep">
  <div class="label">Architecture</div>
  <p><strong>Encoder:</strong> 512-dim &rarr; Linear(512&rarr;128) + BatchNorm + ReLU &rarr; Linear(128&rarr;16) + Tanh &rarr; 16-dim (96.8% compression). <strong>Channel:</strong> noisy = encoded + noise &times; (1/10^(SNR/20)). <strong>Decoder:</strong> 16-dim &rarr; Linear(16&rarr;128) &rarr; Linear(128&rarr;512) &rarr; Reconstructed. <strong>Channel-Blind (CBJSCC):</strong> Swin-Transformer attention self-adapts WITHOUT SNR feedback.</p>
</div>

<!-- PILLAR 4 -->
<h2>Pillar 4 &mdash; Binary Protocol</h2>
<hr class="section-rule">
<h3>The WhatsApp vs Walkie-Talkie Analogy</h3>
<div class="analogy-box">
  <div class="label">Messaging Parallel</div>
  <p>Imagine sending: <code>{"type":"telemetry","lat":20.59,"lon":78.96}</code> &mdash; 52 characters, but only 25 are useful. The rest is labels and formatting. The binary protocol is like cricket hand signals: "Two fingers" = "run two." Not "I suggest we run approximately two runs between the wickets."</p>
</div>
<table>
  <thead><tr><th>Format</th><th>Header Size</th><th>Overhead</th><th>Analogy</th></tr></thead>
  <tbody>
    <tr><td>JSON</td><td>50&ndash;200 bytes</td><td>~85%</td><td>Full sentence for "run two"</td></tr>
    <tr><td>Binary Protocol</td><td>9 bytes</td><td>~15%</td><td>Hand signal for "run two"</td></tr>
  </tbody>
</table>
<div class="tech-deep">
  <div class="label">Packet Format</div>
  <p><code>[MAGIC "SU" 2B][MSG_TYPE 1B][SENDER 1B][RECV 1B][SEQ 2B][LEN 2B][PAYLOAD var][CRC 2B]</code><br>9-byte header + 2-byte CRC. 95% less overhead than JSON. CRC-32 detects corruption; corrupted packets are silently discarded.</p>
</div>

<!-- PILLAR 5 -->
<h2>Pillar 5 &mdash; Tactical Hardening</h2>
<hr class="section-rule">
<h3>The Indian Wedding Analogy</h3>
<div class="analogy-box">
  <div class="label">Five Modules as Wedding Organization</div>
  <p><strong>1. Delta Compression = "Don't repeat the same toast":</strong> Only speak if you have something NEW to say. Drones only send position updates when they've actually moved. <strong>2. TDMA = "The mic passes in order":</strong> At a sangeet, if everyone grabs the mic, it's chaos. Each drone gets a 10ms time slot. <strong>3. AES-128-GCM = "Sealed envelope":</strong> You don't send a wedding invitation as a postcard. Military-grade encryption, key changes every message. <strong>4. Dynamic Quorum = "Adjust the vote if guests leave":</strong> Reduces required votes when drones can't reach each other. <strong>5. Anti-Entropy Gossip = "Compare notes after the power cut":</strong> Separated drones reconcile state logs automatically.</p>
</div>
<table>
  <thead><tr><th>Module</th><th>What It Does</th><th>Wedding Analogy</th></tr></thead>
  <tbody>
    <tr><td>Delta Compression</td><td>Skip unchanged positions</td><td>Don't repeat the same toast</td></tr>
    <tr><td>TDMA Scheduler</td><td>10ms time slots</td><td>Mic passes in order</td></tr>
    <tr><td>AES-128-GCM</td><td>Military encryption</td><td>Sealed envelope</td></tr>
    <tr><td>Dynamic Quorum</td><td>Flexible elections</td><td>Adjust vote count</td></tr>
    <tr><td>Anti-Entropy</td><td>Post-partition sync</td><td>Compare notes after power cut</td></tr>
  </tbody>
</table>

<!-- ARCHITECTURE -->
<h2 class="page-break">08 &mdash; The Complete Architecture</h2>
<hr class="section-rule">
<div class="arch-diagram">
┌───────────────────────────────────────────────────────────────────┐
│                        THE SUTRA SWARM                           │
│                                                                   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ UAV Alpha│  │ UAV Beta │  │UAV Gamma │  │UAV Delta │       │
│   │ (Leader) │  │ (Relay)  │  │(Percept.)│  │ (Scout)  │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        │              │              │              │              │
│   ┌────▼──────────────▼──────────────▼──────────────▼────┐       │
│   │            THREE-LAYER MESH NETWORK                   │       │
│   │  Layer 1: 802.11s Wi-Fi  (54 Mbps,  &lt; 75m)         │       │
│   │  Layer 2: ESP-NOW        (10 Mbps,  75-120m)        │       │
│   │  Layer 3: LoRa SX1278    (250 Kbps, 120m-5km)       │       │
│   └─────────────────────────┬───────────────────────────┘       │
│   ┌─────────────────────────▼───────────────────────────┐       │
│   │            SWARMRAFT CONSENSUS                       │       │
│   │  Pre-Vote → Candidate → Leader | &lt; 50ms failover   │       │
│   │  Dynamic Quorum + BALLAST Adaptive Timeouts          │       │
│   └─────────────────────────┬───────────────────────────┘       │
│   ┌─────────────────────────▼───────────────────────────┐       │
│   │            DEEP JSCC NEURAL TRANSCEIVER              │       │
│   │  512-dim → 16-dim (96.8% compression)               │       │
│   │  Channel-Blind via Swin-Transformer Attention        │       │
│   │  PSNR ≥ 30 dB at 0 dB SNR (zero digital cliff)     │       │
│   └─────────────────────────┬───────────────────────────┘       │
│   ┌─────────────────────────▼───────────────────────────┐       │
│   │  BINARY PROTOCOL + HARDENING                         │       │
│   │  9B header + CRC | AES-128-GCM | TDMA | Delta       │       │
│   └─────────────────────────┬───────────────────────────┘       │
│   ┌─────────────────────────▼───────────────────────────┐       │
│   │  GCS GATEWAY BRIDGE (WebSocket :9090)                │       │
│   │  10Hz telemetry | RTL + Waypoint commands            │       │
│   └─────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘</div>

<!-- DIGITAL TWIN -->
<h2>09 &mdash; The Digital Twin</h2>
<hr class="section-rule">
<div class="analogy-box">
  <div class="label">Bollywood Table Read Analogy</div>
  <p>Before a Bollywood film is shot, there's a "table read" &mdash; actors sit around a table and read through the script. No costumes, no sets, no cameras. They just talk through scenes to find problems before the expensive shoot. <strong>Subsystem B's Gazebo simulation is the "table read" for drone disaster response.</strong></p>
</div>
<p>The Gazebo Sim 8 digital twin recreates the Kedarnath disaster zone in 3D with PBR materials, realistic sensor models (thermal, LiDAR, mmWave radar), and 500 Hz physics. The entire communication stack can be tested against flooded villages and Himalayan terrain before any drone leaves the ground.</p>

<!-- SCRIR -->
<h2>10 &mdash; Innovation &amp; Uniqueness (SCRIR)</h2>
<hr class="section-rule">
<h3>Innovation 1: Triple-Band Radio Stack</h3>
<div class="innovation-box">
  <div class="label">SCRIR Framework</div>
  <p><strong>S &mdash; Status Quo:</strong> Most drones use ONE radio. <strong>C &mdash; Challenge:</strong> Wi-Fi is fast but short-range; LoRa is long-range but slow. <strong>R &mdash; Revolution:</strong> Three radios simultaneously with automatic switching. <strong>I &mdash; Impact:</strong> 5km coverage across Himalayan terrain. <strong>R &mdash; Resilience:</strong> Jam one band &rarr; fall back to another automatically.</p>
</div>
<h3>Innovation 2: Channel-Blind Neural Compression</h3>
<div class="innovation-box">
  <div class="label">SCRIR Framework</div>
  <p><strong>S:</strong> ALL existing JSCC needs SNR feedback. <strong>C:</strong> SNR changes every second in a disaster. <strong>R:</strong> Swin-Transformer attention self-adapts from data alone. <strong>I:</strong> Works even if feedback link is broken. <strong>R:</strong> Zero digital cliff &mdash; graceful degradation at ANY SNR.</p>
</div>
<h3>Innovation 3: Pre-Vote Raft for Swarms</h3>
<div class="innovation-box">
  <div class="label">SCRIR Framework</div>
  <p><strong>S:</strong> Standard Raft for stable data centers. <strong>C:</strong> Drone swarms have high mobility and frequent disconnections. <strong>R:</strong> Pre-Vote + BALLAST. <strong>I:</strong> &lt; 50ms failover, zero unnecessary elections. <strong>R:</strong> Survives 50 consecutive leader crashes.</p>
</div>

<!-- EVIDENCE -->
<h2>11 &mdash; Proof It Works</h2>
<hr class="section-rule">
<table>
  <thead><tr><th>Test Category</th><th>Result</th><th>What It Proves</th></tr></thead>
  <tbody>
    <tr><td>Mesh networking (FSPL, SNR)</td><td>8/8 PASSED</td><td>Drones find optimal routes</td></tr>
    <tr><td>10-UAV swarm scale</td><td>&lt; 100ms</td><td>Scales to 10 drones</td></tr>
    <tr><td>RF jamming resistance</td><td>SNR 0&ndash;20dB</td><td>Survives interference</td></tr>
    <tr><td>Leader crash failover</td><td>&lt; 50ms</td><td>Reorganizes instantly</td></tr>
    <tr><td>Deep JSCC compression</td><td>96.8%</td><td>Fits images in tiny radios</td></tr>
    <tr><td>PSNR at 0 dB SNR</td><td>&ge; 30 dB</td><td>Visible in worst conditions</td></tr>
    <tr><td>100-node mesh stress</td><td>&lt; 1.5s</td><td>Industrial scale</td></tr>
    <tr><td>Binary protocol CRC</td><td>CORRUPTION REJECTED</td><td>No bad data reaches operators</td></tr>
    <tr><td>50-leader cascading crash</td><td>&lt; 10ms/election</td><td>Catastrophic failure survival</td></tr>
    <tr><td>AES-128-GCM encryption</td><td>VERIFIED</td><td>Military-grade security</td></tr>
  </tbody>
</table>
<h3>Key Performance Numbers</h3>
<table>
  <thead><tr><th>Metric</th><th>Target</th><th>Achieved</th></tr></thead>
  <tbody>
    <tr><td>Message Latency</td><td>&lt; 8ms</td><td>&lt; 12ms</td></tr>
    <tr><td>Packet Loss</td><td>&lt; 2%</td><td>Achieved (SNR &ge; 15dB)</td></tr>
    <tr><td>Leader Failover</td><td>&lt; 500ms</td><td>&lt; 50ms (10x faster)</td></tr>
    <tr><td>JSCC Compression</td><td>N/A</td><td>96.8%</td></tr>
    <tr><td>Digital Cliff</td><td>N/A</td><td>ZERO</td></tr>
  </tbody>
</table>

<!-- REFLECTIONS -->
<h2>12 &mdash; Honest Reflections</h2>
<hr class="section-rule">
<h3>Tradeoffs We Made</h3>
<div class="problem-box">
  <div class="label">Tradeoff 1: Compression vs Detail</div>
  <p>96.8% compression loses some fine detail. For search &amp; rescue: acceptable &mdash; we need heat signatures, not license plates. Like using a summary of a 500-page novel: you lose the poetry, but you get the plot.</p>
</div>
<div class="problem-box">
  <div class="label">Tradeoff 2: LoRa Bandwidth Ceiling</div>
  <p>250 Kbps is enough for compressed telemetry, not raw video. That's why the three-layer stack exists &mdash; LoRa is the backup, not the primary. Like using a cycle to reach the station, then the train for the long journey.</p>
</div>
<div class="problem-box">
  <div class="label">Tradeoff 3: Simulation vs Reality</div>
  <p>Gazebo is excellent for testing logic, but real RF propagation is messier. Field testing remains essential. Like practicing cricket in the nets vs a real match &mdash; nets are essential but can't replicate match pressure.</p>
</div>
<h3>Failures That Led to Innovation</h3>
<p><strong>The SNR Estimation Failure:</strong> Original JSCC kept failing when SNR estimate was wrong. Instead of fixing the estimator, we eliminated the need for estimation entirely &rarr; Channel-Blind JSCC.</p>
<p><strong>The Thundering Herd:</strong> Standard Raft caused ALL drones to try becoming leader simultaneously. &rarr; Added Pre-Vote.</p>
<p><strong>The JSON Waste:</strong> JSON wasted 85% of LoRa bandwidth on curly braces. &rarr; Created the binary protocol.</p>

<!-- PHILOSOPHY -->
<h2 class="page-break">13 &mdash; The Philosophy</h2>
<hr class="section-rule">
<div class="callout">
  <div class="big-text">"In a disaster, the communication system must be the LAST thing to fail, not the FIRST."</div>
  <div class="sub-text">
    Every design decision follows from this:<br><br>
    Three radio layers &rarr; no single jammer can silence the swarm<br>
    Raft consensus &rarr; no single drone failure can paralyze the swarm<br>
    Deep JSCC &rarr; no amount of noise can erase the image of a survivor<br>
    Binary protocol &rarr; no bandwidth is wasted on unnecessary overhead<br>
    Tactical hardening &rarr; no edge case is left unhandled<br><br>
    This is not just a communication system.<br>
    This is the reason a drone swarm can save a life when everything else has failed.
  </div>
</div>

<div style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #E8D5B7; text-align: center; font-size: 8pt; color: #8B5E3C; line-height: 1.6;">
  <strong>Subsystem B Teaching Guide</strong> &mdash; Version 2.0 Indian Context Edition<br>
  Project SUTRA &bull; Swarm Unified Tactical Reconnaissance Architecture<br>
  Led by Nikhil, Tech Architect &amp; Subsystem B Lead
</div>

</body>
</html>"""

print("Generating Subsystem B Teaching Guide PDF...")
print(f"Output: {PDF_PATH}")

html = HTML(string=HTML_CONTENT)
html.write_pdf(PDF_PATH)

file_size = os.path.getsize(PDF_PATH)
print(f"PDF generated successfully!")
print(f"Size: {file_size / 1024:.1f} KB")
print(f"Location: {PDF_PATH}")
