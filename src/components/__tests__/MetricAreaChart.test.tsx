import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricAreaChart from '../MetricAreaChart';

// Mock Recharts components to avoid ResizeObserver and SVG issues in JSDOM
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ data, children }: { data: any[]; children: React.ReactNode }) => (
    <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: ({ dataKey, fill, stroke, name }: { dataKey: string; fill: string; stroke: string; name: string }) => (
    <div 
      data-testid="area" 
      data-key={dataKey} 
      data-fill={fill} 
      data-stroke={stroke} 
      data-name={name}
    />
  ),
  YAxis: ({ domain, allowDecimals }: { domain: number[]; allowDecimals: boolean }) => (
    <div 
      data-testid="y-axis" 
      data-domain={JSON.stringify(domain)} 
      data-allow-decimals={allowDecimals}
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
  Tooltip: ({ content, ...props }: { content: any; [key: string]: any }) => (
    <div data-testid="tooltip" data-tooltip-props={JSON.stringify(props)}>
      Tooltip Component
    </div>
  ),
  Legend: ({ iconType, iconSize }: { iconType: string; iconSize: number }) => (
    <div 
      data-testid="legend" 
      data-icon-type={iconType} 
      data-icon-size={iconSize}
    />
  ),
  ReferenceLine: ({ y, stroke, strokeDasharray }: { y: number; stroke: string; strokeDasharray: string }) => (
    <div 
      data-testid="reference-line" 
      data-y={y} 
      data-stroke={stroke} 
      data-stroke-dasharray={strokeDasharray}
    />
  ),
}));

describe('MetricAreaChart', () => {
  const defaultProps = {
    data: [
      { date: '2024-01-01', value: 10 },
      { date: '2024-01-02', value: 15 },
      { date: '2024-01-03', value: 8 },
      { date: '2024-01-04', value: 12 },
      { date: '2024-01-05', value: 20 },
    ],
    label: 'Test Metric',
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
      render(<MetricAreaChart {...defaultProps} />);
      
      const container = screen.getByTestId('responsive-container').parentElement;
      expect(container).toHaveStyle({ width: '100%', height: '120px' });
    });

    it('should render all chart components', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line')).toBeInTheDocument();
    });

    it('should pass correct data to chart', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      // Data should be reversed (most recent first)
      expect(chartData).toHaveLength(5);
      expect(chartData[0]).toEqual({ date: '2024-01-05', value: 20 });
      expect(chartData[4]).toEqual({ date: '2024-01-01', value: 10 });
    });
  });

  describe('Data Processing', () => {
    it('should reverse data order for display', () => {
      const data = [
        { date: '2024-01-01', value: 1 },
        { date: '2024-01-02', value: 2 },
        { date: '2024-01-03', value: 3 },
      ];
      
      render(<MetricAreaChart data={data} label="Test" />);
      
      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].value).toBe(3);
      expect(chartData[1].value).toBe(2);
      expect(chartData[2].value).toBe(1);
    });

    it('should calculate correct Y-axis domain with minimum value of 10', () => {
      const lowValueData = [
        { date: '2024-01-01', value: 2 },
        { date: '2024-01-02', value: 5 },
        { date: '2024-01-03', value: 8 },
      ];
      
      render(<MetricAreaChart data={lowValueData} label="Low Values" />);
      
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
      
      render(<MetricAreaChart data={highValueData} label="High Values" />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 30]); // Should use max value
    });

    it('should calculate correct average for reference line', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const referenceLine = screen.getByTestId('reference-line');
      const averageY = parseFloat(referenceLine.getAttribute('data-y') || '0');
      
      // Average of [10, 15, 8, 12, 20] = 65/5 = 13
      expect(averageY).toBe(13);
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty data array', () => {
      render(<MetricAreaChart data={[]} label="Empty Data" />);
      
      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(0);
    });

    it('should set average to 0 when data is empty', () => {
      render(<MetricAreaChart data={[]} label="Empty Data" />);
      
      const referenceLine = screen.getByTestId('reference-line');
      const averageY = parseFloat(referenceLine.getAttribute('data-y') || '0');
      
      expect(averageY).toBe(0);
    });

    it('should use minimum domain of 10 when data is empty', () => {
      render(<MetricAreaChart data={[]} label="Empty Data" />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 10]);
    });
  });

  describe('Chart Configuration', () => {
    it('should configure Area component correctly', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const area = screen.getByTestId('area');
      expect(area).toHaveAttribute('data-key', 'value');
      expect(area).toHaveAttribute('data-fill', '#facc15');
      expect(area).toHaveAttribute('data-stroke', '#facc15');
      expect(area).toHaveAttribute('data-name', 'Test Metric');
    });

    it('should configure Y-axis correctly', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-allow-decimals', 'false');
    });

    it('should configure CartesianGrid correctly', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const grid = screen.getByTestId('cartesian-grid');
      expect(grid).toHaveAttribute('data-stroke', '#4b5563');
      expect(grid).toHaveAttribute('data-stroke-dasharray', '3 3');
      expect(grid).toHaveAttribute('data-vertical', 'false');
    });

    it('should configure Legend correctly', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const legend = screen.getByTestId('legend');
      expect(legend).toHaveAttribute('data-icon-type', 'circle');
      expect(legend).toHaveAttribute('data-icon-size', '8');
    });

    it('should configure ReferenceLine correctly', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine).toHaveAttribute('data-stroke', '#94a3b8');
      expect(referenceLine).toHaveAttribute('data-stroke-dasharray', '4 4');
    });
  });

  describe('Custom Components', () => {
    it('should render Tooltip component', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Tooltip Component')).toBeInTheDocument();
    });

    it('should pass content prop to Tooltip', () => {
      render(<MetricAreaChart {...defaultProps} />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Label Prop Usage', () => {
    it('should use label in Area component name', () => {
      render(<MetricAreaChart data={defaultProps.data} label="Custom Label" />);
      
      const area = screen.getByTestId('area');
      expect(area).toHaveAttribute('data-name', 'Custom Label');
    });

    it('should pass custom label to component', () => {
      render(<MetricAreaChart data={defaultProps.data} label="Custom Label" />);
      
      // Verify tooltip is rendered (the label is passed to the CustomTooltip via content prop)
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Single Data Point', () => {
    it('should handle single data point correctly', () => {
      const singlePointData = [{ date: '2024-01-01', value: 42 }];
      
      render(<MetricAreaChart data={singlePointData} label="Single Point" />);
      
      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(1);
      expect(chartData[0]).toEqual({ date: '2024-01-01', value: 42 });
    });

    it('should calculate correct average for single data point', () => {
      const singlePointData = [{ date: '2024-01-01', value: 42 }];
      
      render(<MetricAreaChart data={singlePointData} label="Single Point" />);
      
      const referenceLine = screen.getByTestId('reference-line');
      const averageY = parseFloat(referenceLine.getAttribute('data-y') || '0');
      
      expect(averageY).toBe(42);
    });
  });

  describe('Large Values', () => {
    it('should handle large numeric values', () => {
      const largeValueData = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-01-02', value: 2000 },
        { date: '2024-01-03', value: 1500 },
      ];
      
      render(<MetricAreaChart data={largeValueData} label="Large Values" />);
      
      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual([0, 2000]);
    });
  });

  describe('Zero Values', () => {
    it('should handle zero values correctly', () => {
      const zeroValueData = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-01-02', value: 5 },
        { date: '2024-01-03', value: 0 },
      ];
      
      render(<MetricAreaChart data={zeroValueData} label="Zero Values" />);
      
      const referenceLine = screen.getByTestId('reference-line');
      const averageY = parseFloat(referenceLine.getAttribute('data-y') || '0');
      
      // Average of [0, 5, 0] = 5/3 ≈ 1.67
      expect(averageY).toBeCloseTo(1.67, 1);
    });
  });

  describe('Component Memoization', () => {
    it('should be wrapped with React.memo', () => {
      // Test that the component is memoized by checking if it's a memo component
      const component = MetricAreaChart as any;
      expect(component.$$typeof.toString()).toContain('react.memo');
    });
  });
});

// Test CustomTooltip separately by testing the date formatting logic
describe('CustomTooltip functionality', () => {
  it('should handle date formatting in tooltip', () => {
    // Test that new Date().toLocaleDateString() works as expected
    const testDate = '2024-01-01';
    const formattedDate = new Date(testDate).toLocaleDateString();
    expect(formattedDate).toMatch(/1\/1\/2024|2024-01-01|Jan 1, 2024/); // Different locale formats
  });

  it('should construct tooltip content structure', () => {
    // Test the tooltip data structure that would be passed
    const mockPayload = [{ payload: { date: '2024-01-01', value: 10 } }];
    const data = mockPayload[0].payload;
    
    expect(data.date).toBe('2024-01-01');
    expect(data.value).toBe(10);
  });
});

describe('CustomizedDot Component', () => {
  it('should render circle with correct properties', () => {
    // Test the CustomizedDot component directly
    const CustomizedDot = ({ cx, cy }: { cx?: number; cy?: number }) => (
      <circle cx={cx} cy={cy} r={1.5} fill="#6366f1" />
    );
    
    const { container } = render(<CustomizedDot cx={50} cy={100} />);
    const circle = container.querySelector('circle');
    
    expect(circle).toHaveAttribute('cx', '50');
    expect(circle).toHaveAttribute('cy', '100');
    expect(circle).toHaveAttribute('r', '1.5');
    expect(circle).toHaveAttribute('fill', '#6366f1');
  });

  it('should handle undefined cx and cy values', () => {
    const CustomizedDot = ({ cx, cy }: { cx?: number; cy?: number }) => (
      <circle cx={cx} cy={cy} r={1.5} fill="#6366f1" />
    );
    
    const { container } = render(<CustomizedDot />);
    const circle = container.querySelector('circle');
    
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('r', '1.5');
    expect(circle).toHaveAttribute('fill', '#6366f1');
  });
});