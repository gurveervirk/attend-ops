# AI-enhanced Attendance Operations Platform - Backend

The backend component of the AI-enhanced Attendance Operations Platform provides a robust, secure and scalable API for attendance management, team operations, and AI-assisted administrative functions.

## Technologies

- **FastAPI**: High-performance web framework for building APIs with Python 3.10+
- **SQLAlchemy**: ORM for database operations with connection pooling and transaction management
- **PyJWT**: JWT token generation and validation for secure authentication
- **OAuth2**: Implementation of OAuth2 password flow with Bearer token authentication
- **Pydantic**: Data validation using Python type annotations
- **LlamaIndex**: Integration with LLMs for AI processing and natural language understanding, along with Agent workflow management
- **PostgreSQL**: Relational database for storing employee and attendance data
- **Locust**: Load testing framework for performance validation
- **Python-Multipart**: Handling form data and file uploads
- **Passlib**: Password hashing and verification
- **Gemini**: AI model integration for natural language processing

## API Endpoints Overview

The API is organized into the following modules:

### Authentication

- `POST /token` - Obtain JWT access token by providing username and password credentials

### Employees

- `GET /employees/` - List all employees (paginated)
- `POST /employees/` - Create a new employee with credentials
- `GET /employees/{employee_id}` - Get employee details by ID
- `PUT /employees/{employee_id}` - Update employee details
- `DELETE /employees/{employee_id}` - Delete an employee

### Teams

- `GET /teams/` - List all teams
- `POST /teams/` - Create a new team
- `GET /teams/{team_id}` - Get team details by ID
- `PUT /teams/{team_id}` - Update team details
- `DELETE /teams/{team_id}` - Delete a team

### Attendance

- `GET /attendance/` - Get all attendance records
- `POST /attendance/` - Record new attendance entry
- `GET /attendance/{record_id}` - Get attendance record by ID
- `PUT /attendance/{record_id}` - Update attendance record
- `DELETE /attendance/{record_id}` - Delete attendance record
- `GET /attendance/employee/{employee_id}` - Get attendance records for specific employee
- `GET /attendance/team/{team_id}` - Get attendance records for all employees in a team
- `GET /summarize_attendance/` - Get attendance summary statistics for the last day and week

### AI Assistant (Admin only)

- `POST /chat/` - Submit natural language query for AI processing and get response

## API Models

The API uses the following data models:

### Employee

```json
{
  "employee_id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "team_id": 2,
  "role": "Developer"
}
```

### Team

```json
{
  "team_id": 2,
  "team_name": "Engineering",
  "created_at": "2025-01-15",
  "updated_at": "2025-04-01"
}
```

### AttendanceRecord

```json
{
  "record_id": 101,
  "employee_id": 1,
  "attendance_date": "2025-04-12",
  "status": "Present",
  "check_in_time": "09:00:00",
  "check_out_time": "17:30:00",
  "notes": "Regular day"
}
```

### AttendanceSummary

```json
{
  "yesterday_summary": "90% attendance rate with 45 employees present",
  "last_week_summary": "Average attendance rate of 88% with highest attendance on Tuesday"
}
```

### ChatInput

```json
{
  "message": "Show me departments with attendance issues last month"
}
```

## Database Schema

The database follows a normalized design with the following key tables:

- `employees` - Employee personal and professional information
- `attendance` - Daily attendance records with timestamps
- `teams` - Team information

Tables are properly indexed for query performance, with particular attention to date ranges for attendance queries and employee lookups.

## Security Features

The backend implements multiple layers of security:

- **Authentication**: OAuth2 password flow with JWT tokens
- **Authorization**: Role-based access control (employee vs admin)
- **Password Security**: Bcrypt hashing with salt using Passlib
- **Token Management**: Short-lived access tokens with configurable expiration
- **Input Validation**: Strict validation using Pydantic models
- **CORS Protection**: Configured for production environments

## Modular Architecture

The application was refactored with GitHub Copilot to follow a modular design:

```
app/
├── __init__.py     # Application entry point
├── auth.py         # Authentication and authorization
├── employees.py    # Employee management
├── attendance.py   # Attendance tracking
├── teams.py        # Team operations
├── ai.py           # AI assistant functionality
├── db.py           # Database connection and models
├── helper.py       # Utility functions
└── models.py       # Pydantic models for data validation
```

This structure improves maintainability, facilitates testing, and enables independent development of features.

## AI Agent Workflow

The platform includes a sophisticated AI agent workflow accessible to administrators:

### Architecture

1. **Query Processing**: Natural language inputs are parsed and classified
2. **Intent Recognition**: The system identifies the requested operation type
3. **Tool Selection**: Based on intent, appropriate database queries or analytical tools are selected
4. **Data Retrieval**: Relevant data is fetched from the database
5. **Reasoning**: AI models process the data to extract insights or make recommendations
6. **Response Generation**: Results are formatted into natural language responses

## Error Handling & Reliability

The backend implements comprehensive error handling:

- **Graceful Error Responses**: Structured error messages with appropriate HTTP status codes
- **Database Connection Retry Logic**: Automatic recovery from temporary database connection issues
- **Request Validation**: Pre-validation of all inputs before processing
- **Logging**: Detailed logging for troubleshooting with different severity levels
- **Transaction Management**: Database operations are wrapped in transactions to maintain data integrity

## Performance Optimizations

- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Carefully designed queries with proper indexing
- **Async Processing**: Leveraging FastAPI's asynchronous capabilities for non-blocking operations

## Load Testing

Performance validation was conducted using Locust:

- **Simulated Users**: Tests with concurrent users to measure system behavior under load
- **Endpoint Testing**: Comprehensive coverage of all API endpoints
- **Performance Metrics**: Response times, error rates, and throughput measurements
- **Bottleneck Identification**: Analysis to identify performance bottlenecks
- **Reports**: Detailed test reports available in `locust_test_reports/`

## Mock Data

Development and testing use realistic mock data:

- **Generated Datasets**: Created using Mockaroo and Gemini for realistic patterns
- **Scenario Coverage**: Data represents various business scenarios and edge cases
- **Volume Testing**: Large datasets to validate performance with realistic volumes

## Running the Backend

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment variables:

   ```bash
   # Create a .env file with the following variables
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=test
   DB_HOST=localhost
   DB_PORT=5432
   GOOGLE_API_KEY=your_google_api_key
   SECRET_KEY=your_secret_key
   ```

3. Run the server:

   ```bash
   python -m app
   ```

4. Access the API documentation:
   ```
   http://localhost:8000/docs
   ```
