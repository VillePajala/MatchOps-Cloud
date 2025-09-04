import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricTrendChart from '../MetricTrendChart';

// Mock Recharts components to avoid ResizeObserver and SVG issues in JSDOM
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }: { data: any[]; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, type, strokeWidth }: { dataKey: string; stroke: string; type: string; strokeWidth: number }) => (
    <div 
      data-testid="line" 
      data-key={dataKey} 
      data-stroke={stroke} 
      data-type={type}
      data-stroke-width={strokeWidth}
    />
  ),
  YAxis: ({ hide, domain }: { hide: boolean; domain: number[] }) => (
    <div 
      data-testid="y-axis" 
      data-hide={hide} 
      data-domain={JSON.stringify(domain)}
    />
  ),
  CartesianGrid: ({ stroke, strokeDasharray, vertical }: { stroke: string; strokeDasharray: string; vertical: boolean }) => (
    <div 
      data-testid="cartesian-grid" 
      data-stroke={stroke} 
      data-stroke-dasharray={strokeDasharray} 
      data-vertical={vertical}
    />
  ),
  Tooltip: ({ cursor, labelFormatter, wrapperStyle }: { cursor: any; labelFormatter: (v: any) => string; wrapperStyle: any }) => {
    // Test the labelFormatter function
    const testDate = '2024-01-01';
    const formattedLabel = labelFormatter ? labelFormatter(testDate) : testDate;
    return (
      <div 
        data-testid="tooltip" 
        data-cursor={JSON.stringify(cursor)}
        data-wrapper-style={JSON.stringify(wrapperStyle)}
        data-formatted-label={formattedLabel}
      />
    );
  },
}));

describe('MetricTrendChart', () => {
  const defaultProps = {
    data: [
      { date: '2024-01-03', value: 8 },
      { date: '2024-01-01', value: 10 },
      { date: '2024-01-05', value: 20 },
      { date: '2024-01-02', value: 15 },
      { date: '2024-01-04', value: 12 },
    ],
  };

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render chart container with correct dimensions', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const container = screen.getByTestId('responsive-container').parentElement;
      expect(container).toHaveStyle({ width: '100%', height: '60px' });
    });

    it('should render all chart components', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should pass sorted data to chart', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      // Data should be sorted chronologically
      expect(chartData).toHaveLength(5);
      expect(chartData[0]).toEqual({ date: '2024-01-01', value: 10 });
      expect(chartData[1]).toEqual({ date: '2024-01-02', value: 15 });
      expect(chartData[2]).toEqual({ date: '2024-01-03', value: 8 });
      expect(chartData[3]).toEqual({ date: '2024-01-04', value: 12 });
      expect(chartData[4]).toEqual({ date: '2024-01-05', value: 20 });
    });
  });

  describe('Data Processing', () => {
    it('should sort data chronologically by date', () => {
      const unsortedData = [
        { date: '2024-12-31', value: 30 },
        { date: '2024-01-01', value: 10 },
        { date: '2024-06-15', value: 20 },
      ];
      
      render(<MetricTrendChart data={unsortedData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].date).toBe('2024-01-01');
      expect(chartData[1].date).toBe('2024-06-15');
      expect(chartData[2].date).toBe('2024-12-31');
    });

    it('should calculate correct Y-axis domain with minimum value of 10', () => {
      const lowValueData = [
        { date: '2024-01-01', value: 2 },
        { date: '2024-01-02', value: 5 },
        { date: '2024-01-03', value: 8 },
      ];
      
      render(<MetricTrendChart data={lowValueData} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 10]); // Should use minimum of 10
    });

    it('should calculate correct Y-axis domain with values above 10', () => {
      const highValueData = [
        { date: '2024-01-01', value: 15 },
        { date: '2024-01-02', value: 25 },
        { date: '2024-01-03', value: 30 },
      ];
      
      render(<MetricTrendChart data={highValueData} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 30]); // Should use max value
    });

    it('should handle equal date values correctly', () => {
      const duplicateDateData = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-01', value: 15 },
        { date: '2024-01-02', value: 20 },
      ];
      
      render(<MetricTrendChart data={duplicateDateData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(3);
      // Should maintain order for equal dates
      expect(chartData[0]).toEqual({ date: '2024-01-01', value: 10 });
      expect(chartData[1]).toEqual({ date: '2024-01-01', value: 15 });
      expect(chartData[2]).toEqual({ date: '2024-01-02', value: 20 });
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty data array', () => {
      render(<MetricTrendChart data={[]} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(0);
    });

    it('should use minimum domain of 10 when data is empty', () => {
      render(<MetricTrendChart data={[]} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 10]);
    });

    it('should handle single data point', () => {
      const singlePointData = [{ date: '2024-01-01', value: 42 }];
      
      render(<MetricTrendChart data={singlePointData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(1);
      expect(chartData[0]).toEqual({ date: '2024-01-01', value: 42 });
    });
  });

  describe('Chart Configuration', () => {
    it('should configure Line component correctly', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const line = screen.getByTestId('line');
      expect(line).toHaveAttribute('data-key', 'value');
      expect(line).toHaveAttribute('data-stroke', '#facc15');
      expect(line).toHaveAttribute('data-type', 'monotone');
      expect(line).toHaveAttribute('data-stroke-width', '2');
    });

    it('should configure Y-axis correctly', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-hide', 'true');
    });

    it('should configure CartesianGrid correctly', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const grid = screen.getByTestId('cartesian-grid');
      expect(grid).toHaveAttribute('data-stroke', '#4b5563');
      expect(grid).toHaveAttribute('data-stroke-dasharray', '3 3');
      expect(grid).toHaveAttribute('data-vertical', 'false');
    });

    it('should configure Tooltip correctly', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const tooltip = screen.getByTestId('tooltip');
      
      const cursor = JSON.parse(tooltip.getAttribute('data-cursor') || '{}');
      expect(cursor).toEqual({ stroke: '#334155' });
      
      const wrapperStyle = JSON.parse(tooltip.getAttribute('data-wrapper-style') || '{}');
      expect(wrapperStyle).toEqual({
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none'
      });
    });

    it('should format tooltip labels correctly', () => {
      render(<MetricTrendChart {...defaultProps} />);
      
      const tooltip = screen.getByTestId('tooltip');
      const formattedLabel = tooltip.getAttribute('data-formatted-label');
      
      // Should format '2024-01-01' to a locale date string
      expect(formattedLabel).toMatch(/1\/1\/2024|2024-01-01|Jan 1, 2024/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const zeroValueData = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-01-02', value: 5 },
        { date: '2024-01-03', value: 0 },
      ];
      
      render(<MetricTrendChart data={zeroValueData} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      // Should use minimum domain of 10 even with zero values
      expect(domain).toEqual([0, 10]);
    });

    it('should handle negative values correctly', () => {
      const negativeValueData = [
        { date: '2024-01-01', value: -5 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: -10 },
      ];
      
      render(<MetricTrendChart data={negativeValueData} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      // Should use max value (15)
      expect(domain).toEqual([0, 15]);
    });

    it('should handle large numeric values', () => {
      const largeValueData = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-01-02', value: 2000 },
        { date: '2024-01-03', value: 1500 },
      ];
      
      render(<MetricTrendChart data={largeValueData} />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 2000]);
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidDateData = [
        { date: 'invalid-date', value: 10 },
        { date: '2024-01-01', value: 15 },
        { date: '', value: 20 },
      ];
      
      // Should not throw error during render
      expect(() => {
        render(<MetricTrendChart data={invalidDateData} />);
      }).not.toThrow();
    });
  });

  describe('Component Props', () => {
    it('should handle data prop correctly', () => {
      const customData = [
        { date: '2023-12-25', value: 100 },
        { date: '2023-12-26', value: 200 },
      ];
      
      render(<MetricTrendChart data={customData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toEqual(customData);
    });

    it('should not mutate original data array', () => {
      const originalData = [
        { date: '2024-01-03', value: 8 },
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
      ];
      const originalDataCopy = JSON.parse(JSON.stringify(originalData));
      
      render(<MetricTrendChart data={originalData} />);
      
      // Original data should remain unchanged
      expect(originalData).toEqual(originalDataCopy);
    });
  });

  describe('Date Sorting Logic', () => {
    it('should sort dates across different years', () => {
      const crossYearData = [
        { date: '2025-01-01', value: 30 },
        { date: '2023-12-31', value: 10 },
        { date: '2024-06-15', value: 20 },
      ];
      
      render(<MetricTrendChart data={crossYearData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].date).toBe('2023-12-31');
      expect(chartData[1].date).toBe('2024-06-15');
      expect(chartData[2].date).toBe('2025-01-01');
    });

    it('should sort dates within same month', () => {
      const sameDayData = [
        { date: '2024-01-15', value: 30 },
        { date: '2024-01-05', value: 10 },
        { date: '2024-01-25', value: 20 },
      ];
      
      render(<MetricTrendChart data={sameDayData} />);
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].date).toBe('2024-01-05');
      expect(chartData[1].date).toBe('2024-01-15');
      expect(chartData[2].date).toBe('2024-01-25');
    });
  });

  describe('Performance and Optimization', () => {
    it('should be wrapped with React.memo', () => {
      // Test that the component is memoized by checking if it's a memo component
      const component = MetricTrendChart as any;
      expect(component.$$typeof.toString()).toContain('react.memo');
    });

    it('should handle data updates efficiently', () => {
      const initialData = [{ date: '2024-01-01', value: 10 }];
      const { rerender } = render(<MetricTrendChart data={initialData} />);
      
      const updatedData = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
      ];
      
      expect(() => {
        rerender(<MetricTrendChart data={updatedData} />);
      }).not.toThrow();
      
      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(2);
    });

    it('should create new sorted array without modifying original', () => {
      const testData = [
        { date: '2024-01-03', value: 8 },
        { date: '2024-01-01', value: 10 },
      ];
      
      render(<MetricTrendChart data={testData} />);
      
      // Original data order should be preserved
      expect(testData[0].date).toBe('2024-01-03');
      expect(testData[1].date).toBe('2024-01-01');
    });
  });
});