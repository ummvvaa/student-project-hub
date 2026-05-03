# 🎓 Student Project Hub (SPHub)

Веб-платформа управления студенческими проектами с геймификацией, AI-планированием и интеллектуальной рекомендацией состава команды.

> 📋 **Дипломный проект** — реализация концепции цифровой платформы для координации студенческих проектов с применением современных технологий (AI, рекомендательные системы, интеграции с календарём).

---

## 🏗️ Архитектура

### 3-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│  Next.js 14 (React) | Tailwind CSS | TypeScript | Drag-and-drop │
│  (http://localhost:3000)                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST (axios)
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                     Application Layer                            │
│  Express.js | TypeScript | JWT | Zod Validation                │
│  Controllers (auth, projects, teams, tasks, reviews)            │
│  Services (gamification, Gemini AI, skill matching)             │
│  Middleware (auth, rate limiting, error handling)               │
│  (http://localhost:4000/api)                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Prisma ORM
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                     Data Layer                                   │
│  PostgreSQL 16 | Docker | Transactions | Indexes                │
│  Tables: Users, Projects, Teams, Tasks, Reviews, etc.           │
│  (postgres://localhost:5433)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Стек технологий

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| **Frontend** | Next.js (App Router) | 14.2.35 |
| | React | ^18 |
| | TypeScript | ^5 |
| | Tailwind CSS | ^3.4.1 |
| | Drag-and-drop | @dnd-kit/core ^6.3.1 |
| | HTTP Client | axios ^1.15.2 |
| **Backend** | Node.js | 20+ |
| | Express | ^4.19.2 |
| | TypeScript | ^5.4.5 |
| | ORM | Prisma ^5.14.0 |
| | Validation | Zod ^3.23.8 |
| | JWT | jsonwebtoken ^9.0.2 |
| | AI Integration | @google/generative-ai |
| | Calendar Parse | node-ical |
| **Database** | PostgreSQL | 16 |
| | Driver | @prisma/client ^5.14.0 |
| **DevOps** | Docker | latest |
| | Docker Compose | v2+ |

---

## 🎯 Реализованные модули

### 1. **Academic Sync** — Импорт дедлайнов из .ics календаря
- Загрузка файлов в формате .ics (iCalendar)
- Парсинг событий через `node-ical`
- Создание задач с автоматическими дедлайнами
- **Файл:** `backend/src/routes/ics.routes.ts`

### 2. **Peer Assessment** — Система оценок между студентами
- Студенты оставляют рецензии друг на друга (скор 1-5)
- Агрегированные метрики по проектам
- **Файлы:** 
  - `backend/src/controllers/reviews.controller.ts`
  - `frontend/src/app/(app)/projects/[id]/page.tsx` (таб "Рецензии")

### 3. **Smart Team Builder** — Рекомендация состава через Jaccard similarity
- Расчёт совпадения навыков студентов и требуемых навыков проекта
- Штраф за занятость (студент уже в N командах)
- Топ-15 подходящих кандидатов для создателя проекта
- **Файлы:**
  - `backend/src/utils/jaccard.ts`
  - `backend/src/controllers/recommendations.controller.ts`
  - `frontend/src/components/MatchScoreBar.tsx`

### 4. **AI Roadmap** — Генерация плана разработки через Gemini
- Создание детализированного плана в 5-10 шагов по title + description проекта
- Импорт шагов в задачи команды с накопительными дедлайнами
- **Файлы:**
  - `backend/src/services/gemini.service.ts`
  - `backend/src/controllers/roadmap.controller.ts`
  - `frontend/src/components/AIRoadmapModal.tsx`

### 5. **Gamification** — Система очков и бейджей
- Очки за закрытие задач: +10 в срок, +5 с опозданием
- Очки за качественные рецензии: +2×score
- Бейджи: 🎯 Первая задача, 🔥 В ударе (5 в срок подряд), 🤝 Командный игрок (ревью ≥4.0), 🏆 Проект завершён
- **Файлы:**
  - `backend/src/services/gamification.service.ts`
  - `frontend/src/app/(app)/profile/page.tsx`

---

## 🚀 Быстрый старт

### Требования
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+
- npm или pnpm

### 1️⃣ Запуск базы данных

```bash
docker compose up -d
# Или для включения логов:
docker compose up
```

PostgreSQL будет доступна на `localhost:5433` (user: `dev`, pass: `dev`, db: `sphub`)

### 2️⃣ Инициализация backend

```bash
cd backend
npm install
cp .env.example .env
# Отредактируй .env и установи JWT_SECRET, GEMINI_API_KEY (опционально)
npx prisma migrate dev
npm run dev
```

Backend будет доступен на **http://localhost:4000/api**

### 3️⃣ Инициализация frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL уже установлен в http://localhost:4000/api
npm run dev
```

Frontend будет доступен на **http://localhost:3000**

### 🔐 Первый вход

1. Откройте http://localhost:3000
2. Нажмите "Зарегистрироваться"
3. Заполните форму (выберите роль: STUDENT, TEACHER или ADMIN)
4. После регистрации вы автоматически залогинитесь

**Тестовые учётные данные:**
- Email: `test@example.com`
- Password: `password123`

---

## 🔑 Переменные окружения

### backend/.env
```bash
# БД
DATABASE_URL="postgresql://dev:dev@localhost:5433/sphub"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"

# Сервер
PORT=4000

# AI (Gemini) — опционально, для AI Roadmap
GEMINI_API_KEY="your-gemini-api-key-from-google-ai-studio"
```

### frontend/.env.local
```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 📂 Структура проекта

```
student-project-hub/
├── docker-compose.yml              # PostgreSQL 16 контейнер
├── .gitignore
├── README.md                        # Этот файл
│
├── backend/                         # Express API
│   ├── .env                         # Переменные окружения
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md                    # API документация
│   ├── prisma/
│   │   └── schema.prisma            # Схема БД
│   └── src/
│       ├── server.ts                # Точка входа
│       ├── controllers/             # Бизнес-логика
│       ├── routes/                  # API маршруты
│       ├── middleware/              # Auth, error handling
│       ├── services/                # Gamification, Gemini, Jaccard
│       ├── utils/                   # AppError, JWT, Prisma
│       └── types/                   # TypeScript расширения
│
├── frontend/                        # Next.js приложение
│   ├── .env.local
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts           # Tailwind конфиг с primary color
│   ├── public/
│   │   └── favicon.svg              # Иконка приложения
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # Root layout
│       │   ├── (auth)/              # Страницы входа/регистрации
│       │   └── (app)/               # Защищённые страницы
│       │       ├── dashboard/
│       │       ├── profile/
│       │       ├── projects/
│       │       └── teams/
│       ├── components/              # React компоненты
│       ├── hooks/                   # useAuth, пользовательские хуки
│       ├── lib/                     # Утилиты (axios, auth, badges)
│       └── types/                   # TypeScript интерфейсы
│
└── docs/
    ├── PROGRESS.md                  # История разработки
    ├── database-schema.md           # Описание таблиц
    └── defense-cheatsheet.md        # Шпаргалка для защиты
```

---

## 📊 Основные сущности

### User (Пользователь)
- Роли: STUDENT, TEACHER, ADMIN
- Очки (points) и бейджи (badges)
- Навыки (skills) — строки, разделённые запятой

### Project (Проект)
- Создатель (createdBy)
- Статусы: ACTIVE, COMPLETED, ARCHIVED
- Требуемые навыки (requiredSkills)
- Дедлайн (deadline)

### Team (Команда)
- Лидер (leaderId)
- Код приглашения (inviteCode)
- Участники (TeamMember)
- Задачи (Task)

### Task (Задача)
- Статусы: TODO, IN_PROGRESS, DONE
- Дедлайн (deadline)
- Исполнитель (assigneeId)
- Флаг: выполнена ли в срок (wasOnTime)

### PeerReview (Рецензия)
- Автор → Целевой студент
- Скор (1-5)
- Комментарий

---

## 🎮 Основные фишки

### ✅ Kanban-доска для управления задачами
- Перетаскивание задач между колонками (TODO → IN_PROGRESS → DONE)
- Оптимистичные обновления с rollback на ошибку
- Мобильный горизонтальный скролл

### 🏆 Геймификация
- Очки начисляются за закрытие задач
- Бейджи открываются при достижении целей
- Профиль со статистикой и сеткой бейджей

### 🤖 AI-планирование
- Генерация плана разработки через Google Gemini
- Импорт в задачи с автоматическими дедлайнами

### 📅 Синхронизация с календарём
- Загрузка .ics файлов из Google Calendar, Outlook и т.д.
- Автоматическое создание задач по событиям

### 🎯 Умная рекомендация команды
- Поиск студентов по совпадению навыков (Jaccard similarity)
- Штраф за занятость

### 💬 Peer-review система
- Взаимные оценки между студентами
- Агрегированная статистика для преподавателя

### 🎨 Бордовая фирменная цветовая палитра (#7B1F2A)
- Кастомная тема Tailwind с использованием университетского цвета

---

## 🔐 Безопасность

- JWT токены с сроком действия 7 дней
- Хеширование паролей через bcrypt (cost=10)
- Проверка ролей на всех защищённых маршрутах
- Валидация входных данных через Zod
- CORS включён, ограничено по origin
- SQL-инъекции защищены через Prisma ORM

---

## 📚 Документация

- **[backend/README.md](backend/README.md)** — полный список API endpoints с примерами
- **[docs/PROGRESS.md](docs/PROGRESS.md)** — история разработки по промптам
- **[docs/database-schema.md](docs/database-schema.md)** — описание схемы БД
- **[docs/defense-cheatsheet.md](docs/defense-cheatsheet.md)** — шпаргалка для защиты диплома

---

## 🛠️ Разработка

### Запуск тестов
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Type checking
```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Миграции БД
```bash
cd backend

# Создать новую миграцию
npx prisma migrate dev --name migration_name

# Применить миграции в продакшене
npx prisma migrate deploy
```

---

## 📝 Лицензия

MIT

---

## 👨‍💻 Об авторе

**Студент (ФИ)** — дипломный проект, кафедра \[название\]

Консультант: \[ФИ преподавателя\]

---

## 📸 Скриншоты

### Dashboard
![Dashboard placeholder](https://via.placeholder.com/800x400?text=Dashboard+-+My+Teams+and+Projects)

### Kanban-доска
![Kanban placeholder](https://via.placeholder.com/800x400?text=Kanban+Board+-+Task+Management)

### Профиль с бейджами
![Profile placeholder](https://via.placeholder.com/800x400?text=Profile+-+Points+and+Badges)

### AI Roadmap
![AI Roadmap placeholder](https://via.placeholder.com/800x400?text=AI+Roadmap+Generation)

---

## 🤝 Благодарности

- Google Gemini API за AI-планирование
- Prisma за удобный ORM
- Next.js за современный React фреймворк
- Tailwind CSS за утилитарный подход к стилизации

---

**Made with ❤️ for academic excellence**
