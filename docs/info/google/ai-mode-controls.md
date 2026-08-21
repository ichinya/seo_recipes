---
title: Управление Google AI Mode
description: Практические рецепты robots.txt, noindex, nosnippet, data-nosnippet, X-Robots-Tag и Google-Extended
icon: fa-brands fa-google
category: Google
tag: [Google, AI Mode, robots.txt, noindex, nosnippet, Googlebot, Google-Extended]
---

# Google AI Mode: robots.txt, индексация и управление сниппетами

AI Mode является частью Google Search. Для него нет отдельного robots.txt-токена, который позволял бы оставить страницу в обычном Google и одновременно запретить её только для AI Mode.

Google использует несколько разных механизмов, и каждый решает свою задачу:

| Задача | Инструмент | Что произойдёт |
|---|---|---|
| Не сканировать URL для Google Search | `robots.txt` для Googlebot | Googlebot не загружает содержимое, но URL иногда может остаться в индексе без нормального сниппета |
| Удалить страницу из Google | `noindex` | После повторного сканирования страница исключается из поиска |
| Оставить страницу в поиске, но запретить текстовый сниппет | `nosnippet` | Текст и видео-превью не показываются; содержимое не используется как прямой ввод для AI Overviews и AI Mode |
| Ограничить размер текстового фрагмента | `max-snippet:N` | Google может использовать не более указанного количества символов |
| Исключить отдельный участок страницы | `data-nosnippet` | Выбранный текст не используется в сниппете |
| Задать правила для PDF или другого не-HTML файла | `X-Robots-Tag` | Директивы передаются HTTP-заголовком |
| Ограничить обучение и grounding некоторых AI-систем Google вне Search | `Google-Extended` | Не влияет на включение и ранжирование страницы в Google Search, включая AI Mode |

Материал актуален на 20 августа 2026 года.

## Рецепт 1. Разрешить Google Search и AI Mode

Специальных директив для AI Mode не требуется. Базовый `robots.txt` может выглядеть так:

```text
User-agent: Googlebot
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Если сайт должен индексироваться всеми поисковыми системами, отдельный блок Googlebot обычно не нужен:

```text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

`Allow: /` необязателен, если ниже нет конфликтующих `Disallow`, но явная запись иногда упрощает чтение конфигурации.

Проверьте, что Googlebot также не блокируется:

- CDN;
- WAF;
- антибот-защитой;
- географическими ограничениями;
- обязательной авторизацией;
- правилами rate limiting;
- запретом JavaScript, CSS и изображений, необходимых для отображения страницы.

## Рецепт 2. Запретить сканирование раздела

```text
User-agent: Googlebot
Disallow: /internal-search/
Disallow: /tmp/
```

Это подходит для служебных URL, бесконечных результатов внутреннего поиска и ловушек сканирования. Но `Disallow` не гарантирует удаления URL из индекса: Google может узнать адрес из ссылок и показать его без содержимого страницы.

Для конфиденциальной информации используйте авторизацию и контроль доступа. `robots.txt` является публичным файлом и не защищает данные.

## Рецепт 3. Удалить страницу из Google

HTML:

```html
<meta name="robots" content="noindex">
```

Или только для Google:

```html
<meta name="googlebot" content="noindex">
```

Критически важно разрешить Googlebot загрузить страницу. Ошибочная комбинация:

```text
User-agent: Googlebot
Disallow: /private-report/
```

```html
<meta name="robots" content="noindex">
```

При такой конфигурации Googlebot не увидит `noindex`, поскольку `robots.txt` запрещает загрузку HTML.

Правильная последовательность:

1. Удалить запрет сканирования нужного URL из `robots.txt`.
2. Вернуть страницу с HTTP 200 и `noindex`.
3. Запросить повторное сканирование через URL Inspection, если это важно.
4. Дождаться обработки директивы.
5. Если страницу больше не нужно отдавать пользователям — после исключения из поиска можно вернуть 404/410 или закрыть доступ.

Для срочного временного скрытия можно использовать Removals в Search Console, но это не заменяет постоянный `noindex`, 404/410 или защиту доступа.

## Рецепт 4. Оставить страницу в Google, но запретить текстовый сниппет

```html
<meta name="robots" content="nosnippet">
```

`nosnippet` применяется к обычному веб-поиску, Google Images, Discover, AI Overviews и AI Mode. По документации Google эта директива также запрещает использовать содержимое страницы как прямой ввод для AI Overviews и AI Mode.

При этом URL может оставаться в результатах, а статическая миниатюра изображения в некоторых случаях может показываться.

Используйте `nosnippet`, только если ограничение важнее потенциального падения CTR и видимости. Для большинства публичных статей это слишком жёсткая настройка.

## Рецепт 5. Ограничить объём текста

```html
<meta name="robots" content="max-snippet:160, max-image-preview:large">
```

Специальные значения:

- `max-snippet:0` — эквивалент `nosnippet`;
- `max-snippet:-1` — разрешить Google самостоятельно выбрать длину;
- положительное число — максимальное количество символов текстового сниппета.

Ограничение применяется и к объёму содержимого, которое может использоваться как прямой ввод для AI Overviews и AI Mode. При этом отдельные разрешения, лицензии и переданные structured data могут обрабатываться по своим правилам.

Несколько директив можно объединить:

```html
<meta
  name="robots"
  content="index, follow, max-snippet:240, max-image-preview:large, max-video-preview:30"
>
```

`index` и `follow` являются значениями по умолчанию, поэтому их можно не указывать.

## Рецепт 6. Скрыть из сниппета только часть страницы

```html
<p>
  Эта часть может использоваться в сниппете.
  <span data-nosnippet>А этот фрагмент использовать нельзя.</span>
</p>
```

Для большого блока:

```html
<section data-nosnippet>
  <h2>Служебная информация</h2>
  <p>Этот раздел не должен попадать в поисковый сниппет.</p>
</section>
```

`data-nosnippet` поддерживается для элементов:

- `span`;
- `div`;
- `section`.

Значение атрибута не анализируется: `data-nosnippet="false"` всё равно считается включённым ограничением. Используйте корректно закрытый HTML. Не добавляйте и не удаляйте атрибут поздно через JavaScript: Google может извлечь текст до или после рендеринга.

Подходящие случаи:

- лицензионный фрагмент;
- персонализированная часть страницы;
- цена, которая без контекста быстро устаревает;
- служебная подсказка;
- повторяющийся блок, не описывающий основное содержание.

Не скрывайте таким способом весь полезный текст, если рассчитываете на нормальный сниппет и видимость страницы.

## Рецепт 7. Запретить индексацию PDF через X-Robots-Tag

Для PDF нельзя добавить HTML meta robots, поэтому используется HTTP-заголовок.

### Nginx

```nginx
location ~* \.pdf$ {
    add_header X-Robots-Tag "noindex, nofollow" always;
}
```

### Apache

Требуется модуль `mod_headers`:

```apache
<FilesMatch "\.pdf$">
    Header set X-Robots-Tag "noindex, nofollow"
</FilesMatch>
```

Если нужно ограничить только один файл:

```nginx
location = /files/internal-report.pdf {
    add_header X-Robots-Tag "noindex, nofollow" always;
}
```

Проверка:

```bash
curl -I https://example.com/files/internal-report.pdf
```

Ожидаемый заголовок:

```text
X-Robots-Tag: noindex, nofollow
```

Как и meta robots, `X-Robots-Tag` должен быть доступен роботу. Если PDF запрещён в `robots.txt`, Googlebot может не получить заголовок.

## Рецепт 8. Оставить Google Search, но запретить Google-Extended

```text
User-agent: Google-Extended
Disallow: /
```

Это ограничивает использование содержимого для обучения будущих поколений моделей Gemini и grounding в некоторых продуктах Gemini Apps и Vertex AI.

Директива **не** делает следующее:

- не удаляет страницы из Google Search;
- не запрещает Googlebot сканировать их для Search;
- не исключает страницу из AI Overviews;
- не исключает страницу из AI Mode;
- не снижает и не повышает ранжирование в Search.

`Google-Extended` является отдельным product token для `robots.txt`, а не самостоятельным HTTP user agent, который обязательно будет виден в логах сервера.

Можно совместить правила:

```text
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

## Рецепт 9. WordPress: noindex для выбранной страницы

Для постоянного правила лучше использовать SEO-плагин или собственный код, который добавляет директиву через официальный фильтр `wp_robots`.

```php
<?php

add_filter('wp_robots', static function (array $robots): array {
    if (is_page('private-report')) {
        $robots['noindex'] = true;
        $robots['nofollow'] = true;
    }

    return $robots;
});
```

Код можно разместить в собственном плагине или mu-plugin. Не рекомендуется добавлять служебную логику в тему: при смене темы она исчезнет.

Пример mu-plugin:

`wp-content/mu-plugins/robots-rules.php`

```php
<?php
/**
 * Plugin Name: Site robots rules
 */

declare(strict_types=1);

add_filter('wp_robots', static function (array $robots): array {
    if (is_page(['private-report', 'temporary-offer'])) {
        $robots['noindex'] = true;
        $robots['nofollow'] = true;
    }

    return $robots;
});
```

После установки:

```bash
curl -s https://example.com/private-report/ | grep -i robots
```

Убедитесь, что SEO-плагин не добавляет конфликтующую директиву. При конфликте Google применяет более ограничивающее правило.

## Рецепт 10. WordPress: data-nosnippet для динамического блока

```php
<div class="current-offer" data-nosnippet>
    <?php echo esc_html($temporary_offer); ?>
</div>
```

Атрибут должен присутствовать в исходном или корректно отрендеренном DOM. Для повторно используемого блока лучше предусмотреть эту настройку в шаблоне или render callback, а не добавлять её скриптом после загрузки.

## Как проверить конфигурацию

### robots.txt

```bash
curl -s https://example.com/robots.txt
```

Проверьте:

- файл доступен по корню хоста;
- сервер возвращает ожидаемый HTTP-код;
- нет случайного `Disallow: /`;
- правила отличаются для `www` и без `www`, если используются разные хосты;
- staging-директивы не попали в production.

### HTTP-заголовки

```bash
curl -I https://example.com/page/
```

Ищите:

- HTTP-код;
- `X-Robots-Tag`;
- редиректы;
- canonical через HTTP, если используется;
- блокировки CDN/WAF.

### HTML

```bash
curl -sL https://example.com/page/ \
  | grep -Ei 'robots|googlebot|data-nosnippet|canonical'
```

`curl` не выполняет JavaScript. Для JavaScript-сайта дополнительно используйте URL Inspection и просмотрите HTML, который получил Googlebot после рендеринга.

### Search Console

1. Откройте URL Inspection.
2. Проверьте доступность URL для Google.
3. Посмотрите полученный HTML.
4. Убедитесь, что видны meta robots и нужный текст.
5. После изменения запросите повторное сканирование.
6. Дождитесь обработки: изменение может применяться не мгновенно.

## Частые ошибки

### Disallow одновременно с noindex

Googlebot не загружает страницу и не видит `noindex`. Если цель — удалить URL из поиска, разрешите сканирование до обработки директивы.

### Попытка закрыть секретные данные robots.txt

`robots.txt` публичен, а другие роботы могут его игнорировать. Используйте авторизацию, сетевые ограничения и корректные права доступа.

### Google-Extended как запрет AI Mode

Это разные контуры. Для AI Mode в Search действуют Googlebot и preview controls.

### nofollow без необходимости

Для удаления страницы обычно достаточно `noindex`. `nofollow` дополнительно запрещает использовать ссылки страницы для обнаружения других URL и нужен не всегда.

### data-nosnippet на неподдерживаемом элементе

Атрибут на произвольном custom element может не сработать. Оберните содержимое в `span`, `div` или `section`.

### Конфликт нескольких правил

Если одновременно указаны `max-snippet:160` и `nosnippet`, применяется более ограничивающий `nosnippet`. Проверяйте настройки темы, CMS, SEO-плагина и HTTP-заголовков вместе.

### Ожидание мгновенного результата

Google должен повторно просканировать и обработать страницу. Это может занять от нескольких дней до более длительного периода в зависимости от частоты обновления URL.

## Связанные материалы

- [Google AI Mode: как адаптировать сайт без AI-SEO мифов](./ai-mode.md)
- [Search Console в 2026 году](./search-console-2026.md)

## Официальные источники

- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Robots meta tag, data-nosnippet и X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Блокировка индексации через noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Правила robots.txt](https://developers.google.com/crawling/docs/robots-txt/useful-robots-txt-rules)
- [Google crawlers и Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Управление сниппетами](https://developers.google.com/search/docs/appearance/snippet)
