/**
 * Smart Horizon GCS — Tactical Subsystem Error Boundary
 * Ensures failures in one panel (e.g. AI or GIS) do not crash the rest of the GCS.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tactical Subsystem Error Boundary caught:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-rose-950/40 border border-rose-600/50 rounded-lg text-rose-200 font-mono text-xs space-y-2 m-2">
          <div className="flex items-center space-x-2 font-bold text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>SUBSYSTEM ISOLATED FAULT: {this.props.fallbackTitle || 'PANEL ERROR'}</span>
          </div>
          <p className="text-[11px] text-rose-300/80">
            {this.state.error?.message || 'An unexpected rendering error occurred in this tactical view.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-2.5 py-1 rounded bg-rose-900/60 border border-rose-500/60 hover:bg-rose-800 text-[10px] font-bold flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RETRY VIEW</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
