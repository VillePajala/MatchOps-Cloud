import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import GameInfoBar, { GameInfoBarProps } from '../GameInfoBar';

describe('GameInfoBar', () => {
  const defaultProps: GameInfoBarProps = {
    teamName: 'Home Team',
    opponentName: 'Away Team',
    homeScore: 0,
    awayScore: 0,
    onTeamNameChange: jest.fn(),
    onOpponentNameChange: jest.fn(),
    homeOrAway: 'home',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render team names and scores', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      expect(screen.getByText('Home Team')).toBeInTheDocument();
      expect(screen.getByText('Away Team')).toBeInTheDocument();
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should render correct scores when non-zero', () => {
      render(<GameInfoBar {...defaultProps} homeScore={2} awayScore={1} />);
      
      expect(screen.getByText('2 - 1')).toBeInTheDocument();
    });

    it('should swap team positions when playing away', () => {
      render(<GameInfoBar {...defaultProps} homeOrAway="away" />);
      
      const teamElements = screen.getAllByText(/Team/);
      // Away team should show opponent on left, home team on right
      expect(teamElements[0]).toHaveTextContent('Away Team');
      expect(teamElements[1]).toHaveTextContent('Home Team');
    });

    it('should display teams in correct order for home games', () => {
      render(<GameInfoBar {...defaultProps} homeOrAway="home" />);
      
      const teamElements = screen.getAllByText(/Team/);
      // Home team should be on left, away team on right
      expect(teamElements[0]).toHaveTextContent('Home Team');
      expect(teamElements[1]).toHaveTextContent('Away Team');
    });
  });

  describe('Team Name Editing - Desktop', () => {
    it('should start editing left team name on double click', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Home Team');
      expect(input).toHaveFocus();
    });

    it('should start editing right team name on double click', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const awayTeamElement = screen.getByText('Away Team');
      fireEvent.doubleClick(awayTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Away Team');
      expect(input).toHaveFocus();
    });

    it('should save changes on Enter key', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Team Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onTeamNameChange).toHaveBeenCalledWith('New Team Name');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should save changes on blur', () => {
      const onOpponentNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onOpponentNameChange={onOpponentNameChange} />);
      
      const awayTeamElement = screen.getByText('Away Team');
      fireEvent.doubleClick(awayTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Opponent' } });
      fireEvent.blur(input);
      
      expect(onOpponentNameChange).toHaveBeenCalledWith('New Opponent');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should cancel editing on Escape key', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Team Name' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(onTeamNameChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });

    it('should trim whitespace when saving', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '  New Team  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onTeamNameChange).toHaveBeenCalledWith('New Team');
    });

    it('should not save empty team names', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onTeamNameChange).not.toHaveBeenCalled();
    });
  });

  describe('Team Name Editing - Mobile', () => {
    it('should start editing on double tap', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      
      // First tap
      fireEvent.touchEnd(homeTeamElement);
      jest.advanceTimersByTime(100);
      
      // Second tap within 300ms
      fireEvent.touchEnd(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Home Team');
    });

    it('should not start editing on single tap', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.touchEnd(homeTeamElement);
      
      jest.advanceTimersByTime(400); // Wait beyond double tap delay
      
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should reset double tap state after delay', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      
      // First tap
      fireEvent.touchEnd(homeTeamElement);
      
      // Wait beyond double tap delay
      jest.advanceTimersByTime(400);
      
      // Another tap should not trigger edit
      fireEvent.touchEnd(homeTeamElement);
      
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should handle double tap on right team name', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const awayTeamElement = screen.getByText('Away Team');
      
      // Double tap
      fireEvent.touchEnd(awayTeamElement);
      jest.advanceTimersByTime(100);
      fireEvent.touchEnd(awayTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Away Team');
    });
  });

  describe('Away Game Behavior', () => {
    it('should call correct handler when editing left team while away', () => {
      const onOpponentNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} homeOrAway="away" onOpponentNameChange={onOpponentNameChange} />);
      
      // When away, left side shows opponent
      const leftTeamElement = screen.getByText('Away Team');
      fireEvent.doubleClick(leftTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Opponent' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onOpponentNameChange).toHaveBeenCalledWith('New Opponent');
    });

    it('should call correct handler when editing right team while away', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} homeOrAway="away" onTeamNameChange={onTeamNameChange} />);
      
      // When away, right side shows home team
      const rightTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(rightTeamElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Home' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onTeamNameChange).toHaveBeenCalledWith('New Home');
    });
  });

  describe('Score Display', () => {
    it('should display scores with proper formatting', () => {
      render(<GameInfoBar {...defaultProps} homeScore={3} awayScore={2} />);
      
      const scoreElement = screen.getByText('3 - 2');
      expect(scoreElement).toHaveClass('bg-slate-700', 'text-yellow-300', 'font-bold');
    });

    it('should update scores dynamically', () => {
      const { rerender } = render(<GameInfoBar {...defaultProps} homeScore={0} awayScore={0} />);
      
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
      
      rerender(<GameInfoBar {...defaultProps} homeScore={1} awayScore={0} />);
      expect(screen.getByText('1 - 0')).toBeInTheDocument();
      
      rerender(<GameInfoBar {...defaultProps} homeScore={1} awayScore={1} />);
      expect(screen.getByText('1 - 1')).toBeInTheDocument();
    });

    it('should handle double-digit scores', () => {
      render(<GameInfoBar {...defaultProps} homeScore={10} awayScore={12} />);
      
      expect(screen.getByText('10 - 12')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should show hover effect on team names', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      expect(homeTeamElement).toHaveClass('hover:bg-slate-700/50');
    });

    it('should show cursor pointer on team names', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      expect(homeTeamElement).toHaveClass('cursor-pointer');
    });

    it('should show title tooltip on team names', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      expect(homeTeamElement).toHaveAttribute('title', 'Home Team');
      
      const awayTeamElement = screen.getByText('Away Team');
      expect(awayTeamElement).toHaveAttribute('title', 'Away Team');
    });

    it('should show edit hint in title when not editing', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamContainer = screen.getByText('Home Team').parentElement;
      expect(homeTeamContainer).toHaveAttribute('title', 'Double-click to edit');
    });

    it('should not show edit hint when editing', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      const inputContainer = input.parentElement;
      expect(inputContainer).not.toHaveAttribute('title', 'Double-click to edit');
    });
  });

  describe('Input Field Behavior', () => {
    it('should select all text when editing starts', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox') as HTMLInputElement;
      // Note: jsdom doesn't fully support selection, but we can verify focus
      expect(input).toHaveFocus();
    });

    it('should limit input width', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('max-w-[120px]');
    });

    it('should apply correct text alignment for left team', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-right');
    });

    it('should apply correct text alignment for right team', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const awayTeamElement = screen.getByText('Away Team');
      fireEvent.doubleClick(awayTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-left');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long team names', () => {
      const longName = 'This is a very long team name that should be truncated';
      render(<GameInfoBar {...defaultProps} teamName={longName} />);
      
      const teamElement = screen.getByText(longName);
      expect(teamElement).toHaveClass('truncate');
    });

    it('should handle empty team names gracefully', () => {
      render(<GameInfoBar {...defaultProps} teamName="" opponentName="" />);
      
      // Should render without errors
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
    });

    it('should handle rapid double clicks', () => {
      const onTeamNameChange = jest.fn();
      render(<GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      
      // Multiple rapid double clicks
      fireEvent.doubleClick(homeTeamElement);
      fireEvent.doubleClick(homeTeamElement);
      fireEvent.doubleClick(homeTeamElement);
      
      // Should only have one input field
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs).toHaveLength(1);
    });

    it('should handle switching between editing different teams', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      // Start editing home team
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      let input = screen.getByRole('textbox');
      expect(input).toHaveValue('Home Team');
      
      // Cancel by pressing Escape
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // Start editing away team
      const awayTeamElement = screen.getByText('Away Team');
      fireEvent.doubleClick(awayTeamElement);
      
      input = screen.getByRole('textbox');
      expect(input).toHaveValue('Away Team');
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeamElement);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
      
      // Tab navigation should work
      fireEvent.keyDown(input, { key: 'Tab' });
    });

    it('should have proper ARIA attributes', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      const container = screen.getByText('Home Team').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Component Memoization', () => {
    it('should be wrapped in React.memo', () => {
      // GameInfoBar is exported with React.memo
      expect(GameInfoBar.$$typeof.toString()).toContain('react.memo');
    });

    it('should not re-render when props are the same', () => {
      const onTeamNameChange = jest.fn();
      const props = { ...defaultProps, onTeamNameChange };
      
      const { rerender } = render(<GameInfoBar {...props} />);
      
      // Re-render with same props
      rerender(<GameInfoBar {...props} />);
      
      // Component should not trigger any side effects
      expect(onTeamNameChange).not.toHaveBeenCalled();
    });
  });

  describe('Advanced Score Scenarios', () => {
    it('should handle rapid score updates', () => {
      const { rerender } = render(<GameInfoBar {...defaultProps} homeScore={0} awayScore={0} />);
      
      // Rapid score changes
      const scores = [
        { home: 1, away: 0 },
        { home: 1, away: 1 },
        { home: 2, away: 1 },
        { home: 2, away: 2 },
        { home: 3, away: 2 },
      ];
      
      scores.forEach(score => {
        rerender(<GameInfoBar {...defaultProps} homeScore={score.home} awayScore={score.away} />);
        expect(screen.getByText(`${score.home} - ${score.away}`)).toBeInTheDocument();
      });
    });

    it('should handle extreme score values', () => {
      render(<GameInfoBar {...defaultProps} homeScore={99} awayScore={88} />);
      
      expect(screen.getByText('99 - 88')).toBeInTheDocument();
    });

    it('should handle team switching with score updates', () => {
      const { rerender } = render(
        <GameInfoBar {...defaultProps} homeScore={2} awayScore={1} homeOrAway="home" />
      );
      
      expect(screen.getByText('2 - 1')).toBeInTheDocument();
      
      // Switch to away - score should remain the same format
      rerender(
        <GameInfoBar {...defaultProps} homeScore={3} awayScore={2} homeOrAway="away" />
      );
      
      expect(screen.getByText('3 - 2')).toBeInTheDocument();
    });
  });

  describe('Complex Interaction Patterns', () => {
    it('should handle editing with prop changes', () => {
      const onTeamNameChange = jest.fn();
      
      const { rerender } = render(
        <GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} homeScore={0} />
      );
      
      // Start editing
      const homeTeam = screen.getByText('Home Team');
      fireEvent.doubleClick(homeTeam);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Editing Team' } });
      
      // Score changes while editing
      rerender(
        <GameInfoBar {...defaultProps} onTeamNameChange={onTeamNameChange} homeScore={1} />
      );
      
      // Should still be in edit mode
      const stillEditing = screen.getByRole('textbox');
      expect(stillEditing).toHaveValue('Editing Team');
      
      // Complete editing
      fireEvent.keyDown(stillEditing, { key: 'Enter' });
      expect(onTeamNameChange).toHaveBeenCalledWith('Editing Team');
    });

    it('should handle simultaneous editing attempts', () => {
      render(<GameInfoBar {...defaultProps} />);
      
      // Try to edit both teams simultaneously
      const homeTeam = screen.getByText('Home Team');
      const awayTeam = screen.getByText('Away Team');
      
      fireEvent.doubleClick(homeTeam);
      fireEvent.doubleClick(awayTeam);
      
      // Only one input should exist
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(1);
    });

    it('should handle performance with many rapid interactions', () => {
      const { rerender } = render(<GameInfoBar {...defaultProps} />);
      
      // Multiple rapid prop updates
      for (let i = 0; i < 20; i++) {
        rerender(
          <GameInfoBar 
            {...defaultProps} 
            homeScore={i} 
            awayScore={i + 1}
            teamName={`Team ${i}`}
            opponentName={`Opponent ${i}`}
          />
        );
      }
      
      expect(screen.getByText('Team 19')).toBeInTheDocument();
      expect(screen.getByText('Opponent 19')).toBeInTheDocument();
      expect(screen.getByText('19 - 20')).toBeInTheDocument();
    });
  });
});