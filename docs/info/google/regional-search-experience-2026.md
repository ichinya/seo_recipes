---
title: "Региональные различия Google Search в 2026 году"
description: "Aggregator units, supplier units, structured data carousels и другие SERP-функции, доступность которых зависит от региона"
icon: fa-brands fa-google
category: SEO
tag: [Google, SEO, SERP, Structured Data, EEA, Türkiye, South Africa, "2026"]
---

# Региональные различия Google Search в 2026 году

**8 сентября 2026 года** Google добавил отдельную документацию о региональных различиях Search experience.

Практический вывод: одинаковый тип сайта и одинаковая structured data не гарантируют одинаковый SERP в разных странах. Некоторые поисковые элементы доступны только в конкретных регионах и для конкретных типов запросов.

## Какие региональные возможности Google документирует

На момент проверки 13 сентября Google перечисляет следующие группы.

| Возможность | Регион | Типы запросов |
| --- | --- | --- |
| Aggregator unit | EEA | hotels, flights, ground transportation, products |
| Supplier unit | EEA | hotels, flights, ground transportation, products |
| Ecosystem carousel | EEA | weather, sports, finance, translate |
| Job sites features | EEA | jobs |
| Places sites features | Türkiye | hotels, local businesses |
| South Africa badge/refinement chip | South Africa | travel, products, car hire, food delivery, ground transportation |
| Structured data carousels | EEA | hotels, local businesses, things to do, products, ground transportation, flights, vacation rentals |
| Structured data carousels | South Africa | hotels, things to do, flights, products, food delivery, car hire, vacation rentals, ground transportation |
| Structured data carousels | Türkiye | hotels, local businesses, vacation rentals |

Список меняется, поэтому эту таблицу стоит считать снимком документации, а не вечным перечнем возможностей.

## Aggregator unit

Aggregator unit предназначен для Vertical Search Services, Comparison Shopping Services, OTA, metasearch и каталогов.

Для EEA Google описывает его для запросов, связанных с:

- отелями;
- авиаперелётами;
- наземным транспортом;
- товарами.

Это отдельный SERP-блок, а не обычный organic result.

Поэтому попадание страницы в классический индекс Google ещё не означает участие в aggregator unit: у этой функции отдельные eligibility и participation requirements.

## Supplier unit

Supplier unit предназначен для прямых поставщиков, а не агрегаторов.

Например, в travel-сценарии важно различать:

```text
OTA / агрегатор
      и
сайт самого отеля / перевозчика
```

Google может показывать их через разные региональные элементы выдачи.

Для SEO-аудита это означает, что конкурентный анализ SERP нужно проводить с учётом типа участника рынка, а не только позиции URL.

## Structured data carousels

Google отдельно документирует региональные structured-data carousels.

В EEA они охватывают, среди прочего:

- hotels;
- local businesses;
- things to do;
- products;
- transportation;
- flights;
- vacation rentals.

Но наличие корректной structured data означает только **eligibility**, а не гарантию показа карусели.

Нельзя формулировать результат теста так:

```text
разметка валидна → карусель обязательно появится
```

Корректнее:

```text
разметка валидна
+ тип сайта подходит
+ функция доступна в регионе
+ Google признал страницу подходящей
→ страница может участвовать в показе
```

## Почему это важно для международного SEO

### Не сравнивайте SERP разных стран как одинаковый продукт

Если SEO-специалист находится в одной стране, а аудит делает для другой, обычный ручной поиск может показать другой набор блоков.

Различаться могут:

- типы SERP features;
- набор участников;
- визуальное расположение результатов;
- возможности агрегаторов и прямых поставщиков;
- наличие refinement chips и carousels.

### Видимость — это не только позиция organic result

Для некоторых вертикалей полезно измерять отдельно:

```text
organic position
regional SERP feature visibility
aggregator/supplier unit participation
rich result eligibility
clicks/impressions in Search Console
```

Одна цифра «позиция 3» не описывает реальную видимость, если над organic results расположен крупный специализированный блок.

## Как проверять сайт

### 1. Определить рынок

Зафиксируйте:

- страну пользователя;
- страну/регион бизнеса;
- язык;
- тип запроса;
- тип сайта: direct supplier, aggregator, marketplace, directory и т. п.

### 2. Проверить документацию конкретной функции

Страница Regional differences — это навигатор. После выбора feature переходите к его отдельной документации и проверяйте eligibility.

### 3. Проверить structured data

Если функция зависит от structured data:

- валидируйте markup;
- проверяйте обязательные свойства;
- сравнивайте данные markup с видимым контентом страницы;
- не добавляйте фиктивные сущности только ради rich result.

### 4. Сравнивать одинаковые условия

Если отслеживается изменение SERP во времени, фиксируйте:

```text
регион
язык
устройство
тип запроса
дату
feature
```

Иначе изменение региона можно ошибочно принять за изменение ранжирования.

## Что добавить в SEO-мониторинг

Для международных проектов имеет смысл хранить таблицу:

| Рынок | Тип запроса | Feature | Страница подходит | Разметка | Фактический показ |
| --- | --- | --- | --- | --- | --- |
| EEA | hotels | Aggregator unit | да/нет | n/a | да/нет |
| EEA | local business | Structured data carousel | да/нет | valid/error | да/нет |
| Türkiye | hotels | Places sites | да/нет | зависит от feature | да/нет |

Так можно отделить техническую готовность сайта от фактической видимости.

## Чек-лист

- [ ] Для проекта определены целевые страны, а не только язык.
- [ ] Проверено, какие Search experiences доступны в каждом рынке.
- [ ] Direct supplier не сравнивается с aggregator как один тип результата.
- [ ] Structured data рассматривается как eligibility, а не гарантия показа.
- [ ] SERP-тесты фиксируют регион и дату.
- [ ] Для важных вертикалей отдельно отслеживаются специализированные блоки.
- [ ] Документация Google перепроверяется при изменении рынка или типа сайта.

## Источники

- [Google Search Central — Regional differences in Search experience](https://developers.google.com/search/docs/appearance/aggregator-features)
- [Google Search Central — September 2026 documentation updates](https://developers.google.com/search/updates)
- [Google Search Central — Aggregator unit](https://developers.google.com/search/docs/appearance/aggregator-unit)
