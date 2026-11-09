/* xen_dsp.c — the few primitives the first slice needs.
 *
 * EXPERIMENTAL_PLACEHOLDER: every transfer function here was chosen for
 * cheapness and stability, not because it matches any Xensonar reference.
 * See MUSICAL_SEMANTICS.md.
 */
#include "../xen_internal.h"
#include <math.h>
#include <string.h>

float xen_hann[XEN_HANN_N + 1];

void xen_dsp_init(void) {
    static int done = 0;
    if (done) return;
    for (int i = 0; i <= XEN_HANN_N; i++) {
        xen_hann[i] = (float)(0.5 - 0.5 * cos((2.0 * M_PI * (double)i) / (double)XEN_HANN_N));
    }
    done = 1;
}

/* Rational tanh approximation: no transcendental call in the callback. */
double xen_softclip(double x) {
    double x2 = x * x;
    return (x * (27.0 + x2)) / (27.0 + 9.0 * x2);
}

/* Parabolic sine, phase in turns. */
double xen_sin_turns(double p) {
    double x = p - floor(p);
    x = x * 2.0 - 1.0;
    double ax = x < 0 ? -x : x;
    double y = 4.0 * x * (1.0 - ax);
    double ay = y < 0 ? -y : y;
    return 0.775 * y + 0.225 * y * ay;
}

/* Chamberlin state variable filter, 2x internal iteration for stability. */
double xen_svf_tick(xen_svf* s, double x, double f, double q) {
    double lp = s->lp, bp = s->bp;
    for (int i = 0; i < 2; i++) {
        double hp = x - lp - q * bp;
        bp += f * hp;
        lp += f * bp;
    }
    s->lp = lp;
    s->bp = bp;
    return lp;
}

void xen_delay_tick(xen_delay* d, double xl, double xr, double dl, double dr,
                    double fb, double* out) {
    uint32_t n = d->n;
    double rl = (double)d->w - dl;
    double rr = (double)d->w - dr;
    while (rl < 0) rl += (double)n;
    while (rr < 0) rr += (double)n;
    uint32_t il = (uint32_t)rl, ir = (uint32_t)rr;
    double fl = rl - (double)il, fr = rr - (double)ir;
    uint32_t il1 = (il + 1 == n) ? 0 : il + 1;
    uint32_t ir1 = (ir + 1 == n) ? 0 : ir + 1;
    double yl = (double)d->l[il] + ((double)d->l[il1] - (double)d->l[il]) * fl;
    double yr = (double)d->r[ir] + ((double)d->r[ir1] - (double)d->r[ir]) * fr;
    d->l[d->w] = (float)(xl + yr * fb);   /* cross coupled */
    d->r[d->w] = (float)(xr + yl * fb);
    d->w = (d->w + 1 == n) ? 0 : d->w + 1;
    out[0] = yl;
    out[1] = yr;
}
