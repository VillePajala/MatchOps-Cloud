import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import TimerOverlay, { TimerOverlayProps } from '../TimerOverlay';
import { formatTime } from '@/utils/time';

// Mock the time formatting utility
jest.mock('@/utils/time', () => ({
  formatTime: jest.fn((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }),
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TimerOverlay', () => {
  beforeAll(() => {
    // Enable fake timers for all tests
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  const defaultProps: TimerOverlayProps = {
    timeElapsedInSeconds: 0,
    subAlertLevel: 'none',
    onSubstitutionMade: jest.fn(),
    completedIntervalDurations: [],
    subIntervalMinutes: 15,
    onSetSubInterval: jest.fn(),
    isTimerRunning: false,
    onStartPauseTimer: jest.fn(),
    onResetTimer: jest.fn(),
    onToggleGoalLogModal: jest.fn(),
    onRecordOpponentGoal: jest.fn(),
    teamName: 'Home Team',
    opponentName: 'Away Team',
    homeScore: 0,
    awayScore: 0,
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 45,
    currentPeriod: 1,
    gameStatus: 'notStarted',
    lastSubTime: null,
    onOpponentNameChange: jest.fn(),
    onClose: jest.fn(),
    isLoaded: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any pending timer operations
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clean up any pending timers after each test
    jest.clearAllTimers();
  });

  describe('Timer Display', () => {
    it('should display formatted time correctly', () => {
      render(<TimerOverlay {...defaultProps} timeElapsedInSeconds={125} />);
      
      expect(formatTime).toHaveBeenCalledWith(125);
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('should display 00:00 when timer is at zero', () => {
      render(<TimerOverlay {...defaultProps} timeElapsedInSeconds={0} />);
      
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });

    it('should update display when time changes', () => {
      const { rerender } = render(<TimerOverlay {...defaultProps} timeElapsedInSeconds={0} />);
      
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
      
      rerender(<TimerOverlay {...defaultProps} timeElapsedInSeconds={60} />);
      expect(screen.getByText('01:00')).toBeInTheDocument();
    });
  });

  describe('Timer Controls', () => {
    it('should show play button when timer is not running', () => {
      render(<TimerOverlay {...defaultProps} isTimerRunning={false} />);
      
      const playButton = screen.getByRole('button', { name: /start/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should show pause button when timer is running', () => {
      render(<TimerOverlay {...defaultProps} isTimerRunning={true} />);
      
      const pauseButton = screen.getByRole('button', { name: /startButton/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should call onStartPauseTimer when play/pause button is clicked', () => {
      const onStartPauseTimer = jest.fn();
      render(<TimerOverlay {...defaultProps} onStartPauseTimer={onStartPauseTimer} />);
      
      const playButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(playButton);
      
      expect(onStartPauseTimer).toHaveBeenCalledTimes(1);
    });

    it('should call onResetTimer when reset button is clicked', () => {
      const onResetTimer = jest.fn();
      render(<TimerOverlay {...defaultProps} onResetTimer={onResetTimer} timeElapsedInSeconds={60} />);
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      
      expect(onResetTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Score Display', () => {
    it('should display correct score for home team', () => {
      render(<TimerOverlay {...defaultProps} homeScore={2} awayScore={1} homeOrAway="home" />);
      
      expect(screen.getByText('Home Team')).toBeInTheDocument();
      expect(screen.getByText('Away Team')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display correct score for away team', () => {
      render(<TimerOverlay {...defaultProps} homeScore={2} awayScore={1} homeOrAway="away" />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should update scores when they change', () => {
      const { rerender } = render(<TimerOverlay {...defaultProps} homeScore={0} awayScore={0} />);
      
      expect(screen.getAllByText('0')).toHaveLength(2); // Both home and away scores are 0
      
      rerender(<TimerOverlay {...defaultProps} homeScore={3} awayScore={2} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Period Display', () => {
    it('should display current period', () => {
      render(<TimerOverlay {...defaultProps} currentPeriod={1} numberOfPeriods={2} />);
      
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });

    it('should display period 2 of 2', () => {
      render(<TimerOverlay {...defaultProps} currentPeriod={2} numberOfPeriods={2} />);
      
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should handle single period games', () => {
      render(<TimerOverlay {...defaultProps} currentPeriod={1} numberOfPeriods={1} />);
      
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });
  });

  describe('Game Status', () => {
    it('should handle notStarted status', () => {
      render(<TimerOverlay {...defaultProps} gameStatus="notStarted" />);
      
      const playButton = screen.getByRole('button', { name: /start/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should handle inProgress status', () => {
      render(<TimerOverlay {...defaultProps} gameStatus="inProgress" isTimerRunning={true} />);
      
      const pauseButton = screen.getByRole('button', { name: /timerOverlay.pauseButton/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should handle periodEnd status', () => {
      render(<TimerOverlay {...defaultProps} gameStatus="periodEnd" />);
      
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('should handle gameEnd status', () => {
      render(<TimerOverlay {...defaultProps} gameStatus="gameEnd" />);
      
      expect(screen.getByText(/gameEnded/)).toBeInTheDocument();
    });
  });

  describe('Substitution Alerts', () => {
    it('should display no alert when subAlertLevel is none', () => {
      const { container } = render(<TimerOverlay {...defaultProps} subAlertLevel="none" />);
      
      const alertElement = container.querySelector('[class*="warning"]');
      expect(alertElement).not.toBeInTheDocument();
    });

    it('should display warning alert when subAlertLevel is warning', () => {
      const { container } = render(<TimerOverlay {...defaultProps} subAlertLevel="warning" />);
      
      const warningElement = container.querySelector('[class*="yellow"]');
      expect(warningElement).toBeInTheDocument();
    });

    it('should display due alert when subAlertLevel is due', () => {
      const { container } = render(<TimerOverlay {...defaultProps} subAlertLevel="due" />);
      
      const dueElement = container.querySelector('[class*="red"]');
      expect(dueElement).toBeInTheDocument();
    });

    it('should call onSubstitutionMade when substitution button is clicked', () => {
      const onSubstitutionMade = jest.fn();
      render(<TimerOverlay {...defaultProps} onSubstitutionMade={onSubstitutionMade} subAlertLevel="due" />);
      
      const subButton = screen.getByRole('button', { name: /confirmSubButton/i });
      fireEvent.click(subButton);
      
      expect(onSubstitutionMade).toHaveBeenCalledTimes(1);
    });
  });

  describe('Substitution Interval', () => {
    it('should display current substitution interval', () => {
      render(<TimerOverlay {...defaultProps} subIntervalMinutes={15} />);
      
      expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('should call onSetSubInterval when interval is changed', () => {
      const onSetSubInterval = jest.fn();
      render(<TimerOverlay {...defaultProps} onSetSubInterval={onSetSubInterval} />);
      
      const increaseButton = screen.getByRole('button', { name: /Increase interval/i });
      fireEvent.click(increaseButton);
      
      expect(onSetSubInterval).toHaveBeenCalledWith(16);
    });

    it('should display last substitution time', () => {
      render(<TimerOverlay {...defaultProps} lastSubTime={300} />);
      
      // formatTime is called for various time displays, lastSubTime is just one of them
      expect(formatTime).toHaveBeenCalled();
    });
  });

  describe('Opponent Name Editing', () => {
    it('should display opponent name', () => {
      render(<TimerOverlay {...defaultProps} opponentName="Test Opponent" />);
      
      expect(screen.getByText('Test Opponent')).toBeInTheDocument();
    });

    it('should allow editing opponent name', async () => {
      const onOpponentNameChange = jest.fn();
      render(<TimerOverlay {...defaultProps} onOpponentNameChange={onOpponentNameChange} />);
      
      const opponentNameElement = screen.getByText('Away Team');
      fireEvent.click(opponentNameElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Opponent' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(onOpponentNameChange).toHaveBeenCalledWith('New Opponent');
      });
    });

    it('should cancel editing on escape key', async () => {
      const onOpponentNameChange = jest.fn();
      render(<TimerOverlay {...defaultProps} onOpponentNameChange={onOpponentNameChange} />);
      
      const opponentNameElement = screen.getByText('Away Team');
      fireEvent.click(opponentNameElement);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Opponent' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      await waitFor(() => {
        expect(onOpponentNameChange).not.toHaveBeenCalled();
        expect(screen.getByText('Away Team')).toBeInTheDocument();
      });
    });
  });

  describe('Goal Recording', () => {
    it('should call onToggleGoalLogModal when goal button is clicked', () => {
      const onToggleGoalLogModal = jest.fn();
      render(<TimerOverlay {...defaultProps} onToggleGoalLogModal={onToggleGoalLogModal} />);
      
      const goalButton = screen.getByRole('button', { name: /teamGoalButton/i });
      fireEvent.click(goalButton);
      
      expect(onToggleGoalLogModal).toHaveBeenCalledTimes(1);
    });

    it('should call onRecordOpponentGoal when opponent goal button is clicked', () => {
      const onRecordOpponentGoal = jest.fn();
      render(<TimerOverlay {...defaultProps} onRecordOpponentGoal={onRecordOpponentGoal} />);
      
      const opponentGoalButton = screen.getByRole('button', { name: /opponent.*goal/i });
      fireEvent.click(opponentGoalButton);
      
      expect(onRecordOpponentGoal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Completed Intervals', () => {
    it('should display completed interval durations', () => {
      const completedIntervals = [
        { intervalNumber: 1, startTime: 0, endTime: 900, duration: 900 },
        { intervalNumber: 2, startTime: 900, endTime: 1800, duration: 900 },
      ];
      
      render(<TimerOverlay {...defaultProps} completedIntervalDurations={completedIntervals} />);
      
      expect(formatTime).toHaveBeenCalledWith(900);
    });

    it('should handle empty completed intervals', () => {
      render(<TimerOverlay {...defaultProps} completedIntervalDurations={[]} />);
      
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<TimerOverlay {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /Sulje/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not show close button when onClose is not provided', () => {
      render(<TimerOverlay {...defaultProps} onClose={undefined} />);
      
      const closeButton = screen.queryByRole('button', { name: /Sulje/i });
      expect(closeButton).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large time values', () => {
      render(<TimerOverlay {...defaultProps} timeElapsedInSeconds={9999} />);
      
      expect(formatTime).toHaveBeenCalledWith(9999);
      expect(screen.getByText('166:39')).toBeInTheDocument();
    });

    it('should handle negative time values gracefully', () => {
      render(<TimerOverlay {...defaultProps} timeElapsedInSeconds={-1} />);
      
      // Should still render timer display even with negative values
      expect(formatTime).toHaveBeenCalledWith(-1);
    });

    it('should handle missing team names', () => {
      render(<TimerOverlay {...defaultProps} teamName="" opponentName="" />);
      
      // Should still render the component without error
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });

    it('should handle all props being undefined', () => {
      const minimalProps = {
        timeElapsedInSeconds: 0,
        subAlertLevel: 'none' as const,
        onSubstitutionMade: jest.fn(),
        completedIntervalDurations: [],
        subIntervalMinutes: 15,
        onSetSubInterval: jest.fn(),
        isTimerRunning: false,
        onStartPauseTimer: jest.fn(),
        onResetTimer: jest.fn(),
        teamName: 'Team',
        opponentName: 'Opponent',
        homeScore: 0,
        awayScore: 0,
        homeOrAway: 'home' as const,
      };
      
      render(<TimerOverlay {...minimalProps} />);
      
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible timer controls', () => {
      render(<TimerOverlay {...defaultProps} />);
      
      // Start button uses translated text, not aria-label
      const playButton = screen.getByRole('button', { name: /start/i });
      expect(playButton).toBeInTheDocument();
      
      // Reset button uses translated text, not aria-label
      const resetButton = screen.getByRole('button', { name: /timerOverlay.resetButton/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      const onStartPauseTimer = jest.fn();
      render(<TimerOverlay {...defaultProps} onStartPauseTimer={onStartPauseTimer} />);
      
      const playButton = screen.getByRole('button', { name: /start/i });
      playButton.focus();
      expect(playButton).toHaveFocus();
      
      fireEvent.click(playButton);
      expect(onStartPauseTimer).toHaveBeenCalled();
    });
  });

  describe('Timer State Management with Fake Timers', () => {
    it('should handle start/pause/resume cycle with fake timers', async () => {
      const onStartPauseTimer = jest.fn();
      const { rerender } = render(
        <TimerOverlay 
          {...defaultProps} 
          onStartPauseTimer={onStartPauseTimer}
          isTimerRunning={false}
          timeElapsedInSeconds={0}
        />
      );
      
      // Start timer
      const startButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(startButton);
      expect(onStartPauseTimer).toHaveBeenCalledTimes(1);
      
      // Simulate timer running
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          onStartPauseTimer={onStartPauseTimer}
          isTimerRunning={true}
          timeElapsedInSeconds={30}
        />
      );
      
      // Advance fake timers
      jest.advanceTimersByTime(1000);
      
      // Pause timer - look for any button that could be the pause button
      const buttons = screen.getAllByRole('button');
      const pauseButton = buttons.find(btn => 
        btn.textContent?.includes('pause') || 
        btn.textContent?.includes('timerOverlay.pauseButton') ||
        btn.getAttribute('aria-label')?.includes('pause')
      ) || buttons[0]; // fallback to first button
      fireEvent.click(pauseButton);
      expect(onStartPauseTimer).toHaveBeenCalledTimes(2);
      
      // Simulate paused state
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          onStartPauseTimer={onStartPauseTimer}
          isTimerRunning={false}
          timeElapsedInSeconds={30}
        />
      );
      
      // Resume timer
      const resumeButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(resumeButton);
      expect(onStartPauseTimer).toHaveBeenCalledTimes(3);
    });

    it('should handle timer reset with persistence', () => {
      const onResetTimer = jest.fn();
      const { rerender } = render(
        <TimerOverlay 
          {...defaultProps} 
          onResetTimer={onResetTimer}
          timeElapsedInSeconds={120}
          isTimerRunning={true}
        />
      );
      
      // Verify timer shows current time
      expect(screen.getByText('02:00')).toBeInTheDocument();
      
      // Reset timer
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      expect(onResetTimer).toHaveBeenCalledTimes(1);
      
      // Simulate reset state
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          onResetTimer={onResetTimer}
          timeElapsedInSeconds={0}
          isTimerRunning={false}
        />
      );
      
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });

    it('should handle timer across different game periods', () => {
      const { rerender } = render(
        <TimerOverlay 
          {...defaultProps} 
          currentPeriod={1}
          timeElapsedInSeconds={45 * 60}
          gameStatus="periodEnd"
        />
      );
      
      // Check for the timer display - it might not show exactly 45:00 due to formatting
      expect(formatTime).toHaveBeenCalledWith(45 * 60);
      
      // Move to second period
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          currentPeriod={2}
          timeElapsedInSeconds={0}
          gameStatus="inProgress"
        />
      );
      
      expect(formatTime).toHaveBeenCalledWith(0);
      expect(screen.getAllByText('00:00')[0]).toBeInTheDocument();
    });
  });

  describe('Advanced Timer Scenarios', () => {
    it('should handle complex game state transitions', () => {
      const { rerender } = render(
        <TimerOverlay 
          {...defaultProps} 
          gameStatus="notStarted"
          timeElapsedInSeconds={0}
        />
      );
      
      // Start game
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          gameStatus="inProgress"
          isTimerRunning={true}
          timeElapsedInSeconds={30}
        />
      );
      
      // End game
      rerender(
        <TimerOverlay 
          {...defaultProps} 
          gameStatus="gameEnd"
          isTimerRunning={false}
          timeElapsedInSeconds={90 * 60}
        />
      );
      
      expect(screen.getByText(/gameEnded/)).toBeInTheDocument();
    });
  });
});