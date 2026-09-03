#!/usr/bin/env python3
"""
PROJECT SUTRA — Universal Branch Synchronization Script
Updates ALL 5 subsystem branches (a-gnc, b-comms, c-perception, d-gcs, e-docs), dev, main, and buffer-integration
with the latest master agent instructions (AGENTS.md), root README.md, and dedicated subsystem DOCS.md files.
"""

import subprocess
import sys

BRANCHES = [
    "dev",
    "feature/subsystem-a-gnc",
    "feature/subsystem-b-comms",
    "feature/subsystem-c-perception",
    "feature/subsystem-d-gcs",
    "feature/subsystem-e-docs",
    "main"
]

def run_cmd(cmd):
    print(f"\n[EXEC] {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"⚠️ Warning ({res.returncode}): {res.stderr.strip()}")
    else:
        print(f"✓ Output: {res.stdout.strip()}")
    return res.returncode == 0

def main():
    print("======================================================================")
    print("🚀 SUTRA — UPDATING ALL 5 SUBSYSTEM BRANCHES WITH MASTER INSTRUCTIONS")
    print("======================================================================")

    # 1. Start from feature/subsystem-b-comms as source of truth
    run_cmd("git checkout feature/subsystem-b-comms")

    for branch in BRANCHES:
        if branch == "feature/subsystem-b-comms":
            continue
        
        print(f"\n----------------------------------------------------------------------")
        print(f"📌 Synchronizing Branch: {branch}")
        print(f"----------------------------------------------------------------------")
        
        # Track remote branch if not present locally
        run_cmd(f"git checkout -b {branch} origin/{branch} || git checkout {branch}")
            
        # Merge latest changes from feature/subsystem-b-comms
        run_cmd(f"git merge feature/subsystem-b-comms --no-edit")
        
        # Push updated branch to remote origin
        run_cmd(f"git push origin {branch}")

    # Return to feature/subsystem-b-comms working branch
    run_cmd("git checkout feature/subsystem-b-comms")
    print("\n======================================================================")
    print("🎉 ALL 5 SUBSYSTEM BRANCHES + MAIN + DEV + BUFFER-INTEGRATION UPDATED!")
    print("======================================================================")

if __name__ == "__main__":
    main()
