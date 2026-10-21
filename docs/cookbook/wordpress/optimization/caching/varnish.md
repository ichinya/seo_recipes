---
title: Varnish для WordPress
description: Varnish перед WordPress на nginx — 207 запросов/сек вместо 2,4. VCL для анонимного кэша, обработка PURGE от Breeze, привязка к localhost и подводные камни
icon: fa-solid fa-layer-group
category: Wordpress
tag: [Wordpress, Кэширование, Varnish, Оптимизация, nginx, VCL]
---

# Varnish для WordPress

Varnish — обратный прокси-кэш. Ставится перед сайтом и отдаёт анонимным посетителям страницы прямо из оперативной памяти, не запуская PHP вообще. В моём тесте на живом сайте это дало **207 запросов/сек против 2,4 без кэша** — лучший результат среди всех шести проверенных режимов (подробный обзор — в статье [Кеширование WordPress](./caching.md)).

## Схема

Обычная связка за панелью CloudPanel: клиент → nginx (:443/:80) → Varnish (:6081) → backend nginx (:8080) → PHP-FPM. Varnish принимает только локальные запросы, кэш хранит в ОЗУ (`-s malloc,256m`).

## VCL для WordPress

Главное во всём Varnish — файл VCL. Рабочий минимум для блога:

```vcl
vcl 4.1;
backend default {
    .host = "127.0.0.1";
    .port = "8080";
}

acl purge {
    "localhost";
    "127.0.0.1";
}

sub vcl_recv {
    # Breeze шлёт: URLPURGE — одну страницу, PURGE — весь домен
    if (req.method == "PURGE" || req.method == "URLPURGE") {
        if (req.http.X-Real-IP == "127.0.0.1" || (!req.http.X-Real-IP && client.ip ~ purge)) {
            if (req.method == "URLPURGE") {
                ban("req.http.host == " + req.http.host + " && req.url == " + req.url);
                return (synth(200, "Purged URL"));
            }
            ban("req.http.host == " + req.http.host);
            return (synth(200, "Purged domain"));
        }
        return (synth(405, "Purge not allowed"));
    }
    if (req.method != "GET" && req.method != "HEAD") { return (pass); }
    if (req.http.Authorization) { return (pass); }
    if (req.url ~ "wp-admin|wp-login\.php|xmlrpc\.php|admin-ajax\.php|feed|wp-json") { return (pass); }
    # посетитель с любым cookie — мимо кэша (консервативно, но безопасно)
    if (req.http.Cookie) { return (pass); }
    return (hash);
}
```

**Безопасность PURGE — три условия, без любого из которых правило дырявое:**

1. **nginx обязан перезаписывать `X-Real-IP`**: перед `proxy_pass` на Varnish — `proxy_set_header X-Real-IP $remote_addr;`. Без этого внешний клиент пришлёт свой `X-Real-IP: 127.0.0.1` и очистит весь кэш домена одним запросом.
2. **Вторая ветка условия (`client.ip ~ purge`) — только для прямых локальных вызовов**: mu-plugin Breeze шлёт PURGE напрямую на `127.0.0.1:6081`, минуя nginx, — у такого запроса нет `X-Real-IP`, но и пройти к Varnish снаружи нельзя, если…
3. **Varnish слушает только `127.0.0.1:6081`** (systemd-override, не `0.0.0.0`). Открытый наружу Varnish с этой VCL пропустил бы PURGE от кого угодно: `client.ip` у него — всегда локальный nginx.

Проверено на живой связке: внешний PURGE через nginx получает `405 Purge not allowed`, локальный вызов от mu-plugin — `200 Purged domain`.

```vcl
sub vcl_backend_response {
    if (beresp.http.Set-Cookie) {
        set beresp.uncacheable = true;
        return (deliver);
    }
    if (beresp.status != 200) {
        set beresp.uncacheable = true;
        return (deliver);
    }
    set beresp.ttl = 6h;
    set beresp.grace = 60s;
}

sub vcl_deliver {
    if (obj.hits > 0) { set resp.http.X-Cache = "HIT"; }
    else { set resp.http.X-Cache = "MISS"; }
}
```

Логика: анонимные GET/HEAD кэшируются на 6 часов; всё, что с cookie, авторизацией, уходит в админку или отдаёт `Set-Cookie`, — не кэшируется. Заголовок `X-Cache: HIT|MISS` позволяет контролировать попадания любым curl-ом.

## Подключение очистки при обновлении контента

Varnish сам не знает, что статья обновилась. Варианты:

* **Плагин кэша с интеграцией.** Breeze (и некоторые другие) умеют слать purge при сохранении записей и комментариев. В настройках Breeze указывается адрес Varnish — важно прописать порт, если он нестандартный (у меня `127.0.0.1:6081`), иначе запрос уйдёт на порт 80 и потеряется по пути.
* **Свой mu-plugin.** Десяток строк: на хуки `save_post`, `comment_post`, `wp_set_comment_status` отправлять `PURGE` на Varnish. Надёжнее всего — плагинные интеграции могут молча пропускать срабатывания.
* Остаётся проверить end-to-end: пересохранить запись и убедиться, что следующий запрос получает `X-Cache: MISS`, а не закэшированную копию.

## Подводные камни

* **Сравнение с отсутствующим заголовком.** В VCL проверка `req.http.X-Real-IP == ""` ложна, если заголовка нет вовсе. Для «заголовка может не быть» используется `!req.http.X-Real-IP`.
* **Редирект http→https раньше location-блоков.** Если nginx на уровне сервера перенаправляет весь http на https, purge-запросы на порт 80 до Varnish не долетают. Либо слать purge сразу на порт Varnish, либо брать адрес с https.
* **Varnish за nginx видит client.ip = 127.0.0.1.** Ограничение purge по `client.ip` при такой схеме не защищает от внешних пользователей — проверяйте `X-Real-IP`, который выставляет nginx, и/или слушайте только localhost: `ExecStart=... -a 127.0.0.1:6081`.
* **Кэш в ОЗУ.** Рестарт Varnish сбрасывает кэш целиком — первые посетители после рестарта получают «холодный» рендер.
* **Страницы с экраном согласия.** Если перед контентом стоит обязательный экран, каждый его просмотр — полный рендер: VCL обязан пропускать такие страницы мимо кэша (они ставят cookie). Кэширование в этой ситуации фактически выключено, ускорение из бенчмарков заработает только для страниц без гейта.
* При использовании панели (CloudPanel и аналоги) правки vhost могут затираться при регенерации — храните свой VCL и правки проксирования отдельно, чтобы восстановить.

## Результат

На том же железе и том же сайте: 207 запросов/сек, медиана TTFB 24 мс, 10 % загрузки процессора под нагрузкой, p95 70 мс. Связка с Breeze даёт сопоставимую скорость с более удобной очисткой и лучшим «хвостом» p99 — разбор всех комбинаций в [обзоре кеширования](./caching.md).
