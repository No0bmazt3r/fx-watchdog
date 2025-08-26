# FX Watchdog API

## Overview

FX Watchdog is a web service designed to extract foreign exchange (FX) rate information from uploaded images. It leverages Google's Generative AI (Gemini) to analyze image content and return structured data. The application features a role-based access control system with three user tiers (SuperAdmin, Admin, Ops User) and logs key actions for auditing purposes.

## Features

- **AI-Powered Data Extraction**: Uses Google's Gemini model to extract FX rates and other details from images.
- **Role-Based Access Control (RBAC)**:
  - **SuperAdmin**: Manages Admin users.
  - **Admin**: Manages Ops Users.
  - **Ops User**: Uploads images for processing.
- **Secure Authentication**: Employs JSON Web Tokens (JWT) for securing API endpoints.
- **Password Management**: Includes a temporary password system that requires users to change their password upon first login.
- **Audit Trail**: Logs important user actions, suchs as image uploads and rate savings.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Service**: Google Generative AI (`@google/generative-ai`)
- **Authentication**: JSON Web Tokens (JWT), bcryptjs
- **File Handling**: Multer
- **Environment Variables**: Dotenv
- **Containerization**: Docker, Docker Compose

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd fx-watchdog
    ```

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables. Replace the placeholder values with your actual credentials and desired settings.

    ```env
    PORT=3000
    MONGODB_URI="YOUR_MONGO_DB"
    JWT_SECRET=your_jwt_secret
    GOOGLE_API_KEY=YOUR_GEMINI_KEY
    ```

4.  **Install Docker and Docker Compose:**
    Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running on your system. This includes Docker Compose.

## Dockerization

The application is set up for Dockerization using a `Dockerfile` and `docker-compose.yml`.

-   **`Dockerfile`**: Defines the steps to build the Docker image for your Node.js application.
-   **`.dockerignore`**: Specifies files and directories to exclude from the Docker build context, keeping the image size optimized.
-   **`docker-compose.yml`**: Orchestrates the application service, allowing you to build and run your container with simple commands.

## Running the Application with Docker Compose

This is the recommended way to run the application, as it encapsulates all dependencies within Docker containers.

1.  **Ensure Docker Desktop is running.**

2.  **Build the Docker image (first time or after code changes):**
    If this is your first time running the application with Docker Compose, or if you have made changes to your application code (e.g., `index.js`, `package.json`, `services/` files) or the `Dockerfile` itself, you need to rebuild the image:
    ```bash
    docker-compose up --build
    ```
    This command will build the `fx-watchdog-app` image and then start the container.

3.  **Start the application (after initial build):**
    Once the image has been built, you can simply start the container without rebuilding it. This is faster for subsequent runs:
    ```bash
    docker-compose up
    ```
    Your application will start, and you should see logs indicating that the server is running on port 3000 and connected to MongoDB.

4.  **Stop the application:**
    To stop the running container, press `Ctrl+C` in the terminal where `docker-compose up` is running.

5.  **Stop and remove containers/networks (optional):**
    If you want to stop the containers and remove the associated Docker resources (like networks), use:
    ```bash
    docker-compose down
    ```

### Important Notes for Dockerized Environment:

-   **MongoDB Accessibility**: Ensure your MongoDB database (specified in `MONGODB_URI` in `.env`) is accessible from within the Docker container. If your MongoDB is running on `localhost` on your host machine, you might need to change `localhost` in your `MONGODB_URI` to `host.docker.internal` (for Docker Desktop on Windows/Mac) to allow the container to reach it.
-   **Port Conflicts**: If you encounter an error like `Port is already in use`, ensure no other application (including a previously run `node index.js` process) is using port 3000 on your host machine.

## API Usage (Postman Workflow)

To test the API, use the provided Postman collection:
`Resources/postman2/fx-watchdog-api.postman_collection.json`

**1. Ensure the server is running via Docker Compose.**

**2. Configure Postman:**
   - Import the collection.
   - Set a `base_url` variable in your Postman environment to `http://localhost:3000`.

**3. Authentication and User Setup:**
   - **Login as SuperAdmin**: Use the `Auth > 1. Login` request with `SuperAdmin` credentials to get a token. The Postman script will automatically set `authToken`, `isTemporaryPassword`, `userId`, `username`, and `userRole` collection variables.
   - **Create an Admin**: Use the `User Management > 1. SuperAdmin - Create Admin` request.
   - **Login as Admin**: Use the `Auth > 1. Login` request with the new Admin's credentials.
   - **Create an Ops User**: Use the `User Management > 2. Admin - Create Ops User` request.

**4. Image Upload Workflow:**
   - **Login as Ops User**: Use the `Auth > 1. Login` request with the new Ops User's credentials.
   - **Change Temporary Password**: Use the `Auth > 2. Change Password` request to set a new password. This request now returns `success: true` on success.
   - **Upload Image**: Use the `Ops User Workflow > 1. Upload Image (Protected)` request. Attach an image file to the `image` key in the form-data body.

The API will process the image and return the extracted FX rates in the response.