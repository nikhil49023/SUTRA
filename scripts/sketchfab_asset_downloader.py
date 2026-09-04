#!/usr/bin/env python3
"""
Project SUTRA — Sketchfab 3D Asset Downloader & Pipeline Tool
============================================================
Integrates Sketchfab Data API v3 to search, inspect, and download photorealistic
3D models (trees, boulders, human survivors, disaster props) directly into Blender.

Usage:
  python3 scripts/sketchfab_asset_downloader.py search --query "pine tree"
  python3 scripts/sketchfab_asset_downloader.py download --uid <UID> --output-dir models/
"""

import os
import sys
import json
import zipfile
import argparse
import urllib.request
import urllib.parse
from pathlib import Path

# Authoritative Sketchfab API Token
SKETCHFAB_API_TOKEN = os.environ.get(
    "SKETCHFAB_API_TOKEN", "218bb45f4b0f4a539d4e73fbb87b7219"
)
BASE_URL = "https://api.sketchfab.com/v3"


def get_headers():
    return {
        "Authorization": f"Token {SKETCHFAB_API_TOKEN}",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) SUTRA-Disaster-Digital-Twin/1.0"
    }


def search_models(query: str, count: int = 10, categories: str = None):
    """Search for downloadable 3D models on Sketchfab."""
    params = f"?type=models&q={urllib.parse.quote(query)}&downloadable=true&sort_by=-likeCount&per_page={count}"
    if categories:
        params += f"&categories={categories}"
    url = f"{BASE_URL}/search{params}"

    req = urllib.request.Request(url, headers=get_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                return data.get("results", [])
    except Exception as e:
        print(f"⚠️ Search request notice: {e}")
        return []


def get_model_download_url(uid: str):
    """Get temporary download URL for a model's glTF archive."""
    url = f"{BASE_URL}/models/{uid}/download"
    req = urllib.request.Request(url, headers=get_headers())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                return data.get("gltf", {}).get("url") or data.get("source", {}).get("url")
    except Exception as e:
        print(f"⚠️ Failed to get download URL for UID {uid}: {e}")
        return None


def download_and_extract_model(uid: str, output_dir: Path):
    """Download and extract a glTF 3D model into the specified directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    download_url = get_model_download_url(uid)
    if not download_url:
        print(f"❌ Could not obtain download URL for model {uid}.")
        return None

    archive_path = output_dir / f"{uid}.zip"
    print(f"⬇️ Downloading model {uid} from Sketchfab...")
    urllib.request.urlretrieve(download_url, str(archive_path))

    extract_path = output_dir / uid
    extract_path.mkdir(parents=True, exist_ok=True)
    print(f"📦 Extracting model archive into {extract_path}...")
    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)
    
    # Cleanup zip
    archive_path.unlink()
    print(f"✅ Successfully downloaded and extracted model {uid} to {extract_path}")
    return extract_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SUTRA Sketchfab Asset Downloader")
    subparsers = parser.add_subparsers(dest="command")

    # Search
    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("--query", "-q", required=True, help="Search query")
    search_parser.add_argument("--count", "-c", type=int, default=5, help="Number of results")

    # Download
    download_parser = subparsers.add_parser("download")
    download_parser.add_argument("--uid", "-u", required=True, help="Sketchfab Model UID")
    download_parser.add_argument("--output-dir", "-o", default="sutra_ws/src/sutra_sim/models/sketchfab_assets", help="Target output directory")

    args = parser.parse_args()
    if args.command == "search":
        results = search_models(args.query, count=args.count)
        print(f"\n🔍 Found {len(results)} downloadable models for '{args.query}':")
        for r in results:
            print(f"  • UID: {r['uid']} | {r['name']} by {r['user']['displayName']} (Likes: {r['likeCount']}, Faces: {r['faceCount']})")
    elif args.command == "download":
        download_and_extract_model(args.uid, Path(args.output_dir))
    else:
        parser.print_help()
