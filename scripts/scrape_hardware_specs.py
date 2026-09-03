#!/usr/bin/env python3
"""
Scrape Hardware Datasheets & Specs via Local Firecrawl (http://localhost:3002/v1/scrape)
"""

import requests
import json

def scrape_hardware_info(url: str, part_name: str):
    endpoint = "http://localhost:3002/v1/scrape"
    print(f"🔥 Scraping hardware specs for {part_name} via Local Firecrawl...")
    try:
        res = requests.post(endpoint, json={"url": url, "formats": ["markdown"]}, timeout=25)
        data = res.json().get("data", {})
        md = data.get("markdown", "")
        with open(f"/home/nikhil/Desktop/Project SUTRA/docs/plans/HARDWARE_{part_name}.md", "w") as f:
            f.write(f"# HARDWARE SPECIFICATION: {part_name}\n\nURL: {url}\n\n{md[:4000]}")
        print(f"✅ Saved specs to HARDWARE_{part_name}.md")
    except Exception as e:
        print(f"❌ Scraping error for {part_name}: {e}")

if __name__ == "__main__":
    hw_urls = [
        ("https://wiki.dfrobot.com/ESP32_S3_AI_Camera", "DFRobot_ESP32_S3_CAM"),
        ("https://docs.ai-thinker.com/en/lora", "AiThinker_Ra02_LoRa"),
        ("https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html", "ESP32_WROOM_32")
    ]
    for url, name in hw_urls:
        scrape_hardware_info(url, name)
