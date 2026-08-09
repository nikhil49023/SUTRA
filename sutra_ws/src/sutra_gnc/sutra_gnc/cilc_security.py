#!/usr/bin/env python3
"""
SUTRA Subsystem A: CILC — Cryptographic Inter-agent Loop Closure Verifier
Reference: CILC (arXiv 2607.06700, 2026)
"""

import hashlib
import hmac
import json
import time
from typing import Dict, List, Optional

_DEFAULT_FLEET_KEY = b'SUTRA_FLEET_SWARM_KEY_2026_v1.0'


class CILCVerifier:
    def __init__(
        self,
        shared_key: bytes = _DEFAULT_FLEET_KEY,
        max_age_s: float = 5.0,
        trust_threshold: float = 0.8,
    ):
        if len(shared_key) < 16:
            raise ValueError('CILC shared_key must be at least 16 bytes.')
        self._key = shared_key
        self.max_age_s = max_age_s
        self.trust_threshold = trust_threshold
        self._agent_history: Dict[int, List[tuple]] = {}

    def sign_loop_closure(self, lc_data: Dict) -> str:
        canonical = self._canonical_bytes(lc_data)
        mac = hmac.new(self._key, canonical, hashlib.sha256)
        return mac.hexdigest()

    def verify_loop_closure(
        self, lc_data: Dict, signature: str
    ) -> bool:
        agent_id = lc_data.get('agent_id', -1)
        ts = lc_data.get('timestamp', 0.0)
        age = time.time() - ts
        if age > self.max_age_s or age < -1.0:
            self._record_result(agent_id, valid=False)
            return False

        canonical = self._canonical_bytes(lc_data)
        expected_mac = hmac.new(self._key, canonical, hashlib.sha256)
        try:
            expected_hex = expected_mac.hexdigest()
            result = hmac.compare_digest(expected_hex, signature)
        except (TypeError, ValueError):
            result = False

        self._record_result(agent_id, valid=result)
        return result

    def is_trusted_agent(
        self,
        agent_id: int,
        min_history: int = 3,
    ) -> bool:
        history = self._agent_history.get(agent_id, [])
        recent = history[-20:]
        if len(recent) < min_history:
            return True
        valid_count = sum(1 for _, v in recent if v)
        return (valid_count / len(recent)) >= self.trust_threshold

    def get_agent_trust_score(self, agent_id: int) -> float:
        history = self._agent_history.get(agent_id, [])
        recent = history[-20:]
        if not recent:
            return 1.0
        return sum(1 for _, v in recent if v) / len(recent)

    def get_fleet_trust_report(self) -> Dict:
        return {
            agent_id: round(self.get_agent_trust_score(agent_id), 3)
            for agent_id in self._agent_history
        }

    def _canonical_bytes(self, lc_data: Dict) -> bytes:
        canonical_dict = {
            k: (round(v, 6) if isinstance(v, float) else v)
            for k, v in sorted(lc_data.items())
        }
        return json.dumps(canonical_dict, sort_keys=True, separators=(',', ':')).encode('utf-8')

    def _record_result(self, agent_id: int, valid: bool) -> None:
        if agent_id not in self._agent_history:
            self._agent_history[agent_id] = []
        self._agent_history[agent_id].append((time.time(), valid))
        if len(self._agent_history[agent_id]) > 100:
            self._agent_history[agent_id] = self._agent_history[agent_id][-100:]
