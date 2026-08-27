#!/usr/bin/env python3
"""
Scrape Edge Impulse & TFLite Micro Edge Constraints Documentation via Local Firecrawl
"""

import requests
import json
import os

def scrape_edge_doc_via_firecrawl(url: str, title: str):
    firecrawl_endpoint = "http://localhost:3002/v1/scrape"
    print(f"🔥 Scraping {title} via Local Firecrawl ({firecrawl_endpoint})...")
    
    payload = {
        "url": url,
        "formats": ["markdown"]
    }
    
    try:
        res = requests.post(firecrawl_endpoint, json=payload, timeout=30)
        res_json = res.json()
        
        data = res_json.get("data", {})
        markdown = data.get("markdown", "")
        
        output_file = f"/home/nikhil/Desktop/Project SUTRA/docs/plans/FIRECRAWL_SCRAPED_{title}.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# FIRECRAWL SCRAPED EDGE PROFILING DOC: {title}\n\n")
            f.write(f"- **Source URL:** {url}\n")
            f.write(f"- **Scraped via:** Local Firecrawl (http://localhost:3002/v1/scrape)\n\n")
            f.write("---" + "\n\n")
            f.write(markdown if markdown else "No markdown returned.")
            
        print(f"✅ Successfully scraped and saved to: {output_file}")
        return True
    except Exception as e:
        print(f"❌ Error scraping via local Firecrawl: {e}")
        return False

if __name__ == "__main__":
    docs = [
        ("https://docs.edgeimpulse.com/docs/edge-impulse-studio/learning-blocks/object-detection", "Edge_Impulse_Object_Detection"),
        ("https://docs.edgeimpulse.com/docs/deployment/hardware-targets/esp32-s3", "Edge_Impulse_ESP32_S3_Constraints"),
        ("https://www.tensorflow.org/lite/microcontrollers/build_convert", "TFLite_Micro_MCU_Benchmarks")
    ]
    for url, name in docs:
        scrape_edge_doc_via_firecrawl(url, name)
