# Location Emitter TODO Tracker: Setup & Testing Guide

## Quick Start (5 minutes)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ with npm
- Git (for version control)
- VS Code (optional, for debugging)

### Steps

1. **Start PostgreSQL Database:**
   ```bash
   docker-compose up postgres
   ```
   Wait for: `database system is ready to accept connections`

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   npm run seed  # Load 153 todos into database
   npm run dev   # Start Express server on :8080
   ```

3. **Setup Frontend:**
   ```bash
   cd ../web/landing-page
   npm install
   npm run dev   # Start Next.js dev server on :3000
   ```

4. **Access Dashboard:**
   - Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - You should see the master readiness list with 153 items

---

## Detailed Setup Guide

### 1. Database Initialization

#### Option A: Docker Compose (Recommended)

```bash
# From project root
docker-compose up -d postgres
docker-compose logs -f postgres

# Verify connection
psql -h localhost -U postgres -d location_emitter -c "SELECT COUNT(*) FROM todos;"
```

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL 16
brew install postgresql@16  # macOS
apt-get install postgresql-16  # Ubuntu
choco install postgresql  # Windows

# Create database
createdb location_emitter -U postgres

# Set credentials in .env
echo "DB_HOST=localhost" >> backend/.env
echo "DB_USER=postgres" >> backend/.env
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=location_emitter
JWT_SECRET=dev-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
EOF

# Run migrations and seed data
npm run seed

# Verify seed was successful
npm run seed:verify

# Start development server
npm run dev
```

**Expected Output:**
```
[INFO] Server running on :8080
[INFO] WebSocket server initialized
[INFO] Database connected, 153 todos loaded
```

### 3. Frontend Setup

```bash
cd web/landing-page

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
EOF

# Start development server
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled (5 files)
```

---

## Testing Workflows

### Manual Testing Checklist

#### 1. Dashboard Loading (✓ Pass)
- [ ] Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- [ ] Page loads without errors
- [ ] Header shows "Location Emitter"
- [ ] Total items counter shows **153**
- [ ] Todos table displays items

#### 2. Filtering
- [ ] **Category Filter**: Select "Business" → Only business items show
- [ ] **Priority Filter**: Select P0 → Only P0 items show
- [ ] **Status Filter**: Select "done" → Only completed items show
- [ ] **Search**: Type "FCC" → Returns items matching "FCC certification"
- [ ] **Clear All**: Clears all filters and resets to full list
- [ ] **Multi-select**: Select P0 + P1 → Shows both priorities

#### 3. Inline Status Updates
- [ ] Click status dropdown on any todo
- [ ] Change from "todo" to "in-progress"
- [ ] Verify UI updates immediately
- [ ] Verify WebSocket broadcasts update to other tabs (open dashboard in 2 tabs)
- [ ] Verify database persists the change

#### 4. Pagination
- [ ] 50 items per page displayed
- [ ] "Next" button works → Shows items 51-100
- [ ] "Previous" button works → Back to 1-50
- [ ] Last page shows remaining items (103-153)
- [ ] Disabled buttons on first/last page

#### 5. Progress Stats
- [ ] Overall progress bar visible
- [ ] Shows "X / 153 items done (Y%)"
- [ ] Per-category breakdown displays
- [ ] Progress bar reflects actual done count

#### 6. Real-Time Sync (WebSocket)
- [ ] Open dashboard in 2 browser tabs
- [ ] Change status in Tab 1
- [ ] Tab 2 updates automatically (no page refresh)
- [ ] Verify across different categories

#### 7. Error Handling
- [ ] Stop backend server
- [ ] Refresh dashboard
- [ ] Error message displays: "Error: Failed to fetch todos"
- [ ] Restart backend
- [ ] Dashboard recovers after refresh

#### 8. Responsive Design
- [ ] Desktop: Table displays all columns
- [ ] Tablet: Table remains readable (horizontal scroll if needed)
- [ ] Mobile: Filters collapse into menu, table scrolls
- [ ] Dark mode: Toggle via system preference

---

### API Testing with cURL

#### Fetch All Todos
```bash
curl -X GET "http://localhost:8080/api/todos" \
  -H "Authorization: Bearer $(node -e "console.log(require('jsonwebtoken').sign({id:'1',role:'admin'},'dev-secret-key-change-in-production'))")"
```

#### Create Todo
```bash
curl -X POST "http://localhost:8080/api/todos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(node -e "console.log(require('jsonwebtoken').sign({id:'1',role:'admin'},'dev-secret-key-change-in-production'))")" \
  -d '{
    "title": "Test TODO",
    "description": "Testing API",
    "category": "Testing",
    "priority": "P1",
    "status": "todo"
  }'
```

#### Update Todo (Optimistic Locking)
```bash
curl -X PATCH "http://localhost:8080/api/todos/{TODO_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(node -e "console.log(require('jsonwebtoken').sign({id:'1',role:'admin'},'dev-secret-key-change-in-production'))")" \
  -d '{
    "status": "in-progress",
    "version": 1
  }'
```

#### Fetch Progress Stats
```bash
curl -X GET "http://localhost:8080/api/todos/stats/progress" \
  -H "Authorization: Bearer $(node -e "console.log(require('jsonwebtoken').sign({id:'1',role:'admin'},'dev-secret-key-change-in-production'))")"
```

---

### Automated Testing

#### Backend Tests
```bash
cd backend
npm run test
```

#### Frontend Tests
```bash
cd web/landing-page
npm run test
```

#### E2E Tests (Playwright)
```bash
cd web/landing-page
npm run test:e2e
```

---

## Troubleshooting

### Issue: "Cannot connect to PostgreSQL"

**Symptoms:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Verify PostgreSQL is running: `docker ps | grep postgres`
2. Check `.env` variables match actual credentials
3. Restart database: `docker-compose restart postgres`
4. Check firewall isn't blocking port 5432

### Issue: "Todos table is empty after seed"

**Symptoms:** Dashboard loads but shows 0 items

**Solutions:**
1. Run seed manually: `cd backend && npm run seed`
2. Verify no errors: `npm run seed 2>&1 | tail -20`
3. Check seed file exists: `ls seeds/todos-grand-readiness.json`
4. Manually query: `psql -h localhost -U postgres -d location_emitter -c "SELECT COUNT(*) FROM todos;"`

### Issue: "WebSocket connection fails"

**Symptoms:** Chat messages don't sync across tabs, console error: `WebSocket is closed`

**Solutions:**
1. Verify backend is running: `curl http://localhost:8080/health`
2. Check CORS settings in backend: `CORS_ORIGIN=http://localhost:3000`
3. Restart frontend: `npm run dev` in web/landing-page/
4. Check browser console for specific errors

### Issue: "Optimistic locking conflict when updating todo"

**Symptoms:** Status update fails with `409 Conflict`

**Solutions:**
1. This is expected if todo was modified elsewhere
2. Refresh page to get latest version
3. Retry update operation
4. Check `todo_history` table to see what changed

### Issue: "JWT validation fails"

**Symptoms:** API returns `401 Unauthorized`

**Solutions:**
1. Verify `JWT_SECRET` matches in both backend .env and token generation
2. Regenerate token with new secret
3. Check token hasn't expired
4. Verify Bearer token format: `Authorization: Bearer <token>`

---

## Performance Testing

### Load Test with Apache Bench

```bash
# Install Apache Bench
brew install httpd  # macOS
apt-get install apache2-utils  # Ubuntu

# Test fetching todos (100 requests, 10 concurrent)
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({id:'1',role:'admin'},'dev-secret-key-change-in-production'))")
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/todos
```

### Expected Results
- Response time: < 100ms per request
- Throughput: > 100 req/sec
- 0% error rate

### WebSocket Connection Stress Test

```bash
# Using wscat
npm install -g wscat

# Connect and measure
wscat -c ws://localhost:8080/ws
# Then subscribe: {"type":"subscribe","room":"todos"}
# Keep connection open for 1 minute
# Should see no disconnects
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] No console errors in frontend
- [ ] Backend handles graceful shutdown: `SIGTERM`
- [ ] Environment variables documented
- [ ] Database backups configured
- [ ] SSL/TLS certificates ready
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting setup

### AWS Deployment Steps

#### 1. Provision Infrastructure

```bash
cd terraform
terraform init
terraform plan -var="environment=production"
terraform apply -var="environment=production"
```

#### 2. Deploy Backend to ECS

```bash
# Build and push Docker image
docker build -t location-emitter-backend:1.0.0 -f Dockerfile .
aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_URL>
docker tag location-emitter-backend:1.0.0 <ECR_URL>/location-emitter-backend:1.0.0
docker push <ECR_URL>/location-emitter-backend:1.0.0

# Update ECS service
aws ecs update-service --cluster location-emitter-prod --service backend --force-new-deployment
```

#### 3. Deploy Frontend to Vercel

```bash
cd web/landing-page
vercel deploy --prod
```

#### 4. Monitor Deployment

```bash
# Check ECS task logs
aws logs tail /ecs/location-emitter-backend --follow

# Check RDS
aws rds describe-db-instances --db-instance-identifier location-emitter-production
```

---

## Database Maintenance

### Backup

```bash
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier location-emitter-production \
  --db-snapshot-identifier location-emitter-backup-$(date +%Y%m%d)

# List backups
aws rds describe-db-snapshots --db-instance-identifier location-emitter-production
```

### Monitoring

```bash
# Check slow queries
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/location-emitter-production/postgresql
```

### Scaling

- Monitor CloudWatch: RDS CPU, connections, storage
- Scale up: Update `db_instance_class` in Terraform
- Add read replicas for high-traffic scenarios

---

## Key Files Reference

| Path | Purpose |
| --- | --- |
| `backend/src/server.ts` | Express app entry point |
| `backend/src/db/database.ts` | PostgreSQL connection & migrations |
| `backend/src/routes/todos.ts` | REST API endpoints |
| `backend/src/websocket.ts` | WebSocket server |
| `backend/scripts/seed-todos.ts` | 153-item seed loader |
| `web/landing-page/src/app/dashboard/page.tsx` | Main dashboard page |
| `web/landing-page/src/hooks/useTodos.ts` | Real-time sync hook |
| `web/landing-page/src/lib/todoClient.ts` | API client |
| `terraform/main.tf` | VPC, security groups, IAM |
| `terraform/rds.tf` | PostgreSQL RDS setup |
| `.env.example` | Environment variable template |
| `docker-compose.yml` | Local dev database |

---

## Next Steps

1. **Complete Testing**: Run through all manual tests
2. **Enable Authentication**: Implement login/signup UI
3. **Add Notifications**: Integrate Slack/Email alerts
4. **Setup Monitoring**: CloudWatch dashboards
5. **Document Runbooks**: Incident response procedures
6. **Gather User Feedback**: Iterate on UX

---

## Support

- **Issues**: Check GitHub Issues or project board
- **Docs**: Reference `docs/TODO_TRACKER_ARCHITECTURE.md`
- **Logs**: Backend logs in `backend/logs/` or CloudWatch
- **Performance**: Review `docs/PERFORMANCE_TUNING.md`

---

**Last Updated:** 2025-05-07
**Version:** 1.0.0
