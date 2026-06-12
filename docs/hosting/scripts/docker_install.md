---
title: Установка Docker на Debian за 3 шага
icon: fa-brands fa-docker
category: Linux
tag: [Docker, Debian, Linux]
---

# Установка Docker на Debian за 3 шага

Ниже — минимальная установка Docker Engine из официального репозитория Docker для Debian.

## 1) Добавление репозитория Docker

```bash
# Add Docker's official GPG key:
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
```

## 2) Установка пакетов

```bash
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 3) Права Docker для текущего пользователя (если вы не root)

```bash
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

Вывесли текущие контейнеры, чтобы проверить, что Docker работает:
```
docker ps
```

Если всё настроено правильно, команда `docker ps` выведет пустой список контейнеров (без ошибок), например:

```text
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```
