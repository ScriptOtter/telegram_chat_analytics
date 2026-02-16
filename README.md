# TELEGRAM ANAKYTICS BOT

## 1. Запуск проекта

### Как склонировать

Склонируйте репозиторий с помощью Git:

```bash
git clone https://github.com/ScriptOtter/telegram_chat_analytics.git
```
### Настройка .env

Создайте файл .env в корне проекта и заполните его следующими переменными:
```text
NODE_ENV="production"

WEB_PORT=3000

SERVER_PORT=4000

TELEGRAM_BOT_TOKEN=

GEMINI_API_KEY=

DATABASE_URL=postgresql://telegram:telegram@postgres:5432/telegram

REDIS_PASSWORD=redis_pass

REDIS_CACHE_TIME=1200
```
### Запуск

Сначала запустите Docker Compose для развертывания контейнеров:

```bash
docker-compose up --build
```
Теперь ваше приложение доступно по адресу web:[http://localhost:3000](http://localhost:3000), bot:[http://localhost:4000](http://localhost:4000).

Запуск тестов
```bash
npm run test:watch
```
## 2. Архитектура

Проект состоит из следующих основных компонентов:

- **Backend**: Node.js (TypeScript), Telegraf работа с Telegram API, Express для работы с API, pg для базы данных, @google/genai интеграции с Google AI, cors, ioredis, vitest.
- **Frontend**: Next.js
- **Кэширование**: Redis для кэширования данных и повышения производительности.
