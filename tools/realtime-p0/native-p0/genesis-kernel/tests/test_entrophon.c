/* Resolved Wave Entrophon render-class execution.
 *
 * The browser/control side owns tuning, pressure thinning and voice semantics.
 * This test proves the C11 kernel can execute the resulting bounded voice plan
 * deterministically, without allocation or legacy AudioNode construction.
 */
#include "xen_fixture.h"
#include "xen_internal.h" /* route-capture integration is intentionally kernel-private */

static xen_entrophon_plan make_plan(xen_frame at, uint32_t token, float base, uint32_t route_mask) {
    xen_entrophon_plan p;
    memset(&p, 0, sizeof p);
    p.token = token;
    p.frame = at;
    p.base_count = 4;
    p.color_count = 2;
    p.waveform = XEN_OSC_SAWTOOTH;
    p.filter_type = XEN_FILTER_LOWPASS;
    p.aux_route_mask = route_mask;
    p.base_freqs[0] = base * 0.992f;
    p.base_freqs[1] = base * 0.998f;
    p.base_freqs[2] = base * 1.002f;
    p.base_freqs[3] = base * 1.008f;
    p.color_freqs[0] = base * 2.01f;
    p.color_freqs[1] = base * 3.02f;
    p.color_gains[0] = 0.16f;
    p.color_gains[1] = 0.09f;
    p.peak_gain = 0.22f;
    p.sustain_gain = 0.075f;
    p.attack_frames = 144;
    p.decay_frames = 2640;
    p.release_start_frames = 4200;
    p.release_frames = 7680;
    p.stop_after_frames = 12000;
    p.pitch_bend_mul = 1.0245f;
    p.pitch_bend_frames = 4320;
    p.filter_start_hz = 2600.0f;
    p.filter_peak_hz = 4930.0f;
    p.filter_end_hz = 1612.0f;
    p.filter_attack_frames = 144;
    p.filter_decay_frames = 3840;
    p.filter_q = 4.8f;
    p.pre_drive_gain = 0.7656f;
    p.drive_amount = 4.34f;
    p.body_freq_hz = base * 1.5f;
    p.body_q = 3.2f;
    p.body_gain = 0.1344f;
    p.delay_frames = 4224;
    p.delay_wet_gain = 0.0288f;
    p.delay_feedback = 0.0684f;
    p.normalization_gain = 1.0f / (6.0f * 0.7f);
    return p;
}

static uint32_t render_hash(const uint32_t* parts, size_t nparts, float* out, size_t nframes) {
    xen_config cfg; xen_config_default(&cfg); cfg.sample_rate = 48000;
    xen_engine* e = xen_engine_create(&cfg);
    uint32_t ep = xen_engine_epoch(e);
    xen_entrophon_plan p = make_plan(1000, 0xE170u, 220.0f, 0u);
    XCHECK(xen_entrophon_plan_submit(e, ep, &p) == XEN_OK, "Entrophon submit failed");
    size_t pos=0, pi=0; float L[2048],R[2048];
    while(pos<nframes){
        uint32_t q=parts[pi++%nparts]; if(q>2048)q=2048; if(q>nframes-pos)q=(uint32_t)(nframes-pos);
        xen_engine_render(e,L,R,q);
        for(uint32_t i=0;i<q;i++){out[(pos+i)*2]=L[i]; out[(pos+i)*2+1]=R[i];}
        pos+=q;
    }
    xen_telemetry t; xen_engine_telemetry(e,&t);
    XCHECK(t.entrophon_plans_submitted==1 && t.entrophon_plans_executed==1,
           "telemetry submitted=%llu executed=%llu",
           (unsigned long long)t.entrophon_plans_submitted,
           (unsigned long long)t.entrophon_plans_executed);
    XCHECK(xen_all_finite(out,nframes*2),"nonfinite output");
    uint32_t h=xen_hash_f32(out,nframes*2); xen_engine_destroy(e); return h;
}

int main(void){
    xen_test_begin("resolved-entrophon-plan");

    /* 1. Real nonzero PCM starts at the declared frame. */
    {
        xen_config cfg; xen_config_default(&cfg); cfg.sample_rate=48000;
        xen_engine* e=xen_engine_create(&cfg); uint32_t ep=xen_engine_epoch(e);
        xen_entrophon_plan p=make_plan(1000,1,220.0f,0u);
        XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_OK,"submit failed");
        float L[2048],R[2048]; xen_engine_render(e,L,R,2048);
        XCHECK(xen_all_finite(L,2048)&&xen_all_finite(R,2048),"nonfinite output");
        XCHECK(xen_rms(L,0,1000)==0.0,"signal before frame 1000");
        XCHECK(xen_rms(L,1000,1900)>1e-5,"Entrophon produced no PCM");
        xen_telemetry t; xen_engine_telemetry(e,&t);
        XCHECK(t.entrophon_plans_executed==1,"plan not executed");
        XNOTE("Entrophon C11 voice produces finite nonzero PCM after scheduled frame");
        xen_engine_destroy(e);
    }

    /* 2. Callback partition is transport detail, not musical time. */
    {
        static const uint32_t a[]={512}, b[]={64,127,511,128,1024,73,256}, c[]={33};
        const size_t nf=14000; float *A=calloc(nf*2,sizeof(float)),*B=calloc(nf*2,sizeof(float)),*C=calloc(nf*2,sizeof(float));
        uint32_t ha=render_hash(a,1,A,nf),hb=render_hash(b,7,B,nf),hc=render_hash(c,1,C,nf);
        XCHECK(ha==hb&&ha==hc,"partition hash mismatch %08x %08x %08x",ha,hb,hc);
        XCHECK(memcmp(A,B,nf*2*sizeof(float))==0&&memcmp(A,C,nf*2*sizeof(float))==0,"partition output differs");
        XNOTE("partition hashes 512=%08x ragged=%08x 33=%08x",ha,hb,hc);
        free(A);free(B);free(C);
    }

    /* 3. Per-body route masks do not bleed between fixed aux outputs. */
    {
        xen_config cfg; xen_config_default(&cfg); cfg.sample_rate=48000;
        xen_engine* e=xen_engine_create(&cfg); uint32_t ep=xen_engine_epoch(e);
        float aux0[2048]={0},aux1[2048]={0},aux2[2048]={0};
        e->entrophon_aux_out[0]=aux0; e->entrophon_aux_out[1]=aux1; e->entrophon_aux_out[2]=aux2;
        xen_entrophon_plan a=make_plan(0,10,180.0f,1u<<0), b=make_plan(0,11,317.0f,1u<<1);
        XCHECK(xen_entrophon_plan_submit(e,ep,&a)==XEN_OK,"route A submit");
        XCHECK(xen_entrophon_plan_submit(e,ep,&b)==XEN_OK,"route B submit");
        float L[2048],R[2048]; xen_engine_render(e,L,R,2048);
        XCHECK(xen_rms(aux0,0,1800)>1e-5,"aux0 silent");
        XCHECK(xen_rms(aux1,0,1800)>1e-5,"aux1 silent");
        XCHECK(xen_rms(aux2,0,1800)==0.0,"unselected aux2 leaked PCM");
        XCHECK(memcmp(aux0,aux1,sizeof aux0)!=0,"disjoint routed voices collapsed to same aux stream");
        XNOTE("overlapping voices remain isolated by immutable aux route masks");
        xen_engine_destroy(e);
    }

    /* 4. Malformed plans fail closed before realtime admission. */
    {
        xen_engine* e=xen_engine_create(NULL); uint32_t ep=xen_engine_epoch(e); xen_entrophon_plan p;
        p=make_plan(0,1,220,0); p.base_count=0; XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_ARG,"base_count 0 accepted");
        p=make_plan(0,1,220,0); p.base_freqs[0]=NAN; XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_ARG,"NaN accepted");
        p=make_plan(0,1,220,0); p.filter_type=99; XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_ARG,"bad filter accepted");
        p=make_plan(0,1,220,0); p.delay_frames=XEN_ENTROPHON_DELAY_MAX; XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_ARG,"oversize delay accepted");
        p=make_plan(0,1,220,0); p.aux_route_mask=1u<<9; XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_ARG,"bad route mask accepted");
        xen_engine_destroy(e);
    }

    /* 5. Stale interactive plans drop instead of catching up. */
    {
        xen_engine* e=xen_engine_create(NULL); uint32_t ep=xen_engine_epoch(e); float L[256],R[256];
        xen_engine_render(e,L,R,256);
        xen_entrophon_plan p=make_plan(32,1,220,0);
        XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_ERR_STALE,"stale plan caught up");
        xen_engine_destroy(e);
    }

    /* 6. Fixed body pool denies atomically at the true capacity boundary. */
    {
        xen_engine* e=xen_engine_create(NULL); uint32_t ep=xen_engine_epoch(e);
        for(uint32_t i=0;i<XEN_ENTROPHON_BODIES+1u;i++){
            xen_entrophon_plan p=make_plan(0,100+i,110.0f+(float)i,0);
            XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_OK,"queue submit %u",i);
        }
        float L[64],R[64]; xen_engine_render(e,L,R,64); xen_telemetry t; xen_engine_telemetry(e,&t);
        XCHECK(t.entrophon_plans_executed==XEN_ENTROPHON_BODIES,"executed=%llu",(unsigned long long)t.entrophon_plans_executed);
        XCHECK(t.entrophon_plans_denied_no_body==1,"denials=%llu",(unsigned long long)t.entrophon_plans_denied_no_body);
        XCHECK(t.voices_active==XEN_ENTROPHON_BODIES,"active=%u",t.voices_active);
        xen_engine_destroy(e);
    }

    /* 7. Panic is terminal for active Entrophon bodies. */
    {
        xen_engine* e=xen_engine_create(NULL); uint32_t ep=xen_engine_epoch(e);
        xen_entrophon_plan p=make_plan(0,1,220,0); XCHECK(xen_entrophon_plan_submit(e,ep,&p)==XEN_OK,"submit");
        float L[256],R[256]; xen_engine_render(e,L,R,128); xen_telemetry t; xen_engine_telemetry(e,&t);
        XCHECK(t.voices_active>0,"voice not active before panic");
        (void)xen_engine_panic(e); xen_engine_render(e,L,R,128); xen_engine_telemetry(e,&t);
        XCHECK(t.voices_active==0,"Entrophon survived panic");
        XCHECK(xen_rms(L,0,128)==0.0,"PCM survived panic");
        xen_engine_destroy(e);
    }

    return xen_test_end();
}
