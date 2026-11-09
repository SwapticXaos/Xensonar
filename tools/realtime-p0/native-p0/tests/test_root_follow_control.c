#include <stdio.h>
#include <string.h>
#include "../src/p0_native_root_follow_control.h"

#define CHECK(name, expr) do { if (!(expr)) { fprintf(stderr,"FAIL:%s\n",name); return 2; } } while (0)

int main(void) {
  P0NRflControl c;
  p0n_rfl_control_init(&c);
  CHECK("install-material", p0n_rfl_install_program(&c,1u,P0N_RFL_KIND_MATERIAL,"rfl:material:alpha") == 1);
  CHECK("duplicate-generation-rejected", p0n_rfl_install_program(&c,1u,P0N_RFL_KIND_MATERIAL,"rfl:material:beta") == 0);

  P0NRflRealtimeState s1={1u,100u,440.0f,0.75f,1u};
  CHECK("state-accepted", p0n_rfl_update_state(&c,&s1) == 1);
  CHECK("state-visible", c.latest_state.root_hz == 440.0f && c.latest_state.gate_open == 1u);
  P0NRflRealtimeState stale={1u,99u,880.0f,1.0f,1u};
  CHECK("older-latest-state-rejected", p0n_rfl_update_state(&c,&stale) == 0);
  CHECK("older-state-did-not-overwrite", c.latest_state.root_hz == 440.0f);
  P0NRflRealtimeState clamped={1u,101u,99999.0f,5.0f,1u};
  CHECK("newer-state-accepted", p0n_rfl_update_state(&c,&clamped) == 1);
  CHECK("state-clamped", c.latest_state.root_hz == 3520.0f && c.latest_state.volume == 1.0f);

  CHECK("stop-active-generation", p0n_rfl_stop_program(&c,1u) == 1);
  P0NRflRealtimeState resurrect={1u,102u,220.0f,0.5f,1u};
  CHECK("stopped-state-cannot-resurrect", p0n_rfl_update_state(&c,&resurrect) == 0);
  CHECK("stopped-generation-cannot-reinstall", p0n_rfl_install_program(&c,1u,P0N_RFL_KIND_MATERIAL,"rfl:material:again") == 0);
  CHECK("next-generation-install", p0n_rfl_install_program(&c,2u,P0N_RFL_KIND_SYNTH_DIRECT,"rfl:synth:beta") == 1);
  CHECK("kind-separated", c.program.kind == P0N_RFL_KIND_SYNTH_DIRECT);

  p0n_rfl_panic(&c);
  CHECK("panic-terminal", atomic_load(&c.terminal_panic) == 1u);
  CHECK("panic-closes-gate", c.latest_state.gate_open == 0u);
  CHECK("post-panic-install-rejected", p0n_rfl_install_program(&c,3u,P0N_RFL_KIND_MATERIAL,"rfl:material:postpanic") == 0);
  P0NRflRealtimeState post={2u,200u,220.0f,0.5f,1u};
  CHECK("post-panic-state-rejected", p0n_rfl_update_state(&c,&post) == 0);

  printf("{\"schema\":\"xensonar-root-follow-control-core-v1\",\"pass\":true,\"latestWins\":true,\"stopPreventsResurrection\":true,\"panicTerminal\":true,\"programKindsSeparated\":true}\n");
  return 0;
}
