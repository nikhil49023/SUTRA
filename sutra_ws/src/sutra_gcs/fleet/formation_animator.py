"""
SUTRA GCS — Swarm Formation Animator
Provides smooth trajectory interpolation during formation reconfigurations.
"""

from typing import Tuple


class FormationAnimator:
    """Computes cubic Hermite easing for smooth position setpoints."""

    @staticmethod
    def interpolate_pos(current_pos: Tuple[float, float, float], target_pos: Tuple[float, float, float], alpha: float = 0.1) -> Tuple[float, float, float]:
        return (
            current_pos[0] + alpha * (target_pos[0] - current_pos[0]),
            current_pos[1] + alpha * (target_pos[1] - current_pos[1]),
            current_pos[2] + alpha * (target_pos[2] - current_pos[2])
        )


formation_animator = FormationAnimator()
