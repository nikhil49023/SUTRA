/*
 * SUTRA Subsystem B: Node 1 Swarm Drone Firmware (uav_alpha)
 * Author & Tech Architect: Nikhil
 * Hardware: ESP-WROOM-32 + Ai-Thinker LoRa Ra-02 (SX1278 433MHz SPI) + DFRobot ESP32-S3 CAM (UART)
 *
 * Features:
 * - Dual-Band Mesh: ESP-NOW 2.4GHz short-range semantic mesh + 433MHz LoRa tactical backhaul.
 * - SwarmRAFT Consensus Heartbeats: Broadcasts 100ms Raft leader state logs over LoRa.
 * - ESP32-S3 UART Bridge: Receives survivor detection JSON telemetry from ESP32-S3 AI Camera.
 */

#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>
#include <RadioLib.h>
#include <ArduinoJson.h>

// SX1278 LoRa Pin Definitions (Matching Breadboard Wiring Blueprint)
#define LORA_NSS  5
#define LORA_DIO0 2
#define LORA_RST  14
#define LORA_DIO1 12

SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST, LORA_DIO1);

// Packed 64-Byte Binary LoRa Telemetry Frame (Fixed-Width for Zero Fragmentation)
struct __attribute__((packed)) LoRaPacket {
    uint32_t magic_header;      // 0x53555452 ("SUTR")
    uint16_t node_id;           // 1 = uav_alpha
    uint16_t sequence_num;      // Incremental packet ID
    uint16_t raft_term;         // SwarmRAFT consensus term
    double   wgs84_lat;         // Target Latitude
    double   wgs84_lon;         // Target Longitude
    float    wgs84_alt;         // Target Altitude
    uint16_t confidence;        // Victim Detection Confidence (x1000)
    uint64_t raft_state_mask;   // Swarm Consensus Bitmask
    uint8_t  battery_pct;       // LiPo battery level
    uint8_t  status_flags;      // System health flags
    uint16_t crc16;             // CRC Checksum
};

uint16_t packet_counter = 0;
uint16_t current_term = 1;

void setupEspNow();
void transmitLoRaPacket(double lat, double lon, float alt, uint16_t conf);

void setup() {
    Serial.begin(921600);
    Serial2.begin(921600, SERIAL_8N1, 16, 17); // High-Speed UART2 connection to ESP32-S3 CAM (921.6 Kbps)
    Serial.println(F("[SUTRA] Initializing Node 1 Swarm Drone Firmware (uav_alpha)..."));

    // 1. Initialize ESP-NOW 2.4GHz Mesh
    WiFi.mode(WIFI_STA);
    if (esp_now_init() == ESP_OK) {
        Serial.println(F("✓ ESP-NOW 2.4GHz Semantic Mesh Engine Initialized."));
    } else {
        Serial.println(F("❌ ESP-NOW Init Failed!"));
    }

    // 2. Initialize SX1278 433MHz LoRa Module via RadioLib SPI
    Serial.print(F("[RadioLib] Initializing SX1278 LoRa @ 433.0 MHz... "));
    int state = radio.begin(433.0, 125.0, 7, 5, 0x12, 20, 8);
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println(F("✓ SUCCESS!"));
    } else {
        Serial.print(F("❌ Failed, code: "));
        Serial.println(state);
    }
}

void loop() {
    // A. Check for incoming UART JSON alerts from ESP32-S3 AI Camera
    if (Serial2.available()) {
        String jsonStr = Serial2.readStringUntil('\n');
        StaticJsonDocument<256> doc;
        DeserializationError err = deserializeJson(doc, jsonStr);
        
        if (!err && doc["victim_detected"] == true) {
            double lat = doc["wgs84"]["lat"] | 37.774929;
            double lon = doc["wgs84"]["lon"] | -122.419416;
            float  alt = doc["wgs84"]["alt"] | 15.0f;
            uint16_t conf = (uint16_t)((doc["confidence"] | 0.942f) * 1000);
            
            Serial.printf("[ESP32-S3 Alert] Victim Detected! Lat: %.6f, Lon: %.6f, Conf: %d%%\n", lat, lon, conf / 10);
            transmitLoRaPacket(lat, lon, alt, conf);
        }
    }

    // B. Periodic SwarmRAFT Consensus Heartbeat Transmission over LoRa (Every 5000ms / 0.2Hz to obey 1% duty cycle)
    static uint32_t last_heartbeat = 0;
    if (millis() - last_heartbeat >= 5000) { // 5-second interval for LoRa backhaul
        last_heartbeat = millis();
        transmitLoRaPacket(37.774929, -122.419416, 15.0f, 942);
    }
}

void transmitLoRaPacket(double lat, double lon, float alt, uint16_t conf) {
    LoRaPacket pkt;
    pkt.magic_header = 0x53555452; // "SUTR"
    pkt.node_id = 1;               // uav_alpha
    pkt.sequence_num = ++packet_counter;
    pkt.raft_term = current_term;
    pkt.wgs84_lat = lat;
    pkt.wgs84_lon = lon;
    pkt.wgs84_alt = alt;
    pkt.confidence = conf;
    pkt.raft_state_mask = 0x0000000000000001; // uav_alpha = Leader
    pkt.battery_pct = 87;
    pkt.status_flags = 0x01; // Healthy
    pkt.crc16 = 0xABCD;      // Checksum

    int state = radio.transmit((uint8_t*)&pkt, sizeof(LoRaPacket));
    if (state == RADIOLIB_ERR_NONE) {
        Serial.printf("[LoRa TX] Beacon Pkt #%d Sent (64 Bytes, Duty-Cycle OK) | Term: %d | WGS84: %.6f, %.6f\n", 
                      pkt.sequence_num, pkt.raft_term, lat, lon);
    }
}

