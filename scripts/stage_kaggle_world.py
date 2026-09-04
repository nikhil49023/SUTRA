#!/usr/bin/env python3
import os
from pathlib import Path

STAGING_DIR = Path("/home/nikhil/Desktop/Project SUTRA/.kaggle_staging/sutra-neural-disaster-world")
STAGING_DIR.mkdir(parents=True, exist_ok=True)

metadata_file = STAGING_DIR / "kernel-metadata.json"
metadata_file.write_text("""{
  "id": "sainikhilkilani/sutra-neural-disaster-world",
  "title": "SUTRA Neural Disaster World Generator",
  "code_file": "generate_sutra_kaggle_world.py",
  "language": "python",
  "kernel_type": "script",
  "is_private": "true",
  "enable_gpu": "true",
  "enable_tpu": "false",
  "enable_internet": "true",
  "dataset_sources": [],
  "competition_sources": [],
  "kernel_sources": [],
  "model_sources": []
}
""")

print("✅ Staged kernel-metadata.json")
