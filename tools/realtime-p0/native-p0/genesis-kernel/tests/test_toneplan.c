/* Resolved bounded tone-plan execution: the first real semantic implant seam.
 *
 * This does NOT claim WaveStarter render parity. It proves only that an
 * adapter-resolved multi-partial plan is executed atomically, deterministically
 * and independently of callback partitioning without moving preset/tuning
 * semantics into the engine.
 */
#include "xen_fixture.h"

static xen_tone_plan make_plan(xen_frame at, uint32_t token) {
    xen_tone_plan p;
    memset(&p, 0, sizeof p);
    p.token = token;
    p.frame = at;
    p.tone_count = 3;
    p.tones[0] = (xen_tone_desc){ 220.0f, 0.24f, 4200.0f, 0.9f,   0, 7200, XEN_OSC_SINE };
    p.tones[1] = (xen_tone_desc){ 330.0f, 0.13f, 3600.0f, 1.4f, 240, 5600, XEN_OSC_TRIANGLE };
    p.tones[2] = (xen_tone_desc){ 550.0f, 0.07f, 2800.0f, 0.7f, 480, 4100, XEN_OSC_SAWTOOTH };
    return p;
}

static uint32_t render_hash(const uint32_t* parts, size_t nparts, float* out, size_t nframes) {
    xen_engine* e = xen_engine_create(NULL);
    uint32_t ep = xen_engine_epoch(e);
    xen_tone_plan p = make_plan(1000, 0x5151u);
    XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_OK, "tone-plan submit failed");
    size_t pos = 0, pi = 0;
    float L[2048], R[2048];
    while (pos < nframes) {
        uint32_t q = parts[pi++ % nparts];
        if (q > 2048) q = 2048;
        if (q > nframes - pos) q = (uint32_t)(nframes - pos);
        xen_engine_render(e, L, R, q);
        for (uint32_t i = 0; i < q; i++) out[(pos+i)*2+0] = L[i], out[(pos+i)*2+1] = R[i];
        pos += q;
    }
    xen_telemetry t;
    xen_engine_telemetry(e, &t);
    XCHECK(t.tone_plans_executed == 1, "expected exactly one tone plan, got %llu",
           (unsigned long long)t.tone_plans_executed);
    XCHECK(t.tone_plans_denied_no_voice == 0, "unexpected tone-plan denial");
    XCHECK(xen_all_finite(out, nframes * 2), "non-finite tone-plan output");
    uint32_t h = xen_hash_f32(out, nframes * 2);
    xen_engine_destroy(e);
    return h;
}

int main(void) {
    xen_test_begin("resolved-tone-plan");

    /* 1. Absolute start/delay and deterministic nonzero output. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        xen_tone_plan p = make_plan(1000, 77);
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_OK, "submit failed");
        float L[2048], R[2048];
        xen_engine_render(e, L, R, 2048);
        XCHECK(xen_all_finite(L, 2048) && xen_all_finite(R, 2048), "non-finite output");
        long onset = xen_first_onset(L, 2048, 1e-8);
        XCHECK(onset == 1000 || onset == 1001, "first audible sample %ld not at attack boundary (zero-phase sine may make frame 1000 exactly zero)", onset);
        double pre = xen_rms(L, 0, 1000), active = xen_rms(L, 1000, 1800);
        XCHECK(pre == 0.0, "signal before intended frame (rms=%g)", pre);
        XCHECK(active > 1e-5, "tone plan produced no audible output (rms=%g)", active);
        xen_telemetry t; xen_engine_telemetry(e, &t);
        XCHECK(t.tone_plans_submitted == 1 && t.tone_plans_executed == 1,
               "telemetry submitted=%llu executed=%llu",
               (unsigned long long)t.tone_plans_submitted,
               (unsigned long long)t.tone_plans_executed);
        XNOTE("3-partial resolved plan is activated at frame 1000; first nonzero sample %ld (zero-phase sine), rms %.6f", onset, active);
        xen_engine_destroy(e);
    }

    /* 2. Device quantum is not musical time. */
    {
        static const uint32_t a[] = { 512 };
        static const uint32_t b[] = { 64,127,511,128,1024,73,256 };
        static const uint32_t c[] = { 33 };
        const size_t nf = 10000;
        float* A = calloc(nf * 2, sizeof(float));
        float* B = calloc(nf * 2, sizeof(float));
        float* C = calloc(nf * 2, sizeof(float));
        uint32_t ha=render_hash(a,1,A,nf), hb=render_hash(b,7,B,nf), hc=render_hash(c,1,C,nf);
        XCHECK(ha == hb && ha == hc, "partition hashes differ %08x %08x %08x", ha,hb,hc);
        XCHECK(memcmp(A,B,nf*2*sizeof(float)) == 0 && memcmp(A,C,nf*2*sizeof(float)) == 0,
               "resolved tone output is not bit-identical across partitions");
        XNOTE("partition hashes 512=%08x ragged=%08x 33=%08x", ha,hb,hc);
        free(A); free(B); free(C);
    }

    /* 3. Compound timbre admission is atomic under genuine exhaustion. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        for (uint32_t i = 0; i < XEN_MAX_VOICES - 1; i++) {
            xen_gesture g = { XEN_G_SUSTAIN, 10000u+i, 0, 1.0f + 0.0001f*(float)i, 0.02f, 0, XEN_PITCH_ROOT_RATIO };
            XCHECK(xen_gesture_submit(e, ep, &g) == XEN_OK, "sustain submit %u failed", i);
        }
        float L[256], R[256];
        xen_engine_render(e, L, R, 256);
        xen_telemetry before; xen_engine_telemetry(e, &before);
        XCHECK(before.voices_active == XEN_MAX_VOICES - 1, "setup voices=%u", before.voices_active);
        xen_tone_plan p = make_plan(256, 999);
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_OK, "plan command should be admitted to queue");
        xen_engine_render(e, L, R, 256);
        xen_telemetry after; xen_engine_telemetry(e, &after);
        XCHECK(after.tone_plans_executed == 0, "partial plan unexpectedly executed");
        XCHECK(after.tone_plans_denied_no_voice == 1, "atomic denial counter=%llu",
               (unsigned long long)after.tone_plans_denied_no_voice);
        XCHECK(after.voices_active == XEN_MAX_VOICES - 1,
               "partial rollback leaked a voice: before=%u after=%u", before.voices_active, after.voices_active);
        XNOTE("3-partial timbre denied atomically with only one free voice");
        xen_engine_destroy(e);
    }

    /* 4. A denied compound plan must not destroy stealable texture voices.
     * One texture + 510 interactive sustains + one free slot gives capacity 2
     * for an interactive plan. A 3-tone plan must fail before stealing. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint64_t mf = 0; float* mat = xen_fixture_material(48000, 19, 0.25, &mf);
        xen_id a = xen_asset_publish(e, mat, mf, 1, 110.0, "atomic-preflight"); free(mat);
        double pp[XEN_PROGRAM_PARAMS] = {100.0,1000.0,1.0,0.0,0.1,0.0,0.0,0.0};
        uint32_t ep=xen_engine_epoch(e);
        xen_id pg=xen_program_create(e,ep,XEN_PROGRAM_GRANULAR,a,pp,XEN_PROGRAM_PARAMS,99);
        XCHECK(pg!=0, "texture program create failed");
        XCHECK(xen_program_activate(e,ep,pg,1,0)==XEN_OK, "texture activate failed");
        float L[8],R[8]; xen_engine_render(e,L,R,1);
        xen_telemetry t; xen_engine_telemetry(e,&t);
        XCHECK(t.voices_active==1, "expected exactly one texture voice, got %u",t.voices_active);
        for(uint32_t i=0;i<510;i++){
            xen_gesture g={XEN_G_SUSTAIN,20000u+i,1,1.0f+0.00001f*(float)i,0.01f,0,XEN_PITCH_ROOT_RATIO};
            XCHECK(xen_gesture_submit(e,ep,&g)==XEN_OK,"sustain setup submit %u failed",i);
        }
        xen_engine_render(e,L,R,2); xen_engine_telemetry(e,&t);
        XCHECK(t.voices_active==511,"expected 510 interactive + 1 texture, got %u",t.voices_active);
        xen_tone_plan p3=make_plan(xen_engine_now(e),777);
        XCHECK(xen_tone_plan_submit(e,ep,&p3)==XEN_OK,"compound command submit failed");
        xen_engine_render(e,L,R,1); xen_engine_telemetry(e,&t);
        XCHECK(t.tone_plans_denied_no_voice==1,"expected preflight denial");
        XCHECK(t.voices_active==511,"denied compound plan damaged existing texture: voices=%u",t.voices_active);
        XNOTE("atomic preflight preserves the existing texture voice on denial");
        xen_engine_destroy(e);
    }

    /* 5. Bad resolved execution data is rejected on control side. */
    {
        xen_engine* e = xen_engine_create(NULL);
        uint32_t ep = xen_engine_epoch(e);
        xen_tone_plan p = make_plan(0, 1);
        p.tones[1].frequency_hz = NAN;
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_ERR_ARG, "NaN frequency was accepted");
        p = make_plan(0, 1); p.tone_count = XEN_TONE_PLAN_MAX + 1;
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_ERR_ARG, "oversized plan was accepted");
        p = make_plan(0, 1); p.tones[0].delay_frames = 48000u;
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_ERR_ARG, "unbounded delayed partial was accepted");
        p = make_plan(0, 1); p.tones[0].duration_frames = 48000u * 9u;
        XCHECK(xen_tone_plan_submit(e, ep, &p) == XEN_ERR_ARG, "unbounded tone duration was accepted");
        xen_engine_destroy(e);
    }

    return xen_test_end();
}
