from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from .models import Employee
from .helper import SECRET_KEY, ALGORITHM, get_employee_by_username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    employee = get_employee_by_username(username=username)
    if employee is None:
        raise HTTPException(status_code=401, detail="Employee not found")
    return employee

async def get_current_active_user(current_user: Employee = Depends(get_current_user)):
    return current_user
