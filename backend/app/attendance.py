from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Union, Optional
from datetime import datetime, timedelta
from tenacity import retry, stop_after_attempt, retry_if_exception, wait_incrementing, before_sleep_log, after_log
from .db import (
    create_attendance_record,
    get_attendance_record,
    update_attendance_record,
    delete_attendance_record,
    get_all_attendance_records,
    get_attendance_records_by_employee,
    get_attendance_records_by_team,
    get_attendance_trends,
)
from .models import AttendanceRecord, Employee, AttendanceRecordCRUD, AttendanceSummary, TrendResult
from .auth import get_current_active_user
from .helper import is_db_error, summarize_attendance
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Attendance Records CRUD endpoints
@router.post("/attendance/", response_model=AttendanceRecord)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def create_attendance_endpoint(attendance_record: AttendanceRecordCRUD, current_user: Employee = Depends(get_current_active_user)):
    try:
        employee_id = attendance_record.employee_id
        attendance_date = attendance_record.attendance_date
        status = attendance_record.status
        check_in_time = attendance_record.check_in_time
        check_out_time = attendance_record.check_out_time
        notes = attendance_record.notes
        if not employee_id or not attendance_date or not status:
            raise HTTPException(status_code=400, detail="Missing required fields")
        if current_user.role != "ADMIN" and current_user.employee_id != employee_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        record_id = create_attendance_record(employee_id, attendance_date, status, check_in_time, check_out_time, notes)
        if not record_id:
            raise HTTPException(status_code=500, detail="Failed to create attendance record")
        return AttendanceRecord(
            record_id=record_id,
            employee_id=employee_id,
            attendance_date=attendance_date,
            status=status,
            check_in_time=check_in_time,
            check_out_time=check_out_time,
            notes=notes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create attendance record: {e}")

@router.get("/attendance/{record_id}", response_model=AttendanceRecord)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_attendance_endpoint(record_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        record = get_attendance_record(record_id)
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        if current_user.role != "ADMIN" and current_user.employee_id != record['employee_id']:
            raise HTTPException(status_code=403, detail="Unauthorized")
        return AttendanceRecord(**record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read attendance record: {e}")

@router.put("/attendance/{record_id}", response_model=AttendanceRecord)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def update_attendance_endpoint(record_id: int, attendance_record: AttendanceRecordCRUD, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        employee_id = attendance_record.employee_id
        attendance_date = attendance_record.attendance_date
        status = attendance_record.status
        check_in_time = attendance_record.check_in_time
        check_out_time = attendance_record.check_out_time
        notes = attendance_record.notes
        if not employee_id or not attendance_date or not status:
            raise HTTPException(status_code=400, detail="Missing required fields")
        if not update_attendance_record(record_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes):
            raise HTTPException(status_code=500, detail="Failed to update attendance record")
        record = get_attendance_record(record_id)
        return AttendanceRecord(**record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update attendance record: {e}")

@router.delete("/attendance/{record_id}")
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def delete_attendance_endpoint(record_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        if not delete_attendance_record(record_id):
            raise HTTPException(status_code=500, detail="Failed to delete attendance record")
        return {"message": "Attendance record deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete attendance record: {e}")

@router.get("/attendance/", response_model=List[AttendanceRecord])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_all_attendance_endpoint(current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        records = get_all_attendance_records()
        return [AttendanceRecord(**record) for record in records]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read attendance records: {e}")

async def _read_attendance_by_employee(employee_id: Union[int, str], current_user: Employee):
    """Helper function to fetch employee based on ID or 'current'."""
    if employee_id == "current":
        employee_id = current_user.employee_id
    else:
        try:
            employee_id = int(employee_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee_id format")

    records = get_attendance_records_by_employee(employee_id)
    if not records:
        raise HTTPException(status_code=404, detail="Records not found")
    
    employee_id = records[0]['employee_id']

    # If the user is not an admin, check if they are trying to access their own data
    if current_user.role != "ADMIN":
        if current_user.employee_id != employee_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    return [AttendanceRecord(**record) for record in records]

@router.get("/attendance/employee/{employee_id}", response_model=List[AttendanceRecord])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_attendance_by_employee_endpoint(employee_id: Union[int, str], current_user: Employee = Depends(get_current_active_user)):
    try:
        records = await _read_attendance_by_employee(employee_id, current_user)
        return records
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read attendance records: {e}")

@router.get("/attendance/team/{team_id}", response_model=List[AttendanceRecord])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_attendance_by_team_endpoint(team_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        records = get_attendance_records_by_team(team_id)
        return [AttendanceRecord(**record) for record in records]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read attendance records: {e}")

@router.get("/summarize_attendance/", response_model=AttendanceSummary)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
before_sleep=    before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def summarize_attendance_logs(current_user: Employee = Depends(get_current_active_user)):
    """Summarizes attendance logs for the last day and the last week."""
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")

        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        last_week_start = today - timedelta(days=7)

        all_records = get_all_attendance_records()

        # Filter records for yesterday
        yesterday_records = [
            record for record in all_records
            if record["attendance_date"] == yesterday
        ]

        # Filter records for the last week
        last_week_records = [
            record for record in all_records
            if last_week_start <= record["attendance_date"] <= today
        ]

        yesterday_summary = summarize_attendance(yesterday_records, "Yesterday")
        last_week_summary = summarize_attendance(last_week_records, "Last Week")

        return AttendanceSummary(
            yesterday_summary=yesterday_summary,
            last_week_summary=last_week_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to summarize attendance logs: {e}")

@router.get("/trends/", response_model=List[TrendResult])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def get_attendance_trends_endpoint(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    group_by: str = Query("team", description="Group results by 'team', 'employee', or 'status'"),
    employee_id: Optional[int] = Query(None, description="Filter by specific employee ID"),
    team_id: Optional[int] = Query(None, description="Filter by specific team ID"),
    status: Optional[str] = Query(None, description="Filter by specific attendance status (Present, Absent, WFH, Leave)"),
    current_user: Employee = Depends(get_current_active_user)
):
    """
    Get aggregated attendance trends within a date range.
    
    This endpoint provides insights into attendance patterns with flexible aggregation options:
    - Group by team, employee, or status
    - Filter by specific employee, team, or status
    - All results include counts and percentages
    
    Examples:
    - Get attendance distribution by team: /trends/?start_date=2025-01-01&end_date=2025-04-01&group_by=team
    - Get status breakdown for a specific employee: /trends/?start_date=2025-01-01&end_date=2025-04-01&group_by=employee&employee_id=42
    - Get overall status distribution: /trends/?start_date=2025-01-01&end_date=2025-04-01&group_by=status
    - Get WFH trends across all employees: /trends/?start_date=2025-01-01&end_date=2025-04-01&status=WFH&group_by=employee
    """
    try:
        # Validate date formats
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
        # Validate group_by parameter
        if group_by not in ["team", "employee", "status"]:
            raise HTTPException(status_code=400, detail="group_by must be 'team', 'employee', or 'status'")
        
        # Validate status parameter if provided
        if status and status not in ["Present", "Absent", "WFH", "Leave"]:
            raise HTTPException(status_code=400, detail="status must be 'Present', 'Absent', 'WFH', or 'Leave'")
            
        # Only admins can access this endpoint
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
            
        trends = get_attendance_trends(
            start_date=start_date,
            end_date=end_date,
            group_by=group_by,
            employee_id=employee_id,
            team_id=team_id,
            status=status,
        )
        
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve attendance trends: {e}")