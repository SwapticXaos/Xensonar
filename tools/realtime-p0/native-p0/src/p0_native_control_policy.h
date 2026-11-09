#ifndef P0_NATIVE_CONTROL_POLICY_H
#define P0_NATIVE_CONTROL_POLICY_H

/* Native control/realtime policy. These values are architecture contracts, not
   tuning hints. Product-specific musical disconnect policy remains outside P0N. */
#define P0N_RT_OWNER_LEASE_MS 1500u
#define P0N_RT_OWNER_RENEW_MS 250u
#define P0N_BROWSER_SESSION_LEASE_MS 5000u

#define P0N_ATTACK_LEAD_MS 5u
#define P0N_ATTACK_LATE_MS 90u

#define P0N_HTTP_MAX_REQUEST 4096u
#define P0N_HTTP_MAX_BODY 1024u
#define P0N_RFL_MATERIAL_MAX_ASSET_BYTES (256u * 1024u * 1024u)
#define P0N_RFL_MATERIAL_MAX_PLAN_BYTES 2048u
#ifndef P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS
#define P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS 8u
#endif
#define P0N_RFL_MATERIAL_MAX_BATCH_BYTES (16u + P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS * P0N_RFL_MATERIAL_MAX_PLAN_BYTES)

_Static_assert(P0N_RT_OWNER_LEASE_MS > 0u, "RT owner lease must be positive");
_Static_assert(P0N_RT_OWNER_LEASE_MS <= 2000u, "P0 core accepts leases at most two seconds ahead");
_Static_assert(P0N_RT_OWNER_RENEW_MS > 0u, "RT owner renew interval must be positive");
_Static_assert(P0N_RT_OWNER_RENEW_MS * 3u < P0N_RT_OWNER_LEASE_MS,
  "RT owner lease needs substantial renewal headroom");
_Static_assert(P0N_BROWSER_SESSION_LEASE_MS > P0N_RT_OWNER_LEASE_MS,
  "browser-control lease must not be tighter than the RT owner lease");
_Static_assert(P0N_ATTACK_LEAD_MS > 0u && P0N_ATTACK_LATE_MS > 0u,
  "attack admission timing must remain explicit");
_Static_assert(P0N_HTTP_MAX_BODY < P0N_HTTP_MAX_REQUEST,
  "HTTP body bound must fit inside request bound");

#endif
