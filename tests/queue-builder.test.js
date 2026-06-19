// queue-builder.test.js

const { buildQueue } = require('../../js/training'); // Adjust path as needed

describe('Queue Builder', () => {
  const mockExercises = [
    { name: 'stretch', category: 'flexibility', position: 'left', sided: false },
    { name: 'pushup', category: 'strength', position: 'left', sided: false },
    { name: 'squat', category: 'strength', position: 'left', sided: true },
    { name: 'plank', category: 'flexibility', position: 'center', sided: false }
  ];

  it('should include flexibility exercises in slots', () => {
    const { queue } = buildQueue(60, 5, 2, 120, 30);

    const exerciseSteps = queue.filter(step => step.type === 'exercise');
    const flexSteps = exerciseSteps.filter(step =>
      step.ex && step.ex.category === 'flexibility'
    );

    expect(flexSteps.length).toBeGreaterThan(0);
  });

  it('should respect break intervals', () => {
    const { queue } = buildQueue(30, 5, 2, 25, 10);

    const exerciseCount = queue.filter(step => step.type === 'exercise').length;
    const breakCount = queue.filter(step => step.type === 'break').length;

    expect(breakCount).toBeLessThanOrEqual(exerciseCount);
  });

  it('should not place break at end of queue', () => {
    const { queue } = buildQueue(20, 5, 2, 10, 5);

    const lastStep = queue[queue.length - 1];
    expect(lastStep.type).not.toBe('break');
  });

  it('should handle empty exercise list gracefully', () => {
    const { queue } = buildQueue(30, 5, 2, 120, 30);

    expect(Array.isArray(queue)).toBe(true);
  });
});