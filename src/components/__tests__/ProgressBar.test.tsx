import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  describe('Basic Rendering', () => {
    it('should render progress bar container', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const progressContainer = container.firstChild as HTMLElement;
      expect(progressContainer).toBeInTheDocument();
      expect(progressContainer).toHaveClass('w-full', 'h-2', 'bg-slate-700', 'rounded', 'overflow-hidden');
    });

    it('should render progress fill bar', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600');
      expect(fillBar).toBeInTheDocument();
      expect(fillBar).toHaveClass('h-full', 'bg-indigo-600');
    });

    it('should render with correct structure', () => {
      const { container } = render(<ProgressBar current={3} total={10} />);
      
      const outerDiv = container.firstChild;
      const innerDiv = outerDiv?.firstChild;
      
      expect(outerDiv).toHaveClass('w-full', 'h-2', 'bg-slate-700', 'rounded', 'overflow-hidden');
      expect(innerDiv).toHaveClass('h-full', 'bg-indigo-600');
    });

    it('should not render any text content', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      expect(container.textContent).toBe('');
    });
  });

  describe('Progress Calculations', () => {
    it('should calculate 50% progress correctly', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should calculate 0% progress correctly', () => {
      const { container } = render(<ProgressBar current={0} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should calculate 100% progress correctly', () => {
      const { container } = render(<ProgressBar current={10} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should calculate 25% progress correctly', () => {
      const { container } = render(<ProgressBar current={25} total={100} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '25%' });
    });

    it('should calculate 75% progress correctly', () => {
      const { container } = render(<ProgressBar current={75} total={100} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '75%' });
    });

    it('should handle fractional percentages correctly', () => {
      const { container } = render(<ProgressBar current={1} total={3} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      const expectedWidth = (1 / 3) * 100;
      expect(fillBar).toHaveStyle({ width: `${expectedWidth}%` });
    });
  });

  describe('Edge Cases', () => {
    it('should handle current greater than total (cap at 100%)', () => {
      const { container } = render(<ProgressBar current={15} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle total of zero', () => {
      const { container } = render(<ProgressBar current={5} total={0} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle negative current value', () => {
      const { container } = render(<ProgressBar current={-5} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      // Component doesn't clamp negative values, so -5/10 = -50%
      expect(fillBar).toHaveStyle({ width: '-50%' });
    });

    it('should handle negative total value', () => {
      const { container } = render(<ProgressBar current={5} total={-10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle both negative values', () => {
      const { container } = render(<ProgressBar current={-5} total={-10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle very large values', () => {
      const { container } = render(<ProgressBar current={1000000} total={2000000} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should handle decimal values', () => {
      const { container } = render(<ProgressBar current={1.5} total={3.0} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should handle very small decimal values', () => {
      const { container } = render(<ProgressBar current={0.001} total={0.01} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '10%' });
    });
  });

  describe('Props Handling', () => {
    it('should accept current prop', () => {
      const { container, rerender } = render(<ProgressBar current={3} total={10} />);
      
      let fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '30%' });
      
      rerender(<ProgressBar current={7} total={10} />);
      fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '70%' });
    });

    it('should accept total prop', () => {
      const { container, rerender } = render(<ProgressBar current={5} total={10} />);
      
      let fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
      
      rerender(<ProgressBar current={5} total={20} />);
      fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '25%' });
    });

    it('should handle prop changes correctly', () => {
      const { container, rerender } = render(<ProgressBar current={2} total={10} />);
      
      let fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '20%' });
      
      rerender(<ProgressBar current={8} total={10} />);
      fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '80%' });
      
      rerender(<ProgressBar current={8} total={16} />);
      fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '50%' });
    });

    it('should handle zero current and total', () => {
      const { container } = render(<ProgressBar current={0} total={0} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible without aria attributes (purely visual)', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const progressContainer = container.firstChild;
      expect(progressContainer).not.toHaveAttribute('role');
      expect(progressContainer).not.toHaveAttribute('aria-valuenow');
      expect(progressContainer).not.toHaveAttribute('aria-valuemin');
      expect(progressContainer).not.toHaveAttribute('aria-valuemax');
    });

    it('should not interfere with screen readers (no text content)', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      expect(container.textContent).toBe('');
    });

    it('should maintain visual hierarchy', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const outerDiv = container.firstChild;
      const innerDiv = outerDiv?.firstChild;
      
      expect(outerDiv).toBeInTheDocument();
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct container classes', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass('w-full');
      expect(outerDiv).toHaveClass('h-2');
      expect(outerDiv).toHaveClass('bg-slate-700');
      expect(outerDiv).toHaveClass('rounded');
      expect(outerDiv).toHaveClass('overflow-hidden');
    });

    it('should apply correct fill bar classes', () => {
      const { container } = render(<ProgressBar current={5} total={10} />);
      
      const innerDiv = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(innerDiv).toHaveClass('h-full');
      expect(innerDiv).toHaveClass('bg-indigo-600');
    });

    it('should maintain consistent styling across different values', () => {
      const { container, rerender } = render(<ProgressBar current={0} total={10} />);
      
      let outerDiv = container.firstChild as HTMLElement;
      let innerDiv = container.querySelector('.bg-indigo-600') as HTMLElement;
      
      expect(outerDiv).toHaveClass('w-full', 'h-2', 'bg-slate-700', 'rounded', 'overflow-hidden');
      expect(innerDiv).toHaveClass('h-full', 'bg-indigo-600');
      
      rerender(<ProgressBar current={10} total={10} />);
      
      outerDiv = container.firstChild as HTMLElement;
      innerDiv = container.querySelector('.bg-indigo-600') as HTMLElement;
      
      expect(outerDiv).toHaveClass('w-full', 'h-2', 'bg-slate-700', 'rounded', 'overflow-hidden');
      expect(innerDiv).toHaveClass('h-full', 'bg-indigo-600');
    });

    it('should use inline styles for width only', () => {
      const { container } = render(<ProgressBar current={3} total={10} />);
      
      const innerDiv = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(innerDiv).toHaveStyle({ width: '30%' });
      
      // Should not have other inline styles
      const style = innerDiv.getAttribute('style');
      expect(style).toBe('width: 30%;');
    });
  });

  describe('Mathematical Edge Cases', () => {
    it('should handle infinity values gracefully', () => {
      const { container } = render(<ProgressBar current={Infinity} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '100%' });
    });

    it('should handle NaN current value', () => {
      const { container } = render(<ProgressBar current={NaN} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      // NaN/10 = NaN, Math.min(NaN, 1) = NaN, NaN * 100 = NaN
      expect(fillBar).toHaveStyle({ width: 'NaN%' });
    });

    it('should handle NaN total value', () => {
      const { container } = render(<ProgressBar current={5} total={NaN} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '0%' });
    });

    it('should handle very precise calculations', () => {
      const { container } = render(<ProgressBar current={1} total={7} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      const expectedWidth = (1 / 7) * 100;
      expect(fillBar).toHaveStyle({ width: `${expectedWidth}%` });
    });

    it('should handle rounding precision correctly', () => {
      // Test a case that might cause floating point precision issues
      const { container } = render(<ProgressBar current={0.1 + 0.2} total={1} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      const expectedWidth = Math.min((0.1 + 0.2) / 1, 1) * 100;
      expect(fillBar).toHaveStyle({ width: `${expectedWidth}%` });
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle mounting and unmounting', () => {
      const { unmount } = render(<ProgressBar current={5} total={10} />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle multiple rapid re-renders', () => {
      const { container, rerender } = render(<ProgressBar current={1} total={10} />);
      
      for (let i = 1; i <= 10; i++) {
        rerender(<ProgressBar current={i} total={10} />);
        const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
        expect(fillBar).toHaveStyle({ width: `${i * 10}%` });
      }
    });

    it('should maintain performance with frequent updates', () => {
      const { container, rerender } = render(<ProgressBar current={0} total={100} />);
      
      const start = performance.now();
      
      for (let i = 0; i <= 100; i++) {
        rerender(<ProgressBar current={i} total={100} />);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete 100 re-renders reasonably quickly (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent renders correctly', () => {
      const { container, rerender } = render(<ProgressBar current={5} total={10} />);
      
      // Simulate concurrent updates
      rerender(<ProgressBar current={3} total={10} />);
      rerender(<ProgressBar current={7} total={10} />);
      
      const fillBar = container.querySelector('.bg-indigo-600') as HTMLElement;
      expect(fillBar).toHaveStyle({ width: '70%' });
    });
  });
});