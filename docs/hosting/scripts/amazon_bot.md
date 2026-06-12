---
title: Блокирование бота Amazon
icon: fa-brands fa-amazon
category: Поисковые боты
tag: [боты, AmazonBot, Amazon]
---

# Блокировка бота Amazon

## Для чего

Причина блокировки бота довольно простая - большая нагрузка на сайт. У меня небольшой сайт на движке Wiki, посещаемость тоже небольшая. Поэтому и хостинг один из самых дешевых.

Вот и выходило, что посещяемость сайта 100 человек в день, а бот одномоментно создавал 5к-10к посещений. Из-за этого хостер присылал предупреждение, что высокая нагрузка на сервер.

## robots.txt

Обычный UserAgent у бота:

`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)`

Настройка ботов осуществляется в файле `robots.txt`. Но в данном случае техподдержка Amazon пишет:

    AmazonBot does not support the crawl-delay directive in robots.txt

То есть бот не поддерживает данные дерективы из robots.txt, а блокировать ip не получится, так как они постоянно меняются.

## Решение

Мы будем блокировать бота через файл `.htaccess`. Поэтому добавляем в файл:

```apacheconf
#Блокировка User-Agent "Amazonbot"
SetEnvIfNoCase User-Agent "Amazonbot" bad_bot

<Limit GET POST HEAD> 
Order Allow,Deny 
Allow from all
Deny from env=bad_bot
</Limit>
```

В начале проверяем сайт без блокировки:

<SiteInfo name="Мой блог" url="https://ichiblog.ru" preview="/preview_site/ichiblog.ru.png" />

```shell
ichi@pc:$ curl -LI ichiblog.ru -A Amazonbot
HTTP/1.1 200 OK
```

А теперь с блокировкой:

```shell
ichi@pc:$ curl -LI ichiblog.ru -A Amazonbot
HTTP/1.1 403 Forbidden
```

Учитывайте что бот не будет иметь больше доступа к Вашему сайту. Для некоторых это критично.
