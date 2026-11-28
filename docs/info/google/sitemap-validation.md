---
title: Google — проверка Sitemap и Sitemap Index
description: Локальная проверка XML, вложенных индексов, URL и доступности
icon: fa-solid fa-sitemap
category: Google
tag: [Google, SEO, Sitemap, XML]
---

# Валидация Sitemap

[Обновление документации 27 ноября 2026](https://developers.google.com/search/updates) перенесло старые действующие рекомендации: вложенные sitemap index не поддерживаются, HTML-карта не является отправляемой в Search Console картой. Это не новые ограничения.

Используйте XML urlset или поддерживаемые форматы, а для больших наборов — один или несколько отдельных sitemap index, непосредственно перечисляющих карты. Один XML-файл: до 50 000 URL (или карт в index) и до 50 МБ без сжатия. URL абсолютные, предпочитаемые canonical, предназначенные для индексирования. См. [официальные правила](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps) и [создание Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Локальный валидатор XML

Python 3, только доверенные локальные XML, без сетевых запросов и распаковки. Для gzip предварительно распакуйте с ограничением размера. Передайте корневой файл и, если это index, сопоставление URL дочерних карт с локальными файлами. Проверяются namespace, тип корня, лимиты, абсолютные HTTP(S) URL, повторы и вложенность. Не является полной XSD-валидацией.

```python
import sys
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
LIMIT = 50 * 1024 * 1024
def read(path):
    with open(path, "rb") as f:
        data = f.read(LIMIT + 1)
    if len(data) > LIMIT or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("size or unsupported XML declaration")
    root = ET.fromstring(data)
    kinds = {NS+"urlset": NS+"url", NS+"sitemapindex": NS+"sitemap"}
    if root.tag not in kinds:
        raise ValueError("unsupported root/namespace")
    entries = list(root)
    if not 1 <= len(entries) <= 50000:
        raise ValueError("entry count")
    urls = []
    for entry in entries:
        loc = entry.findall(NS+"loc")
        if entry.tag != kinds[root.tag] or len(loc) != 1:
            raise ValueError("invalid entry")
        url = (loc[0].text or "").strip()
        u = urlsplit(url)
        if u.scheme not in ("http", "https") or not u.hostname or u.fragment or u.username or u.password or any(c.isspace() for c in url):
            raise ValueError("invalid URL: "+url)
        urls.append(url)
    if len(set(urls)) != len(urls):
        raise ValueError("duplicate URL")
    return root.tag, urls

kind, urls = read(sys.argv[1])
mapping = dict(arg.split("=", 1) for arg in sys.argv[2:])
if kind == NS+"sitemapindex":
    if set(mapping) != set(urls):
        raise ValueError("provide each child as URL=local-file")
    seen = set()
    for url in urls:
        child_kind, pages = read(mapping[url])
        if child_kind != NS+"urlset":
            raise ValueError("nested index: "+url)
        if seen.intersection(pages):
            raise ValueError("duplicate across maps")
        seen.update(pages)
    print("OK", len(seen), "pages")
else:
    print("OK", len(urls), "pages")
```

Сохраните как validate_sitemap.py; вызов: python3 validate_sitemap.py sitemap.xml либо python3 validate_sitemap.py index.xml 'https://example.com/pages.xml=pages.xml'. Используйте отдельные фикстуры: корректная карта, HTML вместо XML, вложенный индекс, повтор URL, отсутствующий loc.

## Проверка опубликованных URL

Для небольшого заранее утверждённого списка собственных URL выполните GET с ограничением частоты и тайм-аутом:

```bash
while IFS= read -r url; do
  curl -sS --max-time 15 -o /dev/null -w '%{http_code} %{url_effective}\n' "$url" || exit 1
  sleep 1
done < approved-urls.txt
```

Не подавайте произвольные URL из непроверенной карты в сетевой сканер. Проверяйте 200, отсутствие soft 404, noindex и блокировок; сравнивайте HTML/HTTP canonical с URL карты, при необходимости используйте rendered DOM. Для cross-site sitemap и путей учитывайте правила владения и области действия Google. Исключайте редиректы и удалённые страницы; проверяйте lastmod на соответствие значимому изменению. Отправьте XML в подтверждённое свойство Search Console, проверьте отчёт Sitemaps; принятие не гарантирует индексацию.

Связано: [404/410](./404-410-soft-404.md). Проверка реального сайта не выполнялась.
