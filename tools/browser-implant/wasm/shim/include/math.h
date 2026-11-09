#ifndef XEN_WASM_MATH_H
#define XEN_WASM_MATH_H
#define M_PI 3.14159265358979323846264338327950288
#define INFINITY (__builtin_inff())
#define NAN (__builtin_nanf(""))
#define isfinite(x) __builtin_isfinite(x)
#define fabs(x) __builtin_fabs(x)
#define floor(x) __builtin_floor(x)
double cos(double);
double sin(double);
double exp(double);
double pow(double,double);
long long llround(double);
#endif
