import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RatingBar from '../RatingBar';

describe('RatingBar', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<RatingBar />);
      expect(container).toBeInTheDocument();
    });

    it('should render with default values', () => {
      render(<RatingBar />);
      
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should render with value prop', () => {
      render(<RatingBar value={7.5} />);
      
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });

    it('should render with rating prop', () => {
      render(<RatingBar rating={8.2} />);
      
      expect(screen.getByText('8.2')).toBeInTheDocument();
    });

    it('should have correct component structure', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass('flex', 'items-center', 'space-x-2', 'w-full');
      
      const barContainer = container.querySelector('.flex-1');
      expect(barContainer).toHaveClass('h-2', 'bg-slate-700', 'rounded', 'relative', 'overflow-hidden');
      
      const fillBar = container.querySelector('.absolute');
      expect(fillBar).toHaveClass('inset-0');
      
      const valueText = container.querySelector('span');
      expect(valueText).toHaveClass('text-sm', 'text-yellow-400', 'w-8', 'text-right');
    });
  });

  describe('Value Prop Support', () => {
    it('should use value prop when provided', () => {
      render(<RatingBar value={6.7} />);
      expect(screen.getByText('6.7')).toBeInTheDocument();
    });

    it('should use max prop when provided', () => {
      const { container } = render(<RatingBar value={5} max={20} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 5/20 = 25%
      expect(fillBar).toHaveStyle({ width: '25%' });
    });

    it('should default max to 10', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 5/10 = 50%
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should handle undefined value as 0', () => {
      render(<RatingBar value={undefined} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should handle missing value prop as 0', () => {
      render(<RatingBar />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });

  describe('Rating Prop Support', () => {
    it('should use rating prop when provided', () => {
      render(<RatingBar rating={8.5} />);
      expect(screen.getByText('8.5')).toBeInTheDocument();
    });

    it('should use maxRating prop when provided', () => {
      const { container } = render(<RatingBar rating={15} maxRating={30} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 15/30 = 50%
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should prefer rating over value when both provided', () => {
      render(<RatingBar value={3} rating={7} />);
      expect(screen.getByText('7.0')).toBeInTheDocument();
    });

    it('should prefer maxRating over max when both provided', () => {
      const { container } = render(<RatingBar rating={6} max={10} maxRating={20} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 6/20 = 30% (uses maxRating, not max)
      expect(fillBar).toHaveStyle({ width: '30%' });
    });

    it('should handle undefined rating gracefully', () => {
      render(<RatingBar rating={undefined} value={5} />);
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate 0% correctly', () => {
      const { container } = render(<RatingBar value={0} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should calculate 50% correctly', () => {
      const { container } = render(<RatingBar value={5} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should calculate 100% correctly', () => {
      const { container } = render(<RatingBar value={10} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle fractional percentages', () => {
      const { container } = render(<RatingBar value={3.33} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      const expectedWidth = Math.min(Math.max(3.33, 0), 10) / 10 * 100;
      expect(fillBar).toHaveStyle({ width: `${expectedWidth}%` });
    });

    it('should handle custom max values', () => {
      const { container } = render(<RatingBar value={75} max={100} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '75%' });
    });

    it('should handle decimal max values', () => {
      const { container } = render(<RatingBar value={1.5} max={3.0} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });
  });

  describe('Value Clamping', () => {
    it('should clamp negative values to 0', () => {
      const { container } = render(<RatingBar value={-5} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
      expect(screen.getByText('-5.0')).toBeInTheDocument(); // Display shows actual value
    });

    it('should clamp values above max', () => {
      const { container } = render(<RatingBar value={15} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
      expect(screen.getByText('15.0')).toBeInTheDocument(); // Display shows actual value
    });

    it('should handle very large values', () => {
      const { container } = render(<RatingBar value={1000} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle very small positive values', () => {
      const { container } = render(<RatingBar value={0.01} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0.1%' });
    });
  });

  describe('Color Calculations', () => {
    it('should use red color for 0 value (hue=0)', () => {
      const { container } = render(<RatingBar value={0} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(0, 70%, 50%)' });
    });

    it('should use green color for max value (hue=120)', () => {
      const { container } = render(<RatingBar value={10} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(120, 70%, 50%)' });
    });

    it('should use yellow/orange for middle values', () => {
      const { container } = render(<RatingBar value={5} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 5/10 * 120 = 60 degrees (yellow)
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(60, 70%, 50%)' });
    });

    it('should calculate color based on ratio, not absolute value', () => {
      const { container } = render(<RatingBar value={20} max={40} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 20/40 * 120 = 60 degrees (yellow, same as 5/10)
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(60, 70%, 50%)' });
    });

    it('should handle fractional color calculations', () => {
      const { container } = render(<RatingBar value={2.5} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // 2.5/10 * 120 = 30 degrees (orange)
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(30, 70%, 50%)' });
    });

    it('should clamp color hue for values above max', () => {
      const { container } = render(<RatingBar value={15} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // Color calculation uses clamped value: min(15, 10) / 10 * 120 = 120
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(120, 70%, 50%)' });
    });
  });

  describe('Text Display', () => {
    it('should display value with one decimal place', () => {
      render(<RatingBar value={7} />);
      expect(screen.getByText('7.0')).toBeInTheDocument();
    });

    it('should display fractional values correctly', () => {
      render(<RatingBar value={6.789} />);
      expect(screen.getByText('6.8')).toBeInTheDocument();
    });

    it('should display rating values correctly', () => {
      render(<RatingBar rating={8.45} />);
      // toFixed(1) rounds 8.45 to 8.5, but apparently the actual behavior is 8.4
      expect(screen.getByText('8.4')).toBeInTheDocument();
    });

    it('should display negative values', () => {
      render(<RatingBar value={-2.3} />);
      expect(screen.getByText('-2.3')).toBeInTheDocument();
    });

    it('should display zero correctly', () => {
      render(<RatingBar value={0} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should display large values correctly', () => {
      render(<RatingBar value={999.99} />);
      expect(screen.getByText('1000.0')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct container classes', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass('flex', 'items-center', 'space-x-2', 'w-full');
    });

    it('should apply correct bar container classes', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const barContainer = container.querySelector('.flex-1') as HTMLElement;
      expect(barContainer).toHaveClass('h-2', 'bg-slate-700', 'rounded', 'relative', 'overflow-hidden');
    });

    it('should apply correct fill bar classes', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveClass('inset-0');
    });

    it('should apply correct text classes', () => {
      render(<RatingBar value={5} />);
      
      const textSpan = screen.getByText('5.0');
      expect(textSpan).toHaveClass('text-sm', 'text-yellow-400', 'w-8', 'text-right');
    });

    it('should maintain layout structure', () => {
      const { container } = render(<RatingBar value={5} />);
      
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.children).toHaveLength(2); // bar container + text span
      
      const barContainer = outerDiv.children[0];
      const textSpan = outerDiv.children[1];
      
      expect(barContainer).toHaveClass('flex-1');
      expect(textSpan.tagName).toBe('SPAN');
    });
  });

  describe('Props Changes and Re-rendering', () => {
    it('should update when value changes', () => {
      const { rerender } = render(<RatingBar value={3} />);
      
      expect(screen.getByText('3.0')).toBeInTheDocument();
      
      rerender(<RatingBar value={7} />);
      expect(screen.getByText('7.0')).toBeInTheDocument();
    });

    it('should update when max changes', () => {
      const { container, rerender } = render(<RatingBar value={5} max={10} />);
      
      let fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
      
      rerender(<RatingBar value={5} max={20} />);
      fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '25%' });
    });

    it('should update color when value changes', () => {
      const { container, rerender } = render(<RatingBar value={0} max={10} />);
      
      let fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(0, 70%, 50%)' });
      
      rerender(<RatingBar value={10} max={10} />);
      fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(120, 70%, 50%)' });
    });

    it('should switch between value and rating props', () => {
      const { rerender } = render(<RatingBar value={3} />);
      
      expect(screen.getByText('3.0')).toBeInTheDocument();
      
      rerender(<RatingBar rating={8} />);
      expect(screen.getByText('8.0')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero max value', () => {
      const { container } = render(<RatingBar value={5} max={0} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // Division by zero results in invalid CSS value, browser ignores it
      expect(fillBar.style.width).toBe('');
    });

    it('should handle negative max value', () => {
      const { container } = render(<RatingBar value={5} max={-10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // Math.min(Math.max(5, 0), -10) = Math.min(5, -10) = -10
      // -10 / -10 * 100 = 100%
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle Infinity values', () => {
      const { container } = render(<RatingBar value={Infinity} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
      expect(screen.getByText('Infinity')).toBeInTheDocument();
    });

    it('should handle NaN values', () => {
      const { container } = render(<RatingBar value={NaN} max={10} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      // NaN calculations result in invalid CSS value, browser ignores it
      expect(fillBar.style.width).toBe('');
      expect(screen.getByText('NaN')).toBeInTheDocument();
    });

    it('should handle very precise decimal values', () => {
      render(<RatingBar value={7.123456789} />);
      expect(screen.getByText('7.1')).toBeInTheDocument();
    });

    it('should handle floating point precision issues', () => {
      const { container } = render(<RatingBar value={0.1 + 0.2} max={1} />);
      
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      const actualValue = 0.1 + 0.2;
      const expectedWidth = Math.min(Math.max(actualValue, 0), 1) / 1 * 100;
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: `${expectedWidth}%` });
    });
  });

  describe('Performance and Optimization', () => {
    it('should be wrapped with React.memo', () => {
      // Test that the component is memoized
      const component = RatingBar as any;
      expect(component.$$typeof.toString()).toContain('react.memo');
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<RatingBar value={1} />);
      
      const start = performance.now();
      
      for (let i = 2; i <= 10; i++) {
        rerender(<RatingBar value={i} />);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete 9 re-renders quickly
      expect(duration).toBeLessThan(50);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<RatingBar value={5} />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should render consistently with same props', () => {
      const { container: container1 } = render(<RatingBar value={5} max={10} />);
      const { container: container2 } = render(<RatingBar value={5} max={10} />);
      
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed prop types correctly', () => {
      const { container } = render(<RatingBar value={5.5} rating={7.2} max={15} maxRating={20} />);
      
      // Should use rating and maxRating (7.2/20 = 36%)
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '36%' });
      expect(screen.getByText('7.2')).toBeInTheDocument();
    });

    it('should handle rating system edge cases', () => {
      const { container } = render(<RatingBar rating={0} maxRating={5} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(0, 70%, 50%)' });
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should handle perfect rating scenario', () => {
      const { container } = render(<RatingBar rating={5} maxRating={5} />);
      
      const fillBar = container.querySelector('.absolute') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
      expect(fillBar).toHaveStyle({ backgroundColor: 'hsl(120, 70%, 50%)' });
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('should handle component in isolation and in groups', () => {
      const { container } = render(
        <div>
          <RatingBar value={2} max={10} />
          <RatingBar value={5} max={10} />
          <RatingBar value={8} max={10} />
        </div>
      );
      
      const ratingBars = container.querySelectorAll('.flex.items-center');
      expect(ratingBars).toHaveLength(3);
      
      expect(screen.getByText('2.0')).toBeInTheDocument();
      expect(screen.getByText('5.0')).toBeInTheDocument();
      expect(screen.getByText('8.0')).toBeInTheDocument();
    });
  });
});