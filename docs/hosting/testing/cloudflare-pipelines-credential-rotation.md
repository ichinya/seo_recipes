---
title: Cloudflare Pipelines — ротация credentials Sink
description: Замена ключей R2 Sink без пересоздания, обновление Pipeline и проверка доставки событий
icon: fa-solid fa-key
category: Хостинг
tag: [Cloudflare, Pipelines, R2, Analytics, Security]
---

# Ротация credentials Cloudflare Pipelines Sink

Проверено 27 ноября 2026 года по [анонсу от 25 ноября](https://developers.cloudflare.com/changelog/post/2026-11-25-update-sink-credentials-and-pipelines/). Теперь credentials существующего Sink можно заменить. Связанные Pipelines продолжают использовать прежние credentials до собственного обновления; обновление failed pipeline автоматически перезапускает его. Это не гарантия доставки без пропусков или дублей.

## Подготовка

Используйте отдельные тестовые Stream, Sink и R2 destination. Перечислите все Pipelines, использующие Sink, сохраните их конфигурацию без секретов, статусы и baseline задержки. Создайте новый ключ с минимальными разрешениями на нужный destination. Для управляющего API необходим токен с Basin Pipelines Edit. Не смешивайте управляющий токен с R2 access key. Старый ключ при штатной ротации держите действующим до проверки всех зависимостей; при компрометации приоритет — немедленное прекращение доступа, с отдельным планом восстановления доставки.

## Порядок изменения

В Dashboard откройте Sink → Destination → Update credentials. Затем для каждого зависимого Pipeline выберите Update pipeline. Проверьте итоговые статусы.

Документированный API: PATCH /client/v4/accounts/{account_id}/pipelines/v1/sinks/{sink_id}, затем POST /client/v4/accounts/{account_id}/pipelines/v1/pipelines/{pipeline_id}/update_tables для каждого зависимого pipeline. Ниже пример только для R2 Sink, Bash + curl + jq. Запускайте по отдельности после согласования изменения, в изолированной среде. Не используйте set -x. Переменные секретов передайте из защищённого secret manager; не вставляйте значения в историю shell. curl читает авторизацию и JSON через stdin, секреты не попадают в аргументы команд.

```bash
set -euo pipefail
: "${ACCOUNT_ID:?}" "${SINK_ID:?}" "${CLOUDFLARE_API_TOKEN:?}"
: "${R2_ACCESS_KEY_ID:?}" "${R2_SECRET_ACCESS_KEY:?}"
BASE="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pipelines/v1"
# jq получает credentials из окружения, не из аргументов.
export R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
jq -n '{config:{credentials:{access_key_id:env.R2_ACCESS_KEY_ID,secret_access_key:env.R2_SECRET_ACCESS_KEY}}}' |
  curl -fsS --max-time 30 --request PATCH "$BASE/sinks/$SINK_ID" \
    --header @<(printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN") \
    --header 'Content-Type: application/json' --data-binary @- |
  jq -e '.success == true'
unset R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
```

Только после подтверждения Sink, для каждого заранее проверенного PIPELINE_ID:

```bash
set -euo pipefail
: "${ACCOUNT_ID:?}" "${PIPELINE_ID:?}" "${CLOUDFLARE_API_TOKEN:?}"
BASE="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pipelines/v1"
curl -fsS --max-time 30 --request POST "$BASE/pipelines/$PIPELINE_ID/update_tables" \
  --header @<(printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN") |
  jq -e '.success == true'
```

При неясном ответе остановитесь и проверьте состояние в Dashboard; не выполняйте слепые повторы. HTTP 200 и success не заменяют контроль фактической доставки.

## Проверка целостности

До изменения, между PATCH и обновлением каждого Pipeline, после обновления отправьте небольшие партии синтетических событий с уникальными event_id, run_id, фазой и временем UTC. Используйте штатный разрешённый producer. Сохраните точный список успешно принятых event_id; неоднозначные ответы producer учитывайте отдельно. Дождитесь согласованного срока доставки с учётом batching. Экспортируйте из тестового destination только записи данного run_id в observed.jsonl; expected.jsonl содержит успешно принятые события. Оба файла содержат по одному JSON-объекту на строку с event_id и payload. Пример проверки без доступа к облаку:

```python
import json
from collections import Counter
from pathlib import Path

def rows(path):
    return [json.loads(s) for s in Path(path).read_text().splitlines() if s.strip()]

expected, observed = rows("expected.jsonl"), rows("observed.jsonl")
e = Counter(x["event_id"] for x in expected)
o = Counter(x["event_id"] for x in observed)
assert expected and all(n == 1 for n in e.values()), "Invalid baseline"
payload = {x["event_id"]: x["payload"] for x in expected}
missing = sorted(e.keys() - o.keys())
unexpected = sorted(o.keys() - e.keys())
duplicates = {k:v for k,v in o.items() if v > 1}
corrupt = sorted({x["event_id"] for x in observed
                  if x["event_id"] in payload and x["payload"] != payload[x["event_id"]]})
print(json.dumps(dict(missing=missing, unexpected=unexpected,
                      duplicates=duplicates, corrupt=corrupt)))
raise SystemExit(bool(missing or unexpected or duplicates or corrupt))
```

Сравнение требует одинаковой нормализации payload до и после трансформаций. Проверяйте задержку каждой фазы отдельно; не объявляйте потерю до истечения согласованного окна и исключения задержки экспорта. Повторные доставки могут быть допустимы в архитектуре at-least-once, но должны учитываться или дедуплицироваться в аналитике; не заявляйте exactly-once без гарантии поставщика и теста.

## Критерии и откат

Все зависимые Pipelines обновлены, статусы штатные, тестовые события доставлены, payload совпадает, задержка не выходит за согласованный предел, неожиданные дубли отсутствуют или обработаны. Только после этого отозвать прежний ключ при штатной ротации. Если проверка провалена, сохранить очередь и исходные данные; при допустимости вернуть прежние действующие credentials и снова обновить все Pipelines. Не возвращать скомпрометированный ключ. Проверить повторную доставку с дедупликацией.

Связано с [issue #226 — AI Bot Analytics](https://github.com/ichinya/seo_recipes/issues/226), но не реализует полный анализатор. Источник: [Cloudflare Pipelines Sink credentials](https://developers.cloudflare.com/changelog/post/2026-11-25-update-sink-credentials-and-pipelines/). Живые изменения Sink, ключей и Pipelines не выполнялись.
