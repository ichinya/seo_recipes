---
title: "Favicon в Google Search: форматы, размеры и диагностика"
description: "Как добавить favicon для результатов Google, открыть его Googlebot-Image, выбрать формат и размер, проверить CDN, robots.txt и обновление иконки"
icon: fa-brands fa-google
category: Google
tag: [Google, SEO, Favicon, Search appearance, Googlebot-Image, HTML, CDN]
---

# Favicon в Google Search: форматы, размеры и диагностика

**28 августа 2026 года** Google обновил документацию по favicon и впервые явно перечислил форматы файлов, поддерживаемые в результатах поиска.

Список форматов:

- BMP;
- GIF;
- ICO;
- PNG;
- JPEG;
- PPM;
- TIFF.

Это уточнение документации, а не запуск новой функции и не расширение списка форматов. Google отдельно сообщил, что фактическая поддержка форматов не изменилась.

Для обычного сайта практичнее использовать PNG или ICO. Наличие PPM и TIFF в техническом списке не делает их оптимальным выбором для браузеров, CMS и CDN.

## Что нужно Google

Чтобы сайт мог получить favicon в органической выдаче:

1. Создайте квадратную иконку.
2. Добавьте `<link>` на favicon в `<head>` главной страницы hostname.
3. Разрешите Googlebot сканировать главную страницу.
4. Разрешите Googlebot-Image получать файл favicon.
5. Оставьте URL иконки стабильным.
6. Дождитесь повторного обхода и обработки.

Даже при соблюдении всех требований Google не гарантирует показ favicon в каждом результате.

## Минимальная HTML-разметка

```html
<head>
  <link rel="icon" href="/favicon.ico">
</head>
```

Google поддерживает следующие значения `rel`:

| Значение | Назначение |
| --- | --- |
| `icon` | основной современный вариант |
| `shortcut icon` | исторический вариант, который продолжает поддерживаться |
| `apple-touch-icon` | иконка для Apple-устройств, которую Google также умеет учитывать |
| `apple-touch-icon-precomposed` | вариант для старых версий iOS |

Для Google достаточно корректного `rel="icon"`. Apple touch icon можно объявить отдельно для устройств, но не нужно заменять им обычный favicon.

Пример с несколькими размерами:

```html
<head>
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
</head>
```

Не публикуйте несколько противоречащих друг другу `rel="icon"`, если не понимаете, какой вариант выберет браузер или crawler. Все объявленные URL должны работать.

## Размер и пропорции

Google требует:

- квадратное соотношение сторон `1:1`;
- минимальный размер `8×8 px`;
- рекомендуемый размер больше `48×48 px`.

Практический вариант для сайта:

```text
favicon.ico      — совместимость с браузерами и старым ПО
favicon-96.png   — основной квадратный PNG
apple-touch-icon — отдельная крупная иконка Apple
```

Иконка в выдаче отображается маленькой. Поэтому она должна сохранять узнаваемость после уменьшения:

- простой силуэт;
- достаточный контраст;
- минимум мелкого текста;
- без тонких декоративных линий;
- без важных деталей у самого края;
- проверка на светлом и тёмном фоне.

Большой исходный файл не исправит неразборчивый дизайн.

## Один favicon на hostname

Google определяет сайт по hostname.

Можно использовать разные favicon:

```text
https://example.com/
https://news.example.com/
```

потому что это разные hostnames.

Нельзя задать отдельный favicon только для подкаталога:

```text
https://example.com/news/
```

В этом случае применяется favicon hostname `example.com`.

Практические следствия:

- разные языки в подкаталогах используют одну иконку;
- отдельный сервис на поддомене может иметь свою иконку;
- multisite в подкаталогах нельзя визуально разделить в Google только через favicon;
- главная страница каждого hostname должна содержать правильный `<link>`.

## Favicon разрешено хранить на CDN

`href` может быть:

- относительным URL;
- абсолютным URL;
- URL другого hostname, например CDN.

Примеры:

```html
<link rel="icon" href="/favicon.ico">
```

```html
<link rel="icon" href="https://cdn.example.net/brand/favicon.png">
```

CDN-вариант подходит, если:

- файл публичный;
- URL стабилен;
- нет временной подписи;
- Googlebot-Image не получает 403 или challenge;
- TLS-сертификат корректен;
- Content-Type соответствует изображению;
- redirect chain не уводит на HTML-страницу;
- правила hotlink protection не блокируют crawler.

Не используйте presigned URL с коротким сроком действия как favicon.

## Доступ Googlebot и Googlebot-Image

Google использует разные crawler roles:

```text
главная страница hostname
    → должна быть доступна Googlebot

файл favicon
    → должен быть доступен Googlebot-Image
```

Проверьте `robots.txt`:

```bash
curl -sS https://example.com/robots.txt
```

Проблемный пример:

```txt
User-agent: Googlebot-Image
Disallow: /
```

Если favicon лежит в каталоге `/assets/`, его может случайно закрыть общее правило:

```txt
User-agent: *
Disallow: /assets/
```

Не открывайте весь служебный каталог автоматически. Лучше разместить favicon по публичному стабильному пути или сделать точное исключение, совместимое с вашей структурой `robots.txt`.

## HTTP-проверка favicon

Базовый тест:

```bash
FAVICON_URL='https://example.com/favicon.ico'

curl -sS -I "$FAVICON_URL"
```

Проверьте:

- HTTP `200`;
- корректный `Content-Type`;
- отсутствие авторизации;
- отсутствие `X-Robots-Tag: noindex` на изображении;
- разумный `Content-Length`;
- отсутствие redirect loop;
- отсутствие HTML challenge от WAF;
- корректный TLS.

Получение файла:

```bash
curl -fsSL "$FAVICON_URL" -o /tmp/favicon
file /tmp/favicon
```

Если сервер возвращает HTML с HTTP 200, браузер иногда может скрыть проблему, но crawler не получает валидное изображение.

## Проверка с User-Agent

Имитация строки User-Agent не подтверждает полный путь Google verification, но помогает найти правила WAF, которые зависят от названия crawler.

```bash
curl -sS -I \
  -A 'Googlebot-Image/1.0' \
  https://example.com/favicon.ico
```

```bash
curl -sS -I \
  -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' \
  https://example.com/
```

Результат для обычного клиента и crawler не должен неожиданно различаться по доступности файла.

Не добавляйте безусловный allow только по User-Agent: эту строку легко подделать. Для строгих исключений используйте официальную проверку адресов Google crawler и минимальные правила доступа.

## Проверить разметку главной страницы

Google читает favicon declaration с главной страницы hostname.

```bash
curl -fsSL https://example.com/ \
  | grep -iE '<link[^>]+rel=["'"']([^"'"']*icon[^"'"']*)["'"']'
```

Проверьте исходный HTML, а не только DOM после выполнения JavaScript.

Разметка должна:

- находиться в `<head>`;
- содержать рабочий `href`;
- использовать правильный hostname;
- не появляться только после client-side hydration;
- не ссылаться на staging или localhost;
- не содержать временный URL.

## Content-Type

Тип зависит от формата:

| Формат | Обычный Content-Type |
| --- | --- |
| ICO | `image/x-icon` или `image/vnd.microsoft.icon` |
| PNG | `image/png` |
| JPEG | `image/jpeg` |
| GIF | `image/gif` |
| BMP | `image/bmp` |
| TIFF | `image/tiff` |

Главное — не возвращать `text/html`, JSON error или download page вместо байтов изображения.

## Nginx

Обычно достаточно стандартного файла `mime.types`.

Пример отдельного публичного пути:

```nginx
location = /favicon.ico {
    access_log off;
    log_not_found off;
    try_files /favicon.ico =404;
    expires 7d;
    add_header Cache-Control "public";
}
```

Не делайте `return 200` без файла. Такой конфиг может вернуть пустой или неправильный ответ и скрыть ошибку мониторинга.

После изменения:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://example.com/favicon.ico
```

## Apache

Файл можно разместить в `DocumentRoot` и проверить MIME mapping.

Пример кеширования:

```apache
<Files "favicon.ico">
    Header set Cache-Control "public, max-age=604800"
</Files>
```

Для директивы `Header` требуется `mod_headers`. Не добавляйте конфигурацию в production без `apachectl configtest`.

## WordPress

В WordPress используйте системную настройку Site Icon, а не только ручное редактирование темы.

После сохранения проверьте:

- какой URL добавлен в `<head>`;
- работает ли он без авторизации;
- не создаёт ли оптимизатор изображений WebP/AVIF URL, который Google не перечисляет среди favicon formats;
- не меняет ли CDN URL при каждом deploy;
- одинаковая ли иконка у canonical hostname;
- не переопределяет ли SEO-плагин или тема favicon второй раз.

Проверка WP-CLI:

```bash
wp option get site_icon
```

Команда возвращает attachment ID, а не готовый URL. Пустое значение может означать, что Site Icon не настроен через WordPress core.

## Laravel

Положите файл в публичный каталог:

```text
public/favicon.ico
public/favicon-96.png
```

В Blade layout:

```blade
<link rel="icon" type="image/png" sizes="96x96"
      href="{{ url('/favicon-96.png') }}">
<link rel="icon" href="{{ url('/favicon.ico') }}">
```

Не пропускайте favicon через приватный controller, signed route или middleware авторизации.

Если `ASSET_URL` указывает на CDN, проверьте итоговый HTML и доступ Googlebot-Image к CDN. Для favicon стабильный публичный URL важнее автоматического content hash при каждой сборке.

## Nuxt 4

Пример в `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '96x96',
          href: '/favicon-96.png',
        },
        {
          rel: 'icon',
          href: '/favicon.ico',
        },
      ],
    },
  },
})
```

Файлы разместите в `public/`.

После production build проверьте серверный HTML через `curl`. Наличие link в client-side DOM после hydration недостаточно для надёжной диагностики.

## VuePress

В конфигурации сайта:

```ts
export default defineUserConfig({
  head: [
    ['link', {
      rel: 'icon',
      type: 'image/png',
      sizes: '96x96',
      href: '/favicon-96.png',
    }],
    ['link', {
      rel: 'icon',
      href: '/favicon.ico',
    }],
  ],
})
```

Проверьте base path. Если сайт публикуется не в корне домена, браузерный URL может работать, но Google всё равно применяет favicon ко всему hostname, а не только к подкаталогу проекта.

## Кеширование и обновление иконки

Google просит не менять URL favicon часто.

Неудачный вариант:

```text
/favicon.a8f912c.png
/favicon.51b92aa.png
/favicon.0ce18fd.png
```

при каждом deploy.

Более предсказуемо:

```text
/favicon.png
```

При обновлении изображения:

1. Замените содержимое по стабильному URL.
2. Очистите CDN cache.
3. Проверьте файл из внешней сети.
4. Убедитесь, что главная страница продолжает ссылаться на него.
5. Запросите повторную индексацию главной страницы в URL Inspection.
6. Дождитесь повторной обработки.

Google указывает, что обновление может занять от нескольких дней до нескольких недель.

Не добавляйте случайный query string при каждом запросе:

```html
<link rel="icon" href="/favicon.png?v=1700000000">
```

Постоянно меняющийся URL мешает стабильности. Контролируемая редкая версия допустима при миграции, но не должна генерироваться динамически.

## Redirects

Один постоянный redirect обычно не является причиной автоматически отказываться от URL, но прямой ответ проще диагностировать и надёжнее эксплуатировать.

Проверьте цепочку:

```bash
curl -sS -L -o /dev/null \
  -w 'code=%{http_code} redirects=%{num_redirects} final=%{url_effective}\n' \
  https://example.com/favicon.ico
```

Проблемные сценарии:

- HTTP → HTTPS → www → CDN → временная ссылка;
- redirect на страницу входа;
- redirect на generic image placeholder;
- цикл между CDN и origin;
- региональный redirect на недоступный hostname.

## Не путать favicon, логотип и site name

Это разные элементы:

| Элемент | Для чего |
| --- | --- |
| Favicon | маленькая иконка рядом с результатом сайта |
| Site name | текстовое имя сайта в выдаче |
| Organization logo | структурированные данные организации и другие поверхности Google |
| Apple touch icon | иконка для устройств Apple |
| Web app manifest icons | иконки установленного web-приложения |

Добавление `Organization.logo` не заменяет `<link rel="icon">`, а favicon не управляет текстовым site name.

## Favicon не является ranking factor

Favicon относится к оформлению результата и распознаванию бренда. Google не заявляет его как фактор повышения позиции.

Корректная цель:

```text
узнаваемость результата
понятное соответствие бренду
техническая доступность иконки
```

Некорректное обещание:

```text
добавьте favicon и получите рост позиций
```

Изменение CTR после обновления можно измерять, но нельзя автоматически приписывать его только иконке без контроля других изменений выдачи.

## Почему Google показывает старую или стандартную иконку

Проверьте по порядку:

1. `<link>` присутствует в исходном HTML главной страницы.
2. `href` разрешается в абсолютный рабочий URL.
3. Файл возвращает HTTP 200 и изображение.
4. Главная доступна Googlebot.
5. Изображение доступно Googlebot-Image.
6. Иконка квадратная и не меньше 8×8.
7. Используется поддерживаемый Google формат.
8. URL не меняется при каждом deploy.
9. CDN/WAF не возвращает challenge.
10. Прошло достаточно времени после повторного обхода.

Если всё выполнено, показ всё равно не гарантирован. Не меняйте файл ежедневно в попытке ускорить обработку.

## Проверка нескольких hostnames

```bash
for host in example.com www.example.com news.example.com; do
  echo "=== $host ==="
  curl -fsSL "https://$host/" \
    | grep -iE '<link[^>]+icon' \
    | head
  echo
done
```

Особенно важно проверить одновременно `www` и non-`www`. Если один hostname redirect-ит на другой, canonical архитектура должна быть понятной и стабильной.

## Monitoring

Favicon редко входит в обычный uptime-monitoring, поэтому ошибка может оставаться незаметной.

Минимальный synthetic check:

```bash
curl -fsS \
  --max-time 10 \
  https://example.com/favicon.ico \
  -o /dev/null
```

Сильнее проверять:

- HTTP status;
- Content-Type;
- минимальный размер ответа;
- checksum ожидаемого файла;
- отсутствие HTML challenge;
- доступ из нескольких сетей;
- разницу между origin и CDN.

Не делайте alert по каждому краткому CDN miss, но отслеживайте длительные 403/404/5xx.

## Checklist

- [ ] На главной странице hostname есть `<link rel="icon">`.
- [ ] `href` ведёт на стабильный публичный URL.
- [ ] Файл возвращает HTTP 200.
- [ ] Content-Type соответствует изображению.
- [ ] Ответ не является HTML challenge или login page.
- [ ] Иконка квадратная.
- [ ] Размер не меньше 8×8; подготовлен качественный вариант больше 48×48.
- [ ] Используется BMP, GIF, ICO, PNG, JPEG, PPM или TIFF.
- [ ] Главная страница доступна Googlebot.
- [ ] Файл доступен Googlebot-Image.
- [ ] CDN, hotlink protection и WAF не блокируют crawler.
- [ ] Нет короткоживущего presigned URL.
- [ ] Поддомены проверены отдельно.
- [ ] Подкаталог не ошибочно считается отдельным сайтом для favicon.
- [ ] URL не меняется при каждом deploy.
- [ ] После изменения проверен cache purge и запрошен повторный обход главной.
- [ ] Учтено, что Google не гарантирует показ favicon.

## Источники

- [Google Search Central: Define a favicon to show in search results](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Google Search Central: обновление документации 28 августа 2026 года](https://developers.google.com/search/updates)
