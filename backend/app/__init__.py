from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from tenacity import retry, stop_after_attempt, retry_if_exception, wait_incrementing, before_sleep_log, after_log
from . import employees, teams, attendance, auth, ai
from .db import (
    create_employee,
)
from .models import (
    EmployeeCreate,
    Employee
)
from .helper import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_employee_by_username,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# FastAPI app
app = FastAPI(
    title="AI-enhanced Attendance Operations Platform",
    description="API for managing attendance records, teams, and employees.",
    version="1.0.0",
)

# CORS middleware
origins = [
    "http://localhost:8080",
    "*", # Allow all origins for development purposes
]

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(employees.router)
app.include_router(teams.router)
app.include_router(attendance.router)
app.include_router(ai.router)

# Endpoints
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    employee = get_employee_by_username(form_data.username)
    if not employee or not verify_password(form_data.password, employee.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": employee.email, "role": employee.role, "team_id": employee.team_id, "employee_id": employee.employee_id}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "role": employee.role}

# Employees CRUD endpoints
@app.post("/employees/", response_model=Employee)
@retry(
    retry=retry_if_exception(lambda e: isinstance(e, HTTPException) and e.status_code == 500), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def create_employee_endpoint(employee_data: EmployeeCreate, current_user: Employee = Depends(auth.get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        name = employee_data.name
        email = employee_data.email
        team_id = employee_data.team_id
        role = employee_data.role
        password = employee_data.password
        if not name or not email or not password:
            raise HTTPException(status_code=400, detail="Name, email, and password are required")
        hashed_password = get_password_hash(password)
        employee_id = create_employee(name, email, team_id, role, hashed_password)
        if not employee_id:
            raise HTTPException(status_code=500, detail="Failed to create employee")
        return Employee(
            employee_id=employee_id,
            name=name,
            email=email,
            team_id=team_id,
            role=role
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {e}")
