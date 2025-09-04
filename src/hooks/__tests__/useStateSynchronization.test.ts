import { renderHook, act } from '@testing-library/react';
import { useStateSynchronization } from '../useStateSynchronization';

describe('useStateSynchronization', () => {
  it('should synchronize operations sequentially', async () => {
    const { result } = renderHook(() => useStateSynchronization());
    const executionOrder: number[] = [];

    const operation1 = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(1);
      return 'result1';
    });

    const operation2 = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      executionOrder.push(2);
      return 'result2';
    });

    // Start both operations simultaneously
    const promise1 = act(() => 
      result.current.withSynchronization('operation1', operation1)
    );
    const promise2 = act(() => 
      result.current.withSynchronization('operation2', operation2)
    );

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(executionOrder).toEqual([1, 2]); // Should execute in order despite operation2 being faster
    expect(operation1).toHaveBeenCalledTimes(1);
    expect(operation2).toHaveBeenCalledTimes(1);
  });
});