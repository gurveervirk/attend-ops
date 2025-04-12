from fastapi import APIRouter, Depends, HTTPException
from typing import List, Union
from tenacity import retry, stop_after_attempt, retry_if_exception, wait_incrementing, before_sleep_log, after_log
import logging
from .db import (
    get_employee,
    update_employee,
    delete_employee,
    get_all_employees,
)
from .models import Employee, EmployeeCRUD
from .auth import get_current_active_user
from .helper import is_db_error

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

async def _get_employee(employee_id: Union[int, str], current_user: Employee):
    """Helper function to fetch employee based on ID or 'current'."""
    if employee_id == "current":
        employee_id = current_user.employee_id
    else:
        try:
            employee_id = int(employee_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee_id format")

    employee = get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # If the user is not an admin, check if they are trying to access their own data
    if current_user.role != "ADMIN":
        if current_user.employee_id != employee_id and current_user.team_id != employee['team_id']:
            raise HTTPException(status_code=403, detail="Unauthorized")
    return Employee(**employee)

# Employees CRUD endpoints
@router.get("/employees/{employee_id}", response_model=Employee)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_employee_endpoint(employee_id: Union[int, str], current_user: Employee = Depends(get_current_active_user)):
    try:
        return await _get_employee(employee_id, current_user)
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read employee: {e}")

@router.put("/employees/{employee_id}", response_model=Employee)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def update_employee_endpoint(employee_id: int, employee_data: EmployeeCRUD, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        if not update_employee(employee_id, employee_data.name, employee_data.email, employee_data.team_id, employee_data.role):
            raise HTTPException(status_code=500, detail="Failed to update employee")
        employee = get_employee(employee_id)
        return Employee(**employee)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update employee: {e}")

@router.delete("/employees/{employee_id}")
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def delete_employee_endpoint(employee_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        if not delete_employee(employee_id):
            raise HTTPException(status_code=500, detail="Failed to delete employee")
        return {"message": "Employee deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete employee: {e}")

# Additional endpoints
@router.get("/employees/", response_model=List[Employee])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_all_employees_endpoint(current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        employees = get_all_employees()
        return [Employee(**employee) for employee in employees]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read employees: {e}")
