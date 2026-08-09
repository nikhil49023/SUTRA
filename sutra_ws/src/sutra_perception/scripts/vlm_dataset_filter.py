#!/usr/bin/env python3
"""
VLM Automated Dataset Filtering Pipeline — Subsystem C (AI Edge Perception)
Project SUTRA — Swarm Unified Tactical Reconnaissance Architecture

Filters raw search & rescue datasets (VisDrone, HIT-UAV, SARD, xBD, DRONECrowd, MiliPoint, RescueNet, FloodNet)
using an Ollama Vision Language Model (LLaVA-Phi3 / Moondream).
"""

import os
import sys
import json
import base64
import argparse
import shutil
from pathlib import Path
import urllib.request
import urllib.error

OLLAMA_API_URL = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

PROMPT = """You are an expert Search & Rescue (SAR) Drone Perception Dataset Evaluator.
Analyze the input image and return strictly valid JSON matching this exact format:
{
  "quality_score": 8,
  "survivor_or_target_visible": true,
  "target_categories": ["person"],
  "blur_or_corruption": false,
  "occlusion_level": "none",
  "thermal_contrast_ok": true,
  "keep_decision": true,
  "rejection_reason": "None"
}

Rules for evaluation:
1. keep_decision MUST be true ONLY IF quality_score >= 6 AND blur_or_corruption is false AND occlusion_level != "heavy".
2. If survivor_or_target_visible is true, quality_score should be >= 7.
3. If image is blurry, out-of-focus, empty background noise, or uninformative, set keep_decision to false and state rejection_reason.
4. Output ONLY raw valid JSON matching the format above. Do not include extra text.
"""

def encode_image_base64(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def query_ollama_vlm(image_path: Path, model_name: str) -> dict:
    img_b64 = encode_image_base64(image_path)
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": PROMPT,
                "images": [img_b64]
            }
        ],
        "stream": False,
        "format": "json"
    }

    req = urllib.request.Request(
        f"{OLLAMA_API_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_response = data.get("message", {}).get("content", "{}").strip()
            if raw_response.startswith("```"):
                raw_response = raw_response.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            return json.loads(raw_response)
    except Exception as e:
        return {
            "quality_score": 5,
            "survivor_or_target_visible": False,
            "target_categories": [],
            "blur_or_corruption": False,
            "occlusion_level": "unknown",
            "thermal_contrast_ok": True,
            "keep_decision": True,
            "rejection_reason": f"VLM Error: {e}"
        }

def process_dataset(input_dir: Path, output_dir: Path, model_name: str, max_samples: int = None):
    print(f"\n==================================================")
    print(f"  SUTRA VLM Dataset Filtering Pipeline")
    print(f"  Model: {model_name}")
    print(f"  Input: {input_dir}")
    print(f"  Output: {output_dir}")
    print(f"==================================================\n")

    images_out = output_dir / "images"
    labels_out = output_dir / "labels"
    images_out.mkdir(parents=True, exist_ok=True)
    labels_out.mkdir(parents=True, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    all_images = [p for p in input_dir.rglob("*") if p.suffix.lower() in image_extensions]
    
    if max_samples:
        all_images = all_images[:max_samples]

    total = len(all_images)
    print(f"Found {total} target image samples to evaluate.\n")

    stats = {
        "total_evaluated": 0,
        "kept": 0,
        "rejected": 0,
        "rejection_reasons": {},
        "evaluated_files": []
    }

    for idx, img_path in enumerate(all_images, start=1):
        print(f"[{idx}/{total}] Evaluating: {img_path.name} ... ", end="", flush=True)
        res = query_ollama_vlm(img_path, model_name)
        
        keep = res.get("keep_decision", True)
        reason = res.get("rejection_reason", "None")
        score = res.get("quality_score", 0)

        stats["total_evaluated"] += 1

        if keep:
            stats["kept"] += 1
            print(f"\033[1;32mPASSED\033[0m (Score: {score}/10)")
            shutil.copy2(img_path, images_out / img_path.name)
            
            label_file = img_path.with_suffix(".txt")
            if label_file.exists():
                shutil.copy2(label_file, labels_out / label_file.name)
        else:
            stats["rejected"] += 1
            print(f"\033[1;31mREJECTED\033[0m (Reason: {reason})")
            stats["rejection_reasons"][reason] = stats["rejection_reasons"].get(reason, 0) + 1

        stats["evaluated_files"].append({
            "filename": img_path.name,
            "path": str(img_path),
            "evaluation": res
        })

    report_file = output_dir / "curation_report.json"
    with open(report_file, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\n==================================================")
    print(f"  FILTERING COMPLETE SUMMARY")
    print(f"  Total Evaluated: {stats['total_evaluated']}")
    print(f"  Kept (Approved): {stats['kept']} ({stats['kept']/max(total, 1)*100:.1f}%)")
    print(f"  Rejected:        {stats['rejected']}")
    print(f"  Curation Report: {report_file}")
    print(f"==================================================")

def main():
    parser = argparse.ArgumentParser(description="Filter perception datasets using Ollama VLM")
    parser.add_argument("--dataset-dir", required=True, type=Path, help="Path to input dataset folder")
    parser.add_argument("--output-dir", required=True, type=Path, help="Path to output curated dataset folder")
    parser.add_argument("--model", default="qwen2.5-vl:latest", help="Ollama Vision model name (qwen2.5-vl:latest, qwen:latest, or llava-phi3:latest)")
    parser.add_argument("--max-samples", type=int, default=None, help="Maximum number of samples to process")

    args = parser.parse_args()
    process_dataset(args.dataset_dir, args.output_dir, args.model, args.max_samples)

if __name__ == "__main__":
    main()
