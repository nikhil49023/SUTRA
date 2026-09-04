#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — KAGGLE CLOUD GPU CONNECTOR & MLOPS PIPELINE
================================================================================
Enables headless dispatch of heavy PyTorch model training and Blender 3D rendering
to Kaggle's 16 GB NVIDIA Tesla T4 Cloud GPUs, bypassing local 4 GB VRAM limits.

Commands:
  python3 scripts/sutra_kaggle_connector.py auth
  python3 scripts/sutra_kaggle_connector.py train-visdrone [--push-only]
  python3 scripts/sutra_kaggle_connector.py status [kernel-slug]
  python3 scripts/sutra_kaggle_connector.py pull-weights [kernel-slug]
  python3 scripts/sutra_kaggle_connector.py render-blender [--push-only]
================================================================================
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
NOTEBOOK_PATH = SCRIPT_DIR / "SUTRA_VisDrone_Finetune_Kaggle.ipynb"
DEFAULT_WEIGHTS_DIR = PROJECT_ROOT / "sutra_ws/src/sutra_perception/models"
STAGING_DIR = PROJECT_ROOT / ".kaggle_staging"

# Multi-Account Usernames & Slugs
ACCOUNT_USERNAMES = {
    "1": "sainikhilkilani",
    "2": "sainikhil963"
}
VISDRONE_SLUG = "sutra-yolov8-visdrone-sar-drone-fine-tuning"
BLENDER_SLUG = "sutra-blender-flood-render"
CANOPY_SLUG = "sutra-forest-canopy-3d-digital-twin-generator"


def get_username(account="1"):
    """Retrieve username for Account 1 or 2."""
    return ACCOUNT_USERNAMES.get(str(account), ACCOUNT_USERNAMES["1"])


DEFAULT_USERNAME = get_username("1")


def ensure_kaggle_cli():
    """Verify that kaggle CLI is installed and in PATH."""
    kaggle_bin = shutil.which("kaggle") or os.path.expanduser("~/.local/bin/kaggle")
    if not os.path.exists(kaggle_bin) and not shutil.which("kaggle"):
        print("❌ Error: kaggle CLI not found. Run: pip install kaggle")
        sys.exit(1)
    return kaggle_bin


def get_account_token(account="1"):
    """Retrieve API token for account 1 or 2."""
    if str(account) == "2":
        token_file = Path.home() / ".kaggle/access_token_2"
        env_token = os.environ.get("KAGGLE_API_TOKEN_2")
        if env_token:
            return env_token.strip()
        if token_file.exists():
            return token_file.read_text().strip()
        return None
    # Account 1 (default)
    token_file = Path.home() / ".kaggle/access_token"
    env_token = os.environ.get("KAGGLE_API_TOKEN_1") or os.environ.get("KAGGLE_API_TOKEN")
    if env_token:
        return env_token.strip()
    if token_file.exists():
        return token_file.read_text().strip()
    return None


def run_cmd(cmd, account="1", check=True, capture_output=True):
    """Run a shell command with proper environment for the selected account."""
    env = os.environ.copy()
    token = get_account_token(account)
    if token:
        env["KAGGLE_API_TOKEN"] = token

    result = subprocess.run(cmd, env=env, text=True, capture_output=capture_output)
    if check and result.returncode != 0:
        print(f"❌ Command failed (Account {account}): {' '.join(cmd)}")
        if result.stderr:
            print(result.stderr)
        sys.exit(result.returncode)
    return result


def cmd_auth(args):
    """Verify Kaggle authentication and show user info & quota for all configured accounts."""
    kaggle_bin = ensure_kaggle_cli()
    account = getattr(args, "account", "all")

    accounts_to_check = ["1", "2"] if account == "all" else [str(account)]
    for acc in accounts_to_check:
        token = get_account_token(acc)
        username = get_username(acc)
        print(f"\n🔑 Checking Kaggle API Authentication for Account {acc} ({username})...")
        if not token:
            print(f"⚠️ Account {acc} token not configured (set KAGGLE_API_TOKEN_{acc} or ~/.kaggle/access_token_{acc}).")
            continue
        res = run_cmd([kaggle_bin, "kernels", "list", "--mine", "--page-size", "3"], account=acc, check=False)
        if res.returncode == 0:
            print(f"✅ Kaggle Account {acc} ({username}) Authenticated successfully!")
            print("Recent Cloud Kernels:")
            print(res.stdout.strip())
            quota_res = run_cmd([kaggle_bin, "quota"], account=acc, check=False)
            if quota_res.returncode == 0:
                print("\nCompute Quota:")
                print(quota_res.stdout.strip())
        else:
            print(f"❌ Authentication failed for Account {acc}.")
            if res.stderr:
                print(res.stderr)


def cmd_train_visdrone(args):
    """Package and push YOLOv8 VisDrone fine-tuning notebook to Kaggle GPU."""
    kaggle_bin = ensure_kaggle_cli()
    kernel_dir = STAGING_DIR / VISDRONE_SLUG
    kernel_dir.mkdir(parents=True, exist_ok=True)

    # 1. Copy notebook
    dest_nb = kernel_dir / "sutra_visdrone_train.ipynb"
    shutil.copyfile(NOTEBOOK_PATH, dest_nb)

    # 2. Write metadata
    metadata = {
        "id": f"{DEFAULT_USERNAME}/{VISDRONE_SLUG}",
        "title": "SUTRA YOLOv8 VisDrone SAR Drone Fine-Tuning",
        "code_file": "sutra_visdrone_train.ipynb",
        "language": "python",
        "kernel_type": "notebook",
        "is_private": "true",
        "enable_gpu": "true",
        "enable_tpu": "false",
        "enable_internet": "true",
        "dataset_sources": [],
        "competition_sources": [],
        "kernel_sources": [],
        "model_sources": []
    }
    with open(kernel_dir / "kernel-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📦 Staged VisDrone fine-tuning kernel at {kernel_dir}")
    print(f"🚀 Dispatching to Kaggle Cloud GPU (NvidiaTeslaT4 16GB)...")

    cmd = [
        kaggle_bin, "kernels", "push",
        "-p", str(kernel_dir),
        "--accelerator", "NvidiaTeslaT4"
    ]
    res = run_cmd(cmd)
    print(res.stdout)
    print(f"✅ Job successfully submitted to Kaggle Cloud GPU!")
    print(f"   Kernel URL: https://www.kaggle.com/code/{DEFAULT_USERNAME}/{VISDRONE_SLUG}")

    if not args.push_only:
        poll_kernel(DEFAULT_USERNAME, VISDRONE_SLUG, auto_pull=True)


def cmd_render_blender(args):
    """Package and push headless Blender disaster world rendering to Kaggle T4."""
    kaggle_bin = ensure_kaggle_cli()
    kernel_dir = STAGING_DIR / BLENDER_SLUG
    kernel_dir.mkdir(parents=True, exist_ok=True)

    # Build automated blender rendering notebook
    nb_content = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "# Download Blender 4.2 LTS Linux x64\n",
                    "!wget -q https://download.blender.org/release/Blender4.2/blender-4.2.0-linux-x64.tar.xz\n",
                    "!tar -xf blender-4.2.0-linux-x64.tar.xz\n",
                    "print('Blender 4.2 installed!')\n"
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "# Setup GPU device script\n",
                    "code = '''\n",
                    "import bpy\n",
                    "bpy.context.scene.render.engine = 'CYCLES'\n",
                    "prefs = bpy.context.preferences.addons['cycles'].preferences\n",
                    "prefs.compute_device_type = 'CUDA'\n",
                    "prefs.get_devices()\n",
                    "for d in prefs.devices:\n",
                    "    d.use = True\n",
                    "bpy.context.scene.cycles.device = 'GPU'\n",
                    "print('GPU Cycles active!')\n",
                    "'''\n",
                    "with open('enable_gpu.py', 'w') as f:\n",
                    "    f.write(code)\n"
                ]
            }
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10.0"}
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    nb_file = kernel_dir / "blender_render.ipynb"
    with open(nb_file, "w") as f:
        json.dump(nb_content, f, indent=2)

    metadata = {
        "id": f"{DEFAULT_USERNAME}/{BLENDER_SLUG}",
        "title": "SUTRA Blender Submerged Village 4K Cycles Render",
        "code_file": "blender_render.ipynb",
        "language": "python",
        "kernel_type": "notebook",
        "is_private": "true",
        "enable_gpu": "true",
        "enable_tpu": "false",
        "enable_internet": "true",
        "dataset_sources": [],
        "competition_sources": [],
        "kernel_sources": [],
        "model_sources": []
    }
    with open(kernel_dir / "kernel-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📦 Staged Blender render kernel at {kernel_dir}")
    print(f"🚀 Dispatching to Kaggle Cloud GPU (NvidiaTeslaT4)...")

    cmd = [
        kaggle_bin, "kernels", "push",
        "-p", str(kernel_dir),
        "--accelerator", "NvidiaTeslaT4"
    ]
    res = run_cmd(cmd)
    print(res.stdout)
    print(f"✅ Blender render job queued on Kaggle GPU!")


def cmd_build_canopy(args):
    """Package and dispatch Forest Canopy 3D world building script to Kaggle GPU."""
    kaggle_bin = ensure_kaggle_cli()
    kernel_dir = STAGING_DIR / CANOPY_SLUG
    kernel_dir.mkdir(parents=True, exist_ok=True)

    account = getattr(args, "account", "1")
    username = get_username(account)

    # Copy script
    src_script = PROJECT_ROOT / "kaggle_pipeline/generate_sutra_canopy_world.py"
    dest_script = kernel_dir / "generate_sutra_canopy_world.py"
    shutil.copyfile(src_script, dest_script)

    metadata = {
        "id": f"{username}/{CANOPY_SLUG}",
        "title": "SUTRA Forest Canopy 3D Digital Twin Generator",
        "code_file": "generate_sutra_canopy_world.py",
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
    with open(kernel_dir / "kernel-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📦 Staged Canopy World Generator at {kernel_dir}")
    print(f"🚀 Dispatching to Kaggle Cloud GPU (NvidiaTeslaT4) under account {username}...")

    cmd = [
        kaggle_bin, "kernels", "push",
        "-p", str(kernel_dir),
        "--accelerator", "NvidiaTeslaT4"
    ]
    res = run_cmd(cmd, account=account)
    print(res.stdout)
    print(f"✅ Canopy generator job successfully submitted to Kaggle GPU!")
    print(f"   Kernel URL: https://www.kaggle.com/code/{username}/{CANOPY_SLUG}")

    if not args.push_only:
        poll_kernel(username, CANOPY_SLUG, auto_pull=False)
        cmd_pull_canopy(args)


def cmd_pull_canopy(args):
    """Download built canopy world package from Kaggle GPU."""
    kaggle_bin = ensure_kaggle_cli()
    account = getattr(args, "account", "1")
    username = get_username(account)
    kernel_ref = f"{username}/{CANOPY_SLUG}"
    dest_dir = PROJECT_ROOT / "kaggle_output"
    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"⬇️ Downloading canopy output from {kernel_ref}...")
    res = run_cmd([kaggle_bin, "kernels", "output", kernel_ref, "-p", str(dest_dir)], account=account)
    print(res.stdout)
    print(f"✅ Canopy world package downloaded to {dest_dir}!")


def poll_kernel(username, slug, auto_pull=False):
    """Monitor kernel until complete."""
    kaggle_bin = ensure_kaggle_cli()
    kernel_ref = f"{username}/{slug}"
    print(f"\n⏳ Monitoring Cloud GPU execution for {kernel_ref}...")

    start_time = time.time()
    while True:
        res = run_cmd([kaggle_bin, "kernels", "status", kernel_ref], check=False)
        status_line = res.stdout.strip()
        elapsed = int(time.time() - start_time)
        print(f"[{elapsed:03d}s] {status_line}")

        if "complete" in status_line.lower():
            print(f"🎉 Job completed successfully in {elapsed}s!")
            if auto_pull:
                cmd_pull_weights(argparse.Namespace(slug=kernel_ref, dest=str(DEFAULT_WEIGHTS_DIR)))
            break
        elif "error" in status_line.lower() or "failed" in status_line.lower():
            print(f"❌ Kernel execution encountered an error.")
            break

        time.sleep(15)


def cmd_status(args):
    """Check status of a remote kernel."""
    kaggle_bin = ensure_kaggle_cli()
    slug = args.slug or f"{DEFAULT_USERNAME}/{VISDRONE_SLUG}"
    res = run_cmd([kaggle_bin, "kernels", "status", slug], check=False)
    print(res.stdout)


def cmd_pull_weights(args):
    """Download outputs (best.pt, best.onnx) from Kaggle kernel."""
    kaggle_bin = ensure_kaggle_cli()
    slug = getattr(args, "slug", None) or f"{DEFAULT_USERNAME}/{VISDRONE_SLUG}"
    dest = getattr(args, "dest", None) or str(DEFAULT_WEIGHTS_DIR)

    dest_path = Path(dest)
    dest_path.mkdir(parents=True, exist_ok=True)

    print(f"📥 Pulling model outputs from {slug} to {dest_path}...")
    cmd = [
        kaggle_bin, "kernels", "output",
        slug,
        "-p", str(dest_path),
        "-o"
    ]
    res = run_cmd(cmd)
    print(res.stdout)
    print("✅ Model artifacts synchronized successfully!")


def main():
    parser = argparse.ArgumentParser(description="Project SUTRA — Kaggle Cloud GPU Connector")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # auth
    p_auth = subparsers.add_parser("auth", help="Verify Kaggle API credentials")
    p_auth.add_argument("--account", choices=["1", "2", "all"], default="all", help="Account to verify")
    p_auth.set_defaults(func=cmd_auth)

    # train-visdrone
    p_train = subparsers.add_parser("train-visdrone", help="Dispatch VisDrone YOLOv8 training to Kaggle T4")
    p_train.add_argument("--push-only", action="store_true", help="Push and return immediately without polling")
    p_train.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to use")
    p_train.set_defaults(func=cmd_train_visdrone)

    # status
    p_status = subparsers.add_parser("status", help="Check remote kernel status")
    p_status.add_argument("slug", nargs="?", default=None, help="Kernel slug (owner/name)")
    p_status.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to check")
    p_status.set_defaults(func=cmd_status)

    # pull-weights
    p_pull = subparsers.add_parser("pull-weights", help="Download trained weights from Kaggle")
    p_pull.add_argument("slug", nargs="?", default=None, help="Kernel slug")
    p_pull.add_argument("--dest", default=str(DEFAULT_WEIGHTS_DIR), help="Local destination directory")
    p_pull.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to pull from")
    p_pull.set_defaults(func=cmd_pull_weights)

    # render-blender
    p_blender = subparsers.add_parser("render-blender", help="Dispatch Blender 3D render to Kaggle T4")
    p_blender.add_argument("--push-only", action="store_true", help="Push without waiting")
    p_blender.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to use")
    p_blender.set_defaults(func=cmd_render_blender)

    # build-canopy
    p_canopy = subparsers.add_parser("build-canopy", help="Dispatch Forest Canopy 3D generator to Kaggle T4")
    p_canopy.add_argument("--push-only", action="store_true", help="Push without waiting")
    p_canopy.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to use")
    p_canopy.set_defaults(func=cmd_build_canopy)

    # pull-canopy
    p_pull_canopy = subparsers.add_parser("pull-canopy", help="Pull built canopy package from Kaggle")
    p_pull_canopy.add_argument("--account", choices=["1", "2"], default="1", help="Target Kaggle account to pull from")
    p_pull_canopy.set_defaults(func=cmd_pull_canopy)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
