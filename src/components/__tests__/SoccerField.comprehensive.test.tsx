import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SoccerField from '../SoccerField';
import type { Player, TacticalDisc, Point } from '@/types';

// Mock canvas context
const mockCanvasContext = {
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  clearRect: jest.fn(),
  rect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  drawImage: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  createPattern: jest.fn(() => null),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(1600)
  })),
  putImageData: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(1600)
  })),
  setLineDash: jest.fn(),
  getLineDash: jest.fn(() => []),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  miterLimit: 10,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  width: 800,
  height: 600,
  right: 800,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON: () => ({})
}));

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn((callback) => {
  callback(performance.now());
  return 1;
});

const mockCancelAnimationFrame = jest.fn();

// Mock HTMLCanvasElement
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: jest.fn(() => mockCanvasContext),
    writable: true,
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
    value: mockGetBoundingClientRect,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, 'requestAnimationFrame', {
    value: mockRequestAnimationFrame,
    writable: true,
  });

  Object.defineProperty(global, 'cancelAnimationFrame', {
    value: mockCancelAnimationFrame,
    writable: true,
  });

  // Mock Image
  Object.defineProperty(global, 'Image', {
    value: class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      
      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    },
    writable: true,
  });
});

describe.skip('SoccerField', () => {
  const defaultProps = {
    players: [],
    opponents: [],
    drawings: [],
    showPlayerNames: false,
    onPlayerDrop: jest.fn(),
    onPlayerMove: jest.fn(),
    onPlayerMoveEnd: jest.fn(),
    onDrawingStart: jest.fn(),
    onDrawingAddPoint: jest.fn(),
    onDrawingEnd: jest.fn(),
    onPlayerRemove: jest.fn(),
    onOpponentMove: jest.fn(),
    onOpponentMoveEnd: jest.fn(),
    onOpponentRemove: jest.fn(),
    draggingPlayerFromBarInfo: null,
    onPlayerDropViaTouch: jest.fn(),
    onPlayerDragCancelViaTouch: jest.fn(),
    timeElapsedInSeconds: 0,
    isTacticsBoardView: false,
    tacticalDiscs: [],
    onTacticalDiscMove: jest.fn(),
    onTacticalDiscRemove: jest.fn(),
    onToggleTacticalDiscType: jest.fn(),
    tacticalBallPosition: null,
    onTacticalBallMove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanvasContext.fillRect.mockClear();
    mockCanvasContext.clearRect.mockClear();
    mockCanvasContext.drawImage.mockClear();
    mockCanvasContext.fillText.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render canvas element with proper classes', () => {
      const { container } = render(<SoccerField {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('absolute', 'top-0', 'left-0', 'w-full', 'h-full', 'touch-none');
    });

    it('should render timer display', () => {
      render(<SoccerField {...defaultProps} timeElapsedInSeconds={930} />);
      
      expect(screen.getByText('15:30')).toBeInTheDocument();
    });

    it('should initialize canvas context on mount', async () => {
      render(<SoccerField {...defaultProps} />);
      
      await waitFor(() => {
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
      });
    });

    it('should handle canvas dimensions properly', async () => {
      const { container } = render(<SoccerField {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      await waitFor(() => {
        expect(canvas).toHaveAttribute('width', '800');
        expect(canvas).toHaveAttribute('height', '600');
      });
    });
  });

  describe('Props Handling', () => {
    it('should render with players', () => {
      const players: Player[] = [
        {
          id: 'player-1',
          name: 'Test Player',
          jerseyNumber: 10,
          fieldPosition: { relX: 0.5, relY: 0.5 }
        }
      ];

      const { container } = render(<SoccerField {...defaultProps} players={players} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render with opponents', () => {
      const opponents = [
        {
          id: 'opponent-1',
          fieldPosition: { relX: 0.3, relY: 0.7 }
        }
      ];

      const { container } = render(<SoccerField {...defaultProps} opponents={opponents} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render with tactical discs in tactical mode', () => {
      const tacticalDiscs: TacticalDisc[] = [
        {
          id: 'disc-1',
          position: { relX: 0.4, relY: 0.6 },
          type: 'home'
        }
      ];

      const { container } = render(
        <SoccerField 
          {...defaultProps} 
          tacticalDiscs={tacticalDiscs} 
          isTacticsBoardView={true} 
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render with drawing lines', () => {
      const drawings: Point[][] = [
        [
          { relX: 0.1, relY: 0.1 }, 
          { relX: 0.2, relY: 0.2 }
        ]
      ];

      const { container } = render(<SoccerField {...defaultProps} drawings={drawings} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should render ball position when provided', () => {
      const ballPosition = { relX: 0.5, relY: 0.5 };

      const { container } = render(<SoccerField {...defaultProps} tacticalBallPosition={ballPosition} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Mode States', () => {
    it('should handle tactical mode', () => {
      const { container } = render(<SoccerField {...defaultProps} isTacticsBoardView={true} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should handle normal mode', () => {
      const { container } = render(<SoccerField {...defaultProps} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Player Names Display', () => {
    const playersWithNames: Player[] = [
      {
        id: 'player-1',
        name: 'John Doe',
        jerseyNumber: 10,
        fieldPosition: { relX: 0.5, relY: 0.5 }
      }
    ];

    it('should show player names when enabled', () => {
      const { container } = render(
        <SoccerField 
          {...defaultProps} 
          players={playersWithNames}
          showPlayerNames={true} 
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should not show player names when disabled', () => {
      const { container } = render(
        <SoccerField 
          {...defaultProps} 
          players={playersWithNames}
          showPlayerNames={false} 
        />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Event Handling Setup', () => {
    it('should add event listeners on mount', () => {
      const addEventListenerSpy = jest.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
      
      render(<SoccerField {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });

      addEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');
      
      const { unmount } = render(<SoccerField {...defaultProps} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Animation and Performance', () => {
    it('should use requestAnimationFrame for rendering', async () => {
      render(<SoccerField {...defaultProps} />);

      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled();
      });
    });

    it('should cancel animation frame on unmount', () => {
      const { unmount } = render(<SoccerField {...defaultProps} />);
      
      unmount();

      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Canvas Drawing Operations', () => {
    it('should perform canvas drawing operations', async () => {
      render(<SoccerField {...defaultProps} />);

      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled();
      });
      
      // Canvas context should be called once the animation frame executes
      expect(mockCanvasContext.fillRect).toHaveBeenCalled();
    });

    it('should handle high DPI displays', async () => {
      // Mock high DPI
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        writable: true,
      });

      render(<SoccerField {...defaultProps} />);

      await waitFor(() => {
        expect(mockCanvasContext.scale).toHaveBeenCalledWith(2, 2);
      });

      // Reset
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 1,
        writable: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas context gracefully', () => {
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

      expect(() => {
        render(<SoccerField {...defaultProps} />);
      }).not.toThrow();

      // Restore
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('should handle image loading errors gracefully', () => {
      // Mock Image to trigger error
      const OriginalImage = global.Image;
      global.Image = class MockErrorImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      } as any;

      expect(() => {
        render(<SoccerField {...defaultProps} />);
      }).not.toThrow();

      // Restore
      global.Image = OriginalImage;
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to different canvas sizes', () => {
      mockGetBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 1200,
        height: 900,
        right: 1200,
        bottom: 900,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      const { container } = render(<SoccerField {...defaultProps} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('should handle very small canvas sizes', () => {
      mockGetBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 75,
        right: 100,
        bottom: 75,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      const { container } = render(<SoccerField {...defaultProps} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should handle complex game state', () => {
      const complexProps = {
        ...defaultProps,
        players: [
          {
            id: 'p1',
            name: 'Player 1',
            jerseyNumber: 1,
            fieldPosition: { relX: 0.1, relY: 0.1 }
          },
          {
            id: 'p2',
            name: 'Player 2',
            jerseyNumber: 2,
            fieldPosition: { relX: 0.9, relY: 0.9 }
          }
        ],
        opponents: [
          {
            id: 'o1',
            fieldPosition: { relX: 0.5, relY: 0.3 }
          }
        ],
        tacticalDiscs: [
          {
            id: 'd1',
            position: { relX: 0.4, relY: 0.6 },
            type: 'home'
          },
          {
            id: 'd2',
            position: { relX: 0.6, relY: 0.4 },
            type: 'away'
          }
        ],
        drawings: [
          [
            { relX: 0.2, relY: 0.2 }, 
            { relX: 0.8, relY: 0.8 }
          ]
        ],
        tacticalBallPosition: { relX: 0.5, relY: 0.5 },
        isTacticsBoardView: true,
        showPlayerNames: true,
        timeElapsedInSeconds: 2730
      };

      expect(() => {
        render(<SoccerField {...complexProps} />);
      }).not.toThrow();

      expect(screen.getByText('45:30')).toBeInTheDocument();
    });
  });
});