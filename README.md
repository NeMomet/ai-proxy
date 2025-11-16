# CodeX AI Proxy

Прокси‑сервис для генерации текста и потоковой выдачи.

URL для использования: `http://llm.codex.so`  
Интерактивная документация: `GET /docs`


## Аутентификация
Для всех API‑методов требуется API‑ключ в заголовке:
- `x-api-key: <ВАШ_API_КЛЮЧ>`

API‑ключ выдаётся администратором сервиса.


## Лимиты
На каждый API‑ключ действует лимит обращений. При превышении вернётся:

```json
{
  "error": "limit exceeded",
  "used": 123,
  "limit": 100
}
```

Коды ошибок:
- 401: отсутствует API‑ключ
- 403: недействительный API‑ключ
- 429: превышен лимит


## Ручки


### POST /generate
- **Назначение**: синхронная генерация текста
- **Заголовки**:
  - `x-api-key: <ключ>`
  - `Content-Type: application/json`
- **Тело запроса**:
  - `prompt` (string, обязательно) — текст запроса/инструкции
- **Ответ 200**:
  ```json
  {
    "text": "Сгенерированный текст"
  }
  ```
- **Ошибки**: `401`, `403`, `429`

Пример:

```bash
curl -X POST "http://localhost:3000/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"prompt":"Напиши приветственное сообщение"}'
```


### POST /stream
- **Назначение**: потоковая генерация текста (NDJSON)
- **Заголовки**:
  - `x-api-key: <ключ>`
  - `Content-Type: application/json`
  - `Accept: application/x-ndjson` (обязательно)
- **Тело запроса**:
  - `prompt` (string, обязательно) — текст запроса/инструкции
- **Ответ 200**: поток NDJSON (`Content-Type: application/x-ndjson; charset=utf-8`) — каждая строка это отдельное JSON‑событие.
- **Ошибки**: `401`, `403`, `429`, `406` (если `Accept` не равен `application/x-ndjson`)

События (строки NDJSON):
- `start` — начало обработки
- `text-start` — начало вывода текста
- `text-delta` — порция сгенерированного текста: `{ "type": "text-delta", "delta": "<текст>" }`
- `text-end` — завершение вывода текста
- `reasoning-start` — начало рассуждений (если поддерживается моделью)
- `reasoning-delta` — порция рассуждений: `{ "type": "reasoning-delta", "delta": "<reasoning>" }`
- `reasoning-end` — завершение рассуждений
- `finish` — завершение обработки

Пример запроса (curl):

```bash
curl -N -X POST "http://localhost:3000/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: application/x-ndjson" \
  -H "x-api-key: $API_KEY" \
  -d '{"prompt":"Поясни, что такое поток NDJSON и как его читать"}'
```

Пример ответа (фрагмент, по одной JSON‑строке на событие):

```json
{"type":"start"}
{"type":"text-start"}
{"type":"text-delta","delta":"Привет! "}
{"type":"text-delta","delta":"NDJSON — это формат, в котором "}
{"type":"text-end"}
{"type":"finish"}
```
