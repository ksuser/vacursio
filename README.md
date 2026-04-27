# Vacursio

Node.js + MongoDB приложение для поиска вакансий, стажировок и курсов.

## Запуск локально

1. Установить MongoDB локально или создать кластер в MongoDB Atlas.
2. Скопировать `.env.example` в `.env` и заполнить `MONGO_URI`.
3. Установить зависимости:
   - `npm install`
4. Запустить:
   - `npm start`
5. Открыть:
   - `http://localhost:3000`

## Что реализовано

- Выпадающий список городов в верхней панели.
- 3 отдельные страницы: вакансии, стажировки, курсы.
- Node.js сервер для связи интерфейса и БД.
- Сохранение результатов API-поиска в MongoDB.
- Выгрузка результатов из MongoDB в интерфейс.
- Отдельный `parser-service` c ретраями и поддержкой прокси.
- Журнал по каждому источнику: `status`, `fetchedCount`, `savedCount`, `error`.
- Ограничения по количеству результатов:
  - вакансии/стажировки: до 60 (до 20 на источник),
  - курсы: до 40 (до 20 на источник).
- Экспорт результатов в `xlsx`.
- Cookie-уведомление и сохранение действий пользователя на 2 суток.

## Источники

- Вакансии/стажировки: `hh.ru`, `rabota.ru`, `avito.ru`.
- Курсы: `stepik.org`, `teachbase.org`.

`stepik.org` подключен через публичный API. Для остальных источников используются:
- официальный API, если переданы ключи в `.env`,
- fallback на реальный web-search feed (без синтетических карточек).

## Переменные окружения для parser-service

- `PARSER_TIMEOUT_MS`, `PARSER_RETRIES`, `PARSER_RETRY_DELAY_MS`
- `PARSER_PROXY_LIST` - список прокси через запятую, формат `http://user:pass@host:port`
- `HH_API_TOKEN`, `HH_API_BASE_URL`
- `AVITO_CLIENT_ID`, `AVITO_CLIENT_SECRET`, `AVITO_API_BASE_URL`
- `RABOTA_API_URL`, `RABOTA_API_KEY`
- `TEACHBASE_API_URL`, `TEACHBASE_API_KEY`

## Бесплатный хостинг (Render)

1. Загрузить репозиторий в GitHub.
2. На [Render](https://render.com/) создать `Web Service` из репозитория.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. В `Environment Variables` задать `MONGO_URI` (например, MongoDB Atlas free tier).
6. После деплоя использовать публичный URL Render.
