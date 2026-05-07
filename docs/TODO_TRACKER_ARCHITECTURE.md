# Location Emitter: Master Readiness TODO Tracker Architecture

## Overview

The Master Readiness TODO Tracker is a multi-user, real-time synchronized task management system for the Location Emitter project. It enables team coordination on the 153-item grand readiness checklist with role-based access control (RBAC), filtering, progress tracking, and audit trails.

**Key Features:**
- **Real-time Sync**: WebSocket-based multi-user synchronization
- **Advanced Filtering**: Category, priority, status, and full-text search
- **RBAC**: Three-tier access control (admin, internal, stakeholder)
- **Progress Tracking**: Per-category and overall completion metrics
- **Audit Trail**: Full history of changes with timestamps and attribution
- **Offline-Ready**: Works with cached data when network is unavailable

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Dashboard Page (/dashboard)                               │ │
│  │  ├── TodoFilters (category, priority, status, search)     │ │
│  │  ├── TodoTable (sortable, inline status updates)          │ │
│  │  ├── ProgressStats (category breakdown, overall %)        │ │
│  │  └── Pagination Controls                                  │ │
│  │                                                            │ │
│  │  Hooks & Utilities:                                       │ │
│  │  ├── useTodos (real-time sync + CRUD)                    │ │
│  │  ├── todoClient (REST API calls)                          │ │
│  │  └── WebSocket Listener (todo updates)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↕ (REST + WS)                           │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Express.js + Node.ts)                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  REST API Routes (/api/todos)                             │ │
│  │  ├── GET /todos (with RBAC filtering)                    │ │
│  │  ├── POST /todos (create)                                 │ │
│  │  ├── PATCH /todos/:id (update with optimistic lock)      │ │
│  │  ├── DELETE /todos/:id (soft delete)                     │ │
│  │  ├── GET /todos/:id/history (audit trail)                │ │
│  │  └── GET /todos/stats/progress (metrics)                 │ │
│  │                                                            │ │
│  │  WebSocket Server (/ws)                                  │ │
│  │  ├── On todo:created → broadcast to subscribed clients   │ │
│  │  ├── On todo:updated → broadcast to subscribed clients   │ │
│  │  └── On todo:deleted → broadcast to subscribed clients   │ │
│  │                                                            │ │
│  │  RBAC Middleware                                          │ │
│  │  ├── Permission matrix (admin/internal/stakeholder)      │ │
│  │  ├── Role-based query filtering                          │ │
│  │  └── Field-level access control (internal_notes)         │ │
│  │                                                            │ │
│  │  Auth Middleware                                          │ │
│  │  └── JWT verification & user extraction                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↕ (SQL)                                 │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│           PostgreSQL Database (RDS on AWS)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Tables:                                                   │ │
│  │  ├── todos (id, title, description, category,            │ │
│  │  │     priority, status, owner, internal_notes, ...)      │ │
│  │  ├── users (id, email, name, role)                        │ │
│  │  ├── todo_history (id, todo_id, changed_by,              │ │
│  │  │     change_type, old_values, new_values, ...)         │ │
│  │  └── migrations (name, run_at)                            │ │
│  │                                                            │ │
│  │  Constraints:                                             │ │
│  │  ├── todos.title UNIQUE (seed data immutable)             │ │
│  │  ├── todos.priority CHECK (P0|P1|P2)                     │ │
│  │  ├── todos.status CHECK (todo|in-progress|done)          │ │
│  │  └── Foreign keys for audit trail integrity              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Todos Table

```typescript
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(64) NOT NULL,
  priority VARCHAR(16) NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
  status VARCHAR(32) NOT NULL CHECK (status IN ('todo', 'in-progress', 'done')) DEFAULT 'todo',
  owner UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_todos_category ON todos(category);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_owner ON todos(owner);
```

### Users Table

```typescript
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'internal', 'stakeholder')) DEFAULT 'stakeholder',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Todo History Table (Audit Trail)

```typescript
CREATE TABLE todo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  change_type VARCHAR(32) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  old_values JSONB,
  new_values JSONB NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

CREATE INDEX idx_todo_history_todo_id ON todo_history(todo_id);
CREATE INDEX idx_todo_history_changed_at ON todo_history(changed_at);
```

---

## API Specification

### Authentication

All requests to `/api/*` endpoints require a Bearer token in the `Authorization` header.

```http
Authorization: Bearer <JWT_TOKEN>
```

The JWT must be signed with `JWT_SECRET` and contain:
```json
{
  "id": "user-id-uuid",
  "email": "user@example.com",
  "role": "admin|internal|stakeholder"
}
```

### Endpoints

#### 1. Fetch Todos

**GET** `/api/todos`

Query Parameters:
- `category` (string, optional): Filter by category
- `priority` (string, optional): Comma-separated priorities (P0,P1,P2)
- `status` (string, optional): Comma-separated statuses (todo,in-progress,done)
- `search` (string, optional): Full-text search on title & description
- `limit` (number, default: 50): Pagination limit
- `offset` (number, default: 0): Pagination offset

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Obtain FCC Part 15 certification",
      "description": "Required before commercial sale",
      "category": "Regulatory & RF",
      "priority": "P0",
      "status": "todo",
      "owner": null,
      "internal_notes": null,
      "created_at": "2026-05-07T00:00:00Z",
      "updated_at": "2026-05-07T00:00:00Z",
      "version": 1
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 153
  }
}
```

**RBAC Behavior:**
- `admin` / `internal`: See all todos
- `stakeholder`: See only P0 todos, no `internal_notes`

---

#### 2. Get Single Todo

**GET** `/api/todos/:id`

**Response** (200 OK):
```json
{
  "data": { /* todo object */ }
}
```

---

#### 3. Create Todo

**POST** `/api/todos`

**Required Permission:** `todo:create` (admin, internal)

**Request Body:**
```json
{
  "title": "New TODO",
  "description": "Description",
  "category": "Business",
  "priority": "P1",
  "status": "todo",
  "owner": null,
  "internal_notes": null
}
```

**Response** (201 Created):
```json
{
  "data": { /* created todo with id, timestamps, version */ }
}
```

---

#### 4. Update Todo

**PATCH** `/api/todos/:id`

**Required Permission:** `todo:update` (admin, internal)

**Request Body** (all fields optional):
```json
{
  "status": "in-progress",
  "owner": "user-id-uuid",
  "internal_notes": "Team meeting scheduled",
  "version": 1  // Required for optimistic locking
}
```

**Response** (200 OK):
```json
{
  "data": { /* updated todo with incremented version */ }
}
```

**Error** (409 Conflict):
```json
{
  "error": "Optimistic locking conflict: todo was modified"
}
```

---

#### 5. Delete Todo

**DELETE** `/api/todos/:id`

**Required Permission:** `todo:delete` (admin, internal)

**Response** (204 No Content)

---

#### 6. Get Todo History

**GET** `/api/todos/:id/history`

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "history-id-uuid",
      "todo_id": "todo-id-uuid",
      "changed_by": "user-id-uuid",
      "change_type": "updated",
      "old_values": { "status": "todo" },
      "new_values": { "status": "in-progress" },
      "changed_at": "2026-05-08T14:32:00Z"
    }
  ]
}
```

---

#### 7. Get Progress Stats

**GET** `/api/todos/stats/progress`

**Response** (200 OK):
```json
{
  "data": {
    "categories": [
      {
        "category": "Regulatory & RF",
        "total": 15,
        "done": 3,
        "percentage": 20
      }
    ],
    "overall": {
      "total": 153,
      "done": 24,
      "percentage": 16
    }
  }
}
```

**RBAC Behavior:**
- `stakeholder`: Only sees stats for P0 items

---

## WebSocket Specification

### Connection

Connect to `ws://localhost:8080/ws` or `wss://domain.com/ws` (for production).

### Messages

#### Subscribe to Room

```json
{
  "type": "subscribe",
  "room": "todos"  // or specific category name
}
```

#### Todo Events

Broadcasted to all subscribed clients:

```json
{
  "type": "todo:created",
  "data": { /* new todo object */ }
}
```

```json
{
  "type": "todo:updated",
  "data": { /* updated todo object */ }
}
```

```json
{
  "type": "todo:deleted",
  "data": { /* deleted todo object */ }
}
```

### RBAC in WebSocket

- `stakeholder` clients only receive P0 item updates
- `stakeholder` clients never receive `internal_notes`
- Automatic reconnection after 5 seconds on disconnect

---

## Role-Based Access Control (RBAC)

| Permission | Admin | Internal | Stakeholder |
| --- | --- | --- | --- |
| `todo:read` | ✅ | ✅ | ✅ (P0 only) |
| `todo:read:all` | ✅ | ✅ | ❌ |
| `todo:create` | ✅ | ✅ | ❌ |
| `todo:update` | ✅ | ✅ | ❌ |
| `todo:delete` | ✅ | ✅ | ❌ |
| `todo:read:internal_notes` | ✅ | ✅ | ❌ |
| `todo:write:internal_notes` | ✅ | ✅ | ❌ |
| `user:manage` | ✅ | ❌ | ❌ |

### Query Filtering by Role

**Stakeholder:**
```sql
SELECT * FROM todos WHERE priority = 'P0'
```

**Admin / Internal:**
```sql
SELECT * FROM todos -- All items
```

---

## Deployment

### Local Development

1. **Setup Database:**
   ```bash
   docker-compose up postgres
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../web/landing-page && npm install
   ```

3. **Initialize Database:**
   ```bash
   cd backend && npm run seed
   ```

4. **Run Backend:**
   ```bash
   cd backend && npm run dev
   ```

5. **Run Frontend:**
   ```bash
   cd web/landing-page && npm run dev
   ```

6. **Access Dashboard:**
   - Open `http://localhost:3000/dashboard`
   - Generate JWT token via `POST /auth/login` with password `lep-secret`

### Production Deployment

#### Environment Variables

Backend (`.env`):
```env
NODE_ENV=production
PORT=8080
DB_HOST=<RDS_ENDPOINT>
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<SECURE_PASSWORD>  # Use AWS Secrets Manager
DB_NAME=location_emitter
JWT_SECRET=<STRONG_SECRET>
CORS_ORIGIN=https://location-emitter.com
```

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=https://api.location-emitter.com
```

#### AWS Infrastructure

1. **Provision RDS:**
   ```bash
   cd terraform
   terraform apply -var="environment=production" -var="db_password=$(openssl rand -base64 32)"
   ```

2. **Deploy Backend to ECS/Lambda:**
   - Build Docker image: `docker build -t location-emitter-backend .`
   - Push to ECR: `aws ecr push ...`
   - Deploy via ECS or serverless

3. **Deploy Frontend to Vercel:**
   ```bash
   vercel deploy --prod
   ```

---

## Monitoring & Observability

### Logging

Backend logs are structured (Pino) and sent to CloudWatch:
- Request/response logs
- Database errors
- WebSocket disconnects

### Metrics

Track via CloudWatch:
- API response times
- Database query performance
- WebSocket connection count
- Todo creation/update rate

### Alerting

Set CloudWatch alarms for:
- RDS CPU > 80%
- API 5xx error rate > 1%
- Database connection pool exhaustion
- WebSocket disconnect storms

---

## Security Considerations

1. **Authentication**: JWT with strong `JWT_SECRET`
2. **Authorization**: Role-based permissions enforced server-side
3. **Database**: SSL/TLS encryption in transit, encryption at rest for RDS
4. **Rate Limiting**: 120 requests per 60s per client
5. **Audit Trail**: All changes logged to `todo_history` table
6. **Data Privacy**: `internal_notes` never sent to stakeholder role
7. **Optimistic Locking**: Version field prevents race conditions

---

## Performance Optimization

### Indexing Strategy

```sql
-- Frequently queried columns
CREATE INDEX idx_todos_category ON todos(category);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_status ON todos(status);

-- Foreign key lookups
CREATE INDEX idx_todos_owner ON todos(owner);
CREATE INDEX idx_todo_history_todo_id ON todo_history(todo_id);
```

### Query Optimization

- Paginate results (default 50 items/page)
- Filter at database level (not application)
- Use connection pooling (PostgreSQL driver)
- Cache static data (categories, priorities)

### Frontend Performance

- Virtualize long todo lists (consider `react-window`)
- Debounce search input (300ms)
- Cache API responses with SWR or TanStack Query
- WebSocket reduces polling overhead

---

## Future Enhancements

1. **GitHub Issues Integration**: Sync todos with GitHub Project board
2. **Slack Notifications**: Alert team on P0 completions
3. **Email Digest**: Weekly progress report for stakeholders
4. **Bulk Operations**: Mark multiple todos as done
5. **Due Dates**: Add deadline tracking per todo
6. **Comments**: Thread-based discussions on todos
7. **Activity Feed**: Real-time team activity log
8. **Mobile App**: Native iOS/Android app with offline sync
9. **Export**: CSV/JSON export with date range filtering
10. **Webhooks**: Integrate with external tools (Jira, Linear, etc.)

---

## Troubleshooting

### Database Connection Errors

- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` environment variables
- Verify security group allows port 5432
- Ensure RDS instance is in `available` state

### WebSocket Disconnects

- Check CORS settings for WebSocket origin
- Verify firewall allows WebSocket upgrade (HTTP 101 switch)
- Client auto-reconnects after 5 seconds

### Missing Todos After Seed

- Run `npm run seed` manually: `cd backend && npm run seed`
- Verify database connection is working
- Check RDS instance has sufficient storage

---

## References

- [PostgreSQL 16 Docs](https://www.postgresql.org/docs/16/)
- [Express.js API](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.html)
