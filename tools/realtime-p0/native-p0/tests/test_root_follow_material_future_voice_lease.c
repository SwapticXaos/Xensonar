#include <stdio.h>
#include <string.h>
#include <math.h>
#include "../src/p0_native_root_follow_material_renderer.h"

#define CHECK(expr) do { if (!(expr)) { fprintf(stderr, "check failed: %s line %d\n", #expr, __LINE__); return 1; } } while (0)

static float pcm[48000u * 2u];

int main(void) {
  for (uint32_t i = 0u; i < 48000u; ++i) {
    const float t = (float)i / 48000.0f;
    pcm[i * 2u] = 0.20f * sinf(2.0f * 3.14159265358979323846f * 220.0f * t);
    pcm[i * 2u + 1u] = pcm[i * 2u];
  }

  P0NRflMaterialRenderer r;
  memset(&r, 0, sizeof(r));
  p0n_rfl_material_init(&r, 48000u);
  CHECK(p0n_rfl_material_publish_asset(&r, 0u, pcm, 48000u, 2u, 48000u) == 1);

  /* About 131 ms lookahead: 24 windows x 5 grains. The old renderer would
     spend voices at admission time; the synthesis keeps all 120 as schedule
     state until their render quantum. */
  for (uint32_t w = 0u; w < 24u; ++w) {
    P0NRflMaterialWindowPlan plan;
    memset(&plan, 0, sizeof(plan));
    plan.sequence = 100u + w;
    plan.generation = 1u;
    plan.asset_slot = 0u;
    plan.deadline_frame = 9000u + (uint64_t)w * 384u;
    plan.output_gain = 0.08f;
    plan.grain_count = 5u;
    for (uint32_t g = 0u; g < 5u; ++g) {
      plan.grains[g] = (P0NRflMaterialGrainPlan){
        6288u + (uint64_t)w * 384u + (uint64_t)g * 1152u,
        2000.0 + (double)(w * 5u + g) * 16.0,
        1.0f,
        2400u
      };
    }
    CHECK(p0n_rfl_material_submit_window(&r, &plan) == 1);
  }

  float out[512u * 2u];
  memset(out, 0, sizeof(out));
  (void)p0n_rfl_material_render(&r, 0u, out, 512u);
  CHECK(atomic_load_explicit(&r.observed_active_voices, memory_order_relaxed) == 0u);
  CHECK(atomic_load_explicit(&r.observed_pending_windows, memory_order_relaxed) == 24u);
  CHECK(atomic_load_explicit(&r.grains_dropped_voice_pressure, memory_order_relaxed) == 0u);
  CHECK(atomic_load_explicit(&r.grains_started, memory_order_relaxed) == 0u);

  for (uint64_t frame = 512u; frame < 24000u; frame += 512u) {
    memset(out, 0, sizeof(out));
    (void)p0n_rfl_material_render(&r, frame, out, 512u);
  }

  CHECK(atomic_load_explicit(&r.grains_started, memory_order_relaxed) == 120u);
  CHECK(atomic_load_explicit(&r.grains_dropped_voice_pressure, memory_order_relaxed) == 0u);
  CHECK(atomic_load_explicit(&r.grains_dropped_stale, memory_order_relaxed) == 0u);
  CHECK(atomic_load_explicit(&r.observed_pending_windows, memory_order_relaxed) == 0u);

  printf("{\"pass\":true,\"scheduledGrains\":120,\"voicePressureDrops\":0,\"pendingWindows\":0,\"physicalAudio\":false}\n");
  return 0;
}
