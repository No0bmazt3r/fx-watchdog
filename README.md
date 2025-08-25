# FX Watchdog API

## Overview

FX Watchdog is a web service designed to extract foreign exchange (FX) rate information from uploaded images and text. It leverages Google's Generative AI (Gemini) to analyze content and return structured data. The application features a role-based access control system (SuperAdmin, Admin, Ops User), comprehensive auditing, and a full suite of API endpoints for managing users, branches, and submissions.

This project has been significantly refactored for optimal code quality, maintainability, and performance.

## Features

- **AI-Powered Data Extraction**: Uses Google's Gemini model to extract FX rates from images or text.
- **Secure Authentication**: Employs JSON Web Tokens (JWT) for securing API endpoints, including a temporary password system for new users.
- **Role-Based Access Control (RBAC)**: Granular permissions for SuperAdmins, Admins, and Ops Users.
- **Full Audit Trail**: Logs all significant user actions for security and tracking.
- **Dynamic Branch Management**: API endpoints to dynamically create, view, and delete branches.
- **Comprehensive Upload Management**: Users can view their upload history, retrieve the latest upload, and discard their last submission.
- **Automated Rate Processing**: A background service processes submitted rates to determine the lowest and highest rates for each currency across branches.

---

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Service**: Google Generative AI (`@google/generative-ai`)
- **Authentication**: JSON Web Tokens (JWT), bcryptjs
- **File Handling**: Multer
- **Logging**: Winston
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest
- **Containerization**: Docker, Docker Compose

---

## Project Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
- A MongoDB database instance

### 1. Installation

Clone the repository and install the dependencies.

```bash
git clone <repository_url>
cd fx-watchdog
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root and add the following variables:

```env
# Server Configuration
PORT=3000

# Database
MONGODB_URI="YOUR_MONGO_DB_CONNECTION_STRING"

# Security
JWT_SECRET=your_super_secret_and_long_jwt_key

# Google AI
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. Running the Application

The recommended way to run the application is using Docker Compose.

```bash
# Build and start the containers (first time or after changes)
docker-compose up --build

# Start the application (if already built)
docker-compose up
```

The API will be available at `http://localhost:3000`.

### 4. Code Quality

This project is configured with Prettier and ESLint. Use the following commands to maintain code quality:

```bash
# Format all code
npm run format

# Lint and automatically fix issues
npm run lint -- --fix
```

### 5. Running Tests

Execute the test suite with Jest:

```bash
npm test
```

---

## API Endpoints

Below is a summary of the available API endpoints. All protected routes require a `Bearer Token` in the `Authorization` header.

### Authentication

| Method | Endpoint              | Description                               |
| :----- | :-------------------- | :---------------------------------------- |
| `POST` | `/api/auth/login`       | Authenticate a user and receive a JWT.    |
| `POST` | `/api/auth/change-password` | (Authenticated) Change the logged-in user's password. |

### User Management (Admin/SuperAdmin)

| Method   | Endpoint                  | Description                                      |
| :------- | :------------------------ | :----------------------------------------------- |
| `GET`    | `/api/users`              | Get a list of all users.                         |
| `POST`   | `/api/users`              | Create a new user (Admin or Ops User).           |
| `PATCH`  | `/api/users/:id/password` | Change another user's password.                  |
| `DELETE` | `/api/users/:id`          | Delete a user.                                   |

### Branch Management (Admin/SuperAdmin)

| Method   | Endpoint         | Description                   |
| :------- | :--------------- | :---------------------------- |
| `GET`    | `/api/branches`  | Get a list of all branches.   |
| `POST`   | `/api/branches`  | Create a new branch.          |
| `DELETE` | `/api/branches/:id` | Delete a branch.              |

### Upload & Submission (Ops User)

| Method   | Endpoint                   | Description                                       |
| :------- | :------------------------- | :------------------------------------------------ |
| `POST`   | `/api/uploads`             | Upload an image (`multipart/form-data`) or text (`application/json`) for AI extraction. |
| `GET`    | `/api/uploads/history`     | Get the authenticated user's upload history.      |
| `GET`    | `/api/uploads/latest`      | Get the most recent upload for the user.          |
| `DELETE` | `/api/uploads/last`        | Mark the user's last upload as "Rejected".        |
| `POST`   | `/api/submit`              | Submit the extracted data from an upload for processing. |

### Upload Administration (Admin/SuperAdmin)

| Method  | Endpoint                   | Description                                      |
| :------ | :------------------------- | :----------------------------------------------- |
| `GET`   | `/api/uploads`             | Get a paginated list of all uploads.             |
| `GET`   | `/api/uploads/:id`         | Get details for a specific upload by ID.         |
| `GET`   | `/api/uploads/image/:id`   | Retrieve the image file for a specific upload.   |
| `PATCH` | `/api/uploads/:id/status`  | Update the status of an upload (e.g., Approved, Rejected). |