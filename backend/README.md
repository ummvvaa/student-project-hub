# 🔌 Backend API Documentation

Express.js REST API для управления студенческими проектами.

**Base URL:** `http://localhost:4000/api`  
**Environment:** Node.js 20+, TypeScript 5+, Express 4.19+

---

## 📖 Содержание

1. [Authentication](#authentication)
2. [Projects](#projects)
3. [Teams](#teams)
4. [Tasks](#tasks)
5. [Reviews](#reviews)
6. [Gamification & Profile](#gamification--profile)
7. [AI Roadmap](#ai-roadmap)
8. [Recommendations](#recommendations)
9. [Calendar Import (ICS)](#calendar-import-ics)
10. [Error Handling](#error-handling)

---

## Authentication

### POST /api/auth/register
Регистрация нового пользователя.

**Request Body:**
```json
{
  "fullName": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "securePassword123",
  "role": "STUDENT",
  "skills": "React,TypeScript,Node.js"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "fullName": "Иван Иванов",
    "email": "ivan@example.com",
    "role": "STUDENT",
    "skills": ["React", "TypeScript", "Node.js"],
    "points": 0,
    "badges": [],
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

**Errors:**
- `400` — Email уже зарегистрирован или валидация не прошла
- `500` — Ошибка сервера

---

### POST /api/auth/login
Вход существующего пользователя.

**Request Body:**
```json
{
  "email": "ivan@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { /* User object */ }
}
```

**Errors:**
- `400` — Invalid credentials
- `401` — Email or password incorrect

---

### GET /api/auth/me
Получить текущего пользователя (требует авторизацию).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": { /* User object */ }
}
```

**Errors:**
- `401` — Token expired or invalid

---

## Projects

### GET /api/projects
Список проектов (фильтруется по ролям).

**Query Parameters:**
```
?status=ACTIVE          # Фильтр по статусу (ACTIVE, COMPLETED, ARCHIVED)
?search=Название       # Поиск по названию
?skip=0&take=10        # Пагинация
```

**Response (200):**
```json
{
  "projects": [
    {
      "id": "proj-uuid",
      "title": "Мобильное приложение",
      "description": "iOS приложение для управления задачами",
      "deadline": "2026-06-30T23:59:59Z",
      "status": "ACTIVE",
      "createdById": "user-uuid",
      "requiredSkills": ["Swift", "iOS"],
      "createdAt": "2026-05-01T10:00:00Z",
      "_count": {
        "teams": 2
      }
    }
  ]
}
```

**Логика по ролям:**
- **STUDENT** — только ACTIVE проекты
- **TEACHER** — только свои проекты (createdById)
- **ADMIN** — все проекты

---

### GET /api/projects/:id
Детали проекта (с командами и участниками).

**Response (200):**
```json
{
  "project": {
    "id": "proj-uuid",
    "title": "Мобильное приложение",
    "description": "...",
    "deadline": "2026-06-30T23:59:59Z",
    "status": "ACTIVE",
    "createdById": "user-uuid",
    "requiredSkills": ["Swift", "iOS"],
    "teams": [
      {
        "id": "team-uuid",
        "name": "Team A",
        "leaderId": "user-uuid",
        "inviteCode": "ABC12345",
        "members": [
          {
            "userId": "user-uuid",
            "teamId": "team-uuid",
            "joinedAt": "2026-05-02T10:00:00Z",
            "user": {
              "id": "user-uuid",
              "fullName": "Иван Иванов",
              "email": "ivan@example.com",
              "skills": ["Swift", "iOS"]
            }
          }
        ],
        "_count": {
          "tasks": 5
        }
      }
    ]
  }
}
```

**Errors:**
- `404` — Проект не найден
- `401` — Not authenticated

---

### POST /api/projects
Создать новый проект (только TEACHER/ADMIN).

**Request Body:**
```json
{
  "title": "Мобильное приложение",
  "description": "iOS приложение для управления задачами",
  "deadline": "2026-06-30T23:59:59Z",
  "requiredSkills": ["Swift", "iOS", "Firebase"]
}
```

**Response (201):**
```json
{
  "project": { /* Project object */ }
}
```

**Errors:**
- `400` — Валидация не прошла
- `403` — Недостаточно прав (только TEACHER/ADMIN)

---

### PATCH /api/projects/:id
Обновить проект (только creator или ADMIN).

**Request Body:**
```json
{
  "title": "Новое название",
  "description": "Обновленное описание",
  "status": "COMPLETED",
  "requiredSkills": ["Swift", "iOS"]
}
```

**Response (200):**
```json
{
  "project": { /* Updated project */ }
}
```

**При переходе в COMPLETED:**
- Все участники команд получают +20 очков
- Проверяются бейджи PROJECT_DONE

**Errors:**
- `404` — Проект не найден
- `403` — Недостаточно прав
- `409` — Конфликт данных

---

### DELETE /api/projects/:id
Удалить проект (только creator или ADMIN).

**Response (204):** Успешное удаление без содержимого

**Errors:**
- `404` — Проект не найден
- `403` — Недостаточно прав

---

## Teams

### POST /api/projects/:projectId/teams
Создать команду в проекте (только STUDENT, проект должен быть ACTIVE).

**Request Body:**
```json
{
  "name": "Team A"
}
```

**Response (201):**
```json
{
  "team": {
    "id": "team-uuid",
    "name": "Team A",
    "projectId": "proj-uuid",
    "leaderId": "current-user-id",
    "inviteCode": "ABC12345",
    "createdAt": "2026-05-03T10:00:00Z",
    "members": [
      {
        "userId": "current-user-id",
        "teamId": "team-uuid",
        "joinedAt": "2026-05-03T10:00:00Z",
        "user": { /* User object */ }
      }
    ]
  }
}
```

**Errors:**
- `400` — Студент уже в команде для этого проекта
- `400` — Проект не ACTIVE
- `404` — Проект не найден

---

### GET /api/teams/:id
Получить детали команды (с участниками и задачами).

**Response (200):**
```json
{
  "team": {
    "id": "team-uuid",
    "name": "Team A",
    "projectId": "proj-uuid",
    "leaderId": "user-uuid",
    "inviteCode": "ABC12345",
    "project": {
      "id": "proj-uuid",
      "title": "...",
      "status": "ACTIVE",
      "deadline": "2026-06-30T23:59:59Z"
    },
    "members": [ /* Array of TeamMember */ ],
    "tasks": [
      {
        "id": "task-uuid",
        "title": "API integration",
        "description": "...",
        "status": "IN_PROGRESS",
        "deadline": "2026-05-10T23:59:59Z",
        "assigneeId": "user-uuid",
        "completedAt": null,
        "wasOnTime": null,
        "createdAt": "2026-05-03T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/teams/join
Вступить в команду по коду приглашения (только STUDENT).

**Request Body:**
```json
{
  "inviteCode": "ABC12345"
}
```

**Response (200):**
```json
{
  "team": { /* Team object */ }
}
```

**Errors:**
- `404` — Код приглашения неверный
- `409` — Студент уже в команде для этого проекта
- `400` — Проект не ACTIVE

---

### DELETE /api/teams/:id/members/me
Покинуть команду (нельзя лидеру).

**Response (204):** Success

**Errors:**
- `400` — Лидер не может покинуть команду
- `404` — Команда не найдена

---

### DELETE /api/teams/:id/members/:userId
Исключить участника из команды (только лидер).

**Response (204):** Success

**Errors:**
- `403` — Недостаточно прав (только лидер)
- `404` — Участник не найден

---

## Tasks

### POST /api/teams/:teamId/tasks
Создать задачу в команде (только участник).

**Request Body:**
```json
{
  "title": "API integration",
  "description": "Интегрировать REST API с фронтендом",
  "deadline": "2026-05-10T23:59:59Z",
  "assigneeId": "user-uuid",
  "status": "TODO"
}
```

**Response (201):**
```json
{
  "task": {
    "id": "task-uuid",
    "teamId": "team-uuid",
    "title": "API integration",
    "description": "...",
    "status": "TODO",
    "deadline": "2026-05-10T23:59:59Z",
    "assigneeId": "user-uuid",
    "completedAt": null,
    "wasOnTime": null,
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

**Errors:**
- `403` — Недостаточно прав (только участник)
- `404` — Команда не найдена

---

### GET /api/teams/:teamId/tasks
Получить список задач команды (только участник).

**Response (200):**
```json
{
  "tasks": [ /* Array of Task */ ]
}
```

---

### PATCH /api/tasks/:id
Обновить задачу (любой участник команды).

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "deadline": "2026-05-10T23:59:59Z",
  "assigneeId": "user-uuid"
}
```

**Response (200):**
```json
{
  "task": { /* Updated task */ },
  "pointsDelta": 10,
  "newBadges": ["FIRST_TASK"]
}
```

**Автоматически при переходе в DONE:**
- Заполняются `completedAt = now()`
- Вычисляется `wasOnTime = completedAt <= deadline`
- Начисляются очки: +10 (в срок) или +5 (с опозданием)
- Проверяются бейджи

**Errors:**
- `404` — Задача не найдена
- `403` — Недостаточно прав

---

### DELETE /api/tasks/:id
Удалить задачу (только лидер или creator проекта).

**Response (204):** Success

---

## Reviews

### POST /api/projects/:projectId/reviews
Оставить рецензию на студента (требует быть в одной команде).

**Request Body:**
```json
{
  "targetUserId": "user-uuid",
  "score": 5,
  "comment": "Отлично выполнил задачу, внимателен к деталям"
}
```

**Response (201):**
```json
{
  "review": {
    "id": "review-uuid",
    "projectId": "proj-uuid",
    "reviewerId": "current-user-id",
    "targetUserId": "user-uuid",
    "score": 5,
    "comment": "...",
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

**При рецензии:**
- Целевому студенту начисляется +score×2 очков
- Проверяется бейдж TEAM_PLAYER (avg ≥4.0 при ≥3 рецензиях)

**Errors:**
- `400` — Рецензер и целевой в разных командах
- `404` — Проект или пользователь не найден
- `409` — Рецензия уже существует

---

### GET /api/projects/:projectId/reviews
Получить агрегированную статистику рецензий (только creator проекта).

**Response (200):**
```json
{
  "reviews": [
    {
      "user": {
        "id": "user-uuid",
        "fullName": "Иван Иванов"
      },
      "averageScore": 4.5,
      "count": 3,
      "comments": ["Отличная работа", "Хороший результат"]
    }
  ]
}
```

**Ключевая деталь:** Имена рецензентов скрыты для объективности.

---

### GET /api/projects/:projectId/reviews/mine
Получить свои рецензии в проекте.

**Response (200):**
```json
{
  "reviews": [
    {
      "id": "review-uuid",
      "targetUser": {
        "id": "user-uuid",
        "fullName": "Иван Иванов"
      },
      "score": 5,
      "comment": "..."
    }
  ]
}
```

---

## Gamification & Profile

### GET /api/users/me/profile
Получить профиль текущего пользователя со статистикой.

**Response (200):**
```json
{
  "user": {
    "id": "user-uuid",
    "fullName": "Иван Иванов",
    "email": "ivan@example.com",
    "role": "STUDENT",
    "skills": ["React", "TypeScript"],
    "points": 125,
    "badges": ["FIRST_TASK", "ON_FIRE"],
    "createdAt": "2026-05-01T10:00:00Z"
  },
  "stats": {
    "closedTasks": 15,
    "averageReview": 4.2,
    "reviewCount": 5
  }
}
```

**Бейджи:**
- 🎯 **FIRST_TASK** — закрыта минимум 1 задача
- 🔥 **ON_FIRE** — последние 5 задач закрыты в срок подряд
- 🤝 **TEAM_PLAYER** — средняя рецензия ≥4.0 при ≥3 рецензиях
- 🏆 **PROJECT_DONE** — участник команды в завершённом проекте

---

## AI Roadmap

### POST /api/projects/:projectId/ai-roadmap
Сгенерировать план разработки через Google Gemini (требует быть в команде или TEACHER).

**Request Body:**
```json
{
  "regenerate": false
}
```

**Response (200):**
```json
{
  "roadmap": {
    "id": "roadmap-uuid",
    "projectId": "proj-uuid",
    "generatedSteps": [
      {
        "title": "Дизайн и архитектура",
        "description": "Создать макеты экранов и определить структуру БД",
        "estimatedDays": 5
      },
      {
        "title": "Backend разработка",
        "description": "Реализовать API endpoints",
        "estimatedDays": 10
      }
    ],
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

**Ограничения:**
- Требует GEMINI_API_KEY в .env
- Rate-limit 15 запросов в минуту
- Максимум 1 роадмап на проект (upsert)

**Errors:**
- `502` — Gemini API rate limit или ошибка
- `401` — Недостаточно прав
- `404` — Проект не найден

---

### GET /api/projects/:projectId/ai-roadmap
Получить последний сгенерированный план.

**Response (200):**
```json
{
  "roadmap": { /* AIRoadmap object */ }
}
```

**Errors:**
- `404` — План не найден

---

### POST /api/projects/:projectId/ai-roadmap/import
Импортировать шаги плана в задачи команды.

**Request Body:**
```json
{
  "teamId": "team-uuid",
  "steps": [
    {
      "title": "Дизайн и архитектура",
      "description": "Создать макеты экранов",
      "estimatedDays": 5
    }
  ],
  "startDate": "2026-05-05T00:00:00Z"
}
```

**Response (200):**
```json
{
  "imported": 2,
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Дизайн и архитектура",
      "deadline": "2026-05-10T23:59:59Z",
      "status": "TODO"
    }
  ]
}
```

**Дедлайны накопительные:**
- Шаг 1: startDate + 5 дней
- Шаг 2: startDate + 5+10=15 дней
- И т.д.

---

## Recommendations

### GET /api/recommendations/projects
Получить рекомендованные проекты по навыкам (только STUDENT).

**Response (200):**
```json
{
  "recommendations": [
    {
      "project": {
        "id": "proj-uuid",
        "title": "Мобильное приложение",
        "description": "...",
        "requiredSkills": ["Swift", "iOS"]
      },
      "score": 0.8,
      "matchedSkills": ["Swift", "iOS"]
    }
  ]
}
```

**Алгоритм:** Jaccard similarity между `user.skills` и `project.requiredSkills`.  
**Фильтр:** Только проекты с score > 0, топ-10.

---

### GET /api/recommendations/projects/:projectId/students
Получить рекомендованных студентов для проекта (только creator).

**Response (200):**
```json
{
  "suggestions": [
    {
      "user": {
        "id": "user-uuid",
        "fullName": "Иван Иванов",
        "email": "ivan@example.com",
        "skills": ["Swift", "iOS", "Firebase"],
        "points": 150
      },
      "score": 0.9,
      "matchedSkills": ["Swift", "iOS"],
      "activeTeamCount": 1,
      "adjustedScore": 0.85
    }
  ]
}
```

**Алгоритм:** 
```
Jaccard(userSkills, projectSkills) - (0.05 × activeTeamCount)
```
Штраф за уже занятые команды (busyness penalty).  
**Сортировка:** По adjustedScore, топ-15.

---

## Calendar Import (ICS)

### POST /api/projects/:projectId/import-ics
Загрузить .ics файл календаря (только TEACHER/ADMIN, `multipart/form-data`).

**Request:**
```
Content-Type: multipart/form-data
file: <.ics file>
```

**Response (200):**
```json
{
  "events": [
    {
      "uid": "event-id@calendar.google.com",
      "title": "Final presentation",
      "description": "Submit final project presentation",
      "start": "2026-06-15T18:00:00Z",
      "end": "2026-06-15T20:00:00Z"
    }
  ]
}
```

**Ограничения:**
- Файл должен быть .ics
- Максимум 1 МБ
- Минимум 1 событие

**Errors:**
- `400` — Файл повреждён или формат неверный
- `413` — Файл слишком большой
- `404` — Проект не найден

---

### POST /api/projects/:projectId/import-ics/confirm
Подтвердить импорт и создать задачи (только creator).

**Request Body:**
```json
{
  "teamId": "team-uuid",
  "events": [
    {
      "uid": "event-id@calendar.google.com",
      "title": "Final presentation",
      "description": "...",
      "start": "2026-06-15T18:00:00Z"
    }
  ]
}
```

**Response (201):**
```json
{
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Final presentation",
      "description": "...",
      "deadline": "2026-06-15T18:00:00Z",
      "status": "TODO"
    }
  ]
}
```

**Логика:**
- Дедлайн задачи = start события
- Создаётся за одну транзакцию (all-or-nothing)

---

## Error Handling

### Стандартный формат ошибок

```json
{
  "error": "Описание ошибки на русском"
}
```

### HTTP статус-коды

| Код | Ошибка | Причина |
|-----|--------|---------|
| 400 | Bad Request | Валидация, неверный параметр, file не .ics |
| 401 | Unauthorized | Token отсутствует или истёк |
| 403 | Forbidden | Недостаточно прав (роль, членство в команде) |
| 404 | Not Found | Ресурс не найден (P2025) |
| 409 | Conflict | Конфликт данных (duplicate email, unique constraint) |
| 500 | Internal Server Error | Неожиданная ошибка сервера |
| 502 | Bad Gateway | Ошибка external API (Gemini rate limit) |

### Примеры ошибок

**Неверные credentials:**
```json
{
  "error": "Invalid email or password"
}
```

**Уже зарегистрирован:**
```json
{
  "error": "Email already exists"
}
```

**Не авторизован:**
```json
{
  "error": "Unauthorized"
}
```

**Недостаточно прав:**
```json
{
  "error": "Forbidden: insufficient permissions"
}
```

---

## Authentication

Все защищённые endpoints требуют заголовок:
```
Authorization: Bearer <token>
```

Токен выдаётся при регистрации/входе и действует 7 дней.

---

## Rate Limiting

- Gemini API: 15 req/min (встроено в Google SDK)
- Остальные endpoints: не ограничены (можно добавить)

---

## CORS

Включён для `localhost:3000` (фронтенд).

---

## Контакты

Для вопросов о API обратитесь к документации в PROGRESS.md или defence-cheatsheet.md.
