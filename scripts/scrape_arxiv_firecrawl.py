#!/usr/bin/env python3
"""
Firecrawl Local arXiv Scraper Script
Scrapes authoritative research preprints via local Firecrawl API (http://localhost:3002/v1/scrape).
"""

import requests
import json
import os

def scrape_paper_via_firecrawl(url: str, title: str):
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
            f.write(f"# FIRECRAWL SCRAPED RESEARCH: {title}\n\n")
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
    papers = [
        ("https://arxiv.org/abs/1911.07476", "DeepJSCC_Feedback"),
        ("https://arxiv.org/abs/2108.05658", "Semantic_Swarms"),
        ("https://arxiv.org/abs/2203.11482", "SwarmRaft_Consensus"),
        ("https://arxiv.org/abs/2104.14441", "DeepJSCC_Video_Transmission"),
        ("https://arxiv.org/abs/2303.04221", "Neural_OctoMap_3D_Voxel_Compression"),
        ("https://arxiv.org/abs/2401.08210", "Semantic_Telemetry_Swarm_JSCC")
    ]
    for url, name in papers:
        scrape_paper_via_firecrawl(url, name)
