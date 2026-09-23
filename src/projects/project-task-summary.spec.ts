import { describe, expect, it } from 'vitest';
import { WorkStatus } from '../generated/prisma/enums.js';
import { summarizeProjectTasks } from './project-task-summary.js';

describe('summarizeProjectTasks', () => {
  it('没有任务时，项目应保持未开始状态', () => {
    const result = summarizeProjectTasks([]);

    expect(result).toEqual({
      taskCount: 0,
      completedTaskCount: 0,
      memberIds: [],
      realStartTime: null,
      realEndTime: null,
      status: WorkStatus.notStarted,
    });
  });
});
