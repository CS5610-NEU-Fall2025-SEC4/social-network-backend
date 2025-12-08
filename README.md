# Social Network Backend API

A NestJS-based backend API for the Social Network application.

## 🚀 Features

- JWT-based authentication with role-based access control
- User management with profiles, follows, and bookmarks
- Story and comment system with nested threading (depth limit: 1)
- Like/upvote system
- Search integration with Algolia (Hacker News)
- Admin dashboard with analytics
- Content reporting and moderation

## 🛠 Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport JWT
- **External API**: Algolia
- **Security**: Helmet, CORS, Rate Limiting

---

## 📦 Installation

```bash
npm install
npm run start:dev
```

## 🌍 Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/social-network
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:3001
ALGOLIA_BASE_URL=https://hn.algolia.com/api/v1
```

---

## 📚 API Endpoints

### Base URL: `https://social-network-backend-auq6.onrender.com`

🔓 = Public (No Auth Required)  
🔒 = Requires Authentication  
👑 = Requires Admin Role

---

## 👤 Users & Authentication

| Method | Endpoint                           | Auth | Description                 |
| ------ | ---------------------------------- | ---- | --------------------------- |
| POST   | `/users/register`                  | 🔓   | Register new user           |
| POST   | `/users/login`                     | 🔓   | Login user                  |
| GET    | `/users/isAuthenticated`           | 🔒   | Check authentication status |
| GET    | `/users/me`                        | 🔒   | Get current user profile    |
| PATCH  | `/users/me`                        | 🔒   | Update current user profile |
| POST   | `/users/me/photo`                  | 🔒   | Upload profile photo        |
| POST   | `/users/me/bookmarks`              | 🔒   | Add bookmark                |
| PATCH  | `/users/me/bookmarks`              | 🔒   | Remove bookmark             |
| GET    | `/users/checkUsername/:username`   | 🔓   | Check if username exists    |
| GET    | `/users/checkHnUsername/:username` | 🔓   | Check HN username           |
| GET    | `/users/search/:username`          | 🔓   | Get user ID by username     |
| GET    | `/users/:id`                       | 🔓   | Get public profile by ID    |
| POST   | `/users/:id/follow`                | 🔒   | Follow a user               |
| PATCH  | `/users/:id/unfollow`              | 🔒   | Unfollow a user             |
| GET    | `/users/:id/isFollowing`           | 🔒   | Check if following user     |

---

## 📝 Stories

| Method | Endpoint                  | Auth | Description                |
| ------ | ------------------------- | ---- | -------------------------- |
| POST   | `/story`                  | 🔒   | Create new story           |
| GET    | `/story`                  | 🔓   | Get all stories            |
| GET    | `/story/:storyId`         | 🔓   | Get story by ID            |
| GET    | `/story/:storyId/full`    | 🔓   | Get story with comments    |
| GET    | `/story/type/:type`       | 🔓   | Get stories by type        |
| GET    | `/story/author/:username` | 🔓   | Get stories by author      |
| PATCH  | `/story/:storyId`         | 🔒   | Update story (owner only)  |
| DELETE | `/story/:storyId`         | 🔒   | Delete story (owner/admin) |

---

## 💬 Comments

| Method | Endpoint                  | Auth | Description                  |
| ------ | ------------------------- | ---- | ---------------------------- |
| POST   | `/comment`                | 🔒   | Create comment               |
| GET    | `/comment/story/:storyId` | 🔓   | Get comments for story       |
| GET    | `/comment/:commentId`     | 🔓   | Get single comment           |
| PATCH  | `/comment/:commentId`     | 🔒   | Update comment (owner only)  |
| DELETE | `/comment/:commentId`     | 🔒   | Delete comment (owner/admin) |

---

## ❤️ Likes

| Method | Endpoint                | Auth | Description              |
| ------ | ----------------------- | ---- | ------------------------ |
| POST   | `/likes/:itemId/toggle` | 🔒   | Toggle like on item      |
| GET    | `/likes/:itemId/status` | 🔓   | Get like status & count  |
| GET    | `/likes/user/my-likes`  | 🔒   | Get current user's likes |

---

## 🔍 Search & Discovery

| Method | Endpoint          | Auth | Description                            |
| ------ | ----------------- | ---- | -------------------------------------- |
| GET    | `/search`         | 🔓   | Search stories (internal + Algolia)    |
| GET    | `/items/:id`      | 🔓   | Get external story from HN via Algolia |
| GET    | `/front-page`     | 🔓   | Get front page stories (internal + HN) |
| GET    | `/tag/:storyType` | 🔓   | Get stories by tag                     |

### Algolia Integration

The backend integrates with **Algolia's Hacker News API** to provide access to external content:

- **External Stories**: Stories with numeric IDs (e.g., `12345`) are fetched from Hacker News via Algolia
- **Internal Stories**: Stories with UUID format are from the internal database
- **Hybrid Search**: Search endpoint combines both internal MongoDB stories and Algolia HN results
- **Comment Replacement**: For external stories, Algolia's comment structure is replaced with MongoDB comments only

**Query Parameters for Search:**

- `query` - Search term
- `tags` - Filter by tags (e.g., `story`, `job`, `ask_hn`, `show_hn`)
- `page` - Page number (default: 0)
- `hitsPerPage` - Results per page (default: 30)
- `sort` - Sort method: `search`, `search_by_date`
- `numericFilters` - Date filter: `created_at_i>timestamp`

**Example:**

```
GET /search?query=typescript&tags=story&page=0&sort=search_by_date
```

---

## 🚨 Reports

| Method | Endpoint                           | Auth | Description               |
| ------ | ---------------------------------- | ---- | ------------------------- |
| POST   | `/report`                          | 🔒   | Create report             |
| GET    | `/report`                          | 👑   | Get all reports           |
| GET    | `/report/status/:status`           | 👑   | Get reports by status     |
| GET    | `/report/content/:contentId`       | 👑   | Get reports for content   |
| GET    | `/report/content/:contentId/count` | 👑   | Count reports for content |
| GET    | `/report/author/:username`         | 👑   | Get reports by author     |
| GET    | `/report/author/:username/count`   | 👑   | Count reports by author   |
| PATCH  | `/report/:id/status`               | 👑   | Update report status      |
| DELETE | `/report/:id`                      | 👑   | Delete report             |

---

## 👨‍💼 Admin - Users

| Method | Endpoint                   | Auth | Description               |
| ------ | -------------------------- | ---- | ------------------------- |
| GET    | `/admin/users`             | 👑   | Get all users (paginated) |
| GET    | `/admin/users/:id`         | 👑   | Get user details          |
| POST   | `/admin/users/:id/block`   | 👑   | Block user                |
| POST   | `/admin/users/:id/unblock` | 👑   | Unblock user              |

---

## 👨‍💼 Admin - Email Management

| Method | Endpoint                | Auth | Description           |
| ------ | ----------------------- | ---- | --------------------- |
| POST   | `/admin/emails/block`   | 👑   | Block email address   |
| DELETE | `/admin/emails/:email`  | 👑   | Unblock email address |
| GET    | `/admin/emails/blocked` | 👑   | Get blocked emails    |

---

## 👨‍💼 Admin - Content Management

| Method | Endpoint                             | Auth | Description             |
| ------ | ------------------------------------ | ---- | ----------------------- |
| GET    | `/admin/stories`                     | 👑   | Get all stories         |
| GET    | `/admin/comments`                    | 👑   | Get all comments        |
| GET    | `/admin/deleted/stories`             | 👑   | Get deleted stories     |
| GET    | `/admin/deleted/comments`            | 👑   | Get deleted comments    |
| POST   | `/admin/stories/:storyId/restore`    | 👑   | Restore deleted story   |
| POST   | `/admin/comments/:commentId/restore` | 👑   | Restore deleted comment |

---

## 👨‍💼 Admin - Analytics

| Method | Endpoint                             | Auth | Description                 |
| ------ | ------------------------------------ | ---- | --------------------------- |
| GET    | `/admin/stats`                       | 👑   | Get dashboard statistics    |
| GET    | `/admin/analytics/problematic-users` | 👑   | Get users with most reports |
| GET    | `/admin/analytics/top-contributors`  | 👑   | Get most active users       |
| GET    | `/admin/analytics/trending`          | 👑   | Get trending content        |

---

## 🔒 Authentication

Protected endpoints require JWT token in header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🎭 User Roles

- **USER**: Regular user
- **EMPLOYER**: Can create job postings
- **ADMIN**: Full admin access

---

## 🧪 Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage
```

---

## 📦 Project Structure

```
src/
├── admin/          # Admin management
├── auth/           # Authentication & guards
├── comment/        # Comments
├── config/         # Configuration
├── like/           # Likes system
├── report/         # Reports
├── search/         # Search & Algolia
├── story/          # Stories
├── users/          # User management
└── utils/          # Utilities
```

---

## 🚀 Deployment

```bash
# Docker
docker-compose up --build

# Production
npm run build
npm run start:prod
```

---

## 👥 Team

- Preethi Rajesh Yennemadi
- Kalyana Ramanuja Swami Mudumby
- Mrinal Srinath Setty

---
