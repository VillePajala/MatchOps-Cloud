import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverallRatingSelector from '../OverallRatingSelector';

describe('OverallRatingSelector', () => {
  const defaultProps = {
    value: 5,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<OverallRatingSelector {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render 10 rating buttons', () => {
      render(<OverallRatingSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(10);
    });

    it('should render buttons with numbers 1-10', () => {
      render(<OverallRatingSelector {...defaultProps} />);
      
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('should have correct container structure', () => {
      const { container } = render(<OverallRatingSelector {...defaultProps} />);
      
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('flex', 'flex-wrap', 'gap-1');
    });

    it('should render buttons in correct order', () => {
      render(<OverallRatingSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach((button, index) => {
        expect(button).toHaveTextContent((index + 1).toString());
      });
    });
  });

  describe('Button Properties', () => {
    it('should set correct button type', () => {
      render(<OverallRatingSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should set correct aria-label for each button', () => {
      render(<OverallRatingSelector {...defaultProps} />);
      
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByLabelText(i.toString());
        expect(button).toBeInTheDocument();
      }
    });

    it('should have unique keys for each button', () => {
      const { container } = render(<OverallRatingSelector {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      
      // React should render all buttons without key warnings
      expect(buttons).toHaveLength(10);
    });
  });

  describe('Visual State - Selected Value', () => {
    it('should highlight the selected value button', () => {
      render(<OverallRatingSelector value={7} onChange={jest.fn()} />);
      
      const selectedButton = screen.getByText('7');
      expect(selectedButton).toHaveClass('bg-indigo-600', 'text-white');
    });

    it('should not highlight unselected buttons', () => {
      render(<OverallRatingSelector value={7} onChange={jest.fn()} />);
      
      for (let i = 1; i <= 10; i++) {
        if (i !== 7) {
          const button = screen.getByText(i.toString());
          expect(button).toHaveClass('bg-slate-800/40', 'text-slate-300', 'hover:bg-slate-800/60');
          expect(button).not.toHaveClass('bg-indigo-600', 'text-white');
        }
      }
    });

    it('should handle value of 1', () => {
      render(<OverallRatingSelector value={1} onChange={jest.fn()} />);
      
      const selectedButton = screen.getByText('1');
      expect(selectedButton).toHaveClass('bg-indigo-600', 'text-white');
    });

    it('should handle value of 10', () => {
      render(<OverallRatingSelector value={10} onChange={jest.fn()} />);
      
      const selectedButton = screen.getByText('10');
      expect(selectedButton).toHaveClass('bg-indigo-600', 'text-white');
    });

    it('should handle middle values correctly', () => {
      render(<OverallRatingSelector value={5} onChange={jest.fn()} />);
      
      const selectedButton = screen.getByText('5');
      expect(selectedButton).toHaveClass('bg-indigo-600', 'text-white');
      
      // Check that adjacent buttons are not selected
      const button4 = screen.getByText('4');
      const button6 = screen.getByText('6');
      expect(button4).not.toHaveClass('bg-indigo-600', 'text-white');
      expect(button6).not.toHaveClass('bg-indigo-600', 'text-white');
    });
  });

  describe('Click Interactions', () => {
    it('should call onChange when a button is clicked', () => {
      const mockOnChange = jest.fn();
      render(<OverallRatingSelector value={5} onChange={mockOnChange} />);
      
      const button7 = screen.getByText('7');
      fireEvent.click(button7);
      
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(7);
    });

    it('should call onChange with correct value for each button', () => {
      const mockOnChange = jest.fn();
      render(<OverallRatingSelector value={5} onChange={mockOnChange} />);
      
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByText(i.toString());
        fireEvent.click(button);
        
        expect(mockOnChange).toHaveBeenCalledWith(i);
      }
      
      expect(mockOnChange).toHaveBeenCalledTimes(10);
    });

    it('should call onChange when clicking the currently selected button', () => {
      const mockOnChange = jest.fn();
      render(<OverallRatingSelector value={3} onChange={mockOnChange} />);
      
      const selectedButton = screen.getByText('3');
      fireEvent.click(selectedButton);
      
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle value 0 (no selection)', () => {
      render(<OverallRatingSelector value={0} onChange={jest.fn()} />);
      
      // No button should be selected when value is 0
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByText(i.toString());
        expect(button).not.toHaveClass('bg-indigo-600', 'text-white');
        expect(button).toHaveClass('bg-slate-800/40', 'text-slate-300');
      }
    });

    it('should handle negative value', () => {
      render(<OverallRatingSelector value={-1} onChange={jest.fn()} />);
      
      // No button should be selected when value is negative
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByText(i.toString());
        expect(button).not.toHaveClass('bg-indigo-600', 'text-white');
      }
    });

    it('should handle value above 10', () => {
      render(<OverallRatingSelector value={15} onChange={jest.fn()} />);
      
      // No button should be selected when value is above 10
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByText(i.toString());
        expect(button).not.toHaveClass('bg-indigo-600', 'text-white');
      }
    });

    it('should handle decimal values', () => {
      render(<OverallRatingSelector value={5.7} onChange={jest.fn()} />);
      
      // No button should be selected for decimal values
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByText(i.toString());
        expect(button).not.toHaveClass('bg-indigo-600', 'text-white');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper button semantics', () => {
      render(<OverallRatingSelector value={5} onChange={jest.fn()} />);
      const buttons = screen.getAllByRole('button');
      
      expect(buttons).toHaveLength(10);
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should provide accessible names via aria-label', () => {
      render(<OverallRatingSelector value={5} onChange={jest.fn()} />);
      
      for (let i = 1; i <= 10; i++) {
        const button = screen.getByLabelText(i.toString());
        expect(button).toHaveAttribute('aria-label', i.toString());
      }
    });

    it('should support keyboard interaction', () => {
      const mockOnChange = jest.fn();
      render(<OverallRatingSelector value={5} onChange={mockOnChange} />);
      
      const button6 = screen.getByText('6');
      button6.focus();
      // Use click to simulate keyboard activation since this is what actually happens
      fireEvent.click(button6);
      
      expect(mockOnChange).toHaveBeenCalledWith(6);
    });
  });

  describe('Component Behavior', () => {
    it('should be a controlled component', () => {
      const onChange = jest.fn();
      const { rerender } = render(<OverallRatingSelector value={3} onChange={onChange} />);
      
      // Component state is controlled by props
      expect(screen.getByText('3')).toHaveClass('bg-indigo-600', 'text-white');
      
      // Clicking should call onChange but not change visual state until props update
      fireEvent.click(screen.getByText('8'));
      expect(onChange).toHaveBeenCalledWith(8);
      
      // Visual state should still show old value until props change
      expect(screen.getByText('3')).toHaveClass('bg-indigo-600', 'text-white');
      expect(screen.getByText('8')).not.toHaveClass('bg-indigo-600', 'text-white');
      
      // Update props to reflect new value
      rerender(<OverallRatingSelector value={8} onChange={onChange} />);
      expect(screen.getByText('8')).toHaveClass('bg-indigo-600', 'text-white');
      expect(screen.getByText('3')).not.toHaveClass('bg-indigo-600', 'text-white');
    });
  });
});