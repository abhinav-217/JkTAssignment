# Deployment Workflow

This project is designed for a simple Node.js + PostgreSQL deployment flow.

## Local development

```bash
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

## Production build

```bash
npm install --production=false
npm run build
npm run start:prod
```

## Recommended production setup

- Run PostgreSQL in a managed database service or a dedicated server
- Store secrets in environment variables or a secret manager
- Use a reverse proxy such as Nginx or a platform load balancer
- Run the app behind a process manager such as PM2 or a container orchestrator
- Enable HTTPS in production
- Restrict database access to only the app server

## Example Docker deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

Then build:

```bash
docker build -t user-management-api .
docker run -p 3000:3000 --env-file .env user-management-api
```

## Database migration in deployment

Run migrations as a release step before starting the app:

```bash
npm run migration:run
```

## Health and verification

After deployment, verify:

- the app responds on the expected port
- the database connection works
- JWT auth works
- migration status is clean

## Rollout best practices

- Run migrations before deploying app code that depends on them
- Keep database backups enabled
- Use staging before production
- Maintain environment-specific `.env` values
- Review logs for startup failures and runtime authentication issues

## Deployment checklist

- [ ] PostgreSQL is running
- [ ] `.env` contains production values
- [ ] `JWT_SECRET` is set
- [ ] database exists
- [ ] migrations are applied
- [ ] app build succeeds
- [ ] HTTPS is enabled
- [ ] logs and monitoring are configured
