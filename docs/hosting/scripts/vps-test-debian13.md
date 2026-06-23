---
title: Тест VPS на Debian 13
description: Готовый bash-скрипт для сбора информации о VPS и базовых тестов сети, диска, CPU и памяти
icon: fa-solid fa-vial
category: Linux
tag: [Debian, VPS, Тестирование, iperf3, fio, sysbench]
---

# Тест VPS на Debian 13

Для повторяемой проверки VPS можно использовать готовый скрипт `vps-test-debian13.sh`. Он сначала спрашивает, нужно ли установить пакеты для тестов, затем собирает информацию о сервере и запускает только те проверки, для которых есть нужные утилиты.

Если часть пакетов не установлена и вы отказались от установки, скрипт не падает: например, без `fio` пропустит тест диска, без `iperf3` пропустит сетевые проверки iperf3.

## Быстрый запуск

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh)
```

Вариант через `curl`:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh)
```

## Более осторожный запуск

Так можно сначала скачать и посмотреть скрипт:

```bash
wget -O vps-test-debian13.sh https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh
less vps-test-debian13.sh
bash vps-test-debian13.sh
```

## Режимы запуска

Установить пакеты без вопроса:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh) --install
```

Не устанавливать пакеты и использовать только уже доступные команды:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh) --no-install
```

Быстрый режим с меньшим временем тестов и файлом `fio` на 512 МБ:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh) --quick
```

## Что делает скрипт

Скрипт собирает:

- дату запуска, ОС, ядро, hostname и публичный IPv4;
- CPU через `lscpu`, память через `free`, диски через `df` и `lsblk`;
- сетевые интерфейсы и маршруты через `ip`;
- доступность утилит `iperf3`, `ping`, `mtr`, `tracepath`, `fio`, `sysbench`.

Тесты:

- публичный прогон `iperf3` через [itdoginfo/russian-iperf3-servers](https://github.com/itdoginfo/russian-iperf3-servers);
- ручные `iperf3`-проверки до Москвы, Нижнего Новгорода и Тюмени в прямом и обратном направлении;
- международные `iperf3`-проверки по публичному списку [iperf.fr](https://iperf.fr/iperf-servers.php): France / Paris, Netherlands / Serverius и USA / California;
- `ping`, `mtr` и `tracepath` до нескольких внешних точек;
- последовательный и случайный диск через `fio`;
- CPU и память через `sysbench`.

Полный лог сохраняется в каталог:

```text
~/vps-test/YYYY-mm-dd_HH-MM-SS/vps-test.log
```

В конце скрипт печатает короткую сводку: ОС, ядро, CPU, RAM, диск, публичный IP, параметры тестов и путь к полному логу.

## Настройка длительности

По умолчанию длинные тесты идут по 30 секунд, размер файла для `fio` - 1 ГБ, число потоков `iperf3` - 5.

Можно переопределить параметры через переменные окружения:

```bash
VPS_TEST_RUNTIME=60 VPS_TEST_FIO_SIZE=2G VPS_TEST_IPERF_PARALLEL=8 \
  bash <(wget -qO- https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/vps-test-debian13.sh)
```

Для очень маленького VPS лучше начать с `--quick`.

## Что сохранить для обзора

Для заметки по провайдеру полезно взять из лога:

- блок `Short summary for provider review`;
- таблицу из `itdoginfo/russian-iperf3-servers`;
- международный блок `Network: international iperf3 checks`;
- итоговые строки `iperf3` с `sender` / `receiver`;
- `fio`-строки с bandwidth, IOPS и latency;
- `sysbench`-значения `events per second` и total time.

Связанная методика ручных тестов описана в разделе [Тестирование](../testing/).
