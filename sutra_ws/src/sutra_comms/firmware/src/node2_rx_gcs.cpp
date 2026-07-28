/*
 * SUTRA Subsystem B: Node 2 Ground Relay & GCS Serial Bridge Firmware (uav_beta)
 * Author & Tech Architect: Nikhil
 * Hardware: ESP-WROOM-32 + Ai-Thinker LoRa Ra-02 (SX1278 433MHz SPI) + CP2102 USB-to-UART Converter
 *
 * Features:
 * - 433MHz SX1278 LoRa Receiver: Listens for binary LoRa packets from swarm drones up to 5km.
 * - SwarmRAFT Timeout Monitor: Monitors leader heartbeat timeouts (< 500ms failover).
 * - CP2102 Serial Bridge: Converts received binary packets into 256-byte JSON frames streamed @ 115200 baud to GCS.
 */

#include <Arduino.h>
#include <RadioLib.h>
#include <ArduinoJson.h>

// SX1278 LoRa Pin Definitions
#define LORA_NSS  5
#define LORA_DIO0 2
#define LORA_RST  14
#define LORA_DIO1 12

SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST, LORA_DIO1);

// Packed 64-Byte Binary LoRa Telemetry Frame
struct __attribute__((packed)) LoRaPacket {
    uint32_t magic_header;
    uint16_t node_id;
    uint16_t sequence_num;
    uint16_t raft_term;
    double   wgs84_lat;
    double   wgs84_lon;
    float    wgs84_alt;
    uint16_t confidence;
    uint64_t raft_state_mask;
    uint8_t  battery_pct;
    uint8_t  status_flags;
    uint16_t crc16;
};

uint32_t last_heartbeat_rx = 0;
bool rx_flag = false;

#if defined(ESP8266) || defined(ESP32)
  ICACHE_RAM_ATTR
#endif
void setRxFlag(void) {
    rx_flag = true;
}

void setup() {
    Serial.begin(115200);
    Serial.println(F("[SUTRA] Initializing Node 2 GCS Bridge Firmware (uav_beta)..."));

    // Initialize SX1278 LoRa Receiver
    Serial.print(F("[RadioLib] Initializing SX1278 LoRa Receiver @ 433.0 MHz... "));
    int state = radio.begin(433.0, 125.0, 7, 5, 0x12, 20, 8);
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println(F("✓ SUCCESS!"));
    } else {
        Serial.print(F("❌ Failed, code: "));
        Serial.println(state);
    }

    // Set interrupt for packet reception
    radio.setDio0Action(setRxFlag, RISING);
    radio.startReceive();
    last_heartbeat_rx = millis();
}

void loop() {
    // Check if LoRa packet received via interrupt
    if (rx_flag) {
        rx_flag = false;
        LoRaPacket pkt;
        int state = radio.readData((uint8_t*)&pkt, sizeof(LoRaPacket));
        
        if (state == RADIOLIB_ERR_NONE && pkt.magic_header == 0x53555452) {
            last_heartbeat_rx = millis();
            float rssi = radio.getRSSI();
            float snr = radio.getSNR();

            // Stream structured JSON telemetry frame over CP2102 serial to GCS laptop
            StaticJsonDocument<256> doc;
            doc["uav_id"] = (pkt.node_id == 1) ? "uav_alpha" : "uav_beta";
            doc["seq"] = pkt.sequence_num;
            doc["term"] = pkt.raft_term;
            doc["wgs84"]["lat"] = pkt.wgs84_lat;
            doc["wgs84"]["lon"] = pkt.wgs84_lon;
            doc["wgs84"]["alt"] = pkt.wgs84_alt;
            doc["confidence"] = pkt.confidence / 1000.0f;
            doc["rssi_dbm"] = rssi;
            doc["snr_db"] = snr;
            doc["battery_pct"] = pkt.battery_pct;
            doc["raft_role"] = "LEADER";

            serializeJson(doc, Serial);
            Serial.println(); // Newline delimiter
        }
        
        radio.startReceive(); // Re-arm receiver
    }

    // Monitor SwarmRAFT Leader Heartbeat Timeout (> 500ms failover detection)
    if (millis() - last_heartbeat_rx > 500) {
        static uint32_t last_warn = 0;
        if (millis() - last_warn > 1000) {
            last_warn = millis();
            StaticJsonDocument<128> warn_doc;
            warn_doc["event"] = "SWARM_RAFT_LEADER_TIMEOUT";
            warn_doc["elapsed_ms"] = millis() - last_heartbeat_rx;
            warn_doc["status"] = "TRIGGERING_CANDIDATE_ELECTION";
            serializeJson(warn_doc, Serial);
            Serial.println();
        }
    }
}
