# Деплой: Railway (бэкенд + PostgreSQL) + Vercel (фронтенд)

Vercel раздаёт только статический фронтенд. Бэкенду нужен постоянно работающий процесс
(синк каждую минуту, push-уведомления) и PostgreSQL — это Railway.

```
браузер ──► Vercel (frontend/, SPA) ──► Railway: backend (Docker) ──► Railway: PostgreSQL
                                              └── фоновый синк с kffleague.kz / transfermarkt
```

## 0. Код на GitHub

Railway и Vercel деплоят из Git-репозитория.

```bash
cd qscore
git add .
git commit -m "Qscore"
gh repo create qscore --private --source . --push     # или создайте репозиторий на github.com и сделайте git push
```

Папки `.agents/` и `.claude/` (скиллы) в репозиторий класть не обязательно — добавьте их в `.gitignore`,
если не нужны. Файлы `.env` уже в `.gitignore`, секреты не попадут в Git.

## 1. Railway: база и бэкенд

1. https://railway.com → **New Project** → **Deploy PostgreSQL**. Появится сервис `Postgres`.
2. В том же проекте: **+ Create** → **GitHub Repo** → выберите `qscore`.
3. Откройте новый сервис → **Settings**:
   - **Root Directory**: `/backend` (Railway возьмёт `backend/Dockerfile` и `backend/railway.json`
     с health-check `/api/health`);
   - **Networking** → **Generate Domain** — получите адрес вида `https://qscore-production.up.railway.app`.
4. **Variables** (Raw Editor):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<сгенерируйте, см. ниже>
   CORS_ORIGIN=https://<ваш-проект>.vercel.app
   PUBLIC_URL=https://<ваш-проект>.vercel.app
   TRUST_PROXY=1
   ```

   JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Адрес Vercel пока можно указать примерный и поправить в шаге 3.
   Необязательно: `DEEPL_API_KEY` (английские новости), `TM_SYNC_ENABLED=false` (отключить Transfermarkt).
5. Deploy. При старте контейнер сам применяет миграции, а пустая база за ~1–3 минуты наполняется с kffleague.kz.
   Проверка: `https://<railway-домен>/api/health` → `"ready": true`.

Держите **одну реплику** бэкенда: синк и так защищён блокировкой в БД, но лишние копии ничего не дают.

## 2. Vercel: фронтенд

1. https://vercel.com/new → импортируйте репозиторий `qscore`.
2. **Root Directory**: `frontend`. Framework определится как **Vite** (build `npm run build`, output `dist`).
3. **Environment Variables**:

   ```
   VITE_API_URL=https://<railway-домен>/api
   ```

4. Deploy. `frontend/vercel.json` уже отдаёт `index.html` на все пути, поэтому прямые ссылки вида
   `/match/...` работают.

Переменная `VITE_API_URL` вшивается при сборке: после её изменения нужен **Redeploy**.

## 3. Связать адреса

Если домен Vercel отличается от того, что вы указали на Railway, исправьте `CORS_ORIGIN` и `PUBLIC_URL`
в Railway → Variables (сервис перезапустится сам). Несколько доменов (например, свой домен и `*.vercel.app`)
указываются через запятую в `CORS_ORIGIN`.

## 4. Проверка

- Сайт открывается, на главной есть матчи, страница матча, лиги, команды и игрока загружаются.
- В DevTools → Network нет ошибок CORS.
- Push-уведомления: колокольчик на матче → разрешить. Работает только по HTTPS (Vercel и Railway дают HTTPS).
- E2E-тесты против продакшена (только чтение, плюс тестовый аккаунт, который удаляется сам):

  ```bash
  cd frontend
  E2E_BASE_URL=https://<ваш-проект>.vercel.app E2E_API_URL=https://<railway-домен>/api npx playwright test
  ```

## Частые проблемы

| Симптом | Причина |
| --- | --- |
| На сайте «Ошибка загрузки», в консоли CORS | `CORS_ORIGIN` на Railway не совпадает с адресом сайта (с `https://`, без `/` в конце) |
| Запросы идут на `/api` самого Vercel и получают 404 | не задан `VITE_API_URL` или не сделан Redeploy после его добавления |
| Бэкенд падает при старте: `JWT_SECRET must be ...` | секрет короче 32 символов или скопирован из примера |
| Бэкенд падает: `Can't reach database server` | `DATABASE_URL` не указывает на `${{Postgres.DATABASE_URL}}` |
| Баннер «загружаем данные» не исчезает | смотрите Railway → Deployments → Logs (строки `[sync]`); kffleague.kz может быть временно недоступен |
| Нет рыночной стоимости игроков | Transfermarkt ограничивает запросы с облачных IP; повторная попытка будет через 3 часа |
