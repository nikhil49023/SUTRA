"""
Smart Horizon GCS — AI Operator Approval & Advisory Queue Panel
Subsystem: UI / AI Layer (Phase 10)
"""

from typing import Optional
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ai.ai_manager import AIManager, ai_manager
from state.ai_state import RecommendationItem, RecommendationSeverity
from state.application_state import ApplicationState, StateStore, get_state_store


class AICommandPanel(QWidget):
    """
    Operator-in-the-loop approval interface for AI recommendations requiring human authorization.
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
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _init_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        hdr = QLabel("DECISION SUPPORT & OPERATOR APPROVAL")
        hdr.setStyleSheet("color: #00f2fe; font-size: 11px; font-weight: 800; letter-spacing: 1px;")
        layout.addWidget(hdr)

        self.scroll = QScrollArea(self)
        self.scroll.setWidgetResizable(True)
        self.scroll.setStyleSheet("background-color: transparent; border: none;")

        self.container = QWidget()
        self.container_layout = QVBoxLayout(self.container)
        self.container_layout.setContentsMargins(0, 0, 0, 0)
        self.container_layout.setSpacing(6)
        self.container_layout.addStretch()

        self.scroll.setWidget(self.container)
        layout.addWidget(self.scroll)

    def _on_state_updated(self, state: ApplicationState) -> None:
        # Clear existing cards
        while self.container_layout.count() > 1:
            child = self.container_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

        recs = state.ai_state.recommendations
        for r in recs:
            card = self._build_recommendation_card(r)
            self.container_layout.insertWidget(self.container_layout.count() - 1, card)

    def _build_recommendation_card(self, r: RecommendationItem) -> QFrame:
        card = QFrame()
        bg_color = "#090e1a"
        border_color = "#1e293b"
        if r.severity == RecommendationSeverity.CRITICAL:
            border_color = "#ef4444"
        elif r.severity == RecommendationSeverity.HIGH:
            border_color = "#f59e0b"

        card.setStyleSheet(
            f"QFrame {{ background-color: {bg_color}; border: 1px solid {border_color}; border-radius: 4px; padding: 6px; }}"
        )
        l = QVBoxLayout(card)
        l.setContentsMargins(6, 6, 6, 6)
        l.setSpacing(4)

        # Header Title
        t_row = QHBoxLayout()
        t_lbl = QLabel(f"[{r.severity.value}] {r.title}")
        t_lbl.setStyleSheet("color: #38bdf8; font-size: 9px; font-weight: bold;")
        t_row.addWidget(t_lbl)

        conf_lbl = QLabel(f"{r.confidence*100:.0f}% CONF")
        conf_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
        t_row.addWidget(conf_lbl, alignment=Qt.AlignmentFlag.AlignRight)
        l.addLayout(t_row)

        # Body Message & Reason
        msg_lbl = QLabel(r.message)
        msg_lbl.setWordWrap(True)
        msg_lbl.setStyleSheet("color: #f1f5f9; font-size: 9px;")
        l.addWidget(msg_lbl)

        reason_lbl = QLabel(f"WHY: {r.reason}")
        reason_lbl.setWordWrap(True)
        reason_lbl.setStyleSheet("color: #94a3b8; font-size: 8px; font-style: italic;")
        l.addWidget(reason_lbl)

        # Action Buttons (if requires operator approval)
        if r.requires_operator_approval and r.status == "PENDING":
            btn_row = QHBoxLayout()
            btn_row.setSpacing(6)

            accept_btn = QPushButton("ACCEPT")
            accept_btn.setStyleSheet(
                "background-color: #10b981; color: white; font-size: 9px; font-weight: bold; border: none; padding: 3px 8px; border-radius: 2px;"
            )
            accept_btn.clicked.connect(lambda: self.manager.handle_operator_decision(r.recommendation_id, accept=True))
            btn_row.addWidget(accept_btn)

            reject_btn = QPushButton("REJECT")
            reject_btn.setStyleSheet(
                "background-color: #ef4444; color: white; font-size: 9px; font-weight: bold; border: none; padding: 3px 8px; border-radius: 2px;"
            )
            reject_btn.clicked.connect(lambda: self.manager.handle_operator_decision(r.recommendation_id, accept=False))
            btn_row.addWidget(reject_btn)

            l.addLayout(btn_row)
        elif r.status != "PENDING":
            status_lbl = QLabel(f"DECISION: {r.status}")
            status_lbl.setStyleSheet("color: #10b981; font-size: 8px; font-weight: bold;")
            l.addWidget(status_lbl)

        return card

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
