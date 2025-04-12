from fastapi import APIRouter, Depends, HTTPException
from typing import List
from tenacity import retry, stop_after_attempt, retry_if_exception, wait_incrementing, before_sleep_log, after_log
import logging
from .db import (
    create_team,
    get_team,
    update_team,
    delete_team,
    get_all_teams,
)
from datetime import datetime, date
from .models import Team, TeamCRUD, Employee
from .auth import get_current_active_user
from .helper import is_db_error

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Teams CRUD endpoints
@router.post("/teams/", response_model=Team)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def create_team_endpoint(team_data: TeamCRUD, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        team_name = team_data.team_name
        if not team_name:
            raise HTTPException(status_code=400, detail="Team name is required")
        team_id = create_team(team_name)
        if not team_id:
            raise HTTPException(status_code=500, detail="Failed to create team")
        team = get_team(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        # Convert datetime objects to date
        if isinstance(team["created_at"], datetime):
            team["created_at"] = team["created_at"].date()
        if isinstance(team["updated_at"], datetime):
            team["updated_at"] = team["updated_at"].date()
        return Team(**team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create team: {e}")

@router.get("/teams/{team_id}", response_model=Team)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_team_endpoint(team_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        team = get_team(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if current_user.role != "ADMIN":
            if current_user.team_id != team_id:
                 raise HTTPException(status_code=403, detail="Unauthorized")
            
        # Convert datetime objects to date
        if isinstance(team["created_at"], datetime):
            team["created_at"] = team["created_at"].date()
        if isinstance(team["updated_at"], datetime):
            team["updated_at"] = team["updated_at"].date()
        return Team(**team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read team: {e}")

@router.put("/teams/{team_id}", response_model=Team)
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def update_team_endpoint(team_id: int, team_data: TeamCRUD, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        team_name = team_data.team_name
        if not team_name:
            raise HTTPException(status_code=400, detail="Team name is required")
        if not update_team(team_id, team_name):
            raise HTTPException(status_code=500, detail="Failed to update team")
        
        team = get_team(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Convert datetime objects to date
        if isinstance(team["created_at"], datetime):
            team["created_at"] = team["created_at"].date()
        if isinstance(team["updated_at"], datetime):
            team["updated_at"] = team["updated_at"].date()

        return Team(**team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update team: {e}")

@router.delete("/teams/{team_id}")
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def delete_team_endpoint(team_id: int, current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        if not delete_team(team_id):
            raise HTTPException(status_code=500, detail="Failed to delete team")
        return {"message": "Team deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete team: {e}")

@router.get("/teams/", response_model=List[Team])
@retry(
    retry=retry_if_exception(is_db_error), 
    stop=stop_after_attempt(3), 
    wait=wait_incrementing(start=5, increment=5), 
    before_sleep=before_sleep_log(logger, logging.INFO), 
    after=after_log(logger, logging.INFO)
)
async def read_all_teams_endpoint(current_user: Employee = Depends(get_current_active_user)):
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        teams = get_all_teams()
        if not teams:
            raise HTTPException(status_code=404, detail="No teams found")

        # Convert datetime objects to date
        for team in teams:
            if isinstance(team["created_at"], datetime):
                team["created_at"] = team["created_at"].date()
            if isinstance(team["updated_at"], datetime):
                team["updated_at"] = team["updated_at"].date()
        return [Team(**team) for team in teams]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read teams: {e}")
