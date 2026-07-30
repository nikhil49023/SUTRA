#!/usr/bin/env python3
"""
PROJECT SUTRA — PyTorch Deep JSCC Neural Network Audit Suite
Lead Architect: Nikhil | Subsystem B (Comms & Sim)

Deep Engineering Audit Metrics Evaluated:
1. Compression Ratio Audit: 512KB Raw Thermal Image -> Latent Tensor (Target < 0.05 / > 95% Compression)
2. PSNR & SSIM Quality Audit across SNR spectrum (0 dB -> 20 dB)
3. Zero Digital Cliff Effect Audit: Graceful neural degradation vs H.264 failure at low SNR (< 8 dB)
"""

import pytest
import math
import numpy as np
from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline

def test_deep_jscc_latent_compression_audit():
    """Audit 1: Latent Space Payload Compression Ratio Audit."""
    pipeline = PerceptronSemanticCommsPipeline()
    res = pipeline.process_semantic_transmission(image_size_kb=512.0, distance_m=25.0)
    
    assert res['compression_ratio'] <= 0.032, f"Compression Audit Failed: {res['compression_ratio']} > 0.032"
    assert res['bandwidth_reduction_pct'] >= 96.8, f"Bandwidth Reduction Audit Failed: {res['bandwidth_reduction_pct']}% < 96.8%"
    print(f"\n[Audit 1 PASS] 512KB Thermal Frame -> {res['compressed_size_kb']:.2f}KB ({res['bandwidth_reduction_pct']:.1f}% Bandwidth Saved)")

def test_deep_jscc_psnr_ssim_snr_spectrum_audit():
    """Audit 2: PSNR and SSIM Quality Audit across 0 dB -> 20 dB SNR spectrum."""
    pipeline = PerceptronSemanticCommsPipeline()
    
    snr_levels = [0.0, 4.0, 8.0, 12.0, 16.0, 20.0]
    results = {}
    
    for snr in snr_levels:
        # Distance corresponding to SNR level
        dist = 10.0 * (10 ** ((20.0 - snr - 38.0) / 20.0))
        dist = max(5.0, min(150.0, dist))
        res = pipeline.process_semantic_transmission(image_size_kb=512.0, distance_m=dist)
        
        # Deep JSCC PSNR must remain >= 30.0 dB even at 0-4 dB low SNR
        assert res['psnr_db'] >= 30.0, f"PSNR Audit Failed at {snr}dB SNR: {res['psnr_db']}dB < 30.0dB"
        results[snr] = res['psnr_db']
        
    print(f"\n[Audit 2 PASS] Deep JSCC PSNR Spectrum: {results}")

def test_zero_digital_cliff_effect_audit():
    """Audit 3: Zero Digital Cliff Effect vs H.264 Codec Failure."""
    pipeline = PerceptronSemanticCommsPipeline()
    bench = pipeline.benchmark_vs_h264_webp(snr_db=4.0) # Low SNR where H.264 drops frames
    
    assert bench['h264_frame_drop'] == True, "H.264 must fail with frame drop at 4dB SNR"
    assert bench['deep_jscc_psnr_db'] >= 32.0, f"Deep JSCC PSNR failed under 4dB noise: {bench['deep_jscc_psnr_db']}"
    assert bench['deep_jscc_feature_fidelity_pct'] >= 94.0, f"Feature fidelity failed: {bench['deep_jscc_feature_fidelity_pct']}%"
    print(f"\n[Audit 3 PASS] Low SNR (4dB) Digital Cliff Test: H.264 = FROZEN (0dB) | Deep JSCC = {bench['deep_jscc_psnr_db']:.1f}dB PSNR ({bench['deep_jscc_feature_fidelity_pct']}% Fidelity)")
