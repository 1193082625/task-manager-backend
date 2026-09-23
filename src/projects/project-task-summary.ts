/**
 * 统计函数
 */

import { Task, WorkStatus } from '../generated/prisma/client.js';

type TaskSummaryInput = Pick<
  Task,
  'principalId' | 'status' | 'realStartTime' | 'realEndTime'
>;

function calculateProjectStatus(tasks: TaskSummaryInput[]): WorkStatus {
  // 空数组的 every() 会返回 true，因此先处理无任务情况
  if (tasks.length === 0) {
    return WorkStatus.notStarted;
  }

  if (tasks.every((task) => task.status === WorkStatus.canceled)) {
    return WorkStatus.canceled;
  }

  const allSettled = tasks.every(
    (task) =>
      task.status === WorkStatus.completed ||
      task.status === WorkStatus.canceled,
  );

  if (allSettled) {
    // 全部取消的情况已在上面处理，这里至少有一个已完成任务
    return WorkStatus.completed;
  }

  if (tasks.some((task) => task.status === WorkStatus.doing)) {
    return WorkStatus.doing;
  }
  if (tasks.some((task) => task.status === WorkStatus.stopped)) {
    return WorkStatus.stopped;
  }
  if (tasks.some((task) => task.status === WorkStatus.completed)) {
    // 部分已完成，其余存在未开始任务
    return WorkStatus.doing;
  }

  return WorkStatus.notStarted;
}

export function summarizeProjectTasks(tasks: TaskSummaryInput[]) {
  const memberIds = [...new Set(tasks.map((task) => task.principalId))].sort();

  const completedTasks = tasks.filter((task) => task.status === 'completed');

  let earliestStart: Date | null = null;

  for (const task of tasks) {
    if (
      task.realStartTime &&
      (!earliestStart || task.realStartTime.getTime() < earliestStart.getTime())
    ) {
      earliestStart = task.realStartTime;
    }
  }

  const allSettled = tasks.every(
    (task) => task.status === 'completed' || task.status === 'canceled',
  );

  const completedTimesValid = completedTasks.every(
    (task) =>
      task.realStartTime !== null &&
      task.realEndTime !== null &&
      task.realEndTime.getTime() >= task.realStartTime.getTime(),
  );

  let latestEnd: Date | null = null;

  if (completedTasks.length > 0 && allSettled && completedTimesValid) {
    for (const task of completedTasks) {
      const end = task.realEndTime;

      if (end && (!latestEnd || end.getTime() > latestEnd.getTime())) {
        latestEnd = end;
      }
    }
  }

  return {
    taskCount: tasks.length,
    completedTaskCount: completedTasks.length,
    memberIds,
    realStartTime: earliestStart?.toISOString() ?? null,
    realEndTime: latestEnd?.toISOString() ?? null,
    status: calculateProjectStatus(tasks),
  };
}
