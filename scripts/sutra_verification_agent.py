#!/usr/bin/env python3
"""SUTRA Verification Agent — runs real test suites and reports only measured results.

Built on the Google Antigravity SDK (google.antigravity).
Complies with AGENTS.md ABSOLUTE RULE: no mock/projected numbers, only live
pytest / npm run build stdout is reported as evidence.

Usage:
    scripts/.venv-antigravity/bin/python scripts/sutra_verification_agent.py
    # or with a custom task:
    scripts/.venv-antigravity/bin/python scripts/sutra_verification_agent.py "verify subsystem B and report gaps"
"""

import asyncio
import json
import os
import subprocess
import sys
from typing import Any

from google.antigravity import Agent
from google.antigravity.connections.local.local_connection_config import LocalAgentConfig

PROJECT = "landing-pages-498606"
LOCATION = "us-central1"
WORKSPACE = "/home/nikhil/Desktop/Project SUTRA"

SUITES = [
    ("Subsystem A (GNC)", ["pytest", "sutra_ws/src/sutra_gnc/test/", "-q", "--durations=3"]),
    ("Subsystem B (Comms)", ["pytest", "sutra_ws/src/sutra_comms/test/", "-q", "--durations=3"]),
    ("Subsystem C (Perception)", ["pytest", "sutra_ws/src/sutra_perception/test/", "-q", "--durations=3"]),
    ("Subsystem Sim", ["pytest", "sutra_ws/src/sutra_sim/test/", "-q"]),
]

GCS_BUILD = ["npm", "run", "build"]


def run_cmd(cmd: list[str], cwd: str = WORKSPACE, timeout: int = 600) -> dict[str, Any]:
    """Run a shell command and return its real captured output (stdout + stderr + returncode)."""
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return {
            "command": " ".join(cmd),
            "returncode": proc.returncode,
            "stdout_tail": proc.stdout[-4000:],
            "stderr_tail": proc.stderr[-2000:],
        }
    except subprocess.TimeoutExpired:
        return {"command": " ".join(cmd), "returncode": -1, "stdout_tail": "", "stderr_tail": f"TIMEOUT after {timeout}s"}


def verify_all_suites() -> str:
    """Run every SUTRA verification suite and return ONLY measured output."""
    results: list[dict[str, Any]] = []
    for name, cmd in SUITES:
        results.append({"suite": name, **run_cmd(cmd)})
    results.append({"suite": "Subsystem D (GCS build)", **run_cmd(GCS_BUILD, cwd=f"{WORKSPACE}/sutra_ws/src/sutra_gcs")})
    return json.dumps(results, indent=2)


RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "2-3 sentence overall verification summary"},
        "suites": {
            "type": "object",
            "description": "One entry per subsystem with real pass/fail counts verbatim from live stdout",
        },
        "failures": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Any suite that did not pass cleanly, with the real error line from stdout",
        },
        "recommendations": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Concrete next actions based only on the measured results",
        },
    },
    "required": ["summary", "suites", "failures", "recommendations"],
}

SYSTEM_INSTRUCTIONS = f"""
You are the SUTRA Verification Agent for Project SUTRA, an autonomous multi-drone swarm
system (6 subsystems: A GNC, B Comms/Sim, C Perception, D GCS, E Docs, F Ops).

ABSOLUTE RULES (from AGENTS.md, non-negotiable):
1. NEVER invent, project, or estimate benchmark numbers. Only numbers that appear
   verbatim in live command output may be reported.
2. If a metric was not measured, mark it "UNTESTED — <reason>" instead of guessing.
3. The `verify_all_suites` tool returns REAL captured pytest / npm stdout. Base every
   claim about test results strictly on that output.
4. Report pass/fail counts exactly as printed (e.g. "44 passed in 11.11s").
5. If DOCS.md on disk contradicts live output, flag the discrepancy as a failure.

Workspace: {WORKSPACE}
Use built-in file tools to inspect DOCS.md files and source when assessing gaps.
Keep responses tight: table of suites -> status, the failure list, recommendations.
"""


async def main(task: str) -> None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    config = LocalAgentConfig(
        system_instructions=SYSTEM_INSTRUCTIONS,
        tools=[verify_all_suites],
        workspaces=[WORKSPACE],
        response_schema=RESPONSE_SCHEMA,
        **({"api_key": api_key} if api_key else {"vertex": True, "project": PROJECT, "location": LOCATION}),
    )
    print("=== SUTRA Verification Agent (Antigravity SDK) ===")
    print("=== Using:", "Gemini API key (free tier)" if api_key else "Vertex AI (project billing required)")
    print("=== Running suite verification, then LLM assessment... ===")
    async with Agent(config=config) as agent:
        response = await agent.chat(task)
        print("--- RESPONSE TEXT ---")
        print(await response.text())
        try:
            structured = await response.structured_output()
            if structured is not None:
                print("--- STRUCTURED SUMMARY ---")
                print(json.dumps(structured, indent=2))
        except Exception as exc:  # structured output unavailable
            print(f"(structured output unavailable: {exc})")


if __name__ == "__main__":
    task = sys.argv[1] if len(sys.argv) > 1 else (
        "Run the full verification suite and report, subsystem by subsystem, which "
        "suites pass with real numbers and which fail. Flag any DOCS.md claims that "
        "contradict the live output."
    )
    asyncio.run(main(task))
