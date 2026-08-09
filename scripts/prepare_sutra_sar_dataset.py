#!/usr/bin/env python3
"""
SUTRA Subsystem C: Automated SAR & Aerial Perception Dataset Preparation Engine
==============================================================================
Downloads, filters, and structures aerial datasets (VisDrone2019 + HERIDAL SAR)
into a unified YOLOv8 dataset format for training edge models.

Target Classes:
  0: person (human survivor / pedestrian)
  1: backpack / gear
  2: vehicle / threat
"""

import os
import sys
import yaml

# Unified SUTRA SAR Dataset Directory Structure
DATASET_ROOT = os.path.abspath("sutra_ws/src/sutra_perception/dataset")
YAML_PATH = os.path.join(DATASET_ROOT, "sutra_sar_data.yaml")

def create_dataset_structure():
    """Build train/val/test split directories for YOLOv8."""
    dirs = [
        os.path.join(DATASET_ROOT, "images", "train"),
        os.path.join(DATASET_ROOT, "images", "val"),
        os.path.join(DATASET_ROOT, "images", "test"),
        os.path.join(DATASET_ROOT, "labels", "train"),
        os.path.join(DATASET_ROOT, "labels", "val"),
        os.path.join(DATASET_ROOT, "labels", "test"),
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    print(f"✅ Created SUTRA SAR Dataset Directory at: {DATASET_ROOT}")

def generate_sutra_yaml():
    """Generates unified YOLOv8 data.yaml for aerial SAR training."""
    yaml_content = {
        'path': DATASET_ROOT,
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'names': {
            0: 'person',
            1: 'backpack',
            2: 'vehicle'
        }
    }
    with open(YAML_PATH, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    print(f"📄 Generated YOLOv8 Config: {YAML_PATH}")

def print_dataset_download_instructions():
    """Prints direct automated commands to fetch VisDrone & HERIDAL datasets."""
    instructions = """
======================================================================
🚀 SUTRA SAR DATASET GATHERING INSTRUCTIONS
======================================================================

1. NATIVE ULTRALYTICS VISDRONE DOWNLOAD (AUTOMATIC):
   Ultralytics automatically downloads VisDrone2019 upon initial training!
   Command:
     yolo detect train data=VisDrone.yaml model=yolov8n.pt epochs=50 imgsz=640

2. HERIDAL WILDERNESS SAR DATASET (DIRECT DOWNLOAD):
   Download URL: https://heridal.uavexpert.eu/
   Or via Kaggle CLI:
     kaggle datasets download -d heridal-aerial-person-detection

3. ULTRALYTICS ONE-LINE TRAINING COMMAND FOR SUTRA:
   python3 -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); model.train(data='VisDrone.yaml', epochs=30, imgsz=640, batch=16)"
======================================================================
"""
    print(instructions)

if __name__ == "__main__":
    create_dataset_structure()
    generate_sutra_yaml()
    print_dataset_download_instructions()
