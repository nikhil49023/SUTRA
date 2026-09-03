#!/usr/bin/env python3
"""
SMART HORIZON GCS — Master Launcher (Compatibility Alias)
"""
import sys, os
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
from start_gcs import main

if __name__ == "__main__":
    main()
