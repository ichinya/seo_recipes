---
title: Обновление Debian 12 до 13
icon: fa-brands fa-debian
category: Linux
tag: [Debian, Linux, обновление]
---

# Обновление Debian 12 “Bookworm” до Debian 13 “Trixie”

Debian 13 вышел 9 августа 2025 года и принёс ядро Linux 6.12 LTS, актуальные окружения рабочего стола и множество технических улучшений по сравнению с Debian 12, опубликованным в июне 2023 года на ядре 6.1 LTS.

## Основные отличия Debian 13 от Debian 12

- **Ядро и поддержка оборудования.** Debian 13 использует Linux 6.12 LTS с лучшей поддержкой современных процессоров Intel/AMD, Wi‑Fi, графики и 64‑битной RISC‑V. Debian 12 базируется на 6.1 LTS.
- **Десктопные окружения.** GNOME 45 и KDE Plasma 6 с улучшенной поддержкой Wayland и мультитач‑жестов. В Debian 12 используются GNOME 43 и KDE Plasma 5.27.
- **Пакеты и инструменты.** Обновлены тысячи пакетов: Python 3.12, GCC 13, LibreOffice 7.6+, Firefox ESR 126; APT научился работать с сжатием zstd.
- **Безопасность и производительность.** Усилены профили AppArmor, добавлена Landlock LSM, улучшена безопасность systemd; `/tmp` монтируется в `tmpfs`.
- **Архитектуры.** Удалена поддержка устаревших платформ (i386, mipsel), основной упор на современные 64‑битные системы.
- **Контейнеры.** Улучшена интеграция Podman 5, Buildah и rootless‑контейнеров.

Если нужна поддержка старого оборудования, можно остаться на Debian 12, но для свежих платформ и пакетов рекомендуется Debian 13.

## Пошаговая инструкция по обновлению

### 1. Подготовка

1. Сделайте резервные копии важных данных.
2. Обновите текущую систему и перезагрузитесь:

```bash
sudo apt update # обновить список пакетов
sudo apt upgrade # обновить пакеты без удаления
sudo apt full-upgrade # установить все обновления, может удалить устаревшее
sudo reboot # перезагрузить систему
```

3. Отключите сторонние репозитории, оставив только официальные.

### 2. Обновление списка репозиториев

Измените `/etc/apt/sources.list`, заменив `bookworm` на `trixie`:

```text
deb http://deb.debian.org/debian trixie main contrib non-free
deb http://security.debian.org/debian-security trixie-security main contrib non-free
deb http://deb.debian.org/debian trixie-updates main contrib non-free
```

Проверьте также файлы в `/etc/apt/sources.list.d/`.

::: warning
Следующая команда заменит `bookworm` на `trixie` во всех файлах источников. Перед выполнением создайте резервную копию.
:::

```bash
sudo sed -i 's/bookworm/trixie/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list # заменить название релиза
```

### 3. Обновление индекса пакетов

```bash
sudo apt update # обновить индекс пакетов
```

### 4. Минимальное обновление

```bash
sudo apt upgrade --without-new-pkgs # обновить существующие пакеты без новых зависимостей
```

### 5. Полное обновление

```bash
sudo apt full-upgrade # установить все обновления, включая новые зависимости
```

В процессе могут появиться вопросы по конфигурационным файлам – выберите нужный вариант (сохранить свой или принять новый).

### 6. Очистка и проверка

```bash
sudo apt autoremove --purge # удалить ненужные пакеты
sudo apt --fix-broken install # исправить повреждённые зависимости
sudo dpkg --configure -a # донастроить пакеты
```

### 7. Перезагрузка и проверка версии

```bash
sudo reboot # перезагрузить систему
```

После загрузки убедитесь, что система обновилась:

```bash
lsb_release -a # показать версию Debian
uname -r # вывести версию ядра
```

Ожидаемый результат:

```
Distributor ID: Debian
Description:    Debian GNU/Linux 13 (trixie)
Release:        13
Codename:       trixie

Linux hostname 6.12.0-1-amd64 ...
```

### 8. Возврат сторонних репозиториев

При необходимости снова подключите внешние репозитории, убедившись, что они поддерживают Debian 13.

## Ошибка `lsb_release: command not found`

Если при проверке версии появилось сообщение:

```
-bash: lsb_release: command not found
```

установите пакет `lsb-release`:

```bash
sudo apt update # обновить список пакетов
sudo apt install lsb-release # установить утилиту lsb_release
```

Без установки можно узнать версию через:

```bash
cat /etc/os-release # информация о дистрибутиве
# или
cat /etc/debian_version # номер версии Debian
```

Система обновлена до Debian 13.
