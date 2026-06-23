#!/usr/bin/env bash

# VPS test helper for Debian 13.
# Safe to run on a fresh VPS: it asks before installing packages and skips tests
# when required tools are missing.

set -uo pipefail

INSTALL_MODE="ask"
VPS_TEST_RUNTIME="${VPS_TEST_RUNTIME:-30}"
VPS_TEST_FIO_SIZE="${VPS_TEST_FIO_SIZE:-1G}"
VPS_TEST_IPERF_PARALLEL="${VPS_TEST_IPERF_PARALLEL:-5}"
ITDOG_SPEEDTEST_URL="https://github.com/itdoginfo/russian-iperf3-servers/raw/main/speedtest.sh"
IPERF_FR_SERVERS_URL="https://iperf.fr/iperf-servers.php"

usage() {
  cat <<'EOF'
vps-test-debian13.sh - VPS/VDS test helper for Debian 13

Usage:
  bash vps-test-debian13.sh
  bash vps-test-debian13.sh --install
  bash vps-test-debian13.sh --no-install
  bash vps-test-debian13.sh --quick

Options:
  --install     install test packages without asking
  --no-install  do not install packages, skip missing tests
  --quick       shorter tests: 10 seconds, fio size 512M
  -h, --help    show this help

Environment:
  VPS_TEST_RUNTIME=30          test runtime in seconds for iperf3/fio
  VPS_TEST_FIO_SIZE=1G         fio test file size
  VPS_TEST_IPERF_PARALLEL=5    parallel iperf3 TCP streams
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_MODE="yes"
      shift
      ;;
    --no-install)
      INSTALL_MODE="no"
      shift
      ;;
    --quick)
      VPS_TEST_RUNTIME="10"
      VPS_TEST_FIO_SIZE="512M"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

LOG_BASE="${HOME:-/tmp}/vps-test"
if ! mkdir -p "$LOG_BASE" 2>/dev/null; then
  LOG_BASE="/tmp/vps-test"
  mkdir -p "$LOG_BASE"
fi

RUN_ID="$(date +%Y-%m-%d_%H-%M-%S)"
LOG_DIR="${LOG_BASE}/${RUN_ID}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/vps-test.log"

exec > >(tee -a "$LOG_FILE") 2>&1

section() {
  echo
  echo "================================================================"
  echo "$1"
  echo "================================================================"
}

warn() {
  echo "[warn] $*"
}

skip() {
  echo "[skip] $*"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-yes}"
  local answer
  local suffix

  if [[ "$default" == "yes" ]]; then
    suffix="[Y/n]"
  else
    suffix="[y/N]"
  fi

  if [[ -r /dev/tty ]]; then
    read -r -p "${prompt} ${suffix}: " answer </dev/tty || answer=""
  else
    answer=""
  fi

  if [[ -z "$answer" ]]; then
    [[ "$default" == "yes" ]]
    return
  fi

  [[ "$answer" == "y" || "$answer" == "Y" || "$answer" == "yes" || "$answer" == "YES" ]]
}

run_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    env DEBIAN_FRONTEND=noninteractive "$@"
  elif have sudo; then
    sudo env DEBIAN_FRONTEND=noninteractive "$@"
  else
    return 127
  fi
}

run_cmd() {
  echo
  echo "+ $*"
  "$@"
  local code=$?
  if [[ $code -ne 0 ]]; then
    warn "command exited with code ${code}: $*"
  fi
  return 0
}

run_with_timeout() {
  local seconds="$1"
  shift

  if have timeout; then
    run_cmd timeout "$seconds" "$@"
  else
    run_cmd "$@"
  fi
}

cpu_threads() {
  if have nproc; then
    nproc
  else
    getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1
  fi
}

get_os_value() {
  local key="$1"

  if [[ -r /etc/os-release ]]; then
    awk -F= -v key="$key" '$1 == key { gsub(/^"|"$/, "", $2); print $2; exit }' /etc/os-release
  fi
}

get_public_ip() {
  if have curl; then
    curl -4fsS --max-time 8 https://ifconfig.me 2>/dev/null || true
  elif have wget; then
    wget -4qO- -T 8 https://ifconfig.me 2>/dev/null || true
  else
    true
  fi
}

format_command_status() {
  local cmd="$1"
  if have "$cmd"; then
    printf "  %-12s %s\n" "$cmd" "$(command -v "$cmd")"
  else
    printf "  %-12s %s\n" "$cmd" "not installed"
  fi
}

install_packages_if_needed() {
  local packages=(
    ca-certificates
    curl
    wget
    iperf3
    mtr-tiny
    iputils-ping
    iputils-tracepath
    fio
    sysbench
    lsb-release
    procps
    iproute2
    util-linux
    jq
  )

  if ! have apt-get; then
    skip "apt-get not found, package installation skipped"
    return 0
  fi

  if [[ "$INSTALL_MODE" == "ask" ]]; then
    if ask_yes_no "Install packages for tests with apt?" "yes"; then
      INSTALL_MODE="yes"
    else
      INSTALL_MODE="no"
    fi
  fi

  if [[ "$INSTALL_MODE" != "yes" ]]; then
    skip "package installation disabled"
    return 0
  fi

  section "Package installation"

  if ! run_root apt-get update; then
    warn "apt-get update failed, tests will use already installed tools"
    return 0
  fi

  if ! run_root apt-get install -y "${packages[@]}"; then
    warn "apt-get install failed, tests will use already installed tools"
    return 0
  fi
}

print_header() {
  local os_pretty os_id os_version public_ip
  os_pretty="$(get_os_value PRETTY_NAME)"
  os_id="$(get_os_value ID)"
  os_version="$(get_os_value VERSION_ID)"
  public_ip="$(get_public_ip)"

  section "VPS test start"
  echo "Run id: ${RUN_ID}"
  echo "Log file: ${LOG_FILE}"
  echo "Date: $(date -Is)"
  echo "Hostname: $(hostname 2>/dev/null || echo unknown)"
  echo "OS: ${os_pretty:-unknown}"
  echo "Kernel: $(uname -a)"
  echo "Public IPv4: ${public_ip:-unknown}"
  echo "Runtime per long test: ${VPS_TEST_RUNTIME}s"
  echo "fio size: ${VPS_TEST_FIO_SIZE}"
  echo "iperf3 parallel streams: ${VPS_TEST_IPERF_PARALLEL}"

  if [[ "$os_id" != "debian" || "$os_version" != "13" ]]; then
    warn "target OS is Debian 13, current OS looks like ${os_pretty:-unknown}; continuing best-effort"
  fi
}

print_system_info() {
  section "System information"

  run_cmd date -Is
  run_cmd uname -a

  if have lsb_release; then
    run_cmd lsb_release -a
  elif [[ -r /etc/os-release ]]; then
    run_cmd cat /etc/os-release
  fi

  if have lscpu; then
    run_cmd lscpu
  else
    skip "lscpu not installed"
  fi

  if have free; then
    run_cmd free -h
  else
    skip "free not installed"
  fi

  if have df; then
    run_cmd df -hT
  else
    skip "df not installed"
  fi

  if have lsblk; then
    run_cmd lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,MODEL
  else
    skip "lsblk not installed"
  fi

  if have ip; then
    run_cmd ip -br addr
    run_cmd ip route
  else
    skip "ip not installed"
  fi

  if have uptime; then
    run_cmd uptime
  fi
}

print_tools() {
  section "Tool availability"

  for cmd in apt-get sudo curl wget iperf3 ping mtr tracepath fio sysbench lscpu free df lsblk ip jq timeout; do
    format_command_status "$cmd"
  done
}

download_file() {
  local url="$1"
  local target="$2"

  if have wget; then
    wget -qO "$target" "$url"
  elif have curl; then
    curl -fsSL -o "$target" "$url"
  else
    return 127
  fi
}

run_itdog_speedtest() {
  section "Network: itdoginfo russian iperf3 speedtest"

  if ! have iperf3; then
    skip "iperf3 not installed"
    return 0
  fi

  if ! have wget && ! have curl; then
    skip "wget/curl not installed"
    return 0
  fi

  local script_path="${LOG_DIR}/russian-iperf3-speedtest.sh"

  if ! download_file "$ITDOG_SPEEDTEST_URL" "$script_path"; then
    warn "failed to download ${ITDOG_SPEEDTEST_URL}"
    return 0
  fi

  chmod +x "$script_path"
  run_cmd bash "$script_path" -f
}

run_manual_iperf3() {
  section "Network: manual iperf3 checks"

  if ! have iperf3; then
    skip "iperf3 not installed"
    return 0
  fi

  local timeout_seconds=$((VPS_TEST_RUNTIME + 45))
  local tests=(
    "mskst.st.mtsws.net 3333 Moscow"
    "st.nn.ertelecom.ru 5202 Nizhny-Novgorod"
    "tumst.st.mtsws.net 3333 Tyumen"
  )
  local item host port label

  for item in "${tests[@]}"; do
    read -r host port label <<<"$item"
    echo
    echo "[iperf3] ${label}: ${host}:${port} upload"
    run_with_timeout "$timeout_seconds" iperf3 -c "$host" -p "$port" -P "$VPS_TEST_IPERF_PARALLEL" -t "$VPS_TEST_RUNTIME"
    echo
    echo "[iperf3] ${label}: ${host}:${port} download (-R)"
    run_with_timeout "$timeout_seconds" iperf3 -c "$host" -p "$port" -P "$VPS_TEST_IPERF_PARALLEL" -t "$VPS_TEST_RUNTIME" -R
  done
}

run_international_iperf3() {
  section "Network: international iperf3 checks"

  if ! have iperf3; then
    skip "iperf3 not installed"
    return 0
  fi

  echo "Source list: ${IPERF_FR_SERVERS_URL}"
  echo "Public iperf3 servers can be busy; failed checks are kept in the log and the script continues."

  local timeout_seconds=$((VPS_TEST_RUNTIME + 45))
  local tests=(
    "ping.online.net 5200 France-Paris"
    "speedtest.serverius.net 5002 Netherlands-Serverius"
    "iperf.he.net 5201 USA-California"
  )
  local item host port label

  for item in "${tests[@]}"; do
    read -r host port label <<<"$item"
    echo
    echo "[iperf3] ${label}: ${host}:${port} upload"
    run_with_timeout "$timeout_seconds" iperf3 -c "$host" -p "$port" -P "$VPS_TEST_IPERF_PARALLEL" -t "$VPS_TEST_RUNTIME"
    echo
    echo "[iperf3] ${label}: ${host}:${port} download (-R)"
    run_with_timeout "$timeout_seconds" iperf3 -c "$host" -p "$port" -P "$VPS_TEST_IPERF_PARALLEL" -t "$VPS_TEST_RUNTIME" -R
  done
}

run_latency_tests() {
  section "Network: ping, mtr, tracepath"

  local targets=("1.1.1.1" "ya.ru" "mskst.st.mtsws.net")
  local target

  if have ping; then
    for target in "${targets[@]}"; do
      run_with_timeout 30 ping -c 10 -W 2 "$target"
    done
  else
    skip "ping not installed"
  fi

  if have mtr; then
    for target in "${targets[@]}"; do
      run_with_timeout 90 mtr -r -w -z -c 50 "$target"
    done
  else
    skip "mtr not installed"
  fi

  if have tracepath; then
    for target in "${targets[@]}"; do
      run_with_timeout 45 tracepath "$target"
    done
  else
    skip "tracepath not installed"
  fi
}

run_disk_tests() {
  section "Disk: fio"

  if ! have fio; then
    skip "fio not installed"
    return 0
  fi

  local fio_dir="${LOG_DIR}/fio"
  local timeout_seconds=$((VPS_TEST_RUNTIME + 120))
  mkdir -p "$fio_dir"

  run_with_timeout "$timeout_seconds" fio \
    --name=seq-write \
    --filename="${fio_dir}/seq-write.test" \
    --size="$VPS_TEST_FIO_SIZE" \
    --rw=write \
    --bs=1M \
    --iodepth=16 \
    --direct=1 \
    --runtime="$VPS_TEST_RUNTIME" \
    --time_based \
    --group_reporting

  run_with_timeout "$timeout_seconds" fio \
    --name=seq-read \
    --filename="${fio_dir}/seq-write.test" \
    --rw=read \
    --bs=1M \
    --iodepth=16 \
    --direct=1 \
    --runtime="$VPS_TEST_RUNTIME" \
    --time_based \
    --group_reporting

  run_with_timeout "$timeout_seconds" fio \
    --name=rand-rw \
    --filename="${fio_dir}/rand-rw.test" \
    --size="$VPS_TEST_FIO_SIZE" \
    --rw=randrw \
    --rwmixread=70 \
    --bs=4k \
    --iodepth=32 \
    --direct=1 \
    --runtime="$VPS_TEST_RUNTIME" \
    --time_based \
    --group_reporting

  rm -f "${fio_dir}/seq-write.test" "${fio_dir}/rand-rw.test"
}

run_cpu_tests() {
  section "CPU and memory: sysbench"

  if ! have sysbench; then
    skip "sysbench not installed"
    return 0
  fi

  local threads
  threads="$(cpu_threads)"

  run_with_timeout 120 sysbench cpu --cpu-max-prime=20000 --threads=1 run
  run_with_timeout 180 sysbench cpu --cpu-max-prime=20000 --threads="$threads" run
  run_with_timeout 120 sysbench memory --threads="$threads" run
}

print_summary() {
  local os_pretty cpu_model threads ram root_disk public_ip

  os_pretty="$(get_os_value PRETTY_NAME)"
  public_ip="$(get_public_ip)"
  threads="$(cpu_threads)"

  if have lscpu; then
    cpu_model="$(lscpu | awk -F: '/Model name/ { gsub(/^[ \t]+/, "", $2); print $2; exit }')"
  else
    cpu_model="unknown"
  fi

  if have free; then
    ram="$(free -h | awk '/^Mem:/ { print $2 }')"
  else
    ram="unknown"
  fi

  if have df; then
    root_disk="$(df -h / | awk 'NR == 2 { print $2 " total, " $4 " free, " $5 " used" }')"
  else
    root_disk="unknown"
  fi

  section "Short summary for provider review"
  echo "Date: $(date -Is)"
  echo "OS: ${os_pretty:-unknown}"
  echo "Kernel: $(uname -r)"
  echo "CPU: ${cpu_model:-unknown}, threads: ${threads}"
  echo "RAM: ${ram}"
  echo "Root disk: ${root_disk}"
  echo "Public IPv4: ${public_ip:-unknown}"
  echo "Test runtime: ${VPS_TEST_RUNTIME}s"
  echo "fio size: ${VPS_TEST_FIO_SIZE}"
  echo "Full log: ${LOG_FILE}"
  echo
  echo "Use the tables above for network speed, fio IOPS/bandwidth and sysbench totals."
}

main() {
  echo "VPS test log: ${LOG_FILE}"
  install_packages_if_needed
  print_header
  print_tools
  print_system_info
  run_itdog_speedtest
  run_manual_iperf3
  run_international_iperf3
  run_latency_tests
  run_disk_tests
  run_cpu_tests
  print_summary
}

main "$@"
