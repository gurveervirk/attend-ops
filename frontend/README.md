# AI-enhanced Attendance Operations Platform - Frontend

The frontend application for the AI-enhanced Attendance Operations Platform provides an intuitive and responsive user interface for managing employee attendance, team structures, and administrative operations.

## Technologies Used

- **React**: Component-based UI library for building the interface
- **Vite**: Next-generation frontend build tooling for fast development and optimized production builds
- **TypeScript**: Static typing for improved developer experience and code quality
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **ShadcnUI**: Customizable component library built on Tailwind CSS
- **React Router**: Declarative routing for React applications
- **Bun**: JavaScript runtime and package manager for fast dependency installation

## Development Approach

The application was initially scaffolded using [lovable.dev](https://lovable.dev), providing a solid foundation with best practices for modern React applications. This scaffolding was then extensively customized and enhanced with GitHub Copilot to implement the specific features and workflows required by the attendance management system.

## Key Features & Views

### Authentication
- **Login Page**: Secure authentication with username/password
- **Protected Routes**: Role-based access control for different user types

### Dashboard
- **Overview Cards**: Quick stats showing attendance metrics and team information
- **Recent Activity**: Timeline of recent attendance events
- **Attendance Trends**: Graphical representation of attendance data over time, with appropriate filters and selectors

### Employee Management
- **Employee Directory**: Searchable and filterable list of all employees
- **Employee Profiles**: Detailed view of employee information

### Attendance Tracking
- **Check-in/Check-out**: Interface for recording daily attendance
- **Filter Options**: Filter attendance records by date, employee, or team

### Team Management
- **Team Details**: Team composition, id, name and creation/modification dates
- **Team Builder**: Interface for creating new teams

### Admin AI Assistant
- **Natural Language Queries**: Interface for submitting queries to the AI assistant (Agentic), like a chat interface
- **Response Display**: View AI-generated responses and insights

## Component Structure

The frontend follows a modular architecture with:

- **Layout Components**: Page templates and navigation structures
- **Feature Components**: Complex components tied to specific features
- **UI Components**: Reusable interface elements
- **Hooks**: Custom React hooks for shared logic
- **Services**: API interaction and data processing
- **Stores**: State management
- **Utils**: Utility functions and helpers

## Responsive Design

The interface is fully responsive, providing an optimal experience across:

- Desktop workstations
- Laptops
- Tablets
- Mobile devices

## Development Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```