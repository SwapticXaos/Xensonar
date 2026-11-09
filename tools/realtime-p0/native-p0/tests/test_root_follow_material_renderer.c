#include <stdio.h>
#include <string.h>
#include <math.h>
#include "../src/p0_native_root_follow_material_renderer.h"

#define CHECK(expr) do { if (!(expr)) { fprintf(stderr, "check failed: %s line %d\n", #expr, __LINE__); return 1; } } while (0)

static float pcm[48000u * 2u];

int main(void) {
  for (uint32_t i = 0u; i < 48000u; ++i) {
    const float t = (float)i / 48000.0f;
    pcm[i * 2u] = 0.25f * sinf(2.0f * 3.14159265358979323846f * 220.0f * t);
    pcm[i * 2u + 1u] = 0.20f * sinf(2.0f * 3.14159265358979323846f * 247.0f * t);
  }
  P0NRflMaterialRenderer r;
  memset(&r, 0, sizeof(r));
  p0n_rfl_material_init(&r, 48000u);
  CHECK(p0n_rfl_material_publish_asset(&r, 0u, pcm, 48000u, 2u, 48000u) == 1);

  P0NRflMaterialWindowPlan plan;
  memset(&plan, 0, sizeof(plan));
  plan.sequence = 1u;
  plan.generation = 1u;
  plan.asset_slot = 0u;
  plan.deadline_frame = 1000u;
  plan.output_gain = 1.0f;
  plan.grain_count = 3u;
  plan.grains[0] = (P0NRflMaterialGrainPlan){128u, 1000.25, 1.0f, 720u};
  plan.grains[1] = (P0NRflMaterialGrainPlan){320u, 5000.5, 0.75f, 960u};
  plan.grains[2] = (P0NRflMaterialGrainPlan){512u, 9000.75, 1.4f, 640u};
  CHECK(p0n_rfl_material_submit_window(&r, &plan) == 1);

  float out[512u * 2u];
  memset(out, 0, sizeof(out));
  float peak = p0n_rfl_material_render(&r, 0u, out, 512u);
  CHECK(peak > 0.0001f);
  CHECK(atomic_load_explicit(&r.windows_accepted, memory_order_relaxed) == 1u);
  CHECK(atomic_load_explicit(&r.grains_started, memory_order_relaxed) == 2u);
  CHECK(atomic_load_explicit(&r.observed_pending_windows, memory_order_relaxed) == 1u);
  CHECK(atomic_load_explicit(&r.nonzero_callbacks, memory_order_relaxed) == 1u);

  memset(out, 0, sizeof(out));
  peak = p0n_rfl_material_render(&r, 512u, out, 512u);
  CHECK(peak > 0.0001f);
  CHECK(atomic_load_explicit(&r.grains_started, memory_order_relaxed) == 3u);
  CHECK(atomic_load_explicit(&r.observed_pending_windows, memory_order_relaxed) == 0u);

  P0NRflMaterialWindowPlan stale = plan;
  stale.sequence = 2u;
  stale.deadline_frame = 10u;
  CHECK(p0n_rfl_material_submit_window(&r, &stale) == 1);
  memset(out, 0, sizeof(out));
  (void)p0n_rfl_material_render(&r, 2048u, out, 512u);
  CHECK(atomic_load_explicit(&r.windows_stale, memory_order_relaxed) == 1u);

  /* A stale control window can still contain future musical work. Drop only the
     elapsed grain; keep the future grain at its original timeline. */
  P0NRflMaterialWindowPlan mixed = plan;
  mixed.sequence = 20u;
  mixed.deadline_frame = 1000u;
  mixed.grain_count = 2u;
  mixed.grains[0] = (P0NRflMaterialGrainPlan){1200u, 12000.0, 1.0f, 240u};
  mixed.grains[1] = (P0NRflMaterialGrainPlan){2300u, 16000.0, 1.0f, 480u};
  CHECK(p0n_rfl_material_submit_window(&r, &mixed) == 1);
  memset(out, 0, sizeof(out));
  peak = p0n_rfl_material_render(&r, 2048u, out, 512u);
  CHECK(peak > 0.0001f);
  CHECK(atomic_load_explicit(&r.grains_dropped_stale, memory_order_relaxed) >= 1u);

  CHECK(atomic_load_explicit(&r.windows_stale, memory_order_relaxed) == 2u);

  p0n_rfl_material_panic(&r);
  CHECK(atomic_load_explicit(&r.terminal, memory_order_acquire) == 1u);
  P0NRflMaterialWindowPlan after = plan;
  after.sequence = 3u;
  after.deadline_frame = 10000u;
  CHECK(p0n_rfl_material_submit_window(&r, &after) == 0);
  CHECK(atomic_load_explicit(&r.submissions_rejected_terminal, memory_order_relaxed) == 1u);
  memset(out, 0, sizeof(out));
  CHECK(p0n_rfl_material_render(&r, 4096u, out, 512u) == 0.0f);

  printf("{\"pass\":true,\"windowsAccepted\":%llu,\"windowsStale\":%llu,\"grainsStarted\":%llu,\"panicTerminal\":true,\"physicalAudio\":false}\n",
    (unsigned long long)atomic_load(&r.windows_accepted),
    (unsigned long long)atomic_load(&r.windows_stale),
    (unsigned long long)atomic_load(&r.grains_started));
  return 0;
}
