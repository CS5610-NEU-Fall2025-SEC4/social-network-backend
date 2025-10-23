# Social Network Backend

A NestJS-based backend API for the Social Network application. This backend provides RESTful APIs and real-time features using WebSockets for a modern social networking platform.

## Description

This is the backend service for the Social Network project, built with [NestJS](https://github.com/nestjs/nest) framework using TypeScript. It features authentication, real-time messaging, user management, and post interactions.

## Features

- 🔐 JWT-based authentication with Passport
- 📊 MongoDB integration with Mongoose
- 🔄 Real-time features with Socket.io
- 🛡️ Security middleware (Helmet, CORS)
- 🚀 Rate limiting with Throttler
- 🧪 Testing setup with Jest
- 📝 Input validation with class-validator
- 🎯 TypeScript support throughout

## Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport JWT
- **Real-time**: Socket.io
- **Caching**: Redis (ioredis)
- **Security**: Helmet, CORS
- **Testing**: Jest
- **Language**: TypeScript

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/social-network

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token

### Users

- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `GET /users/:id` - Get user by ID

### Posts

- `GET /posts` - Get all posts
- `POST /posts` - Create new post
- `GET /posts/:id` - Get post by ID
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post

### Real-time Features

- Socket.io connection on `/socket.io`
- Real-time messaging and notifications

## Docker Support

The project includes Docker configuration for easy deployment:

```bash
# Build and run with Docker Compose
$ docker-compose up --build

# Run in detached mode
$ docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
