# Real Estate Management System

A modern, full-stack Real Estate ERP frontend designed to simplify and centralize real estate business operations. EstateFlow helps manage projects, buildings, apartment bookings, installment payments, employees, and financial activities through a centralized dashboard.

## Overview

EstateFlow ERP provides a structured platform for real estate companies to manage their daily operations efficiently. It offers an intuitive dashboard, organized management modules, and secure role-based access to business resources.

The frontend communicates with a RESTful backend API to manage business data and authentication.

## Key Features

- **Dashboard:** Overview of projects, bookings, payments, and financial activities.
- **Project Management:** Organize and manage real estate projects.
- **Building Management:** Manage buildings, floors, and apartment units.
- **Booking Management:** Track apartment bookings and customer information.
- **Installment Management:** Monitor installment schedules and payment progress.
- **Financial Management:** Track financial transactions and view financial reports.
- **Employee Management:** Manage employees and their roles.
- **Role-Based Access Control:** Control access to system resources based on user roles.
- **Authentication:** Secure login, session management, and logout using HTTP-only cookies.
- **Notifications:** View system notifications and important updates.
- **Responsive Interface:** Dashboard-oriented UI designed for different screen sizes.

## Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend Integration
- REST API
- Cookie-Based Authentication
- Role-Based Access Control (RBAC)

### Database
- PostgreSQL

### Development Tools
- Git
- GitHub
- npm

## Project Architecture

The application follows a frontend-backend architecture:

- **Frontend:** Next.js application responsible for the user interface and client-side interactions.
- **Backend:** Express.js REST API responsible for business logic, authentication, and data processing.
- **Database:** PostgreSQL for structured data storage, accessed through Prisma ORM.

## Getting Started

Follow these instructions to run the frontend locally.

### Prerequisites

Make sure you have installed:

- Node.js (LTS recommended)
- npm
- Git
- A running EstateFlow backend API

### 1. Clone the Repository

```bash
git clone YOUR_FRONTEND_REPOSITORY_URL
```

### 2. Navigate to the Project

```bash
cd Real-State-ERP-Frontend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

If you use the Next.js API proxy configuration, configure:

```env
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_URL=http://localhost:5000
```

Replace the backend URL with your actual API address when using a hosted backend.

### 5. Run the Development Server

```bash
npm run dev
```

Open your browser and visit:

```text
http://localhost:3000
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production application |
| `npm run start` | Start the production server |
| `npm run lint` | Run linting, if configured |

## Backend Integration

EstateFlow frontend communicates with the Express.js backend through REST API endpoints.

The integration includes:

- Authentication and user session management.
- Project and building data management.
- Apartment booking and installment operations.
- Financial reports and payment information.
- Employee and notification management.

The backend uses PostgreSQL and Prisma ORM for database operations.

## Security

- HTTP-only cookie-based authentication.
- Role-based access control (RBAC).
- Organization-level data access restrictions enforced by the backend.
- Protected API communication.
- Environment-based configuration for sensitive values.

## Future Improvements

- Advanced analytics and reporting.
- Enhanced search, filtering, and sorting.
- Improved notification management.
- Additional financial and operational insights.
- Performance optimization and accessibility improvements.

## Author

**Mehedi Hasan Raju**

Full-Stack Developer

---

Simplifying Real Estate Management Through Technology.
