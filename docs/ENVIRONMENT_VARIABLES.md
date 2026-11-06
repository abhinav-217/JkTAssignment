# Environment Variables

This project uses environment variables from a `.env` file at the project root.

## Required variables

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=document_admin
DB_PASSWORD=your_local_password
DB_DATABASE=document_management
JWT_SECRET=your-super-secret-jwt-key
```

## Variable descriptions

- `NODE_ENV`: Application environment (`development`, `production`, `test`)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port (default `5432`)
- `DB_USERNAME`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_DATABASE`: PostgreSQL database name
- `JWT_SECRET`: Secret key used to sign access tokens

## Example for local development

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=document_admin
DB_PASSWORD=your_local_password
DB_DATABASE=document_management
JWT_SECRET=dev-secret-change-me
```

## Production recommendations

- Store secrets in a secure secret manager
- Do not commit `.env` files to version control
- Use strong random values for `JWT_SECRET`
- Use least-privilege database credentials

## `.env.example`

A sample file can be created as:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=document_admin
DB_PASSWORD=your_local_password
DB_DATABASE=document_management
JWT_SECRET=change-me-in-production
```
