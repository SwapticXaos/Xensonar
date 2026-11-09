#!/usr/bin/env bash
set -euo pipefail
has_pkg=false; has_header=false; has_runtime=false; has_pw_cli=false; server_socket=false; has_compiler=false; server_reachable=false
pkg_version=""; runtime_version=""; os_id=""; os_version=""
CC_BIN="${CC:-cc}"
if command -v "$CC_BIN" >/dev/null 2>&1; then has_compiler=true; fi
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists libpipewire-0.3; then
  has_pkg=true; pkg_version="$(pkg-config --modversion libpipewire-0.3 2>/dev/null || true)"
fi
if [[ "$has_compiler" == true && "$has_pkg" == true ]]; then
  read -r -a PW_CFLAGS <<< "$(pkg-config --cflags libpipewire-0.3)"
  if printf '#include <pipewire/pipewire.h>\n' | "$CC_BIN" "${PW_CFLAGS[@]}" -E -x c - >/dev/null 2>&1; then
    has_header=true
  fi
fi
if ldconfig -p 2>/dev/null | grep 'libpipewire-0.3.so.0' >/dev/null; then has_runtime=true; fi
if command -v pw-cli >/dev/null 2>&1; then has_pw_cli=true; fi
runtime_dir="${PIPEWIRE_RUNTIME_DIR:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}}"
server_path="$runtime_dir/pipewire-0"
if [[ -S "$server_path" ]]; then server_socket=true; fi
if [[ "$has_pw_cli" == true && "$server_socket" == true ]] && timeout 2 pw-cli info 0 >/dev/null 2>&1; then server_reachable=true; fi
if command -v dpkg-query >/dev/null 2>&1; then
  runtime_version="$(dpkg-query -W -f='${Version}' libpipewire-0.3-0t64 2>/dev/null || dpkg-query -W -f='${Version}' libpipewire-0.3-0 2>/dev/null || true)"
fi
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  os_id="${ID:-}"; os_version="${VERSION_ID:-}"
fi
build_ready=$([[ "$has_compiler" == true && "$has_pkg" == true && "$has_header" == true ]] && echo true || echo false)
physical_ready=$([[ "$build_ready" == true && "$server_socket" == true ]] && echo true || echo false)
printf '{"compiler":%s,"compilerCommand":"%s","pipewirePkgConfig":%s,"pipewireHeaders":%s,"pipewireRuntime":%s,"pipewireRuntimeVersion":"%s","pwCli":%s,"serverSocket":%s,"serverReachableByPwCli":%s,"serverSocketPath":"%s","pkgVersion":"%s","osId":"%s","osVersion":"%s","devPackageHint":"libpipewire-0.3-dev","buildReady":%s,"physicalReady":%s}\n' \
  "$has_compiler" "$CC_BIN" "$has_pkg" "$has_header" "$has_runtime" "$runtime_version" "$has_pw_cli" "$server_socket" "$server_reachable" "$server_path" "$pkg_version" "$os_id" "$os_version" "$build_ready" "$physical_ready"
