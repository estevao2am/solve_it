# API NestJS - Store and Product Management

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" alt="NestJS Logo" width="140" />
</p>

This project is a NestJS API for managing users, stores, categories, and products. It uses Prisma with PostgreSQL and includes authentication, file upload support, and Cloudinary integration for product images.

## Features

- User registration and authentication with JWT
- Store creation and ownership validation
- Category management
- Product creation with image upload
- Prisma ORM integration with PostgreSQL
- Protected routes with authentication guard

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Multer
- Cloudinary

## Project setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

Create a `.env` file with at least:

```env
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Generate Prisma client

```bash
npx prisma generate
```

4. Run database migrations

```bash
npx prisma migrate dev
```

5. Start the application

```bash
npm run start:dev
```

## API Routes

### Users

- `POST /users` - Create a new user
- `POST /users/login` - Login and receive JWT token
- `POST /users/refresh` - Rotate the refresh token and receive new tokens
- `GET /users/me` - Get authenticated user profile
- `GET /users/:id` - Get user by id

### Stores

- `POST /store` - Create a store for the authenticated user
- `GET /store` - List stores
- `GET /store/:id` - Get store by id
- `PATCH /store/:id` - Update a store
- `DELETE /store/:id` - Delete a store

### Categories

- `POST /category` - Create a category
- `GET /category` - List categories
- `GET /category/:id` - Get category by id
- `PATCH /category/:id` - Update a category
- `DELETE /category/:id` - Delete a category

### Products

- `POST /product` - Create a product with image upload
- `GET /product` - List products
- `GET /product/:id` - Get product by id
- `PATCH /product/:id` - Update a product
- `DELETE /product/:id` - Delete a product

## Authentication

Protected routes require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

## Notes

- Product creation expects an uploaded image file field named `image`.
- The app uses Cloudinary for image storage.
- Prisma schema is defined in `prisma/schema.prisma`.
