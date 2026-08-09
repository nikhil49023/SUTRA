#!/usr/bin/env python3
"""
PyTest Suite for Subsystem B Improvements: ONNX JSCC Export & Low-Latency Binary Mesh Protocol.
Author: Nikhil (Tech Architect & Subsystem B Lead)
"""

import os
import torch
import pytest
from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline, ONNXJSCTransceiver
from sutra_comms.binary_mesh_protocol import BinaryMeshProtocol, MSG_TYPE_TELEMETRY, MSG_TYPE_JSCC_FEATURE


def test_onnx_jscc_export_and_execution():
    pipeline = PerceptronSemanticCommsPipeline()
    export_res = pipeline.export_onnx()
    
    assert os.path.exists(export_res['encoder_onnx'])
    assert os.path.exists(export_res['decoder_onnx'])
    
    # Initialize ONNX Transceiver
    transceiver = ONNXJSCTransceiver(
        encoder_path=export_res['encoder_onnx'],
        decoder_path=export_res['decoder_onnx']
    )
    
    dummy_input = torch.randn(1, 512)
    encoded_symbols = transceiver.encode(dummy_input)
    
    assert encoded_symbols.shape == (1, 16)
    assert not torch.isnan(encoded_symbols).any()


def test_binary_mesh_protocol_pack_unpack():
    payload = b"SUTRA_TEST_TELEMETRY_LAT_17.385_LON_78.486"
    packed = BinaryMeshProtocol.pack(
        msg_type=MSG_TYPE_TELEMETRY,
        sender_id=10,
        receiver_id=1,
        sequence_num=501,
        payload=payload
    )
    
    assert packed.startswith(b'SU')
    
    unpacked = BinaryMeshProtocol.unpack(packed)
    assert unpacked is not None
    assert unpacked.msg_type == MSG_TYPE_TELEMETRY
    assert unpacked.sender_id == 10
    assert unpacked.receiver_id == 1
    assert unpacked.sequence_num == 501
    assert unpacked.payload == payload


def test_binary_mesh_protocol_crc_corruption_rejection():
    payload = b"SUTRA_SENSITIVE_CONSENSUS_DATA"
    packed = bytearray(BinaryMeshProtocol.pack(
        msg_type=MSG_TYPE_JSCC_FEATURE,
        sender_id=5,
        receiver_id=255,
        sequence_num=42,
        payload=payload
    ))
    
    # Corrupt 1 byte in payload
    packed[12] ^= 0xFF
    
    unpacked = BinaryMeshProtocol.unpack(bytes(packed))
    assert unpacked is None  # Must reject corrupted payload due to CRC mismatch
