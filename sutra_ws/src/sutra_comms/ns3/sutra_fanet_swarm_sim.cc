/*
 * SUTRA Subsystem B: Industry-Standard C++ NS-3 FANET Swarm Simulation
 * Lead Architect: Nikhil (Tech Architect & Subsystem B Lead)
 *
 * Models:
 * - 5 UAV Swarm Nodes operating over IEEE 802.11a Ad-Hoc Wireless Mesh
 * - IETF RFC 3626 OLSR (Optimized Link State Routing) with multi-hop aerial relaying
 * - Full IP packet forwarding across intermediate UAV routers (uav_beta, uav_delta)
 * - SwarmRAFT Consensus & Multi-UAV Telemetry Flows (44-Byte Binary Packets @ 10Hz)
 * - FlowMonitor performance accounting (PDR, Latency, Jitter, Throughput)
 * - NetAnim XML Trace Export (sutra_swarm_trace.xml) for desktop GUI visualization
 */

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/mobility-module.h"
#include "ns3/wifi-module.h"
#include "ns3/internet-module.h"
#include "ns3/olsr-module.h"
#include "ns3/netanim-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-module.h"
#include <iostream>
#include <iomanip>
#include <sstream>

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("SutraFanetSwarmSim");

struct UAVProfile {
    std::string callsign;
    std::string role;
    double x, y, z;
};

int main(int argc, char *argv[]) {
    CommandLine cmd(__FILE__);
    cmd.Parse(argc, argv);

    std::cout << "================================================================================" << std::endl;
    std::cout << "🛰️  PROJECT SUTRA — INDUSTRY-STANDARD NS-3 FANET SWARM NETWORK SIMULATION" << std::endl;
    std::cout << "    Subsystem B (Comms & Simulation) | Gate G2 Verification Suite" << std::endl;
    std::cout << "    Protocol: IEEE 802.11a Ad-Hoc Mesh + IETF RFC 3626 OLSR Multi-Hop Routing" << std::endl;
    std::cout << "================================================================================" << std::endl;

    const uint32_t NUM_UAVS = 5;
    const double SIM_TIME_SEC = 12.0;

    // 1. Define 5 UAV Swarm Profiles in 3D Space (Bengaluru Disaster Search Geometry)
    UAVProfile profiles[NUM_UAVS] = {
        {"uav_alpha",   "Swarm Leader (SwarmRAFT Primary)",    0.0,    0.0, 25.0},
        {"uav_beta",    "Relay & Edge Compute Worker",        45.0,   30.0, 30.0},
        {"uav_gamma",   "AI Perception / Survivor Scout",    -50.0,   50.0, 22.0},
        {"uav_delta",   "Flank Reconnaissance Drone",         85.0,  -35.0, 28.0},
        {"uav_epsilon", "Long-Range Backhaul to GCS",        130.0,   60.0, 26.0}
    };

    // 2. Instantiate Network Nodes
    NodeContainer nodes;
    nodes.Create(NUM_UAVS);

    // 3. Set Up 3D Mobility Model
    MobilityHelper mobility;
    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator>();
    for (uint32_t i = 0; i < NUM_UAVS; ++i) {
        positionAlloc->Add(Vector(profiles[i].x, profiles[i].y, profiles[i].z));
    }
    mobility.SetPositionAllocator(positionAlloc);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(nodes);

    // 4. Configure 802.11a Ad-Hoc Wireless Mesh Channel (23 dBm Tx Power, 12 Mbps OFDM)
    YansWifiChannelHelper channel;
    channel.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
    channel.AddPropagationLoss("ns3::FriisPropagationLossModel",
                               "Frequency", DoubleValue(5.180e9)); // 5.18 GHz (802.11a Channel 36)

    YansWifiPhyHelper phy;
    phy.SetChannel(channel.Create());
    phy.Set("TxPowerStart", DoubleValue(23.0)); // 23 dBm (200 mW UAV Wi-Fi)
    phy.Set("TxPowerEnd", DoubleValue(23.0));
    phy.Set("RxGain", DoubleValue(3.0));        // 3 dBi antenna gain

    WifiHelper wifi;
    wifi.SetStandard(WIFI_STANDARD_80211a);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager",
                                 "DataMode", StringValue("OfdmRate12Mbps"),
                                 "ControlMode", StringValue("OfdmRate6Mbps"));

    WifiMacHelper mac;
    mac.SetType("ns3::AdhocWifiMac");

    NetDeviceContainer devices = wifi.Install(phy, mac, nodes);

    // 5. Install OLSR Proactive Multi-Hop Routing & IPv4 Internet Stack
    OlsrHelper olsr;
    InternetStackHelper stack;
    stack.SetRoutingHelper(olsr);
    stack.Install(nodes);

    // Enable multi-hop packet forwarding on all UAV routers
    for (uint32_t i = 0; i < nodes.GetN(); ++i) {
        Ptr<Ipv4> ipv4 = nodes.Get(i)->GetObject<Ipv4>();
        ipv4->SetAttribute("IpForward", BooleanValue(true));
    }

    Ipv4AddressHelper address;
    address.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer interfaces = address.Assign(devices);

    // 6. Deploy Swarm Telemetry & Consensus Traffic Generators
    // uav_alpha listens for follower telemetry on port 9090
    uint16_t telemetryPort = 9090;
    PacketSinkHelper sinkLeader("ns3::UdpSocketFactory", InetSocketAddress(Ipv4Address::GetAny(), telemetryPort));
    ApplicationContainer serverLeaderApp = sinkLeader.Install(nodes.Get(0));
    serverLeaderApp.Start(Seconds(0.5));
    serverLeaderApp.Stop(Seconds(SIM_TIME_SEC));

    // Follower UAVs (1..4) stream 44-byte binary telemetry structs @ 10 Hz to Leader (uav_alpha)
    for (uint32_t i = 1; i < NUM_UAVS; ++i) {
        UdpClientHelper client(interfaces.GetAddress(0), telemetryPort);
        client.SetAttribute("MaxPackets", UintegerValue(80));
        client.SetAttribute("Interval", TimeValue(MilliSeconds(100))); // 10 Hz
        client.SetAttribute("PacketSize", UintegerValue(44));           // SUTRA 44-byte binary telemetry

        ApplicationContainer clientApp = client.Install(nodes.Get(i));
        clientApp.Start(Seconds(2.0 + (i * 0.1)));                     // Warm-up after OLSR convergence
        clientApp.Stop(Seconds(SIM_TIME_SEC - 0.5));
    }

    // Leader broadcasts SwarmRAFT consensus heartbeat to uav_beta (Relay) on port 9091
    uint16_t heartbeatPort = 9091;
    PacketSinkHelper sinkRelay("ns3::UdpSocketFactory", InetSocketAddress(Ipv4Address::GetAny(), heartbeatPort));
    ApplicationContainer serverRelayApp = sinkRelay.Install(nodes.Get(1));
    serverRelayApp.Start(Seconds(0.5));
    serverRelayApp.Stop(Seconds(SIM_TIME_SEC));

    UdpClientHelper leaderHeartbeat(interfaces.GetAddress(1), heartbeatPort);
    leaderHeartbeat.SetAttribute("MaxPackets", UintegerValue(80));
    leaderHeartbeat.SetAttribute("Interval", TimeValue(MilliSeconds(100)));
    leaderHeartbeat.SetAttribute("PacketSize", UintegerValue(64));      // RAFT heartbeat payload
    ApplicationContainer leaderApp = leaderHeartbeat.Install(nodes.Get(0));
    leaderApp.Start(Seconds(2.0));
    leaderApp.Stop(Seconds(SIM_TIME_SEC - 0.5));

    // 7. Install NetAnim Trace for 3D Desktop GUI Visualizer
    AnimationInterface anim("sutra_ws/src/sutra_comms/ns3/sutra_swarm_trace.xml");
    for (uint32_t i = 0; i < NUM_UAVS; ++i) {
        anim.SetConstantPosition(nodes.Get(i), profiles[i].x, profiles[i].y, profiles[i].z);
        anim.UpdateNodeDescription(nodes.Get(i), profiles[i].callsign + " (" + profiles[i].role + ")");
        if (i == 0) {
            anim.UpdateNodeColor(nodes.Get(i), 0, 180, 255); // Cyan (Leader)
        } else if (i == 1) {
            anim.UpdateNodeColor(nodes.Get(i), 255, 180, 0); // Amber (Relay)
        } else {
            anim.UpdateNodeColor(nodes.Get(i), 100, 220, 100); // Green (Followers)
        }
    }

    // 8. Attach FlowMonitor for Ground-Truth Metrics
    FlowMonitorHelper flowmon;
    Ptr<FlowMonitor> monitor = flowmon.InstallAll();

    std::cout << "\n[+] Executing discrete-event wireless simulation for " << SIM_TIME_SEC << " simulated seconds..." << std::endl;
    Simulator::Stop(Seconds(SIM_TIME_SEC));
    Simulator::Run();

    // 9. Process FlowMonitor Metrics & Check Gate G2 Compliance
    monitor->CheckForLostPackets();
    Ptr<Ipv4FlowClassifier> classifier = DynamicCast<Ipv4FlowClassifier>(flowmon.GetClassifier());
    std::map<FlowId, FlowMonitor::FlowStats> stats = monitor->GetFlowStats();

    std::cout << "\n--------------------------------------------------------------------------------" << std::endl;
    std::cout << "📊 SIMULATED FANET MESH FLOW PERFORMANCE METRICS (OLSR AD-HOC MESH)" << std::endl;
    std::cout << "--------------------------------------------------------------------------------" << std::endl;
    std::cout << std::left 
              << std::setw(8)  << "Flow ID"
              << std::setw(28) << "Source -> Destination"
              << std::setw(10) << "Tx Pkts"
              << std::setw(10) << "Rx Pkts"
              << std::setw(12) << "PDR (%)"
              << std::setw(14) << "Mean Delay"
              << std::setw(12) << "Throughput" << std::endl;
    std::cout << "--------------------------------------------------------------------------------" << std::endl;

    uint64_t totalTx = 0, totalRx = 0;
    double totalDelayMs = 0;
    uint32_t flowCount = 0;

    for (auto const &flow : stats) {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(flow.first);
        double pdr = (flow.second.txPackets > 0) ? (100.0 * flow.second.rxPackets / flow.second.txPackets) : 0.0;
        double meanDelayMs = (flow.second.rxPackets > 0) ? (flow.second.delaySum.GetSeconds() * 1000.0 / flow.second.rxPackets) : 0.0;
        double throughputKbps = (flow.second.timeLastRxPacket.GetSeconds() > flow.second.timeFirstTxPacket.GetSeconds()) 
            ? (flow.second.rxBytes * 8.0 / (flow.second.timeLastRxPacket.GetSeconds() - flow.second.timeFirstTxPacket.GetSeconds()) / 1024.0) 
            : 0.0;

        std::stringstream routeStr;
        routeStr << t.sourceAddress << " -> " << t.destinationAddress;

        std::cout << std::left 
                  << std::setw(8)  << flow.first
                  << std::setw(28) << routeStr.str()
                  << std::setw(10) << flow.second.txPackets
                  << std::setw(10) << flow.second.rxPackets
                  << std::setw(12) << std::fixed << std::setprecision(1) << pdr
                  << std::setw(14) << (std::to_string(meanDelayMs).substr(0, 5) + " ms")
                  << std::setw(12) << (std::to_string(throughputKbps).substr(0, 5) + " kbps") << std::endl;

        totalTx += flow.second.txPackets;
        totalRx += flow.second.rxPackets;
        if (flow.second.rxPackets > 0) {
            totalDelayMs += meanDelayMs;
            flowCount++;
        }
    }

    double overallPdr = (totalTx > 0) ? (100.0 * totalRx / totalTx) : 0.0;
    double avgLatencyMs = (flowCount > 0) ? (totalDelayMs / flowCount) : 0.0;

    std::cout << "--------------------------------------------------------------------------------" << std::endl;
    std::cout << "📈 OVERALL SWARM COMMUNICATION BENCHMARK SUMMARY:" << std::endl;
    std::cout << "   • Total Packets Transmitted    : " << totalTx << std::endl;
    std::cout << "   • Total Packets Received       : " << totalRx << std::endl;
    std::cout << "   • Network Packet Delivery (PDR): " << std::fixed << std::setprecision(2) << overallPdr << " %" << std::endl;
    std::cout << "   • Mean End-to-End Latency      : " << std::fixed << std::setprecision(3) << avgLatencyMs << " ms" << std::endl;
    std::cout << "   • Gate G2 Compliance Criteria  : PDR >= 98.0%, Latency < 8.0 ms" << std::endl;

    if (overallPdr >= 98.0 && avgLatencyMs < 8.0) {
        std::cout << "   • Status                       : ✅ GATE G2 FULLY SATISFIED" << std::endl;
    } else {
        std::cout << "   • Status                       : ⚠️ RETRANSMISSION & LINK MARGIN TUNING" << std::endl;
    }
    std::cout << "================================================================================" << std::endl;

    // Export FlowMonitor XML
    monitor->SerializeToXmlFile("sutra_ws/src/sutra_comms/ns3/sutra_flow_stats.xml", true, true);
    std::cout << "✓ Exported NetAnim Trace File : sutra_ws/src/sutra_comms/ns3/sutra_swarm_trace.xml" << std::endl;
    std::cout << "✓ Exported FlowMonitor Stats  : sutra_ws/src/sutra_comms/ns3/sutra_flow_stats.xml" << std::endl;

    Simulator::Destroy();
    return 0;
}
