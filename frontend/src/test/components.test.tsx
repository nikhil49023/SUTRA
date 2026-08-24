import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from '../components/topbar/TopBar';
import { Sidebar } from '../components/sidebar/Sidebar';
import { ConnectionStatus } from '../communication/ConnectionStatus';
import { ArtificialHorizon } from '../hud/ArtificialHorizon';
import { HeadingTape } from '../hud/HeadingTape';
import { MissionSummary } from '../mission/MissionSummary';
import { FormationPanel } from '../fleet/FormationPanel';

describe('SMART HORIZON GCS — UI Components & HUD Renderers', () => {
  it('renders TopBar with brand title, mission badge and emergency RTL button', () => {
    render(<TopBar />);
    expect(screen.getByText('SMART HORIZON')).toBeInTheDocument();
    expect(screen.getByText('EMERGENCY RTL')).toBeInTheDocument();
  });

  it('renders Sidebar with all tactical navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('COMMAND')).toBeInTheDocument();
    expect(screen.getByText('MISSION')).toBeInTheDocument();
    expect(screen.getByText('SWARM FLEET')).toBeInTheDocument();
    expect(screen.getByText('GIS INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText('AI ADVISOR')).toBeInTheDocument();
  });

  it('renders ConnectionStatus with state and retry button', () => {
    render(<ConnectionStatus />);
    expect(screen.getByText(/WS:/)).toBeInTheDocument();
  });

  it('renders ArtificialHorizon with pitch & roll', () => {
    const { container } = render(<ArtificialHorizon pitch={5.5} roll={-10.2} />);
    expect(container.querySelector('.w-48.h-48')).toBeInTheDocument();
    expect(screen.getByText('-10.2°')).toBeInTheDocument();
  });

  it('renders HeadingTape with degree markers', () => {
    render(<HeadingTape heading={180} />);
    expect(screen.getByText(/180°/)).toBeInTheDocument();
  });

  it('renders MissionSummary with stats', () => {
    render(<MissionSummary />);
    expect(screen.getByText(/ALPHA RECON/)).toBeInTheDocument();
    expect(screen.getByText(/EST FLIGHT TIME/)).toBeInTheDocument();
  });

  it('renders FormationPanel with formations', () => {
    render(<FormationPanel />);
    expect(screen.getByText('V-FORMATION')).toBeInTheDocument();
    expect(screen.getByText('DIAMOND')).toBeInTheDocument();
    expect(screen.getByText('LINE (ECHELON)')).toBeInTheDocument();
  });
});
