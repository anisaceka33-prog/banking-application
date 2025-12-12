# Banking Application

A full-stack banking application built with Django REST Framework and React with TypeScript on the frontend.
The system implements a  role-based access control (RBAC) architecture, supporting administrators, bankers, and clients with different permissions and workflows.Used JWT-based authentication, brute force protection, transaction idempotency, and audit trails. The application includes finite state machines for approval workflows, atomic database transactions, Redis caching for performance optimization, and OpenAPI/Swagger documentation for API.

### Core Functionality

- **Authentication & Authorization**
  - JWT-based authentication with access/refresh tokens
  - Token blacklist on logout
  - Automatic token refresh
  - Brute force protection

- **Bank Accounts**
  - Account application with IBAN auto-generation
  - Approval/rejection workflow FSM
  - Balance tracking with audit trail
  - Deposit functionality for bankers

- **Debit Cards**
  - Card application linked to bank accounts
  - Monthly salary verification (€500 minimum)
  - Auto-rejection for insufficient salary
  - One active card per account 

- **Transactions**
  - Money transfers between accounts
  - IBAN validation
  - Idempotency key for duplicate prevention
  - Transaction throttling
  - Atomic transactions

- **User Management**
  - Admin manages bankers
  - Bankers manage clients

## Tech Stack

### Backend

- **Framework:** Django  with Django REST Framework
- **Database:** PostgreSQL
- **Caching:** Redis with django-redis
- **Authentication:** JWT (djangorestframework-simplejwt)
- **Security:** django-axes, django-cors-headers, django-csp
- **State Management:** django-fsm (Finite State Machine)
- **Audit:** django-auditlog
- **API Docs:** drf-spectacular
- **Testing:** pytest

### Frontend

- **Framework:** React with TypeScript
- **Build Tool:** Vite 5.0+

### Infrastructure

- **Containerization:** Docker & Docker Compose
- **Database UI:** PgAdmin 4

## Project Structure

```
banking-application/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # Bank account management
│   │   ├── cards/           # Debit card management
│   │   ├── transactions/    # Transaction 
│   │   └── users/           #User Management for admin, client, banker
│   │   │__ auth/            # jwt auth 
│   ├── config/              # Django settings
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**


2. **Set up environment variables**

Create `.env` file in the root directory

3. **Start the application**

```bash
docker-compose up --build
```

4. **Access the services**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Documentation: http://localhost:8000/api/schema/swagger-ui/
- PgAdmin: http://localhost:5050

5. **Create superuser**

```bash
docker-compose exec backend python manage.py createsuperuser
```

## User Roles

### ADMIN
- Manage bankers (CRUD operations)

### BANKER
- Manage clients (CRUD operations)
- Review and approve/reject account applications
- Review and approve/reject card applications
- Deposit funds to client accounts
- View all accounts, cards, and transactions
- Search functionality for clients and cards

### CLIENT
- Apply for bank accounts
- Apply for debit cards
- View personal accounts and cards
- Create transfers between accounts
- View transaction history

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login and receive JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Logout and blacklist token |
| GET | `/api/auth/me/` | Get current user info |

### Bank Account Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/accounts/` | List accounts | CLIENT, BANKER |
| POST | `/api/accounts/` | Apply for account | CLIENT |
| GET | `/api/accounts/{id}/` | Get account details | CLIENT, BANKER |
| PATCH | `/api/accounts/{id}/` | Approve/reject account | BANKER |
| DELETE | `/api/accounts/{id}/` | Delete account | BANKER |

### Card Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/cards/` | List cards | CLIENT, BANKER |
| POST | `/api/cards/` | Apply for card | CLIENT |
| GET | `/api/cards/{id}/` | Get card details | CLIENT, BANKER |
| PATCH | `/api/cards/{id}/` | Approve/reject card | BANKER |
| DELETE | `/api/cards/{id}/` | Delete card | BANKER |

### Transaction Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/transactions/` | List transactions | CLIENT, BANKER |
| POST | `/api/transactions/` | Create transfer | CLIENT |

### User Management Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/users/bankers/` | List bankers | ADMIN |
| POST | `/api/users/bankers/` | Create banker | ADMIN |
| GET | `/api/users/clients/` | List clients | BANKER |
| POST | `/api/users/clients/` | Create client | BANKER |


## Development

### Running Tests

**Backend:**
```bash
docker-compose exec backend pytest
```

### Database Migrations

```bash
docker-compose exec backend python manage.py makemigrations

docker-compose exec backend python manage.py migrate
```

