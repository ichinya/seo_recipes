#!/usr/bin/env bash

# ============================
# cleanctl.sh
# disk cleanup tool
# interactive + auto mode
# ============================

set -e

FORCE=0
TOTAL_FREED_BYTES=0

if [[ "$1" == "--force" ]]; then
    FORCE=1
fi


print_line() {
    echo "----------------------------------------"
}

to_mb() {
    awk -v bytes="$1" 'BEGIN { printf "%.2f", bytes / 1024 / 1024 }'
}

format_bytes() {
    awk -v b="$1" 'BEGIN {
        if (b == "" || b < 0) { print "0.00 MB"; exit }
        if (b >= 1024*1024*1024) printf "%.2f GB", b/1024/1024/1024;
        else printf "%.2f MB", b/1024/1024;
    }'
}

is_at_least_1mb() {
    local bytes="$1"

    [[ -n "$bytes" ]] || return 1
    (( bytes >= 1024 * 1024 ))
}

dir_size_bytes() {
    local path="$1"

    if [[ -d "$path" ]]; then
        du -s -B1 "$path" 2>/dev/null | awk '{print $1}'
    else
        echo ""
    fi
}

disk_summary_root() {
    local line size used avail pcent
    line=$(df -B1 --output=size,used,avail,pcent / 2>/dev/null | tail -n 1 | tr -s ' ')
    read -r size used avail pcent <<<"$line"

    echo "[analytics] Disk (/): total $(format_bytes "$size"), used $(format_bytes "$used") (${pcent}), free $(format_bytes "$avail")"
}

popular_dirs_report() {
    local size

    echo "[analytics] Popular directories:"

    for path in \
        /var/log \
        /var/www \
        /srv \
        /home \
        /tmp \
        /opt \
        /var/lib/docker \
        /var/lib/containerd \
        /var/cache \
        /var/lib/apt \
        /usr/local \
        /root \
        "$HOME"; do
        size=$(dir_size_bytes "$path")
        if is_at_least_1mb "$size"; then
            echo " - ${path}: $(format_bytes "$size")"
        fi
    done
}

top_dirs_report() {
    local parent="$1"
    local limit="$2"

    [[ -d "$parent" ]] || return 0
    [[ -n "$limit" ]] || limit=10

    echo "[analytics] Top ${limit} in ${parent}:"

    du -x -B1 --max-depth=1 "$parent" 2>/dev/null \
        | sort -nr \
        | tail -n +2 \
        | head -n "$limit" \
        | while read -r bytes path; do
            if is_at_least_1mb "$bytes"; then
                echo " - ${path}: $(format_bytes "$bytes")"
            fi
        done
}

get_avail_bytes() {
    local target="$1"
    local bytes
    
    bytes=$(df -B1 --output=avail "$target" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [[ -z "$bytes" ]]; then
        bytes=$(df -B1 --output=avail / | tail -n 1 | tr -d ' ')
    fi
    
    echo "$bytes"
}

report_freed() {
    local label="$1"
    local before="$2"
    local after="$3"
    local delta
    local delta_mb
    
    delta=$((after - before))
    if (( delta < 0 )); then
        delta=0
    fi
    
    TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + delta))
    delta_mb=$(to_mb "$delta")
    
    echo "[$label] freed ${delta_mb} MB"
}

report_zero() {
    local label="$1"
    echo "[$label] freed 0.00 MB"
}

ask() {
    if [[ $FORCE -eq 1 ]]; then
        return 0
    fi
    
    read -p "$1 [y/N]: " a
    [[ "$a" == "y" || "$a" == "Y" ]]
}


clean_apt() {
    if ! ask "Clean apt cache?"; then
        report_zero "apt"
        return 0
    fi
    
    echo "[apt] cleaning apt cache and unused packages..."
    local before after
    before=$(get_avail_bytes "/")
    
    sudo apt-get clean
    sudo apt-get autoremove -y
    sudo apt-get autoremove --purge -y
    
    after=$(get_avail_bytes "/")
    report_freed "apt" "$before" "$after"
}


clean_journal() {
    if ! ask "Clean journal logs?"; then
        report_zero "journal"
        return 0
    fi
    
    echo "[journal] cleaning systemd journal..."
    local before after
    before=$(get_avail_bytes "/var/log")
    
    sudo journalctl --vacuum-time=7d
    sudo journalctl --vacuum-size=200M
    
    after=$(get_avail_bytes "/var/log")
    report_freed "journal" "$before" "$after"
}


clean_logs() {
    if ! ask "Clean /var/log?"; then
        report_zero "logs"
        return 0
    fi
    
    echo "[logs] cleaning /var/log files..."
    local before after
    before=$(get_avail_bytes "/var/log")
    
    sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
    
    after=$(get_avail_bytes "/var/log")
    report_freed "logs" "$before" "$after"
}


clean_cache() {
    if ! ask "Clean user cache?"; then
        report_zero "cache"
        return 0
    fi
    
    echo "[cache] cleaning user cache directories..."
    local before after
    before=$(get_avail_bytes "$HOME")
    
    rm -rf ~/.cache/*
    rm -rf ~/.npm/*
    rm -rf ~/.cargo/registry
    rm -rf ~/.cargo/git
    
    after=$(get_avail_bytes "$HOME")
    report_freed "cache" "$before" "$after"
}


clean_docker() {
    if ! ask "Clean docker?"; then
        report_zero "docker"
        return 0
    fi
    
    if command -v docker >/dev/null; then
        if ! docker info >/dev/null 2>&1; then
            echo "[docker] freed 0.00 MB (docker daemon is not available)"
            return 0
        fi
        
        echo "[docker] cleaning docker images, containers, volumes..."
        local before after
        before=$(get_avail_bytes "/var/lib/docker")
        
        if docker system prune -a -f; then
            docker volume prune -f || true
            
            after=$(get_avail_bytes "/var/lib/docker")
            report_freed "docker" "$before" "$after"
        else
            echo "[docker] freed 0.00 MB (prune failed)"
        fi
    else
        echo "[docker] freed 0.00 MB (docker not found)"
    fi
}


clean_containerd() {
    if ! ask "Clean containerd?"; then
        report_zero "containerd"
        return 0
    fi
    
    if systemctl is-active containerd >/dev/null 2>&1; then
        echo "[containerd] cleaning containerd and docker runtime data..."
        local before after
        before=$(get_avail_bytes "/var/lib/containerd")
        
        sudo systemctl stop docker || true
        sudo systemctl stop containerd || true
        
        sudo rm -rf /var/lib/containerd/*
        sudo rm -rf /var/lib/docker/*
        
        sudo systemctl start containerd || true
        sudo systemctl start docker || true
        
        after=$(get_avail_bytes "/var/lib/containerd")
        report_freed "containerd" "$before" "$after"
    else
        echo "[containerd] freed 0.00 MB (containerd is not active)"
    fi
}


clean_kernels() {
    if ! ask "Clean old kernels?"; then
        report_zero "kernels"
        return 0
    fi
    
    if command -v purge-old-kernels >/dev/null; then
        echo "[kernels] removing old kernels..."
        local before after
        before=$(get_avail_bytes "/")
        
        sudo purge-old-kernels --keep 2
        
        after=$(get_avail_bytes "/")
        report_freed "kernels" "$before" "$after"
    else
        echo "[kernels] freed 0.00 MB (purge-old-kernels not installed)"
    fi
}


main_menu() {
    print_line
    disk_summary_root
    popular_dirs_report
    top_dirs_report "/var" 10
    top_dirs_report "/home" 10
    print_line
    echo "Starting cleanup..."
    print_line
    
    clean_apt
    clean_journal
    clean_logs
    clean_cache
    clean_docker
    clean_containerd
    clean_kernels
    
    local total_mb
    total_mb=$(to_mb "$TOTAL_FREED_BYTES")
    
    print_line
    echo "Total cleaned: ${total_mb} MB"
    disk_summary_root
    echo "Done"
    print_line
}


main_menu