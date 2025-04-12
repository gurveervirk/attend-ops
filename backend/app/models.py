from datetime import date, time
from pydantic import BaseModel
from typing import Optional

class Employee(BaseModel):
    employee_id: int
    name: str
    email: str
    team_id: Optional[int]
    role: str

class EmployeeCRUD(BaseModel):
    name: str
    email: str
    team_id: Optional[int]
    role: str

class EmployeeCreate(BaseModel):
    name: str
    email: str
    team_id: Optional[int]
    role: str
    password: str

class User(Employee):
    password_hash: str

class Team(BaseModel):
    team_id: int
    team_name: str
    created_at: date
    updated_at: date

class TeamCRUD(BaseModel):
    team_name: str

class AttendanceRecord(BaseModel):
    record_id: int
    employee_id: int
    attendance_date: date
    status: str
    check_in_time: Optional[time]
    check_out_time: Optional[time]
    notes: Optional[str]

class AttendanceRecordCRUD(BaseModel):
    employee_id: int
    attendance_date: date
    status: str
    check_in_time: Optional[time]
    check_out_time: Optional[time]
    notes: Optional[str]

class AttendanceSummary(BaseModel):
    yesterday_summary: str
    last_week_summary: str