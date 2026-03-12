#!/usr/bin/env bash

# ============================
# cleanctl.sh
# disk cleanup tool
# interactive + auto mode
# ============================

set -e

FORCE=0

if [[ "$1" == "--force" ]]; then
    FORCE=1
fi


print_line() {
    echo "----------------------------------------"
}

ask() {
    if [[ $FORCE -eq 1 ]]; then
        return 0
    fi
    
    read -p "$1 [y/N]: " a
    [[ "$a" == "y" || "$a" == "Y" ]]
}


show_disk() {
    print_line
    echo "Disk usage:"
    df -h
    print_line
}


clean_apt() {
    
    ask "Clean apt cache?" || return
    
    sudo apt-get clean
    sudo apt-get autoremove -y
    sudo apt-get autoremove --purge -y
    
}


clean_journal() {
    
    ask "Clean journal logs?" || return
    
    sudo journalctl --vacuum-time=7d
    sudo journalctl --vacuum-size=200M
    
}


clean_logs() {
    
    ask "Clean /var/log?" || return
    
    sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
    
}


clean_cache() {
    
    ask "Clean user cache?" || return
    
    rm -rf ~/.cache/*
    rm -rf ~/.npm/*
    rm -rf ~/.cargo/registry
    rm -rf ~/.cargo/git
    
}


clean_docker() {
    
    ask "Clean docker?" || return
    
    if command -v docker >/dev/null; then
        docker system prune -a -f
        docker volume prune -f
    else
        echo "docker not found"
    fi
    
}


clean_containerd() {
    
    ask "Clean containerd?" || return
    
    if systemctl is-active containerd >/dev/null 2>&1; then
        
        sudo systemctl stop docker || true
        sudo systemctl stop containerd || true
        
        sudo rm -rf /var/lib/containerd/*
        sudo rm -rf /var/lib/docker/*
        
        sudo systemctl start containerd || true
        sudo systemctl start docker || true
        
    fi
    
}


clean_kernels() {
    
    ask "Clean old kernels?" || return
    
    if command -v purge-old-kernels >/dev/null; then
        sudo purge-old-kernels --keep 2
    else
        echo "purge-old-kernels not installed"
    fi
    
}


main_menu() {
    
    show_disk
    
    clean_apt
    clean_journal
    clean_logs
    clean_cache
    clean_docker
    clean_containerd
    clean_kernels
    
    show_disk
    
    echo "Done"
    
}


main_menu