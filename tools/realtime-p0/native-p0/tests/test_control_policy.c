#include <stdio.h>
#include "../src/p0_native_control_policy.h"
int main(void) {
  printf("{\"pass\":true,\"rtOwnerLeaseMs\":%u,\"rtOwnerRenewMs\":%u,\"browserSessionLeaseMs\":%u,\"attackLeadMs\":%u,\"attackLateMs\":%u,\"httpMaxRequest\":%u,\"httpMaxBody\":%u}\n",
    P0N_RT_OWNER_LEASE_MS,P0N_RT_OWNER_RENEW_MS,P0N_BROWSER_SESSION_LEASE_MS,
    P0N_ATTACK_LEAD_MS,P0N_ATTACK_LATE_MS,P0N_HTTP_MAX_REQUEST,P0N_HTTP_MAX_BODY);
  return 0;
}
