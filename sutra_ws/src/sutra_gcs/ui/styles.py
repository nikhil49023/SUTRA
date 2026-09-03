"""
Smart Horizon GCS — Tactical Dark Theme Stylesheet & Palette Constants
Subsystem: UI Layer
"""

# Color Palette Constants
COLOR_BG_DARK = "#050811"
COLOR_BG_PANEL = "#090e1a"
COLOR_BG_CARD = "#0b111e"
COLOR_BG_HOVER = "#1e293b"
COLOR_BORDER = "#1e293b"
COLOR_BORDER_FOCUS = "#00f2fe"

COLOR_CYAN = "#00f2fe"
COLOR_BLUE = "#38bdf8"
COLOR_GREEN = "#10b981"
COLOR_YELLOW = "#f59e0b"
COLOR_RED = "#ef4444"

COLOR_TEXT_MAIN = "#f8fafc"
COLOR_TEXT_MUTED = "#94a3b8"
COLOR_TEXT_DIM = "#64748b"

TACTICAL_QSS = f"""
QMainWindow {{
    background-color: {COLOR_BG_DARK};
    color: {COLOR_TEXT_MAIN};
}}

QWidget {{
    background-color: transparent;
    color: {COLOR_TEXT_MAIN};
    font-family: 'JetBrains Mono', 'Consolas', 'Segoe UI', monospace;
    font-size: 11px;
}}

QFrame#panel {{
    background-color: {COLOR_BG_PANEL};
    border: 1px solid {COLOR_BORDER};
    border-radius: 4px;
}}

QFrame#card {{
    background-color: {COLOR_BG_CARD};
    border: 1px solid {COLOR_BORDER};
    border-radius: 4px;
    padding: 6px;
}}

QPushButton {{
    background-color: #111827;
    color: {COLOR_TEXT_MAIN};
    border: 1px solid {COLOR_BORDER};
    border-radius: 4px;
    padding: 6px 12px;
    font-weight: 600;
}}

QPushButton:hover {{
    background-color: {COLOR_BG_HOVER};
    border-color: {COLOR_CYAN};
    color: {COLOR_CYAN};
}}

QPushButton:pressed {{
    background-color: #0f172a;
}}

QPushButton#nav_btn {{
    text-align: left;
    padding: 10px 14px;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    color: {COLOR_TEXT_MUTED};
    font-size: 11px;
    font-weight: bold;
}}

QPushButton#nav_btn:hover {{
    background-color: #111827;
    color: {COLOR_CYAN};
}}

QPushButton#nav_btn_active {{
    text-align: left;
    padding: 10px 14px;
    border-left: 3px solid {COLOR_CYAN};
    background-color: rgba(0, 242, 254, 0.1);
    color: {COLOR_CYAN};
    font-size: 11px;
    font-weight: bold;
}}

QPushButton#emergency_btn {{
    background-color: rgba(239, 68, 68, 0.2);
    border: 1px solid {COLOR_RED};
    color: #fca5a5;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 4px;
}}

QPushButton#emergency_btn:hover {{
    background-color: {COLOR_RED};
    color: #ffffff;
}}

QTabWidget::pane {{
    border: 1px solid {COLOR_BORDER};
    background-color: {COLOR_BG_PANEL};
}}

QTabBar::tab {{
    background-color: #0b111e;
    color: {COLOR_TEXT_MUTED};
    border: 1px solid {COLOR_BORDER};
    padding: 5px 12px;
    margin-right: 2px;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    font-size: 10px;
    font-weight: bold;
}}

QTabBar::tab:selected {{
    background-color: {COLOR_BG_PANEL};
    color: {COLOR_CYAN};
    border-bottom: 2px solid {COLOR_CYAN};
}}

QTabBar::tab:hover {{
    color: {COLOR_TEXT_MAIN};
}}

QTextEdit, QListWidget, QTableWidget {{
    background-color: #03060c;
    border: 1px solid {COLOR_BORDER};
    color: {COLOR_TEXT_MAIN};
    border-radius: 3px;
}}

QScrollBar:vertical {{
    border: none;
    background: #090e1a;
    width: 6px;
    margin: 0px;
}}

QScrollBar::handle:vertical {{
    background: #1e293b;
    min-height: 20px;
    border-radius: 3px;
}}

QScrollBar::handle:vertical:hover {{
    background: {COLOR_CYAN};
}}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0px;
}}
"""
