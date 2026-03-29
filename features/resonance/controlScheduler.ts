export type ControlTick = {
  audioNow: number;
  perfNow: number;
  dtMs: number;
};

export type ControlTask = {
  id: string;
  intervalMs: number;
  run: (tick: ControlTick) => void;
};

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
  onMetrics?: (metrics: ControlSchedulerMetrics) => void;
};

export type ControlScheduler = {
  start: () => void;
  stop: () => void;
};

export const createControlScheduler = ({ getAudioNow, shouldRun, tasks, onMetrics }: ControlSchedulerOptions): ControlScheduler => {
  let raf = 0;
  let running = false;
  let lastPerf = 0;
  let metricsWindowStart = 0;
  let metricsFrameMs = 0;
  let metricsWorkMs = 0;
  let metricsTaskRuns = 0;
  let metricsFrames = 0;
  const lastRunByTask = new Map<string, number>();

  const flushMetrics = (perfNow: number) => {
    if (!onMetrics || metricsFrames <= 0) return;
    if (metricsWindowStart <= 0) metricsWindowStart = perfNow;
    if (perfNow - metricsWindowStart < 480) return;
    onMetrics({
      avgFrameMs: metricsFrameMs / metricsFrames,
      avgWorkMs: metricsWorkMs / metricsFrames,
      workRatio: Math.min(1, Math.max(0, metricsWorkMs / Math.max(1, metricsFrameMs))),
      taskRuns: metricsTaskRuns,
      taskCount: tasks.length,
    });
    metricsWindowStart = perfNow;
    metricsFrameMs = 0;
    metricsWorkMs = 0;
    metricsTaskRuns = 0;
    metricsFrames = 0;
  };

  const frame = (perfNow: number) => {
    if (!running) return;

    const dtMs = lastPerf > 0 ? perfNow - lastPerf : 16.7;
    lastPerf = perfNow;
    metricsFrameMs += dtMs;
    metricsFrames += 1;

    let workThisFrame = 0;
    if (!shouldRun || shouldRun()) {
      const audioNow = getAudioNow();
      for (const task of tasks) {
        const previous = lastRunByTask.get(task.id) ?? Number.NEGATIVE_INFINITY;
        if (perfNow - previous >= Math.max(8, task.intervalMs)) {
          lastRunByTask.set(task.id, perfNow);
          const start = performance.now();
          task.run({ audioNow, perfNow, dtMs });
          workThisFrame += Math.max(0, performance.now() - start);
          metricsTaskRuns += 1;
        }
      }
    }
    metricsWorkMs += workThisFrame;
    flushMetrics(perfNow);

    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastPerf = 0;
      metricsWindowStart = 0;
      metricsFrameMs = 0;
      metricsWorkMs = 0;
      metricsTaskRuns = 0;
      metricsFrames = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastPerf = 0;
      metricsWindowStart = 0;
      metricsFrameMs = 0;
      metricsWorkMs = 0;
      metricsTaskRuns = 0;
      metricsFrames = 0;
      lastRunByTask.clear();
    },
  };
};
