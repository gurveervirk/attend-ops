import datetime as dt
import jwt
import os
import psycopg2
from dotenv import load_dotenv
from fastapi import HTTPException
from passlib.context import CryptContext
from .db import (
    db_name,
    db_user,
    db_password,
    db_host,
    db_port,
    get_all_attendance_records,
)
from datetime import datetime, timedelta
from typing import List, Optional
from .models import User, AttendanceRecord

# Load environment variables from .env file
load_dotenv()

# Initialize CryptContext from ini file
bcrypt_context = CryptContext.from_path("passlib_config.ini")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: dt.timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = dt.datetime.now(dt.timezone.utc) + expires_delta
    else:
        expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return bcrypt_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return bcrypt_context.hash(password)

def get_employee_by_username(username: str):
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        with conn.cursor() as cur:
            cur.execute("SELECT employee_id, name, email, team_id, role, password_hash FROM employees WHERE email = %s;", (username,))
            employee = cur.fetchone()
            if employee:
                return User(
                    employee_id=employee[0],
                    name=employee[1],
                    email=employee[2],
                    team_id=employee[3],
                    role=employee[4],
                    password_hash=employee[5]
                )
            else:
                return None
    except psycopg2.Error as e:
        print(f"Error retrieving employee: {e}")
        return None
    finally:
        if conn:
            conn.close()

def is_db_error(exception: Exception) -> bool:
    """
    Return True if the exception is a database connection or server error.
    In this case, we will check for HTTP exceptions with status code 500.
    """
    return isinstance(exception, psycopg2.Error) or (isinstance(exception, HTTPException) and exception.status_code == 500)

def summarize_attendance(records: List[AttendanceRecord], timeframe: str) -> str:
    """Summarizes attendance records for a given timeframe."""
    if not records:
        return f"No attendance records found for {timeframe}."

    total_records = len(records)
    present_count = sum(1 for record in records if record['status'] == 'Present')
    absent_count = sum(1 for record in records if record['status'] == 'Absent')
    wfh_count = sum(1 for record in records if record['status'] == 'WFH')
    leave_count = sum(1 for record in records if record['status'] == 'Leave')

    summary = (
        f"Total Records: {total_records}\n"
        f"Present: {present_count}\n"
        f"Absent: {absent_count}\n"
        f"WFH: {wfh_count}\n"
        f"Leave: {leave_count}\n"
    )

    return summary

def get_attendance_data(timeframe: str, columns: Optional[List[str]] = None) -> str:
    """
    Retrieves attendance data for a specific timeframe.

    Args:
        timeframe (str): The timeframe for which to retrieve attendance data (e.g., "last week", "last month", "today").
        columns (Optional[List[str]], optional): The columns to include in the output. Defaults to None (all columns).

    Returns:
        str: A string representation of the attendance data.
    """
    today = datetime.now().date()
    all_records = get_all_attendance_records()

    if timeframe == "last week":
        start_date = today - timedelta(days=7)
        filtered_records = [
            record for record in all_records
            if start_date <= record["attendance_date"] <= today
        ]
    elif timeframe == "last month":
        start_date = today - timedelta(days=30)
        filtered_records = [
            record for record in all_records
            if start_date <= record["attendance_date"] <= today
        ]
    elif timeframe == "today":
        filtered_records = [
            record for record in all_records
            if record["attendance_date"] == today
        ]
    else:
        return "Invalid timeframe. Supported timeframes: last week, last month, today."

    if not filtered_records:
        return f"No attendance records found for {timeframe}."

    output = ""
    for record in filtered_records:
        record_str = ", ".join(f"{col}: {record[col]}" for col in record if columns is None or col in columns)
        output += f"({record_str})\n"

    return output