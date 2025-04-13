# AI-enhanced Attendance Operations Platform

A comprehensive solution for managing employee attendance, team allocation, and administrative operations with AI-powered insights and decision support.

## Overview

The AI-enhanced Attendance Operations Platform is designed to streamline attendance management processes through an intuitive interface and intelligent backend services. The platform integrates modern frontend technologies with a robust backend API, providing features like real-time attendance tracking, team management, analytical reporting, and AI-assisted administrative support.

## Key Features

- **Secure Authentication**: OAuth and JWT-based authentication system
- **Employee Management**: Add, update, and track employee details and attendance records
- **Team Operations**: Create and manage teams with advanced allocation features
- **AI Assistant**: Natural language query system for administrators to gain insights and automate tasks
- **Analytics Dashboard**: Visual representations of attendance data and team performance
- **Role-Based Access Control**: Different permission levels for employees and administrators

## Architecture

The application follows a modern client-server architecture:

- **Frontend**: React-based SPA with Tailwind CSS for styling and state management
- **Backend**: FastAPI-powered Python service with modular design and OAuth/JWT security
- **Database**: Optimized schema design with proper indexing for high-performance queries
- **AI Integration**: Advanced agent workflow system for processing administrative queries

## Getting Started

### Prerequisites

- Node.js 16+ and npm/bun for frontend
- Python 3.10+ for backend
- Database (refer to backend README for configuration)
- Docker and Docker Compose (optional, for containerized setup)

### Setup Instructions

1. **Clone the repository**

   ```
   git clone https://github.com/gurveervirk/attend-ops.git
   cd attend-ops
   ```

2. **Backend Setup**

   ```
   cd backend
   pip install -r requirements.txt
   uvicorn app:app
   ```

   See backend/README.md for detailed configuration options.

3. **Frontend Setup**

   ```
   cd frontend
   npm install
   npm run dev
   ```

   See frontend/README.md for more information.

4. **Access the Application**
   - Frontend development server: http://localhost:8080
   - Backend API: http://localhost:8000
   - API documentation: http://localhost:8000/docs

### Alternative: Running with Docker Compose

You can also run the entire application stack using Docker Compose:

1. **Create a .env file** in the project root with the following variables:

   ```
   DB_PASSWORD=your_secure_password
   SECRET_KEY=your_secret_key
   GOOGLE_API_KEY=your_google_api_key
   ```

2. **Run Docker Compose**

   ```bash
   docker-compose up -d
   ```

3. **Access the containerized application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000
   - API documentation: http://localhost:8000/docs
