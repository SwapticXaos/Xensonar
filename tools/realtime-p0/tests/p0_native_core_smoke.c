#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include "../core/p0_core.c"
int main(int argc,char**argv){
  p0_init(48000);float* table=(float*)p0_sine_table_ptr();
  for(int i=0;i<P0_SINE_TABLE;i++)table[i]=(float)sin(P0_PI2*(double)i/P0_SINE_TABLE);
  if(p0_arm(1,96000)!=1)return 2;
  double w=P0_PI2*2400/48000,cs=cos(w),alpha=sin(w)/(2*pow(10,1.0/20)),a0=1+alpha;
  p0_begin_attack_group(1,1,3,2400,6720);
  for(int i=0;i<3;i++)if(p0_set_attack_note(i,i+1,1,1,220+110*i,.04,(1-cs)/2/a0,(1-cs)/a0,(1-cs)/2/a0,-2*cs/a0,(1-alpha)/a0,1536,5011,12480,exp(-1.0/(.025704*48000)))!=1)return 3;
  if(p0_commit_attack_group()!=1)return 4;
  FILE*out=argc>1?fopen(argv[1],"wb"):NULL;if(argc>1&&!out)return 5;
  double peak=0,sum=0;unsigned count=0;
  for(unsigned cursor=0;cursor<72000;){unsigned n=72000-cursor;if(n>128)n=128;p0_render(n);float*s=(float*)p0_output_ptr();
    for(unsigned i=0;i<n;i++){float x=s[2*i];if(!isfinite(x))return 6;if(fabs(x)>peak)peak=fabs(x);sum+=x*x;count++;if(out)fwrite(&x,sizeof x,1,out);}cursor+=n;}
  if(out)fclose(out);p0_panic(1,240);p0_render(256);
  if(peak<.001||p0_started_external()!=3||p0_active_voices()!=0)return 7;
  printf("{\"pass\":true,\"frames\":%u,\"peak\":%.9g,\"rms\":%.9g,\"notes\":3,\"physicalDevice\":false}\n",count,peak,sqrt(sum/count));return 0;
}
