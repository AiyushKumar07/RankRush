# RankRush — Biology Quiz Bank Admin Panel

A production-grade admin platform for managing, reviewing, and publishing structured biology quiz questions. Built with **NestJS**, **Prisma**, **MongoDB**, **React**, and **TailwindCSS**.

## Architecture

```
RankRush/
├── server/                  # NestJS + Prisma Backend
│   ├── prisma/
│   │   └── schema.prisma    # Prisma schema (User, Question, AuditLog, UploadBatch)
│   └── src/
│       ├── auth/            # Auth module (JWT, guards, strategies, DTOs)
│       ├── questions/       # Questions module (CRUD, upload, workflow, validation)
│       ├── analytics/       # Analytics module (dashboard, uploads, audit logs)
│       ├── audit/           # Audit service (action tracking)
│       ├── prisma/          # Prisma service (global DB client)
│       ├── common/          # Decorators, filters, interceptors
│       └── scripts/         # Seed scripts
└── client/                  # React + Vite Frontend
    └── src/
        ├── components/      # Reusable UI components
        │   ├── common/      # Button, Modal, StatusBadge, EmptyState
        │   ├── layout/      # Sidebar, AppLayout
        │   ├── dashboard/   # StatCard, charts
        │   └── questions/   # QuestionCard, Renderer, Detail
        ├── pages/           # Route pages (7 pages)
        ├── context/         # Auth context
        ├── services/        # Axios API client
        └── utils/           # Constants, helpers
```

## Tech Stack

| Layer      | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | NestJS, TypeScript, Prisma ORM                |
| Database  | MongoDB (via Prisma MongoDB connector)         |
| Auth      | JWT (Passport.js), bcryptjs, role-based guards |
| Validation| class-validator, custom QuestionValidator      |
| Frontend  | React 19, Vite, TailwindCSS v4                |
| Charts    | Recharts                                       |
| Animation | Framer Motion                                  |
| Icons     | Lucide React                                   |

## Features

- **Multi-Type Questions**: MCQ, Multi-Correct, Assertion-Reason, Case-Based, Match-the-Following, True/False, Diagram-Based
- **Role-Based Auth**: Super Admin, Reviewer, Moderator, Publisher with granular permissions
- **Workflow States**: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED (with REJECTED path)
- **Bulk Operations**: Upload JSON, bulk approve/reject
- **Schema Validation**: Reusable validation engine with type-specific rules
- **Duplicate Detection**: SHA-256 content hash-based deduplication
- **Question Versioning**: Full version history with diff tracking
- **Audit Logging**: Every action tracked with user, timestamp, IP
- **Analytics Dashboard**: Charts for status, type, difficulty, subject distribution
- **Advanced Filtering**: By status, type, difficulty, subject, chapter, search
- **Modern UI**: Glassmorphism, dark mode, smooth animations (Framer Motion)
- **Prisma ORM**: Type-safe database access with auto-generated client

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. **Install dependencies**:
```bash
cd server && npm install
cd ../client && npm install
```

2. **Configure environment** — edit `server/.env`:
```env
DATABASE_URL="mongodb://localhost:27017/rankrush"
JWT_SECRET="your_secret_here"
PORT=5000
```

3. **Generate Prisma client**:
```bash
cd server && npx prisma generate
```

4. **Seed demo users**:
```bash
cd server && npm run seed
```

5. **Start both servers**:
```bash
# Terminal 1 — Backend
cd server && npm run start:dev

# Terminal 2 — Frontend
cd client && npm run dev
```

6. Open http://localhost:5173

### Demo Accounts

| Role         | Email                    | Password        |
|-------------|--------------------------|-----------------|
| Super Admin | admin@rankrush.io        | Admin@1234      |
| Reviewer    | reviewer@rankrush.io     | Reviewer@1234   |
| Moderator   | moderator@rankrush.io    | Moderator@1234  |
| Publisher   | publisher@rankrush.io    | Publisher@1234  |

## API Endpoints

All endpoints are under `/api`.

### Auth
| Method | Route              | Description            | Auth |
|--------|-------------------|------------------------|------|
| POST   | /auth/register    | Register new user      | No   |
| POST   | /auth/login       | Login                  | No   |
| GET    | /auth/profile     | Current user profile   | Yes  |
| GET    | /auth/users       | List all users         | Super Admin |

### Questions
| Method | Route                    | Description                | Permission           |
|--------|--------------------------|----------------------------|----------------------|
| POST   | /questions/upload        | Upload quiz JSON batch     | create/upload        |
| GET    | /questions               | List with filters          | read                 |
| GET    | /questions/filters       | Get filter options         | read                 |
| GET    | /questions/:id           | Get question details       | read                 |
| PUT    | /questions/:id           | Update question (versions) | update               |
| PATCH  | /questions/:id/status    | Change workflow status     | review/approve/publish |
| POST   | /questions/bulk-status   | Bulk approve/reject        | review/approve       |
| DELETE | /questions/:id           | Delete question            | create               |

### Analytics
| Method | Route                | Description         | Auth |
|--------|---------------------|---------------------|------|
| GET    | /analytics/dashboard | Dashboard stats     | Yes  |
| GET    | /analytics/uploads   | Upload batch history | Yes  |
| GET    | /analytics/audit-logs | Audit trail         | analytics:read |

## JSON Upload Format

```json
{
  "quizBank": [
    {
      "questionId": "BIO-0001",
      "examType": ["NEET", "CBSE"],
      "class": "11",
      "subject": "Biology",
      "unit": "Human Physiology",
      "chapter": "Breathing and Exchange of Gases",
      "topic": "Respiratory Volumes",
      "subTopic": "Tidal Volume",
      "questionType": "MCQ",
      "difficulty": "Medium",
      "question": "What is the normal tidal volume?",
      "options": [
        { "id": "A", "text": "250 mL" },
        { "id": "B", "text": "500 mL" }
      ],
      "correctAnswer": ["B"],
      "answerExplanation": { "correctExplanation": "...", "incorrectExplanation": {} },
      "estimatedTimeSeconds": 45,
      "marks": 1,
      "negativeMarks": 0.25,
      "isDiagramBased": false,
      "isCaseBased": false,
      "isNcertLineBased": true
    }
  ]
}
```

## Prisma Schema Highlights

- **Composite types**: `Option`, `MatchPair`, `CaseStudy`, `PreviousVersion` — modeled as MongoDB embedded documents
- **Enums**: `Role`, `WorkflowStatus`, `QuestionType`, `Difficulty`, `AuditAction`, `BatchStatus`
- **Optimized indexes**: Compound indexes on `[status, questionType]`, `[subject, chapter, topic]`
- **Relations**: `AuditLog → User`, `UploadBatch → User` via ObjectId references

## Future-Ready Architecture

The platform is designed with extensibility for:
- **Blockchain**: Extensible metadata JSON field for on-chain question attestations
- **AI Moderation**: Pluggable service layer for ML-based quality checks
- **Web3 Auth**: Guard-based auth supports wallet connect integration
- **Realtime**: Event-driven audit log can feed WebSocket gateways
- **3D Interfaces**: Renderer pattern supports pluggable question renderers
