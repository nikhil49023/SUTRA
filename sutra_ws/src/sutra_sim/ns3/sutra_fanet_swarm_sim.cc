/* =============================================================================
 * SUTRA Subsystem B — NS-3 802.11s FANET Swarm Simulator (Gate G2 Evidence Tool)
 * -----------------------------------------------------------------------------
 * Simulates an ad-hoc 802.11s wireless mesh of UAV swarm nodes (FANET) with:
 *   - 3D mobility at 30 m AGL (random waypoint / grid)
 *   - NLOS RF path loss: Log-Distance (urban exponent) + Rayleigh fading
 *     (Nakagami m=1) via a CompositePropagationLossModel
 *   - 20% node churn (UAVs leave formation mid-mission -> link loss)
 *   - UDP CBR traffic between random node pairs; per-flow PDR / delay / jitter
 *   - NetAnim trace output: sutra_swarm_trace.xml
 *
 * Gate G2 acceptance: 802.11s Mesh PDR >= 95% under 20% node churn & NLOS loss.
 *
 * Build:  g++ -std=c++17 sutra_fanet_swarm_sim.cc -o sutra_fanet_swarm_sim \
 *         $(ns3-config --libs ...)  (see build_fanet_sim.sh)
 * Run:    ./sutra_fanet_swarm_sim --nNodes=10 --churnFraction=0.2
 * ===========================================================================*/

#include <cstring>  // must precede ns3 headers (GCC 13 memchr/:: memcpy fix)

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/mobility-module.h"
#include "ns3/wifi-module.h"
#include "ns3/mesh-module.h"
#include "ns3/internet-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-module.h"
#include "ns3/propagation-module.h"

#include <algorithm>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("SutraFanetSwarmSim");

namespace {

struct FlowStats {
  double pdr = 0.0;          // packet delivery ratio [0..1]
  double avgDelayMs = 0.0;   // mean end-to-end delay [ms]
  double throughputKbps = 0.0;
};

}  // namespace

int main(int argc, char** argv) {
  uint32_t nNodes = 10;          // swarm size (UAVs)
  double durationS = 120.0;      // mission duration [s]
  double churnFraction = 0.2;    // fraction of nodes that leave formation
  double churnTimeS = 60.0;      // churn event time [s]
  double packetIntervalMs = 50.0; // CBR inter-packet interval
  uint32_t packetSize = 512;     // payload bytes
  uint32_t nFlows = 5;           // concurrent UDP flows
  double pathLossExponent = 3.5; // urban NLOS path-loss exponent
  double simSeed = 42;

  CommandLine cmd;
  cmd.AddValue("nNodes", "Number of UAV mesh nodes", nNodes);
  cmd.AddValue("duration", "Simulation duration (s)", durationS);
  cmd.AddValue("churnFraction", "Fraction of nodes leaving formation", churnFraction);
  cmd.AddValue("churnTime", "Time of churn event (s)", churnTimeS);
  cmd.AddValue("intervalMs", "CBR inter-packet interval (ms)", packetIntervalMs);
  cmd.AddValue("packetSize", "UDP payload bytes", packetSize);
  cmd.AddValue("nFlows", "Number of concurrent flows", nFlows);
  cmd.AddValue("pathLossExponent", "Log-distance path-loss exponent (NLOS)", pathLossExponent);
  cmd.AddValue("seed", "Random seed", simSeed);
  cmd.Parse(argc, argv);

  RngSeedManager::SetSeed(static_cast<uint32_t>(simSeed));

  // -------------------------------------------------------------------------
  // 1. Nodes + 3D UAV mobility (30 m AGL)
  // -------------------------------------------------------------------------
  NodeContainer nodes;
  nodes.Create(nNodes);

  MobilityHelper mobility;
  mobility.SetMobilityModel("ns3::RandomWaypointMobilityModel",
                            "Speed", StringValue("ns3::UniformRandomVariable[Min=2.0|Max=6.0]"),
                            "Pause", StringValue("ns3::ConstantRandomVariable[Constant=3.0]"));
  mobility.SetPositionAllocator("ns3::GridPositionAllocator",
                                "MinX", DoubleValue(0.0), "MinY", DoubleValue(0.0),
                                "DeltaX", DoubleValue(40.0), "DeltaY", DoubleValue(40.0),
                                "GridWidth", UintegerValue(5), "LayoutType", StringValue("RowFirst"));
  mobility.Install(nodes);

  // Lock UAVs at 30 m AGL (FANET cruise altitude) -> manual altitude placement
  for (uint32_t i = 0; i < nodes.GetN(); ++i) {
    Vector pos = nodes.Get(i)->GetObject<MobilityModel>()->GetPosition();
    nodes.Get(i)->GetObject<MobilityModel>()->SetPosition(Vector(pos.x, pos.y, 30.0));
  }

  // -------------------------------------------------------------------------
  // 2. RF channel: NLOS path loss (Log-Distance) + Rayleigh fading (Nakagami m=1)
  // -------------------------------------------------------------------------
  YansWifiChannelHelper channel = YansWifiChannelHelper::Default();
  channel.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
  // Composite: Log-Distance (NLOS exponent) THEN Nakagami m=1 (Rayleigh)
  std::stringstream lossList;
  lossList << "ns3::LogDistancePropagationLossModel(Exponent=" << pathLossExponent
           << "|ReferenceLoss=46.67)";
  lossList << "|ns3::NakagamiPropagationLossModel(m0=1.0|m1=1.0|m2=1.0)";  // Rayleigh
  channel.AddPropagationLoss("ns3::CompositePropagationLossModel",
                             "LossModelList", StringValue(lossList.str()));

  // -------------------------------------------------------------------------
  // 3. 802.11s mesh stack
  // -------------------------------------------------------------------------
  YansWifiPhyHelper phy;
  phy.SetChannel(channel.Create());
  phy.Set("ChannelSettings", StringValue("{0, 0, BAND_2_4GHZ}"));

  WifiMacHelper mac;
  MeshHelper mesh = MeshHelper::Default();
  mesh.SetStackInstaller("ns3::Dot11sStack");
  mesh.SetMacType("AdhocWifiMac");
  mesh.SetNumberOfInterfaces(1);
  mesh.SetRemoteStationManager("ns3::ConstantRateWifiManager", "DataMode",
                               StringValue("OfdmRate6Mbps"));

  NetDeviceContainer meshDevices = mesh.Install(phy, nodes);

  // -------------------------------------------------------------------------
  // 4a. IP addressing (mesh points need IP for UDP flows)
  // -------------------------------------------------------------------------
  Ipv4AddressHelper ipv4;
  ipv4.SetBase("10.1.1.0", "255.255.255.0");
  Ipv4InterfaceContainer interfaces = ipv4.Assign(meshDevices);

  // -------------------------------------------------------------------------
  // 4b. UDP CBR flows between random pairs (survivor telemetry stream)
  // -------------------------------------------------------------------------
  std::mt19937 rng(static_cast<uint32_t>(simSeed));
  std::uniform_int_distribution<uint32_t> pickNode(0, nNodes - 1);

  uint16_t basePort = 9000;
  for (uint32_t f = 0; f < nFlows; ++f) {
    uint32_t src = pickNode(rng);
    uint32_t dst = pickNode(rng);
    if (src == dst) { dst = (dst + 1) % nNodes; }

    uint16_t port = basePort + static_cast<uint16_t>(f);
    // Receiver
    PacketSinkHelper sink("ns3::UdpSocketFactory",
                          InetSocketAddress(Ipv4Address::GetAny(), port));
    ApplicationContainer sinkApp = sink.Install(nodes.Get(dst));
    sinkApp.Start(Seconds(1.0));
    sinkApp.Stop(Seconds(durationS));

    // Sender
    OnOffHelper onoff("ns3::UdpSocketFactory",
                      InetSocketAddress(interfaces.GetAddress(dst), port));
    onoff.SetConstantRate(DataRate((8000.0 * packetSize) / packetIntervalMs));
    onoff.SetAttribute("PacketSize", UintegerValue(packetSize));
    ApplicationContainer srcApp = onoff.Install(nodes.Get(src));
    srcApp.Start(Seconds(2.0));
    srcApp.Stop(Seconds(durationS));
  }

  // -------------------------------------------------------------------------
  // 5. Node churn: churnFraction of UAVs leave formation (teleport away)
  // -------------------------------------------------------------------------
  uint32_t nChurn = static_cast<uint32_t>(std::floor(nNodes * churnFraction));
  std::vector<uint32_t> churnIndexes;
  for (uint32_t i = 0; i < nChurn; ++i) {
    churnIndexes.push_back((i * 7 + 3) % nNodes);  // deterministic spread
  }
  for (uint32_t idx : churnIndexes) {
    uint32_t nodeIdx = idx;
    Simulator::Schedule(Seconds(churnTimeS), [nodeIdx]() {
      Ptr<MobilityModel> mm = NodeList::GetNode(nodeIdx)->GetObject<MobilityModel>();
      mm->SetPosition(Vector(1e6, 1e6, 30.0));  // out of RF range
      NS_LOG_UNCOND("SUTRA-FANET: churn event -> node " << nodeIdx
                     << " left the formation (20% churn sim)");
    });
  }

  // -------------------------------------------------------------------------
  // 6. Flow monitor for measured PDR / delay / throughput
  // -------------------------------------------------------------------------
  FlowMonitorHelper flowMonitor;
  Ptr<FlowMonitor> monitor = flowMonitor.InstallAll();

  // -------------------------------------------------------------------------
  // 8. NetAnim trace output
  // -------------------------------------------------------------------------
  AnimationInterface anim("sutra_swarm_trace.xml");
  for (uint32_t i = 0; i < nNodes; ++i) {
    anim.UpdateNodeDescription(nodes.Get(i), "UAV_" + std::to_string(i));
    anim.UpdateNodeColor(nodes.Get(i), 0, 120, 255);
  }

  // -------------------------------------------------------------------------
  // 9. Run + report real measured stats
  // -------------------------------------------------------------------------
  NS_LOG_UNCOND("SUTRA-FANET: 802.11s mesh sim | nodes=" << nNodes
                << " flows=" << nFlows << " churn=" << nChurn
                << " NLOS-exponent=" << pathLossExponent
                << " Rayleigh(m=1) | duration=" << durationS << "s");

  Simulator::Stop(Seconds(durationS));
  Simulator::Run();

  std::vector<FlowStats> perFlow;
  double totalRx = 0.0, totalTx = 0.0;
  double delaySum = 0.0, delayCount = 0.0;

  monitor->CheckForLostPackets();
  Ptr<Ipv4FlowClassifier> classifier =
      DynamicCast<Ipv4FlowClassifier>(flowMonitor.GetClassifier());
  std::map<FlowId, FlowMonitor::FlowStats> stats = monitor->GetFlowStats();

  for (auto const& [flowId, st] : stats) {
    FlowStats fs;
    fs.pdr = st.txPackets > 0 ? static_cast<double>(st.rxPackets) / st.txPackets : 0.0;
    fs.avgDelayMs = st.rxPackets > 0 ? (st.delaySum.GetMilliSeconds() / st.rxPackets) : 0.0;
    fs.throughputKbps = (8.0 * st.rxBytes * 1000.0) / durationS / 1024.0;
    perFlow.push_back(fs);
    totalRx += st.rxPackets; totalTx += st.txPackets;
    delaySum += st.delaySum.GetMilliSeconds(); delayCount += st.rxPackets;
  }

  double overallPdr = totalTx > 0 ? totalRx / totalTx : 0.0;
  double overallDelayMs = delayCount > 0 ? delaySum / delayCount : 0.0;

  std::cout << "\n===== SUTRA-FANET MEASURED RESULTS (real sim run) =====" << std::endl;
  std::cout << "FLOW SUMMARY (per flow):" << std::endl;
  std::cout << std::left << std::setw(10) << "Flow"
            << std::setw(12) << "PDR (%)"
            << std::setw(16) << "Delay (ms)"
            << std::setw(18) << "Throughput (kbps)" << std::endl;
  size_t f = 0;
  for (const auto& fs : perFlow) {
    std::cout << std::left << std::setw(10) << f++
              << std::setw(12) << std::fixed << std::setprecision(2) << fs.pdr * 100.0
              << std::setw(16) << fs.avgDelayMs
              << std::setw(18) << fs.throughputKbps << std::endl;
  }
  std::cout << "---------------------------------------------" << std::endl;
  std::cout << "OVERALL PDR: " << std::fixed << std::setprecision(2) << overallPdr * 100.0
            << "%  (" << static_cast<uint64_t>(totalRx) << "/" << static_cast<uint64_t>(totalTx)
            << " packets, " << nChurn << " nodes churned at t=" << churnTimeS << "s)"
            << std::endl;
  std::cout << "OVERALL AVG E2E DELAY: " << std::fixed << std::setprecision(2)
            << overallDelayMs << " ms" << std::endl;
  std::cout << "GATE G2 CHECK: " << (overallPdr >= 0.95 ? "PASS (PDR >= 95%)" : "FAIL (PDR < 95%)")
            << std::endl;

  Simulator::Destroy();
  return 0;
}
