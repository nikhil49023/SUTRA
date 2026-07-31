import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { LoggerService } from '../../services/loggerService';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    LoggerService.error('ErrorBoundary', error.message, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-[#0a0f1c] border border-rose-500/40 rounded text-rose-300 font-mono text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{this.props.fallbackTitle || 'SUBSYSTEM RENDERING EXCEPTION'}</span>
          </div>
          <p className="text-[10px] text-slate-300">
            {this.state.error?.message || 'An unhandled rendering error occurred in this tactical view component.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center space-x-1 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-[10px] font-bold text-rose-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RECOVER SUBSYSTEM</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
