#!/usr/bin/env python3
"""
Scrape Smart Horizon International Hackathon 2026 Guidelines via Local Firecrawl
"""

import requests
import json
import os

def scrape_smart_horizon_via_firecrawl(url: str, title: str):
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
            f.write(f"# FIRECRAWL SCRAPED SMART HORIZON HACKATHON: {title}\n\n")
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
    urls = [
        ("https://devpost.com/hackathons", "Smart_Horizon_International_Hackathon_2026"),
        ("https://hackerearth.com/challenges/hackathon/", "Smart_Horizon_Evaluation_Rubric")
    ]
    for url, name in urls:
        scrape_smart_horizon_via_firecrawl(url, name)
