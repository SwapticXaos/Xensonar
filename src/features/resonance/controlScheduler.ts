export type ControlTick = { audioNow: number; perfNow: number; dtMs: number };
export type ControlTask = { id: string; intervalMs: number; run: (tick: ControlTick) => void };
export type ControlSchedulerMetrics = {
  avgFrameMs: number;
  avgWorkMs: number;
  workRatio: number;
  taskRuns: number;
  taskCount: number;
};
export type ControlSchedulerOptions = {
  getAudioNow: () => number;
  shouldRun?: () => boolean;
  tasks: ControlTask[];
  onTaskError?: (error: unknown, taskId: string) => void;
  onMetrics?: (metrics: ControlSchedulerMetrics) => void;
};
export type ControlScheduler = { start: () => void; stop: () => void };

/** Control-rate updates only. No note queue, replay, or audio-clock ownership. */
export const createControlScheduler = ({
  getAudioNow,
  shouldRun,
  tasks,
  onMetrics,
  onTaskError,
}: ControlSchedulerOptions): ControlScheduler => {
  let raf = 0;
  let running = false;
  let generation = 0;
  let lastPerf = 0;
  let metricsWindowStart = 0;
  let metricsFrameMs = 0;
  let metricsWorkMs = 0;
  let metricsTaskRuns = 0;
  let metricsFrames = 0;
  const failedTasks = new Set<string>();
  const lastRunByTask = new Map<string, number>();

  const resetMetrics = () => {
    metricsWindowStart = 0;
    metricsFrameMs = 0;
    metricsWorkMs = 0;
    metricsTaskRuns = 0;
    metricsFrames = 0;
  };
  const reportFailure = (id: string, error: unknown) => {
    if (failedTasks.has(id)) return;
    failedTasks.add(id);
    try {
      if (onTaskError) onTaskError(error, id);
      else console.error(`[controlScheduler] ${id}`, error);
    } catch {
      /* Diagnostics cannot stop control updates. */
    }
  };
  const flushMetrics = (perfNow: number) => {
    if (!onMetrics || metricsFrames === 0) return;
    if (metricsWindowStart === 0) metricsWindowStart = perfNow;
    if (perfNow - metricsWindowStart < 480) return;
    const metrics = {
      avgFrameMs: metricsFrameMs / metricsFrames,
      avgWorkMs: metricsWorkMs / metricsFrames,
      workRatio: Math.min(1, Math.max(0, metricsWorkMs / Math.max(1, metricsFrameMs))),
      taskRuns: metricsTaskRuns,
      taskCount: tasks.length,
    };
    resetMetrics();
    metricsWindowStart = perfNow;
    try {
      onMetrics(metrics);
      failedTasks.delete("scheduler:metrics");
    } catch (error) {
      reportFailure("scheduler:metrics", error);
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      const ownGeneration = ++generation;
      lastPerf = 0;
      resetMetrics();
      const isCurrent = () => running && generation === ownGeneration;
      const frame = (perfNow: number) => {
        if (!isCurrent()) return;
        raf = 0;
        const dtMs = lastPerf > 0 ? Math.max(0, perfNow - lastPerf) : 16.7;
        lastPerf = perfNow;
        let workThisFrame = 0;
        let runsThisFrame = 0;
        try {
          if (!shouldRun || shouldRun()) {
            const audioNow = getAudioNow();
            failedTasks.delete("scheduler:clock");
            for (const task of tasks) {
              if (!isCurrent()) return;
              const previous = lastRunByTask.get(task.id) ?? Number.NEGATIVE_INFINITY;
              const interval = Number.isFinite(task.intervalMs) ? Math.max(8, task.intervalMs) : 8;
              if (perfNow - previous < interval) continue;
              // At most one update per task/frame, even after a long browser stall.
              lastRunByTask.set(task.id, perfNow);
              const start = onMetrics ? performance.now() : 0;
              try {
                task.run({ audioNow, perfNow, dtMs });
                failedTasks.delete(task.id);
              } catch (error) {
                reportFailure(task.id, error);
              }
              if (onMetrics) workThisFrame += Math.max(0, performance.now() - start);
              runsThisFrame++;
            }
          }
        } catch (error) {
          reportFailure("scheduler:clock", error);
        } finally {
          // A callback may stop AND restart. Only the new generation owns its RAF.
          if (isCurrent()) {
            if (onMetrics) {
              metricsFrameMs += dtMs;
              metricsWorkMs += workThisFrame;
              metricsTaskRuns += runsThisFrame;
              metricsFrames++;
              flushMetrics(perfNow);
            }
            if (isCurrent()) raf = requestAnimationFrame(frame);
          }
        }
      };
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      generation++;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastPerf = 0;
      resetMetrics();
      lastRunByTask.clear();
      failedTasks.clear();
    },
  };
};
