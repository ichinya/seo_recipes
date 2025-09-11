---
title: Ошибка "Repository changed its 'Label'" в Ubuntu
icon: fa-brands fa-ubuntu
category: Linux
tag: [Ubuntu, apt, PPA]
---

# Обновление пакетов Ubuntu при изменённом `Label` PPA

Иногда при обновлении системы с подключёнными PPA появляется сообщение:

```
E: Repository 'https://ppa.launchpadcontent.net/ondrej/php/ubuntu noble InRelease' changed its 'Label' value
```

А `apt upgrade` завершается ошибками `404 Not Found`. Это означает, что репозиторий изменил метаданные и требуется повторно
подтвердить доверие.

## Решение

1. Подтвердите новое значение `Label` и обновите список пакетов:

   ```bash
   sudo apt update --allow-releaseinfo-change
   ```

2. После успешного обновления индекса установите пакеты:

   ```bash
   sudo apt upgrade
   ```

Если некоторые пакеты остаются "kept back", выполните:

```bash
sudo apt full-upgrade
```

## Почему это происходит

При обновлении метаданных PPA `apt` требует подтверждения, чтобы избежать подмены источников. Без этого система блокирует
обновление и возвращает ошибки `404` при попытке скачать пакеты.

## Итог

Используйте `sudo apt update --allow-releaseinfo-change` при смене метаданных репозитория, затем запускайте обычное
обновление `sudo apt upgrade`.
