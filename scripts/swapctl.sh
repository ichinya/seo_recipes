#!/usr/bin/env bash
# swapctl.sh — создать/удалить swap-файл и настроить swappiness
# Использование:
#   sudo ./swapctl.sh --size 4G              # создать /swapfile на 4 ГиБ
#   sudo ./swapctl.sh --size 2048M --file /swap2 # произвольный путь/размер
#   sudo ./swapctl.sh --swappiness 10        # выставить swappiness (и сейчас, и постоянно)
#   sudo ./swapctl.sh --remove               # отключить и удалить /swapfile (или --file ...)
#
# Параметры по умолчанию:
#   --file /swapfile
#   --size 2G
#   --swappiness (не меняем, если не указано)

set -euo pipefail

FILE="/swapfile"
SIZE="2G"
SWAPPINESS=""
DO_REMOVE="0"

usage() {
  cat <<'EOF'
swapctl.sh — создать/удалить swap-файл и настроить swappiness
Использование:
  sudo ./swapctl.sh --size 4G              # создать /swapfile на 4 ГиБ
  sudo ./swapctl.sh --size 2048M --file /swap2 # произвольный путь/размер
  sudo ./swapctl.sh --swappiness 10        # выставить swappiness (и сейчас, и постоянно)
  sudo ./swapctl.sh --remove               # отключить и удалить /swapfile (или --file ...)

Параметры по умолчанию:
  --file /swapfile
  --size 2G
  --swappiness (не меняем, если не указано)
EOF
  exit 1
}

# --- Парсим аргументы ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file) FILE="${2:-}"; shift 2;;
    -s|--size) SIZE="${2:-}"; shift 2;;
    --swappiness) SWAPPINESS="${2:-}"; shift 2;;
    -r|--remove) DO_REMOVE="1"; shift;;
    -h|--help) usage;;
    *) echo "Неизвестный аргумент: $1"; usage;;
  esac
done

# --- Утилиты/проверки ---
require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "Запустите с sudo/от root."
    exit 1
  fi
}

in_fstab() {
  local esc
  esc="$(printf '%s' "$FILE" | sed 's/[.[\*^$()+?{|}/]/\\&/g')"
  grep -Eq "^${esc}[[:space:]]+none[[:space:]]+swap[[:space:]]" /etc/fstab 2>/dev/null || return 1
}

remove_fstab() {
  local esc
  esc="$(printf '%s' "$FILE" | sed 's/[.[\*^$()+?{|}/]/\\&/g')"
  if in_fstab; then
    sed -i.bak "/^${esc}[[:space:]]\+none[[:space:]]\+swap[[:space:]]/d" /etc/fstab
  fi
}

parse_size_to_mib() {
  local s="${1^^}"
  if [[ "$s" =~ ^([0-9]+)G$ ]]; then
    echo $(( ${BASH_REMATCH[1]} * 1024 ))
  elif [[ "$s" =~ ^([0-9]+)M$ ]]; then
    echo $(( ${BASH_REMATCH[1]} ))
  elif [[ "$s" =~ ^[0-9]+$ ]]; then
    echo "$s"
  else
    echo "Неверный формат размера: $1 (ожидается, например, 4G или 4096M)" >&2
    exit 1
  fi
}

create_swapfile() {
  local mib="$1"

  if [[ -e "$FILE" ]]; then
    if file -L "$FILE" | grep -qi 'swap'; then
      echo "Файл $FILE уже существует и похож на swap. Пропускаю создание."
    else
      echo "Файл $FILE существует. Пропускаю создание, попробую использовать его как swap."
    fi
  else
    if command -v fallocate >/dev/null 2>&1; then
      fallocate -l "$((mib))MiB" "$FILE" 2>/dev/null || {
        echo "fallocate недоступен/не поддерживается на FS, пробую dd..."
        dd if=/dev/zero of="$FILE" bs=1M count="$mib" status=progress
      }
    else
      dd if=/dev/zero of="$FILE" bs=1M count="$mib" status=progress
    fi
  fi

  chmod 600 "$FILE"
  mkswap "$FILE" >/dev/null
  swapon "$FILE" || true

  if ! in_fstab; then
    echo -e "${FILE}\tnone\tswap\tsw\t0 0" >> /etc/fstab
  fi
  echo "Готово: активирован swap ${mib}MiB в $FILE"
}

remove_swapfile() {
  swapoff "$FILE" 2>/dev/null || true
  remove_fstab
  if [[ -e "$FILE" ]]; then
    rm -f "$FILE"
    echo "Удалён $FILE и запись из /etc/fstab."
  else
    echo "Файл $FILE не найден. Убрана возможная запись из /etc/fstab."
  fi
}

set_swappiness() {
  local val="$1"
  if [[ -z "$val" ]]; then return 0; fi
  if ! [[ "$val" =~ ^[0-9]+$ ]] || (( val < 0 || val > 200 )); then
    echo "Некорректный swappiness: $val (ожидается 0..200)" >&2
    exit 1
  fi

  sysctl vm.swappiness="$val" >/dev/null

  local conf="/etc/sysctl.d/99-swapctl.conf"
  mkdir -p /etc/sysctl.d
  echo "vm.swappiness=$val" > "$conf"
  sysctl --system >/dev/null
  echo "Установлен vm.swappiness=$val (и применён постоянно)."
}

main() {
  require_root
  if [[ "$DO_REMOVE" == "1" ]]; then
    remove_swapfile
    exit 0
  fi

  local mib
  mib="$(parse_size_to_mib "$SIZE")"

  if swapon --show | grep -q .; then
    echo "Внимание: в системе уже активен swap. Будет добавлен ещё один."
  fi

  create_swapfile "$mib"

  if [[ -n "$SWAPPINESS" ]]; then
    set_swappiness "$SWAPPINESS"
  fi

  echo
  echo "Текущее состояние:"
  swapon --show || true
  free -h || true
}

main "$@"

