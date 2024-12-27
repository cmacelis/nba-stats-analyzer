import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayerComparison from '../players/PlayerComparison';
import { nbaApi } from '../../services/nbaApi';

// Mock the NBA API
jest.mock('../../services/nbaApi');

describe('PlayerComparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders player search inputs initially', () => {
    render(<PlayerComparison />);
    expect(screen.getAllByPlaceholderText(/search for a player/i)).toHaveLength(2);
  });

  it('shows loading state when fetching player stats', async () => {
    render(<PlayerComparison />);
    
    // Mock API response
    (nbaApi.searchPlayers as jest.Mock).mockResolvedValueOnce([
      { id: '1', fullName: 'LeBron James', team: 'LAL', position: 'F' }
    ]);

    // Type in search
    const searchInput = screen.getAllByPlaceholderText(/search for a player/i)[0];
    fireEvent.change(searchInput, { target: { value: 'James' } });

    // Check loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  it('displays player stats when two players are selected', async () => {
    render(<PlayerComparison />);

    // Mock player search and stats
    const mockPlayers = [
      { id: '1', fullName: 'LeBron James', team: 'LAL', position: 'F' },
      { id: '2', fullName: 'Stephen Curry', team: 'GSW', position: 'G' }
    ];

    const mockStats = {
      points: 25.0,
      assists: 7.5,
      rebounds: 7.0,
      // ... other stats
    };

    (nbaApi.searchPlayers as jest.Mock).mockResolvedValue(mockPlayers);
    (nbaApi.getPlayerStats as jest.Mock).mockResolvedValue(mockStats);

    // Select players
    const [search1, search2] = screen.getAllByPlaceholderText(/search for a player/i);
    
    fireEvent.change(search1, { target: { value: 'James' } });
    await waitFor(() => {
      fireEvent.click(screen.getByText('LeBron James'));
    });

    fireEvent.change(search2, { target: { value: 'Curry' } });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Stephen Curry'));
    });

    // Check if stats are displayed
    await waitFor(() => {
      expect(screen.getByText('25.0')).toBeInTheDocument();
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });
  });
}); 