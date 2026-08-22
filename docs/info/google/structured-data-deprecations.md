---
title: Устаревшие structured data features Google — что удалить, а что оставить
description: Какие типы разметки больше не дают специальные результаты Google, как отличать Schema.org от Google Search features и как провести аудит JSON-LD на сайте
icon: fa-brands fa-google
category: Google
tag: [Google, Schema.org, structured data, JSON-LD, rich results, SEO]
---

# Устаревшие structured data features Google — что удалить, а что оставить

Structured data и Google rich results — не одно и то же.

Schema.org описывает сущности и свойства. Google Search поддерживает только часть этой разметки для специальных search features.

Поэтому ситуация:

```text
Google больше не показывает rich result
```

не всегда означает:

```text
Schema.org-разметка стала невалидной и ее нужно удалить
```

## Что Google перестал поддерживать как специальные Search features

В 2025–2026 годах Google последовательно упростил набор специальных результатов.

К важным снятым/сворачиваемым Search features относятся:

- Book Actions;
- Course Info;
- Claim Review;
- Estimated Salary;
- Learning Video;
- Special Announcement;
- Vehicle Listing;
- FAQ rich results — прекращены с 7 мая 2026 года.

Нужно различать даты отключения самого отображения, удаления отчетов Search Console и удаления документации: это происходило не всегда одновременно.

## Что означает deprecation

Например, сайт продолжает публиковать:

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Курс"
}
```

Тип `Course` не перестает существовать в Schema.org только потому, что Google отказался от конкретного Course Info display.

Вопрос для владельца сайта должен быть таким:

> Нужна ли эта разметка другим потребителям данных или она существует исключительно ради Google rich result, которого уже нет?

## Когда разметку можно оставить

Оставлять имеет смысл, если она:

- корректно описывает видимый контент;
- используется собственным frontend/backend;
- нужна другим поисковым системам или data consumers;
- помогает внутреннему knowledge graph;
- генерируется без заметной сложности и ошибок;
- не создает конфликтующей/ложной информации.

## Когда стоит удалить или упростить

Удаление разумно, если:

- код существует только ради снятого Google feature;
- CMS/plugin генерирует большой и сложный JSON-LD без пользы;
- данные расходятся с видимым контентом;
- старый plugin мешает поддерживать актуальную разметку;
- deprecated block продолжает вызывать ложные ожидания у редакторов;
- документация проекта обещает rich result, которого Google уже не показывает.

## FAQ rich results

Google прекратил показывать FAQ rich results 7 мая 2026 года.

Это не означает, что FAQ-секции на страницах бесполезны.

Можно оставить обычный FAQ-контент, если он реально помогает пользователю.

Но не стоит:

- добавлять FAQ только ради звездочек/расширенного сниппета;
- обещать клиенту FAQ rich result в Google;
- массово генерировать искусственные вопросы ради SERP display.

Если `FAQPage` используется только ради старого Google display, можно оценить, нужна ли разметка дальше.

## Course Info

Google убрал специальный Course Info display.

Проверьте:

- plugins LMS;
- шаблоны образовательных сайтов;
- старые SEO plugins;
- документацию, где обещан course rich result.

Обычная сущность `Course` при этом может оставаться полезной как Schema.org metadata.

## Estimated Salary

Отдельный display больше не поддерживается Google Search.

Проверить стоит:

- сайты вакансий;
- salary calculators;
- job boards;
- старые схемы `Occupation` / compensation metadata.

Не удаляйте полезные salary data из видимого контента только потому, что исчез специальный SERP feature.

## Learning Video

Если образовательный видеосайт размечал видео специально под Learning Video display, нужно убрать из внутренних SEO-checklists обещание этого результата.

Но обычная Video structured data может по-прежнему иметь отдельные поддерживаемые сценарии. Не следует удалять всю video-разметку вместе с одним deprecated feature.

## Special Announcement

Разметка `SpecialAnnouncement` появилась как специальный формат для чрезвычайных/особых объявлений.

Если она сохранилась в старом шаблоне после конкретной кампании или события, это хороший повод проверить:

- актуальность текста;
- даты;
- URL;
- генерацию JSON-LD;
- необходимость самого блока.

## Vehicle Listing

Автомобильным каталогам нужно отдельно проверить разметку, plugins и документацию, которая обещает Google Vehicle Listing display.

Данные о транспортных средствах могут быть нужны сайту, но конкретный Google Search feature снят.

## Claim Review

Важно не путать снятие Search feature с общим утверждением, что `ClaimReview` никому не нужен.

Если проект использует структурированные fact-check данные для собственных API/архивов, решение нужно принимать отдельно.

## Book Actions

Сайты книг и издателей должны проверить старые интеграции, которые создавались именно ради Book Actions Google.

Не следует автоматически удалять `Book`, `Person`, `Organization` и другие обычные сущности из-за прекращения одного display.

## Аудит: найти JSON-LD вручную

Быстрая проверка одной страницы:

```bash
curl -s https://example.com/page/ \
  | grep -o '<script[^>]*application/ld+json[^>]*>.*</script>'
```

Для сложного HTML лучше использовать parser, а не regex.

## Аудит через DevTools

В консоли браузера:

```js
[...document.querySelectorAll('script[type="application/ld+json"]')]
  .map(el => {
    try {
      return JSON.parse(el.textContent)
    } catch (e) {
      return { error: String(e), raw: el.textContent }
    }
  })
```

Так можно быстро увидеть, что реально генерирует CMS после всех plugins/hooks.

## Python: собрать @type со страницы

```python
import json
import requests
from bs4 import BeautifulSoup

url = "https://example.com/"
html = requests.get(url, timeout=20).text
soup = BeautifulSoup(html, "html.parser")

for node in soup.select('script[type="application/ld+json"]'):
    try:
        data = json.loads(node.string or node.get_text())
    except Exception as exc:
        print("invalid JSON-LD:", exc)
        continue

    items = data if isinstance(data, list) else [data]
    for item in items:
        if isinstance(item, dict):
            print(item.get("@type"), item.get("name"))
```

Установить зависимости:

```bash
python -m pip install requests beautifulsoup4
```

## Рекурсивный поиск @type

JSON-LD часто содержит `@graph`, поэтому простой `item.get('@type')` недостаточен.

```python
def walk(value):
    if isinstance(value, dict):
        if "@type" in value:
            print(value["@type"])
        for child in value.values():
            walk(child)
    elif isinstance(value, list):
        for child in value:
            walk(child)
```

Такой обход позволяет найти вложенные типы.

## Список deprecated Google features для аудита

```python
DEPRECATED_GOOGLE_FEATURE_TYPES = {
    "Course",          # проверять контекст: сам Schema.org type не deprecated
    "SpecialAnnouncement",
    "ClaimReview",
    "FAQPage",
}
```

Этот набор нельзя использовать как автоматический список «удалить».

Например `Course` может быть нормальной semantic entity, хотя Course Info display Google снят.

Поэтому скрипт должен выдавать:

```text
review required
```

а не автоматически модифицировать сайт.

## Аудит WordPress

На WordPress разметку могут одновременно генерировать:

- тема;
- SEO plugin;
- WooCommerce;
- LMS plugin;
- review plugin;
- custom snippets;
- page builder.

Проверяйте итоговый HTML, а не только настройки одного plugin.

Типовая проблема:

```text
тема → Article
SEO plugin → Article
review plugin → Review
LMS → Course
custom code → Course
```

В результате возникают дубли или конфликтующие сущности.

## Что проверить после отключения plugin feature

1. Открыть исходный HTML.
2. Проверить итоговый JSON-LD.
3. Убедиться, что не исчезла другая нужная разметка.
4. Проверить Search Console.
5. Проверить Rich Results Test для все еще поддерживаемых features.
6. Не ожидать теста для уже снятого display.

## Rich Results Test — не общий Schema.org validator

Rich Results Test отвечает на вопрос:

> Подходит ли разметка под поддерживаемые Google rich results?

Он не является универсальным валидатором всей Schema.org vocabulary.

Для общей semantic-разметки нужны отдельные validators/tools.

## Search Console и старые reports

После снятия Search features Google также постепенно удалял связанные Search Console reports, appearance filters и поддержку в инструментах.

Если старый dashboard или BigQuery query ожидает deprecated search appearance field, он может начать получать `NULL` или потерять поле/отчет.

Это особенно важно для длительных BI-запросов, где раньше использовалась логика вроде:

```sql
WHERE NOT is_old_feature
```

При `NULL` такое условие может неожиданно исключать строки.

Более безопасный подход для nullable boolean:

```sql
WHERE is_old_feature IS NOT TRUE
```

Конкретные поля нужно сверять с текущей схемой Search Console export/API.

## Инвентаризация документации проекта

Ищите не только JSON-LD, но и тексты:

```bash
grep -RniE \
  'FAQ rich|Course Info|Estimated Salary|Learning Video|Special Announcement|Vehicle Listing|Claim Review|Book Actions' \
  docs/ src/ templates/
```

Часто главная проблема — не код, а устаревшее обещание:

> «Добавьте такую разметку и получите расширенный результат Google».

## Правильная таблица решений

| Ситуация | Что делать |
| --- | --- |
| Feature Google снят, разметка нужна другим системам | Оставить, обновить документацию |
| Feature снят, разметка никому не нужна | Удалить/упростить |
| Разметка конфликтует с видимым контентом | Исправить независимо от deprecation |
| Plugin обещает старый rich result | Обновить plugin/config/docs |
| Тип Schema.org существует, но Google его не показывает | Не называть тип «невалидным» |
| Старый Search Console dashboard зависит от feature | Обновить отчеты/queries |

## Чек-лист аудита

- [ ] Собрать все `application/ld+json` blocks.
- [ ] Извлечь все `@type`, включая `@graph`.
- [ ] Найти deprecated Google Search features.
- [ ] Понять, кто генерирует каждый block.
- [ ] Проверить, нужен ли тип вне Google Search.
- [ ] Проверить соответствие видимому контенту.
- [ ] Убрать из документации обещания снятых rich results.
- [ ] Проверить Search Console reports/dashboards.
- [ ] Проверить BigQuery/API queries на deprecated appearance fields.
- [ ] После изменений повторно проверить итоговый HTML.

## Источники

- [Google Search — Simplifying the search results page](https://developers.google.com/search/blog/2025/06/simplifying-search-results)
- [Google Search documentation updates](https://developers.google.com/search/updates)
- [Google structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Schema.org](https://schema.org/)
