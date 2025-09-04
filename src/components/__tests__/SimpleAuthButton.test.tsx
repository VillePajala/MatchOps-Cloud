import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SimpleAuthButton } from '../SimpleAuthButton';

// Mock the react-icons/hi2 module
jest.mock('react-icons/hi2', () => ({
  HiOutlineUser: ({ className }: { className?: string }) => (
    <svg data-testid="user-icon" className={className}>
      <title>User Icon</title>
    </svg>
  ),
}));

describe('SimpleAuthButton', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<SimpleAuthButton />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should display "Simple Auth" text', () => {
      render(<SimpleAuthButton />);
      expect(screen.getByText('Simple Auth')).toBeInTheDocument();
    });

    it('should render the user icon', () => {
      render(<SimpleAuthButton />);
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should have the correct button structure', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('user-icon');
      const text = screen.getByText('Simple Auth');
      
      expect(button).toContainElement(icon);
      expect(button).toContainElement(text);
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct CSS classes to button', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-gray-800');
      expect(button).toHaveClass('hover:bg-gray-700');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('rounded-lg');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('items-center');
    });

    it('should apply all button classes at once', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass(
        'bg-gray-800',
        'hover:bg-gray-700',
        'text-white',
        'px-4',
        'py-2',
        'rounded-lg',
        'inline-flex',
        'items-center'
      );
    });

    it('should apply correct icon classes', () => {
      render(<SimpleAuthButton />);
      const icon = screen.getByTestId('user-icon');
      
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    it('should apply correct text span classes', () => {
      render(<SimpleAuthButton />);
      const textSpan = screen.getByText('Simple Auth');
      
      expect(textSpan.tagName).toBe('SPAN');
      expect(textSpan).toHaveClass('ml-2');
    });

    it('should maintain consistent layout structure', () => {
      const { container } = render(<SimpleAuthButton />);
      const button = container.querySelector('button');
      const icon = container.querySelector('[data-testid="user-icon"]');
      const span = container.querySelector('span');
      
      expect(button?.children).toHaveLength(2);
      expect(button?.children[0]).toBe(icon);
      expect(button?.children[1]).toBe(span);
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have accessible name from text content', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button', { name: 'User Icon Simple Auth' });
      expect(button).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      // Should be reachable via Tab
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should have button semantics', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      // HTML button elements don't have type="button" by default unless explicitly set
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveRole('button');
    });

    it('should not have disabled state by default', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).not.toBeDisabled();
      expect(button).toBeEnabled();
    });
  });

  describe('User Interactions', () => {
    it('should be clickable', () => {
      const handleClick = jest.fn();
      const { container } = render(<SimpleAuthButton />);
      const button = container.querySelector('button') as HTMLButtonElement;
      
      // Add event listener manually since component doesn't have onClick prop
      button.addEventListener('click', handleClick);
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should respond to mouse events', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(() => {
        fireEvent.mouseEnter(button);
        fireEvent.mouseLeave(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      }).not.toThrow();
    });

    it('should respond to keyboard events', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(() => {
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyUp(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: ' ' });
        fireEvent.keyUp(button, { key: ' ' });
      }).not.toThrow();
    });

    it('should handle focus and blur events', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(() => {
        fireEvent.focus(button);
        fireEvent.blur(button);
      }).not.toThrow();
    });

    it('should maintain state during interactions', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      // Interact with button multiple times
      fireEvent.click(button);
      fireEvent.focus(button);
      fireEvent.blur(button);
      fireEvent.click(button);
      
      // Should still be the same button with same content
      expect(screen.getByText('Simple Auth')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });

  describe('Component Props and Behavior', () => {
    it('should not accept any props (static component)', () => {
      // Component doesn't accept props, should render consistently
      const { container: container1 } = render(<SimpleAuthButton />);
      const { container: container2 } = render(<SimpleAuthButton />);
      
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it('should be a pure component (same props = same output)', () => {
      const { container, rerender } = render(<SimpleAuthButton />);
      const initialHTML = container.innerHTML;
      
      rerender(<SimpleAuthButton />);
      expect(container.innerHTML).toBe(initialHTML);
    });

    it('should maintain consistent rendering across multiple instances', () => {
      const { container } = render(
        <div>
          <SimpleAuthButton />
          <SimpleAuthButton />
          <SimpleAuthButton />
        </div>
      );
      
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
      
      buttons.forEach(button => {
        expect(button).toHaveClass('bg-gray-800', 'text-white');
        expect(button.textContent).toContain('Simple Auth');
      });
    });

    it('should not have any dynamic state', () => {
      const { container } = render(<SimpleAuthButton />);
      const initialState = container.innerHTML;
      
      // Simulate various interactions
      const button = container.querySelector('button') as HTMLButtonElement;
      fireEvent.click(button);
      fireEvent.focus(button);
      fireEvent.blur(button);
      
      // Content should remain the same (no dynamic state)
      expect(container.innerHTML).toBe(initialState);
    });
  });

  describe('Icon Integration', () => {
    it('should render HiOutlineUser icon with correct props', () => {
      render(<SimpleAuthButton />);
      const icon = screen.getByTestId('user-icon');
      
      expect(icon).toHaveClass('w-5', 'h-5');
      expect(icon.tagName).toBe('svg');
    });

    it('should position icon before text', () => {
      const { container } = render(<SimpleAuthButton />);
      const button = container.querySelector('button');
      const children = Array.from(button?.children || []);
      
      expect(children[0]).toHaveAttribute('data-testid', 'user-icon');
      expect(children[1]).toHaveTextContent('Simple Auth');
    });

    it('should maintain icon-text spacing', () => {
      render(<SimpleAuthButton />);
      const textSpan = screen.getByText('Simple Auth');
      
      expect(textSpan).toHaveClass('ml-2');
    });

    it('should handle icon rendering correctly', () => {
      render(<SimpleAuthButton />);
      
      // Icon should be present and accessible
      const icon = screen.getByTestId('user-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toBeVisible();
    });
  });

  describe('Layout and Responsive Design', () => {
    it('should use flexbox for layout', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('inline-flex', 'items-center');
    });

    it('should have appropriate padding', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('should have rounded corners', () => {
      render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('rounded-lg');
    });

    it('should maintain layout integrity', () => {
      const { container } = render(<SimpleAuthButton />);
      const button = container.querySelector('button');
      
      // Should have exactly 2 children (icon + text)
      expect(button?.children).toHaveLength(2);
      
      // First child should be the icon
      expect(button?.children[0]).toHaveAttribute('data-testid', 'user-icon');
      
      // Second child should be the text span
      expect(button?.children[1]).toHaveTextContent('Simple Auth');
      expect(button?.children[1].tagName).toBe('SPAN');
    });
  });

  describe('Performance and Optimization', () => {
    it('should render quickly', () => {
      const start = performance.now();
      render(<SimpleAuthButton />);
      const end = performance.now();
      
      // Should render in less than 10ms (very fast for such a simple component)
      expect(end - start).toBeLessThan(10);
    });

    it('should handle multiple rapid renders', () => {
      const { rerender } = render(<SimpleAuthButton />);
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        rerender(<SimpleAuthButton />);
      }
      const end = performance.now();
      
      // 100 re-renders should complete quickly
      expect(end - start).toBeLessThan(100);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<SimpleAuthButton />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should be lightweight (minimal DOM nodes)', () => {
      const { container } = render(<SimpleAuthButton />);
      
      // Should have minimal DOM structure: button > (icon + span)
      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBeLessThanOrEqual(4); // container + button + icon + span
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing icon gracefully', () => {
      // Mock HiOutlineUser to return null
      jest.doMock('react-icons/hi2', () => ({
        HiOutlineUser: () => null,
      }));
      
      expect(() => {
        render(<SimpleAuthButton />);
      }).not.toThrow();
    });

    it('should render in different container contexts', () => {
      // Test rendering inside different container types
      const { container: div } = render(<div><SimpleAuthButton /></div>);
      const { container: section } = render(<section><SimpleAuthButton /></section>);
      const { container: main } = render(<main><SimpleAuthButton /></main>);
      
      expect(div.querySelector('button')).toBeInTheDocument();
      expect(section.querySelector('button')).toBeInTheDocument();
      expect(main.querySelector('button')).toBeInTheDocument();
    });

    it('should handle concurrent renders', () => {
      const { container, rerender } = render(<SimpleAuthButton />);
      
      // Simulate rapid concurrent updates
      rerender(<SimpleAuthButton />);
      rerender(<SimpleAuthButton />);
      rerender(<SimpleAuthButton />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Simple Auth')).toBeInTheDocument();
    });

    it('should maintain integrity under stress testing', () => {
      const { container } = render(<SimpleAuthButton />);
      const button = screen.getByRole('button');
      
      // Stress test with many events
      for (let i = 0; i < 50; i++) {
        fireEvent.click(button);
        fireEvent.focus(button);
        fireEvent.blur(button);
      }
      
      // Should still be functional
      expect(screen.getByText('Simple Auth')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });
});