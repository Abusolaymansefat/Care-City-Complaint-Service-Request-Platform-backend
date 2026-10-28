# 🏙️ CityCare — City Complaint & Service Request Platform

A backend system for managing civic complaints and municipal service requests. CityCare enables citizens to report city problems, track complaint progress, and access public services while helping municipal departments manage assignments, technicians, and service resolution.

## 🚀 Project Overview

CityCare is designed to improve communication between citizens and city service departments through a centralized complaint management system.

### ✨ Key Features

- **Authentication & Authorization:** Secure user authentication and role-based access control.
- **Complaint Management:** Create, view, update, and track civic complaints.
- **Department Management:** Organize departments and manage service responsibilities.
- **Category Management:** Categorize complaints with configurable SLA hours.
- **Technician Assignment:** Assign complaints to technicians and track work progress.
- **Complaint Status Workflow:** Manage complaint statuses throughout the resolution process.
- **bKash Payment Integration:** Support complaint processing fees through bKash Tokenized Checkout.
- **Free Complaint Policy:** First two complaints are free according to the configured business rules.
- **Payment History:** Track payment transactions and their statuses.
- **Redis Integration:** Support caching and token management.
- **Input Validation:** Validate incoming requests using Zod.
- **API Testing:** Test endpoints with Postman.
- **Error Handling:** Provide structured API responses and centralized error handling.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| TypeScript | Type-safe backend development |
| PostgreSQL | Relational database |
| Prisma ORM 7 | Database access and schema management |
| Redis | Caching and bKash token management |
| Zod | Request validation |
| JWT | Authentication |
| bKash Tokenized Checkout | Payment integration |
| Postman | API testing |

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| `CITIZEN` | Submit complaints and track progress |
| `TECHNICIAN` | View assigned work and update progress |
| `DEPARTMENT_OFFICER` | Manage department complaints and assignments |
| `ADMIN` | Manage platform resources and users |

## 📁 Project Structure

```text
citycare-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   ├── generated/
│   │   └── prisma/
│   ├── lib/
│   │   ├── bkash.ts
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── middlewares/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── departments/
│   │   ├── categories/
│   │   ├── complaints/
│   │   ├── assignments/
│   │   └── payments/
│   ├── routes/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── README.md
```

*Note: This is the intended structure; adjust it to match the actual files in your repository.*

## ⚙️ Installation & Setup

### Prerequisites

- Node.js and npm
- PostgreSQL
- Redis
- Git
- Postman

### 1. Clone the repository

```bash
git clone YOUR_BACKEND_REPOSITORY_URL
cd citycare-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

Example `.env.example`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/citycare"

REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="replace_with_a_secure_secret"
JWT_REFRESH_SECRET="replace_with_a_secure_secret"

BKASH_BASE_URL="YOUR_BKASH_SANDBOX_BASE_URL"
BKASH_USERNAME="YOUR_BKASH_USERNAME"
BKASH_PASSWORD="YOUR_BKASH_PASSWORD"
BKASH_APP_KEY="YOUR_BKASH_APP_KEY"
BKASH_APP_SECRET="YOUR_BKASH_APP_SECRET"
BKASH_CALLBACK_URL="YOUR_CONFIGURED_CALLBACK_URL"

COMPLAINT_FEE_AMOUNT="YOUR_CONFIGURED_FEE"
```

Use the exact environment variable names expected by your configuration module. Never commit `.env`, credentials, access tokens, or payment secrets to GitHub.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

Use your project's configured Prisma 7 setup and migration workflow if it requires additional configuration.

### 6. Start the development server

```bash
npm run dev
```

If configured to use port `5000`, the local server should be available at:

```text
http://localhost:5000
```

## 🔗 API Documentation

**Base URL:** `http://localhost:5000/api`

Use `Authorization: Bearer YOUR_ACCESS_TOKEN` for protected endpoints.

| Module | Method | Endpoint | Purpose |
|---|---|---|---|
| Auth | POST | `/auth/register` | Register an account |
| Auth | POST | `/auth/login` | Log in |
| Departments | GET | `/departments` | List departments |
| Departments | POST | `/departments` | Create a department |
| Categories | GET | `/categories` | List categories |
| Categories | POST | `/categories` | Create a category |
| Complaints | POST | `/complaints` | Submit a complaint |
| Complaints | GET | `/complaints/my-complaints` | Get citizen complaints |
| Complaints | GET | `/complaints/:id` | Get complaint details |
| Assignments | POST | `/assignments` | Create an assignment |
| Payments | POST | `/payments/create` | Create a payment request |
| Payments | POST | `/payments/execute` | Execute and verify payment |
| Payments | GET | `/payments/my-payments` | View payment history |

These endpoint paths are based on the planned API structure. Confirm each path against the actual Express routers before publishing it as final documentation.

## 💳 Payment Workflow

CityCare integrates with bKash Tokenized Checkout for complaint processing payments.

1. A citizen submits a complaint.
2. The backend checks the complaint payment requirement.
3. The first two complaints follow the configured free policy.
4. For a complaint requiring payment, the backend creates a payment request.
5. The citizen completes checkout through bKash.
6. The backend verifies the transaction before marking it as paid.
7. The payment status and transaction details are stored in the database.

**Security:** Never trust a frontend success message alone. Payment status must be verified server-side using the appropriate bKash API flow.

## 🧪 API Testing with Postman

1. Start the backend server and required services.
2. Register and log in with test accounts.
3. Save access tokens in Postman environment variables.
4. Create a department and complaint category.
5. Submit a complaint as a citizen.
6. Assign the complaint and test status updates with the appropriate roles.
7. Test payment flows using authorized bKash sandbox credentials.
8. Test validation errors, missing tokens, invalid IDs, and unauthorized access.

## 📦 API Response Format

Example success response:

```json
{
  "success": true,
  "message": "Complaint created successfully",
  "data": {
    "id": "COMPLAINT_UUID",
    "trackingCode": "TRACKING_CODE"
  }
}
```

Example error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Actual response fields depend on the implemented controllers and centralized error handler.

## 🔐 Security Practices

- Hash passwords before storing them.
- Validate request bodies using Zod.
- Enforce role-based access control.
- Verify resource ownership before returning private data.
- Store credentials in environment variables.
- Verify bKash transactions on the backend.
- Use database constraints and transactions where appropriate.
- Never expose private payment tokens in logs or API responses.

## 🚀 Deployment

Deploy the backend using a suitable hosting provider and configure its PostgreSQL database, Redis connection, environment variables, and payment callback URL.


## 🎥 Project Demonstration

The 5–10 minute walkthrough should cover:

1. Project overview and backend architecture.
2. Authentication and role-based authorization.
3. Department, category, and complaint APIs.
4. Technician assignment and complaint status workflow.
5. Input validation and error handling.
6. bKash payment verification.
7. Postman responses and database results.

## 👨‍💻 Author

**Abu Solayman Sefat**

