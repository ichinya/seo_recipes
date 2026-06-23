---
title: Тестирование
description: Практические проверки VPS и хостинга перед переносом проекта
index: true
icon: fa-solid fa-vial
category: Хостинг
tag: [Хостинг, VPS, Тестирование, iperf3]
---

# Тестирование

Перед переносом сайта или сервиса на новый VPS полезно сделать короткий практический тест. Рекламная скорость порта и чужие отзывы не показывают, как сервер будет работать именно для нужной задачи, региона и времени суток.

Минимальный набор проверок:

- сеть: `iperf3`, `ping`, `mtr` или `tracepath`;
- диск: последовательное и случайное чтение/запись через `fio`;
- CPU и память: короткий `sysbench` или другой понятный бенчмарк;
- панель: reinstall, reboot, rescue-режим, снапшоты и бэкапы;
- поддержка: простой вопрос до переноса рабочего проекта.

Для Debian 13 есть готовый скрипт: [Тест VPS на Debian 13](../scripts/vps-test-debian13.md). Он спрашивает про установку пакетов, собирает информацию о сервере и пропускает тесты, если нужной утилиты нет.

## Готовый набор команд

Команды ниже можно выполнить на VPS и сохранить вывод. Для сравнения провайдеров лучше запускать их в одинаковых условиях: новый сервер, та же ОС, похожее время суток и без параллельной нагрузки.

Подготовка пакетов:

```bash
sudo apt update
sudo apt install -y iperf3 mtr-tiny iputils-ping iputils-tracepath fio sysbench wget jq
mkdir -p ~/vps-test
```

Информация о сервере:

```bash
date -Is
uname -a
lscpu
free -h
df -h
```

Сеть через публичные `iperf3`-серверы:

```bash
iperf3 -c st.nn.ertelecom.ru -p 5202 -t 30
iperf3 -c st.nn.ertelecom.ru -p 5202 -P 5 -t 30
iperf3 -c st.nn.ertelecom.ru -p 5202 -P 5 -t 30 -R

iperf3 -c tumst.st.mtsws.net -p 3333 -t 30
iperf3 -c tumst.st.mtsws.net -p 3333 -P 5 -t 30
iperf3 -c tumst.st.mtsws.net -p 3333 -P 5 -t 30 -R

iperf3 -c mskst.st.mtsws.net -p 3333 -P 5 -t 30
iperf3 -c mskst.st.mtsws.net -p 3333 -P 5 -t 30 -R
```

Быстрый прогон по публичному списку [itdoginfo/russian-iperf3-servers](https://github.com/itdoginfo/russian-iperf3-servers):

```bash
wget -O ~/vps-test/russian-iperf3-speedtest.sh https://github.com/itdoginfo/russian-iperf3-servers/raw/main/speedtest.sh
bash ~/vps-test/russian-iperf3-speedtest.sh -f
```

Задержка, потери и маршрут:

```bash
ping -c 20 st.nn.ertelecom.ru
mtr -rwzc 100 st.nn.ertelecom.ru
tracepath st.nn.ertelecom.ru

ping -c 20 mskst.st.mtsws.net
mtr -rwzc 100 mskst.st.mtsws.net
tracepath mskst.st.mtsws.net
```

Диск:

```bash
fio --name=seq-write --filename=$HOME/vps-test/seq-write.test --size=1G --rw=write --bs=1M --iodepth=16 --direct=1 --runtime=60 --time_based --group_reporting
fio --name=seq-read --filename=$HOME/vps-test/seq-write.test --rw=read --bs=1M --iodepth=16 --direct=1 --runtime=60 --time_based --group_reporting
fio --name=rand-rw --filename=$HOME/vps-test/rand-rw.test --size=1G --rw=randrw --rwmixread=70 --bs=4k --iodepth=32 --direct=1 --runtime=60 --time_based --group_reporting
```

CPU и память:

```bash
sysbench cpu --cpu-max-prime=20000 --threads=1 run
sysbench cpu --cpu-max-prime=20000 --threads=$(nproc) run
sysbench memory --threads=$(nproc) run
```

## Что смотреть в результатах

`date`, `uname`, `lscpu`, `free` и `df` нужны не для оценки скорости, а для контекста: чтобы потом было понятно, какой сервер, ОС, CPU, память и диск тестировались.

`iperf3` проверяет пропускную способность между VPS и внешним тестовым сервером. Обычный запуск показывает направление от VPS к публичному серверу, `-R` проверяет обратное направление, а `-P 5` запускает несколько TCP-потоков. В выводе стоит смотреть не только на итоговый `Bitrate`, но и на `Retr`: большое число ретрансмитов может указывать на потери, перегруженный маршрут, проблемы конкретного тестового сервера или особенности TCP-настройки.

`ping`, `mtr` и `tracepath` помогают понять задержку, потери и маршрут до тестовой точки. Если `iperf3` показывает плохую скорость, эти команды помогают отличить слабый канал от проблемного маршрута.

`fio` показывает поведение диска. Последовательные тесты полезны для крупных файлов и бэкапов, а `rand-rw` ближе к нагрузке сайтов, баз данных и CMS с большим числом мелких операций.

`sysbench` дает грубую оценку CPU и памяти. Это не полноценный серверный бенчмарк, но его достаточно, чтобы сравнить несколько VPS между собой при одинаковых настройках.

## Публичные серверы iperf3

Для российских направлений удобно использовать список [itdoginfo/russian-iperf3-servers](https://github.com/itdoginfo/russian-iperf3-servers). В репозитории собраны публичные `iperf3`-серверы в России, список хранится в `list.yml`, а доступность проверяется автоматически.

На странице проекта есть готовый скрипт:

```bash
bash <(wget -qO- https://github.com/itdoginfo/russian-iperf3-servers/raw/main/speedtest.sh)
```

И быстрый режим:

```bash
bash <(wget -qO- https://github.com/itdoginfo/russian-iperf3-servers/raw/main/speedtest.sh) -f
```

Перед запуском удаленного shell-скрипта лучше открыть его и быстро просмотреть. Более осторожный вариант:

```bash
wget -O speedtest.sh https://github.com/itdoginfo/russian-iperf3-servers/raw/main/speedtest.sh
less speedtest.sh
bash speedtest.sh -f
```

Список полезен не как абсолютный рейтинг провайдеров, а как набор внешних точек для проверки маршрутов. Если один город или оператор показывает плохой результат, стоит перепроверить другие города, обратное направление `-R`, задержку через `ping` и трассировку маршрута.

## Как фиксировать результат

Для заметки по провайдеру достаточно записать:

- тариф, город и заявленную скорость порта;
- дату и примерное время теста;
- команду `iperf3`, сервер, порт, число потоков и длительность;
- итоговый `Bitrate` и число ретрансмитов;
- отдельно результат прямого направления и `-R`;
- вывод: это похоже на лимит тарифа, перегруженный маршрут или разовую проблему.

Такой формат проще сравнивать между провайдерами и повторять через несколько недель.
