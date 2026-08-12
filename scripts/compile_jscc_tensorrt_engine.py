#!/usr/bin/env python3
"""
PROJECT SUTRA — Deep JSCC TensorRT Engine Compiler & FP16 Execution Builder
Author: Tech Lead Nikhil (Subsystem B Lead ⚡)

Features:
1. Converts PyTorch Deep JSCC Autoencoder -> ONNX with dynamic shapes (PyTorch 2.x dynamo compatible).
2. Builds TensorRT FP16 / INT8 `.engine` binary using TensorRT Python API or `trtexec` CLI.
3. Generates TensorRT engine manifest (`jscc_encoder.engine.json`) specifying NPU execution profiles.
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path

sys.path.insert(0, os.path.abspath("sutra_ws/src/sutra_comms"))
from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline


def compile_tensorrt_engine():
    print("==========================================================================")
    print(" ⚡ SUTRA Deep JSCC TensorRT Engine Compiler & FP16 NPU Optimizer")
    print("==========================================================================")

    models_dir = Path("sutra_ws/src/sutra_comms/models")
    models_dir.mkdir(parents=True, exist_ok=True)

    encoder_onnx = models_dir / "jscc_encoder.onnx"
    decoder_onnx = models_dir / "jscc_decoder.onnx"
    encoder_engine = models_dir / "jscc_encoder.engine"
    spec_json = models_dir / "jscc_encoder.engine.json"

    # Step 1: Export ONNX models using pipeline
    print("📦 Step 1: Exporting ONNX models with dynamic shape profiles...")
    pipeline = PerceptronSemanticCommsPipeline()
    onnx_paths = pipeline.export_onnx()
    print(f"   ✓ Encoder ONNX: {encoder_onnx}")
    print(f"   ✓ Decoder ONNX: {decoder_onnx}")

    # Step 2: Attempt TensorRT CLI / API compilation
    print("\n🚀 Step 2: Compiling TensorRT FP16 Engine for Edge NPUs...")
    trt_built = False
    
    # Check trtexec CLI
    trtexec_bin = subprocess.run(["which", "trtexec"], capture_output=True, text=True).stdout.strip()
    if trtexec_bin and os.path.exists(trtexec_bin):
        print(f"   ⚡ Found trtexec at: {trtexec_bin}")
        cmd = [
            trtexec_bin,
            f"--onnx={encoder_onnx}",
            f"--saveEngine={encoder_engine}",
            "--fp16",
            "--workspace=1024",
            "--minShapes=features:1x512",
            "--optShapes=features:4x512",
            "--maxShapes=features:16x512",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print("   ✅ TensorRT Engine successfully compiled via trtexec!")
            trt_built = True

    if not trt_built:
        try:
            import tensorrt as trt
            print("   ⚡ Building TensorRT Engine using TensorRT Python API...")
            TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
            builder = trt.Builder(TRT_LOGGER)
            network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
            config = builder.create_builder_config()
            parser = trt.OnnxParser(network, TRT_LOGGER)
            
            with open(encoder_onnx, 'rb') as f:
                if parser.parse(f.read()):
                    config.set_flag(trt.BuilderFlag.FP16)
                    serialized_engine = builder.build_serialized_network(network, config)
                    if serialized_engine is not None:
                        with open(encoder_engine, 'wb') as ef:
                            ef.write(serialized_engine)
                        print("   ✅ TensorRT Engine built via Python API!")
                        trt_built = True
        except Exception as e:
            print(f"   ℹ️ TensorRT native SDK compilation not active: {e}")

    # Step 3: Write TensorRT Spec Manifest
    engine_spec = {
        "model_name": "universal_deep_jscc_encoder",
        "version": "2.0.0",
        "architecture": "Perceptron Deep JSCC Autoencoder",
        "precision": "FP16",
        "target_hardware": "NVIDIA Jetson Orin Nano / Hailo-8L NPU / RTX GPU",
        "input_shape": "B x 512 (features)",
        "bottleneck_dim": 16,
        "onnx_path": str(encoder_onnx),
        "engine_path": str(encoder_engine) if trt_built else "ONNX_RUNTIME_FALLBACK",
        "compiled": trt_built,
        "timestamp": time.time(),
    }

    with open(spec_json, "w") as f:
        json.dump(engine_spec, f, indent=2)

    print(f"\n📋 Step 3: Generated Engine Manifest Spec: {spec_json}")
    print(json.dumps(engine_spec, indent=2))
    print("\n✅ Deep JSCC TensorRT compilation workflow completed.")
    return trt_built


if __name__ == '__main__':
    compile_tensorrt_engine()
