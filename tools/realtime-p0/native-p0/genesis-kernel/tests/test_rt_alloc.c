/* No allocation on the realtime path — demonstrated, not asserted by comment.
 *
 * Step 1 is a positive control: allocate inside the guard window and confirm
 * the detector fires. Without that, a clean result would prove nothing.
 * Step 2 then runs the real workload — dense program, gestures, timed state,
 * program updates, active recorder, ragged quanta — and requires zero.
 */
#include "xen_fixture.h"

int main(void) {
    xen_test_begin("realtime-allocation");

    /* ---- positive control: the detector must actually detect --------------
     * volatile + an actual store, otherwise the optimiser elides the pair and
     * the control silently proves nothing. */
    static volatile size_t probe_size = 64;
    static void* volatile probe_sink;
    xen_rt_guard_begin();
    probe_sink = malloc(probe_size);
    xen_rt_guard_end();
    if (probe_sink) ((volatile char*)probe_sink)[0] = 7;
    free(probe_sink);
    uint64_t baseline = xen_rt_guard_violations();
    XCHECK(baseline >= 1, "the allocation detector did not fire on a known malloc "
                          "(build without --wrap?) -> result would be meaningless");
    if (baseline == 0) {
        XNOTE("RESULT: NOT VERIFIED (detector inactive)");
        return xen_test_end();
    }

    /* ---- the actual workload --------------------------------------------- */
    xen_config cfg;
    xen_config_default(&cfg);
    cfg.recorder_capacity_frames = 1u << 17;
    xen_engine* e = xen_engine_create(&cfg);
    uint64_t mf;
    float* mat = xen_fixture_material(48000, 20260101, 2.0, &mf);
    xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "m");
    free(mat);
    uint32_t ep = xen_engine_epoch(e);
    xen_id p = xen_program_create(e, ep, XEN_PROGRAM_GRANULAR, a, XEN_DENSE_PARAMS,
                                  XEN_PROGRAM_PARAMS, 4711);
    xen_program_activate(e, ep, p, 1, 0);
    xen_record_start(e, NULL);

    static const uint32_t quanta[] = { 64, 127, 511, 128, 1024, 73, 256 };
    float L[2048], R[2048];
    float drain[4096 * 2];
    double params[XEN_PROGRAM_PARAMS];
    memcpy(params, XEN_DENSE_PARAMS, sizeof params);

    uint64_t frame = 0;
    for (int block = 0; block < 900; block++) {
        uint32_t q = quanta[block % 7];

        /* control-thread traffic happens OUTSIDE the guard, as it would in a
         * real host: submission is allowed to allocate, rendering is not. */
        if (block % 5 == 0) {
            xen_gesture g = { XEN_G_ATTACK, (uint32_t)(block + 1), frame + q / 2, 1.5f, 0.8f, 0.0f, XEN_PITCH_ROOT_RATIO };
            xen_gesture_submit(e, ep, &g);
        }
        if (block % 7 == 0) xen_state_set_at(e, ep, XEN_STATE_ROOT_HZ, 90.0f + (float)(block % 40), frame + 3);
        if (block % 11 == 0) xen_state_set_latest(e, ep, XEN_STATE_FORGE_AMOUNT, 0.2f + 0.01f * (float)(block % 30));
        if (block % 23 == 0) {
            params[2] = 1.0 + (double)(block % 5) * 0.4;
            xen_program_update(e, ep, p, params, XEN_PROGRAM_PARAMS, frame + 1);
        }
        if (block % 37 == 0) {
            xen_gesture r = { XEN_G_RELEASE, (uint32_t)(block - 4), XEN_FRAME_ASAP, 0, 0, 0, XEN_PITCH_ROOT_RATIO };
            xen_gesture_submit(e, ep, &r);
        }
        if (block % 29 == 0) {
            xen_tone_plan tp; memset(&tp, 0, sizeof tp);
            tp.token = 500000u + (uint32_t)block; tp.frame = frame + q / 3; tp.tone_count = 2;
            tp.tones[0] = (xen_tone_desc){220.0f,0.08f,4200.0f,0.8f,0,2400,XEN_OSC_SINE};
            tp.tones[1] = (xen_tone_desc){330.0f,0.04f,3200.0f,1.1f,24,1800,XEN_OSC_TRIANGLE};
            xen_tone_plan_submit(e, ep, &tp);
        }
        if (block % 31 == 0) {
            xen_entrophon_plan epn; memset(&epn, 0, sizeof epn);
            epn.token=700000u+(uint32_t)block; epn.frame=frame+q/4;
            epn.base_count=2; epn.color_count=1; epn.waveform=XEN_OSC_SAWTOOTH; epn.filter_type=XEN_FILTER_LOWPASS;
            epn.base_freqs[0]=220.0f; epn.base_freqs[1]=222.0f; epn.color_freqs[0]=440.0f; epn.color_gains[0]=0.12f;
            epn.peak_gain=0.12f; epn.sustain_gain=0.04f; epn.attack_frames=96; epn.decay_frames=960;
            epn.release_start_frames=1800; epn.release_frames=2400; epn.stop_after_frames=4300;
            epn.pitch_bend_mul=1.01f; epn.pitch_bend_frames=900; epn.filter_start_hz=2200.0f;
            epn.filter_peak_hz=3800.0f; epn.filter_end_hz=1400.0f; epn.filter_attack_frames=96; epn.filter_decay_frames=1600;
            epn.filter_q=3.8f; epn.pre_drive_gain=0.7f; epn.drive_amount=2.0f; epn.body_freq_hz=330.0f;
            epn.body_q=3.2f; epn.body_gain=0.1f; epn.delay_frames=1200; epn.delay_wet_gain=0.02f;
            epn.delay_feedback=0.08f; epn.normalization_gain=0.45f;
            xen_entrophon_plan_submit(e, ep, &epn);
        }

        xen_rt_guard_begin();
        xen_engine_render(e, L, R, q);        /* <-- the realtime path */
        xen_rt_guard_end();

        frame += q;
        xen_record_drain(e, drain, 4096);
    }

    /* panic is control-side, but the fence executes inside render */
    uint32_t ep2 = xen_engine_panic(e);
    (void)ep2;
    xen_rt_guard_begin();
    xen_engine_render(e, L, R, 512);
    xen_rt_guard_end();

    uint64_t after = xen_rt_guard_violations();
    XCHECK(after == baseline, "%llu allocation(s) occurred inside the render callback",
           (unsigned long long)(after - baseline));
    XNOTE("900 ragged blocks + gestures + resolved tone/Entrophon plans + timed state + program updates + panic: "
          "%llu allocations in the callback path", (unsigned long long)(after - baseline));
    XCHECK(xen_all_finite(L, 512) && xen_all_finite(R, 512), "non-finite output");

    xen_record_stop(e);
    xen_engine_destroy(e);
    return xen_test_end();
}
