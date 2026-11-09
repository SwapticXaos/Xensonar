/* xen-bench - honest throughput measurement of the shared render kernel via the
 * null backend with a ragged quantum pattern. Offline-only: it measures DSP
 * cost, NOT device latency or xruns, which require real hardware. */
#include "xen/xen_audio.h"
#include "xen_fixture.h"
#include <time.h>
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(int argc,char**argv){
  double dens = argc>1?atof(argv[1]):1.85;
  xen_engine* e=xen_engine_create(NULL);
  uint64_t mf; float* m=xen_fixture_material(48000,20260101,2.0,&mf);
  xen_id a=xen_asset_publish(e,m,mf,1,110.0,"m"); free(m);
  double p[XEN_PROGRAM_PARAMS]={120.0,8.0,dens,0.5,0.45,0.5,0,0};
  uint32_t ep=xen_engine_epoch(e);
  xen_id pr=xen_program_create(e,ep,XEN_PROGRAM_GRANULAR,a,p,XEN_PROGRAM_PARAMS,1);
  xen_program_activate(e,ep,pr,1,0);
  static const uint32_t q[]={64,127,511,128,1024,73,256};
  xen_backend* be=NULL; xen_backend_null_create(e,q,7,&be);
  float* buf=malloc(48000*60*2*sizeof(float));
  double t0=now(); xen_backend_null_run(be,48000*60,buf); double dt=now()-t0;
  xen_telemetry t; xen_engine_telemetry(e,&t);
  printf("density %-5.2f  60 s audio in %6.3f s wall  = %6.1fx realtime  | grains %llu peak voices %u denied %llu\n",
     dens,dt,60.0/dt,(unsigned long long)t.grains_emitted,t.voices_peak,(unsigned long long)t.grains_denied_no_voice);
  free(buf); xen_backend_destroy(be); xen_engine_destroy(e); return 0;}
