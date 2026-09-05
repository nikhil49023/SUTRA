"""
Smart Horizon GCS — Tactical HUD Color Palette & Styling Theme
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

try:
    from PySide6.QtGui import QColor, QFont
except ImportError:
    class QColor:  # type: ignore
        def __init__(self, r=0, g=0, b=0, a=255):
            self.r, self.g, self.b, self.a = r, g, b, a

        def isValid(self) -> bool:
            return True

        def name(self) -> str:
            return f"rgba({self.r},{self.g},{self.b},{self.a/255})"

    class QFont:  # type: ignore
        Weight = type("Weight", (), {"Bold": 75, "Normal": 50})
        StyleHint = type("StyleHint", (), {"Monospace": 1, "SansSerif": 2})

        def __init__(self, family="Monospace", size=10, weight=50):
            self.family, self.size, self.weight = family, size, weight

        def setStyleHint(self, hint):
            pass

        def bold(self) -> bool:
            return self.weight >= 75


class HUDTheme:
    """
    Standardized tactical color constants and typography for HUD and PFD avionics.
    """

    # Aviation Artificial Horizon
    COLOR_SKY = QColor(14, 116, 144, 200)       # Cyan/Blue sky (#0e7490)
    COLOR_GROUND = QColor(120, 53, 15, 200)     # Earth brown (#78350f)
    COLOR_HORIZON_LINE = QColor(255, 255, 255, 240)
    COLOR_PITCH_LADDER = QColor(255, 255, 255, 220)
    COLOR_RETICLE = QColor(0, 242, 254)         # Neon tactical cyan (#00f2fe)

    # Status Indicators
    COLOR_PRIMARY = QColor(56, 189, 248)        # Sky blue (#38bdf8)
    COLOR_POSITIVE = QColor(16, 185, 129)       # Emerald (#10b981)
    COLOR_WARNING = QColor(245, 158, 11)        # Amber (#f59e0b)
    COLOR_CRITICAL = QColor(239, 68, 68)        # Crimson (#ef4444)
    COLOR_EMERGENCY = QColor(220, 38, 38)       # Deep Red (#dc2626)
    COLOR_STALE = QColor(100, 116, 139)         # Slate gray (#64748b)
    COLOR_DISABLED = QColor(51, 65, 85)         # Dark slate (#334155)

    # Instrument Panels
    COLOR_GLASS_BG = QColor(9, 14, 26, 210)     # Semi-transparent dark glass
    COLOR_BORDER = QColor(30, 41, 59, 230)
    COLOR_TEXT_PRIMARY = QColor(241, 245, 249)  # White text (#f1f5f9)
    COLOR_TEXT_MUTED = QColor(148, 163, 184)    # Slate text (#94a3b8)

    # Fonts
    @staticmethod
    def font_instrument_value(size: int = 11) -> QFont:
        f = QFont("Monospace", size, QFont.Weight.Bold)
        f.setStyleHint(QFont.StyleHint.Monospace)
        return f

    @staticmethod
    def font_instrument_label(size: int = 9) -> QFont:
        f = QFont("Sans-Serif", size, QFont.Weight.Bold)
        return f
