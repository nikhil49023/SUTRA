"""
Smart Horizon GCS — AI Mission Advisor Conversational Assistant Panel
Subsystem: UI / AI Layer (Phase 10)
"""

from typing import Optional
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from ai.ai_manager import AIManager, ai_manager
from state.application_state import ApplicationState, StateStore, get_state_store


class MissionAdvisorPanel(QWidget):
    """
    Interactive natural language mission advisor supporting read-only telemetry queries and tactical explanations.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        manager: Optional[AIManager] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.manager = manager or ai_manager

        self._init_ui()

        # Subscribe to state store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _init_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        # 1. Header
        hdr = QLabel("TACTICAL AI ASSISTANT")
        hdr.setStyleSheet("color: #00f2fe; font-size: 11px; font-weight: 800; letter-spacing: 1px;")
        layout.addWidget(hdr)

        # 2. Chat Log Display
        self.chat_display = QTextEdit(self)
        self.chat_display.setReadOnly(True)
        self.chat_display.setStyleSheet(
            "background-color: #090e1a; border: 1px solid #1e293b; color: #f1f5f9; font-family: monospace; font-size: 10px; border-radius: 4px; padding: 6px;"
        )
        layout.addWidget(self.chat_display, stretch=1)

        # 3. Quick Query Suggestion Chips
        chips_layout = QHBoxLayout()
        chips_layout.setSpacing(4)

        for q in ["Lowest Battery?", "Mission ETA?", "Why Risk High?"]:
            btn = QPushButton(q)
            btn.setStyleSheet(
                "background-color: #0f172a; border: 1px solid #334155; color: #38bdf8; font-size: 9px; padding: 2px 6px; border-radius: 3px;"
            )
            btn.clicked.connect(lambda checked=False, query=q: self._send_query(query))
            chips_layout.addWidget(btn)

        layout.addLayout(chips_layout)

        # 4. Input Row
        input_row = QHBoxLayout()
        input_row.setSpacing(4)

        self.input_edit = QLineEdit(self)
        self.input_edit.setPlaceholderText("Ask tactical advisor (e.g. 'what is the current ETA?')...")
        self.input_edit.setStyleSheet(
            "background-color: #0b111e; border: 1px solid #1e293b; color: #f1f5f9; padding: 4px 8px; border-radius: 3px; font-size: 10px;"
        )
        self.input_edit.returnPressed.connect(self._on_send_clicked)
        input_row.addWidget(self.input_edit)

        self.send_btn = QPushButton("SEND")
        self.send_btn.setStyleSheet(
            "background-color: #0284c7; color: white; border: none; font-weight: bold; padding: 4px 10px; border-radius: 3px; font-size: 10px;"
        )
        self.send_btn.clicked.connect(self._on_send_clicked)
        input_row.addWidget(self.send_btn)

        layout.addLayout(input_row)

    def _on_send_clicked(self) -> None:
        text = self.input_edit.text().strip()
        if text:
            self.input_edit.clear()
            self._send_query(text)

    def _send_query(self, query: str) -> None:
        self.manager.ask_assistant(query)

    def _on_state_updated(self, state: ApplicationState) -> None:
        msgs = state.ai_state.assistant_messages
        log_text = ""
        for m in msgs:
            if m.sender == "USER":
                log_text += f"<p style='color:#38bdf8; margin:2px 0;'><b>OPERATOR:</b> {m.text}</p>"
            else:
                conf_str = f" <span style='color:#64748b;'>({m.confidence*100:.0f}% conf)</span>" if m.confidence else ""
                log_text += f"<p style='color:#10b981; margin:2px 0;'><b>AI:</b> {m.text}{conf_str}</p>"

        self.chat_display.setHtml(log_text)
        # Scroll to bottom
        sb = self.chat_display.verticalScrollBar()
        sb.setValue(sb.maximum())

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
