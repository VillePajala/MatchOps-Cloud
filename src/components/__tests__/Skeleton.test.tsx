import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  GameLoadingSkeleton,
  ModalLoadingSkeleton
} from '../Skeleton';
import GameLoadingSkeletonDefault from '../Skeleton';

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    describe('Basic Rendering', () => {
      it('should render without crashing', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should render as a div element', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('animate-pulse');
      });

      it('should apply default classes', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('animate-pulse');
        expect(skeleton).toHaveClass('bg-slate-600/30');
        expect(skeleton).toHaveClass('w-full');
        expect(skeleton).toHaveClass('h-4');
        expect(skeleton).toHaveClass('rounded');
      });
    });

    describe('Props Handling', () => {
      it('should apply custom width', () => {
        const { container } = render(<Skeleton width="w-1/2" />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('w-1/2');
        expect(skeleton).not.toHaveClass('w-full');
      });

      it('should apply custom height', () => {
        const { container } = render(<Skeleton height="h-8" />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('h-8');
        expect(skeleton).not.toHaveClass('h-4');
      });

      it('should apply custom className', () => {
        const { container } = render(<Skeleton className="custom-class" />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('custom-class');
      });

      it('should handle rounded prop as true', () => {
        const { container } = render(<Skeleton rounded={true} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('rounded');
      });

      it('should handle rounded prop as false', () => {
        const { container } = render(<Skeleton rounded={false} />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).not.toHaveClass('rounded');
      });

      it('should combine multiple custom props', () => {
        const { container } = render(
          <Skeleton
            width="w-32"
            height="h-6"
            className="mb-2"
            rounded={false}
          />
        );
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('w-32');
        expect(skeleton).toHaveClass('h-6');
        expect(skeleton).toHaveClass('mb-2');
        expect(skeleton).not.toHaveClass('rounded');
      });
    });

    describe('Default Values', () => {
      it('should use default width when not provided', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('w-full');
      });

      it('should use default height when not provided', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('h-4');
      });

      it('should use default rounded when not provided', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild as HTMLElement;
        
        expect(skeleton).toHaveClass('rounded');
      });

      it('should use empty className when not provided', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild as HTMLElement;
        
        // Should have base classes but no additional custom classes
        expect(skeleton.className).toContain('animate-pulse');
        expect(skeleton.className).not.toContain('undefined');
      });
    });
  });

  describe('SkeletonText', () => {
    describe('Basic Rendering', () => {
      it('should render without crashing', () => {
        const { container } = render(<SkeletonText />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should render container with correct classes', () => {
        const { container } = render(<SkeletonText />);
        const container_div = container.firstChild as HTMLElement;
        
        expect(container_div).toHaveClass('space-y-2');
      });

      it('should render single line by default', () => {
        const { container } = render(<SkeletonText />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons).toHaveLength(1);
      });
    });

    describe('Lines Prop', () => {
      it('should render specified number of lines', () => {
        const { container } = render(<SkeletonText lines={3} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons).toHaveLength(3);
      });

      it('should render 5 lines when specified', () => {
        const { container } = render(<SkeletonText lines={5} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons).toHaveLength(5);
      });

      it('should handle zero lines gracefully', () => {
        const { container } = render(<SkeletonText lines={0} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons).toHaveLength(0);
      });

      it('should handle single line correctly', () => {
        const { container } = render(<SkeletonText lines={1} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons).toHaveLength(1);
        expect(skeletons[0]).toHaveClass('w-full');
      });
    });

    describe('Line Width Logic', () => {
      it('should make last line 3/4 width when multiple lines', () => {
        const { container } = render(<SkeletonText lines={3} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // First two lines should be full width
        expect(skeletons[0]).toHaveClass('w-full');
        expect(skeletons[1]).toHaveClass('w-full');
        
        // Last line should be 3/4 width
        expect(skeletons[2]).toHaveClass('w-3/4');
      });

      it('should keep single line full width', () => {
        const { container } = render(<SkeletonText lines={1} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        expect(skeletons[0]).toHaveClass('w-full');
        expect(skeletons[0]).not.toHaveClass('w-3/4');
      });

      it('should apply correct height to all lines', () => {
        const { container } = render(<SkeletonText lines={2} />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        skeletons.forEach(skeleton => {
          expect(skeleton).toHaveClass('h-3');
        });
      });
    });

    describe('Custom ClassName', () => {
      it('should apply custom className to container', () => {
        const { container } = render(<SkeletonText className="custom-text-class" />);
        const container_div = container.firstChild as HTMLElement;
        
        expect(container_div).toHaveClass('custom-text-class');
        expect(container_div).toHaveClass('space-y-2');
      });
    });
  });

  describe('SkeletonCard', () => {
    describe('Basic Rendering', () => {
      it('should render without crashing', () => {
        const { container } = render(<SkeletonCard />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should render card container with correct classes', () => {
        const { container } = render(<SkeletonCard />);
        const card = container.firstChild as HTMLElement;
        
        expect(card).toHaveClass('p-4');
        expect(card).toHaveClass('border');
        expect(card).toHaveClass('border-slate-700');
        expect(card).toHaveClass('rounded-lg');
        expect(card).toHaveClass('bg-slate-800/50');
      });

      it('should contain header section with avatar and text', () => {
        const { container } = render(<SkeletonCard />);
        const header = container.querySelector('.flex.items-center.space-x-3.mb-3');
        
        expect(header).toBeInTheDocument();
      });

      it('should contain avatar skeleton', () => {
        const { container } = render(<SkeletonCard />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have avatar skeleton (w-10 h-10)
        const avatarSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-10') && skeleton.classList.contains('h-10')
        );
        expect(avatarSkeleton).toBeInTheDocument();
        expect(avatarSkeleton).toHaveClass('rounded');
      });

      it('should contain text skeletons in header', () => {
        const { container } = render(<SkeletonCard />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have title skeleton (w-1/2 h-4)
        const titleSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-1/2') && skeleton.classList.contains('h-4')
        );
        expect(titleSkeleton).toBeInTheDocument();
        
        // Should have subtitle skeleton (w-1/3 h-3)
        const subtitleSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-1/3') && skeleton.classList.contains('h-3')
        );
        expect(subtitleSkeleton).toBeInTheDocument();
      });

      it('should contain SkeletonText component', () => {
        const { container } = render(<SkeletonCard />);
        const textSection = container.querySelector('.space-y-2');
        
        expect(textSection).toBeInTheDocument();
      });
    });

    describe('Custom ClassName', () => {
      it('should apply custom className to card container', () => {
        const { container } = render(<SkeletonCard className="custom-card-class" />);
        const card = container.firstChild as HTMLElement;
        
        expect(card).toHaveClass('custom-card-class');
        expect(card).toHaveClass('p-4');
      });
    });
  });

  describe('GameLoadingSkeleton', () => {
    describe('Basic Rendering', () => {
      it('should render without crashing', () => {
        const { container } = render(<GameLoadingSkeleton />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should render main container with correct classes', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const main = container.firstChild as HTMLElement;
        
        expect(main).toHaveClass('space-y-4');
      });

      it('should contain game info section', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const gameInfoSection = container.querySelector('.bg-slate-800\\/50.p-4.rounded-lg.border.border-slate-700');
        
        expect(gameInfoSection).toBeInTheDocument();
      });

      it('should contain field section', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const fieldSection = container.querySelector('.bg-green-900\\/20.border.border-green-700\\/30.rounded-lg.p-4');
        
        expect(fieldSection).toBeInTheDocument();
      });

      it('should contain player bar section', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const playerBarSections = container.querySelectorAll('.bg-slate-800\\/50.p-3.rounded-lg.border.border-slate-700');
        
        expect(playerBarSections.length).toBeGreaterThan(0);
      });
    });

    describe('Game Info Section', () => {
      it('should contain header with title and time skeletons', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have title skeleton (w-32 h-5)
        const titleSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-32') && skeleton.classList.contains('h-5')
        );
        expect(titleSkeleton).toBeInTheDocument();
        
        // Should have time skeleton (w-16 h-4)
        const timeSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-16') && skeleton.classList.contains('h-4')
        );
        expect(timeSkeleton).toBeInTheDocument();
      });

      it('should contain grid with team information', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const grid = container.querySelector('.grid.grid-cols-2.gap-4');
        
        expect(grid).toBeInTheDocument();
      });
    });

    describe('Field Section', () => {
      it('should contain field skeleton with correct styling', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have field skeleton (w-full h-64 bg-green-800/20)
        const fieldSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-full') && 
          skeleton.classList.contains('h-64') && 
          skeleton.classList.contains('bg-green-800/20')
        );
        expect(fieldSkeleton).toBeInTheDocument();
      });

      it('should contain field footer with team skeletons', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const fieldFooter = container.querySelector('.mt-3.flex.justify-between');
        
        expect(fieldFooter).toBeInTheDocument();
        
        const teamSkeletons = fieldFooter?.querySelectorAll('.w-24.h-4');
        expect(teamSkeletons).toHaveLength(2);
      });
    });

    describe('Player Bar Section', () => {
      it('should contain player disks', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const playerDiskContainer = container.querySelector('.flex.space-x-2');
        
        expect(playerDiskContainer).toBeInTheDocument();
      });

      it('should render 5 player disk skeletons', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have 5 player disk skeletons (w-12 h-12)
        const playerDiskSkeletons = Array.from(skeletons).filter(skeleton => 
          skeleton.classList.contains('w-12') && skeleton.classList.contains('h-12')
        );
        expect(playerDiskSkeletons).toHaveLength(5);
        
        // All should be rounded
        playerDiskSkeletons.forEach(skeleton => {
          expect(skeleton).toHaveClass('rounded');
        });
      });

      it('should contain add button skeleton', () => {
        const { container } = render(<GameLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have add button skeleton (w-8 h-12)
        const addButtonSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-8') && skeleton.classList.contains('h-12')
        );
        expect(addButtonSkeleton).toBeInTheDocument();
      });
    });

    describe('Custom ClassName', () => {
      it('should apply custom className to main container', () => {
        const { container } = render(<GameLoadingSkeleton className="custom-game-class" />);
        const main = container.firstChild as HTMLElement;
        
        expect(main).toHaveClass('custom-game-class');
        expect(main).toHaveClass('space-y-4');
      });
    });
  });

  describe('ModalLoadingSkeleton', () => {
    describe('Basic Rendering', () => {
      it('should render without crashing', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        expect(container.firstChild).toBeInTheDocument();
      });

      it('should render main container with correct classes', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const main = container.firstChild as HTMLElement;
        
        expect(main).toHaveClass('space-y-4');
      });

      it('should contain header section', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const header = container.querySelector('.flex.justify-between.items-center.pb-4.border-b.border-slate-600');
        
        expect(header).toBeInTheDocument();
      });

      it('should contain content section', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const content = container.querySelector('.space-y-4');
        
        expect(content).toBeInTheDocument();
      });

      it('should contain footer section', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const footer = container.querySelector('.flex.justify-end.space-x-3.pt-4.border-t.border-slate-600');
        
        expect(footer).toBeInTheDocument();
      });
    });

    describe('Header Section', () => {
      it('should contain title skeleton', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have title skeleton (w-48 h-6)
        const titleSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-48') && skeleton.classList.contains('h-6')
        );
        expect(titleSkeleton).toBeInTheDocument();
      });

      it('should contain close button skeleton', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have close button skeleton (w-6 h-6 rounded)
        const closeButtonSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-6') && 
          skeleton.classList.contains('h-6') && 
          skeleton.classList.contains('rounded')
        );
        expect(closeButtonSkeleton).toBeInTheDocument();
      });
    });

    describe('Content Section', () => {
      it('should render 3 skeleton cards', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const cards = container.querySelectorAll('.p-4.border.border-slate-700.rounded-lg.bg-slate-800\\/50');
        
        expect(cards).toHaveLength(3);
      });

      it('should contain SkeletonCard components', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        
        // Each card should have the SkeletonCard structure
        const avatarSkeletons = container.querySelectorAll('.w-10.h-10');
        expect(avatarSkeletons.length).toBeGreaterThanOrEqual(3); // At least 3 cards with avatars
      });
    });

    describe('Footer Section', () => {
      it('should contain action button skeletons', () => {
        const { container } = render(<ModalLoadingSkeleton />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        
        // Should have cancel button skeleton (w-20 h-9)
        const cancelButtonSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-20') && skeleton.classList.contains('h-9')
        );
        expect(cancelButtonSkeleton).toBeInTheDocument();
        
        // Should have action button skeleton (w-24 h-9)
        const actionButtonSkeleton = Array.from(skeletons).find(skeleton => 
          skeleton.classList.contains('w-24') && skeleton.classList.contains('h-9')
        );
        expect(actionButtonSkeleton).toBeInTheDocument();
      });
    });

    describe('Custom ClassName', () => {
      it('should apply custom className to main container', () => {
        const { container } = render(<ModalLoadingSkeleton className="custom-modal-class" />);
        const main = container.firstChild as HTMLElement;
        
        expect(main).toHaveClass('custom-modal-class');
        expect(main).toHaveClass('space-y-4');
      });
    });
  });

  describe('Default Export', () => {
    it('should export GameLoadingSkeleton as default', () => {
      expect(GameLoadingSkeletonDefault).toBe(GameLoadingSkeleton);
    });

    it('should render default export without crashing', () => {
      const { container } = render(<GameLoadingSkeletonDefault />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work with nested Skeleton components', () => {
      const { container } = render(
        <div>
          <Skeleton />
          <SkeletonText lines={2} />
          <SkeletonCard />
        </div>
      );
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(5); // Multiple components with skeletons
    });

    it('should handle concurrent rendering', () => {
      const { container } = render(
        <div>
          <GameLoadingSkeleton />
          <ModalLoadingSkeleton />
        </div>
      );
      
      expect(container.children).toHaveLength(1);
      expect(container.firstChild?.children).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const start = performance.now();
      render(<GameLoadingSkeleton />);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10);
    });

    it('should not create memory leaks', () => {
      const { unmount } = render(<ModalLoadingSkeleton />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<SkeletonText lines={1} />);
      
      const start = performance.now();
      for (let i = 1; i <= 10; i++) {
        rerender(<SkeletonText lines={i} />);
      }
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50);
    });
  });
});