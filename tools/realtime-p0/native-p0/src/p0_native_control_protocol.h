#ifndef P0_NATIVE_CONTROL_PROTOCOL_H
#define P0_NATIVE_CONTROL_PROTOCOL_H

#define P0N_PROTOCOL_VERSION "p0n-control-v1"

#define P0N_ROUTE_LAB "/lab"
#define P0N_ROUTE_PROTOCOL_JS "/xensonar-native-protocol.js"
#define P0N_ROUTE_ADAPTER_JS "/xensonar-native-control.js"
#define P0N_ROUTE_SESSION "/v1/session"
#define P0N_ROUTE_BROWSER_PROGRESS "/v1/browser-progress"
#define P0N_ROUTE_STATUS "/v1/status"
#define P0N_ROUTE_HEARTBEAT "/v1/heartbeat"
#define P0N_ROUTE_STATE "/v1/state"
#define P0N_ROUTE_ATTACK "/v1/attack"
#define P0N_ROUTE_WAVE_STARTER_ATTACK "/v1/wavestarter/attack"
#define P0N_ROUTE_WAVE_STARTER_RESOLVED_ATTACK "/v1/wavestarter/resolved-attack"
#define P0N_ROUTE_RELEASE "/v1/release"
#define P0N_ROUTE_PANIC "/v1/panic"
#define P0N_ROUTE_BROWSER_REPORT "/v1/browser-report"
#define P0N_ROUTE_SHUTDOWN "/v1/shutdown"
#define P0N_ROUTE_RFL_MATERIAL_ASSET "/v1/rfl/material/asset"
#define P0N_ROUTE_RFL_MATERIAL_PREPARE "/v1/rfl/material/window/prepare"
#define P0N_ROUTE_RFL_MATERIAL_COMMIT "/v1/rfl/material/window/commit"
#define P0N_ROUTE_RFL_MATERIAL_STOP "/v1/rfl/material/stop"
#define P0N_ROUTE_RFL_MATERIAL_SUBMIT "/v1/rfl/material/window/submit"
#define P0N_ROUTE_RFL_MATERIAL_BATCH "/v1/rfl/material/window/batch"
#define P0N_ROUTE_POST_MASTER_BEGIN "/v1/post-master/begin"
#define P0N_ROUTE_POST_MASTER_PCM "/v1/post-master/pcm"
#define P0N_ROUTE_POST_MASTER_STREAM "/v1/post-master/stream"
#define P0N_ROUTE_POST_MASTER_COMMIT "/v1/post-master/commit"
#define P0N_ROUTE_POST_MASTER_STOP "/v1/post-master/stop"

#define P0N_HEADER_ORIGIN "Origin"
#define P0N_HEADER_TOKEN "X-Xensonar-Token"
#define P0N_HEADER_SESSION "X-Xensonar-Session"
#define P0N_HEADER_MATERIAL_HASH "X-Xensonar-Material-Hash"
#define P0N_HEADER_MATERIAL_FRAMES "X-Xensonar-Material-Frames"
#define P0N_HEADER_MATERIAL_CHANNELS "X-Xensonar-Material-Channels"
#define P0N_HEADER_MATERIAL_SAMPLE_RATE "X-Xensonar-Material-Sample-Rate"
#define P0N_HEADER_PCM_GENERATION "X-Xensonar-PCM-Generation"
#define P0N_HEADER_PCM_SEQUENCE "X-Xensonar-PCM-Sequence"
#define P0N_HEADER_PCM_START_FRAME "X-Xensonar-PCM-Start-Frame"
#define P0N_HEADER_PCM_FRAMES "X-Xensonar-PCM-Frames"
#define P0N_HEADER_PCM_CHANNELS "X-Xensonar-PCM-Channels"
#define P0N_HEADER_PCM_SAMPLE_RATE "X-Xensonar-PCM-Sample-Rate"

#define P0N_HTTP_OK 200
#define P0N_HTTP_ACCEPTED 202
#define P0N_HTTP_BAD_REQUEST 400
#define P0N_HTTP_FORBIDDEN 403
#define P0N_HTTP_NOT_FOUND 404
#define P0N_HTTP_CONFLICT 409
#define P0N_HTTP_PAYLOAD_TOO_LARGE 413
#define P0N_HTTP_TOO_MANY_REQUESTS 429
#define P0N_HTTP_INTERNAL_SERVER_ERROR 500
#define P0N_HTTP_UNAUTHORIZED 401

#define P0N_ERROR_BODY_TOO_LARGE "body-too-large"
#define P0N_ERROR_REQUEST_TOO_LARGE "request-too-large"
#define P0N_ERROR_SESSION_ROTATION_FAILED "session-rotation-failed"
#define P0N_ERROR_BAD_PROGRESS "bad-progress"
#define P0N_ERROR_FORBIDDEN_SESSION "forbidden-session"
#define P0N_ERROR_CONTROL_SESSION_EXPIRED "control-session-expired"
#define P0N_ERROR_BAD_STATE "bad-state"
#define P0N_ERROR_STALE_REVISION "stale-revision"
#define P0N_ERROR_BAD_ATTACK "bad-attack"
#define P0N_ERROR_EVENT_RING_FULL "event-ring-full"
#define P0N_ERROR_BAD_BROWSER_REPORT "bad-browser-report"
#define P0N_ERROR_NOT_FOUND "not-found"
#define P0N_ERROR_BAD_WAVE_STARTER_ATTACK "bad-wavestarter-attack"
#define P0N_ERROR_BAD_WAVE_STARTER_RESOLVED_ATTACK "bad-wavestarter-resolved-attack"
#define P0N_ERROR_BAD_RFL_MATERIAL_ASSET "bad-rfl-material-asset"
#define P0N_ERROR_RFL_MATERIAL_ASSET_BANK_FULL "rfl-material-asset-bank-full"
#define P0N_ERROR_RFL_MATERIAL_NOT_WARM "rfl-material-not-warm"
#define P0N_ERROR_BAD_RFL_MATERIAL_WINDOW "bad-rfl-material-window"
#define P0N_ERROR_RFL_MATERIAL_PREPARE_CONFLICT "rfl-material-prepare-conflict"
#define P0N_ERROR_RFL_MATERIAL_COMMIT_REJECTED "rfl-material-commit-rejected"
#define P0N_ERROR_BAD_RFL_MATERIAL_STOP "bad-rfl-material-stop"
#define P0N_ERROR_RFL_MATERIAL_SUBMIT_REJECTED "rfl-material-submit-rejected"
#define P0N_ERROR_RFL_MATERIAL_BATCH_REJECTED "rfl-material-batch-rejected"
#define P0N_ERROR_BAD_POST_MASTER_BEGIN "bad-post-master-begin"
#define P0N_ERROR_BAD_POST_MASTER_PCM "bad-post-master-pcm"
#define P0N_ERROR_POST_MASTER_BACKPRESSURE "post-master-backpressure"
#define P0N_ERROR_POST_MASTER_CONTINUITY "post-master-continuity"
#define P0N_ERROR_POST_MASTER_NOT_PREFILLED "post-master-not-prefilled"
#define P0N_ERROR_BAD_POST_MASTER_STOP "bad-post-master-stop"

#endif
