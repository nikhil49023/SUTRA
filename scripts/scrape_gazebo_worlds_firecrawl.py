#!/usr/bin/env python3
"""
Scrape Gazebo World Repositories & PX4 Sim Gazebo Documentation via Local Firecrawl
"""

import requests
import json
import os

def scrape_gazebo_docs(url: str, output_name: str):
    endpoint = "http://localhost:3002/v1/scrape"
    print(f"🔥 Scraping {url} via Local Firecrawl...")
    try:
        res = requests.post(endpoint, json={"url": url, "formats": ["markdown"]}, timeout=30)
        data = res.json().get("data", {})
        md = data.get("markdown", "")
        
        output_file = f"/home/nikhil/Desktop/Project SUTRA/docs/plans/{output_name}.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# SCRAPED GAZEBO WORLDS: {output_name}\n\nURL: {url}\n\n---\n\n")
            f.write(md if md else "No content returned.")
        print(f"✅ Saved scraped content to: {output_file}")
        return True
    except Exception as e:
        print(f"❌ Error scraping {url}: {e}")
        return False

if __name__ == "__main__":
    targets = [
        ("https://github.com/leonhartyao/gazebo_models_worlds_collection/tree/master/worlds", "FIRECRAWL_Gazebo_Worlds_Collection"),
        ("https://docs.px4.io/main/en/sim_gazebo_gz/worlds", "FIRECRAWL_PX4_Gazebo_Sim_Worlds")
    ]
    for url, name in targets:
        scrape_gazebo_docs(url, name)
