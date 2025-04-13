from dotenv import load_dotenv
import logging
import os
import psycopg2
from typing import Dict, Optional, List, Any, Union, Tuple, TypedDict, NoReturn
from datetime import date, time, datetime

# Set up logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables from .env file
load_dotenv()

# Connect to DB
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")

SCHEMA_SQL = """
DROP TYPE IF EXISTS attendance_status CASCADE;
CREATE TYPE attendance_status AS ENUM (
    'Present',
    'Absent',
    'WFH',
    'Leave'
);
CREATE TYPE employee_role AS ENUM (
    'ADMIN',
    'EMPLOYEE'
);

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_teams
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    team_id INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role employee_role NOT NULL DEFAULT 'EMPLOYEE',
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT fk_team
        FOREIGN KEY(team_id)
        REFERENCES teams(team_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_employees_team_id ON employees (team_id);
CREATE INDEX idx_employees_email ON employees (email);

CREATE TRIGGER set_timestamp_employees
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE attendance_records (
    record_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    status attendance_status NOT NULL,
    check_in_time TIME WITHOUT TIME ZONE NULL,
    check_out_time TIME WITHOUT TIME ZONE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee
        FOREIGN KEY(employee_id)
        REFERENCES employees(employee_id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_employee_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee_date ON attendance_records (employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_records (attendance_date);
CREATE INDEX idx_attendance_status ON attendance_records (status);

CREATE TRIGGER set_timestamp_attendance
BEFORE UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
"""

def initialize_database() -> None:
    """Connects to the PostgreSQL database and executes the schema creation SQL."""
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )

        # Create a cursor object
        with conn.cursor() as cur:
            # Execute the multi-statement SQL script
            cur.execute(SCHEMA_SQL)

        # Commit the changes to the database
        conn.commit()
        logging.info("Database changes committed.")

    except psycopg2.Error as e:
        logging.error(f"Error connecting to or interacting with PostgreSQL: {e}")
        # Rollback changes if any part of the transaction failed
        if conn:
            conn.rollback()
            logging.error("Transaction rolled back.")
    except Exception as e:
        logging.exception(f"An unexpected error occurred: {e}")
    finally:
        # Ensure the connection is closed even if errors occurred
        if conn is not None:
            conn.close()
            logging.info("Database connection closed.")

def create_team(team_name: str) -> Optional[int]:
    """Creates a new team in the teams table."""
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
            cur.execute("INSERT INTO teams (team_name) VALUES (%s) RETURNING team_id;", (team_name,))
            team_id = cur.fetchone()[0]
            conn.commit()
            logging.info(f"Team created with team_id: {team_id}")
            return team_id
    except psycopg2.Error as e:
        logging.error(f"Error creating team: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def get_team(team_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a team from the teams table by team_id."""
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
            cur.execute("SELECT team_id, team_name, created_at, updated_at FROM teams WHERE team_id = %s;", (team_id,))
            team = cur.fetchone()
            if team:
                logging.info(f"Team retrieved with team_id: {team_id}")
                return {
                    'team_id': team[0],
                    'team_name': team[1],
                    'created_at': team[2],
                    'updated_at': team[3]
                }
            else:
                logging.info(f"Team with team_id: {team_id} not found.")
                return None
    except psycopg2.Error as e:
        logging.error(f"Error retrieving team: {e}")
        return None
    finally:
        if conn:
            conn.close()

def get_team_by_name(team_name: str) -> Optional[Dict[str, Any]]:
    """Retrieves a team from the teams table by team_name."""
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
            cur.execute("SELECT team_id, team_name, created_at, updated_at FROM teams WHERE team_name = %s;", (team_name,))
            team = cur.fetchone()
            if team:
                logging.info(f"Team retrieved with team_name: {team_name}")
                return {
                    'team_id': team[0],
                    'team_name': team[1],
                    'created_at': team[2],
                    'updated_at': team[3]
                }
            else:
                logging.info(f"Team with team_name: {team_name} not found.")
                return None
    except psycopg2.Error as e:
        logging.error(f"Error retrieving team: {e}")
        return None
    finally:
        if conn:
            conn.close()

def update_team(team_id: int, team_name: str) -> bool:
    """Updates a team's name in the teams table."""
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
            cur.execute("UPDATE teams SET team_name = %s WHERE team_id = %s;", (team_name, team_id))
            conn.commit()
            logging.info(f"Team with team_id: {team_id} updated.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error updating team: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def delete_team(team_id: int) -> bool:
    """Deletes a team from the teams table."""
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
            cur.execute("DELETE FROM teams WHERE team_id = %s;", (team_id,))
            conn.commit()
            logging.info(f"Team with team_id: {team_id} deleted.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error deleting team: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_employee(name: str, email: str, team_id: Optional[int], role: str, password_hash: str) -> Optional[int]:
    """Creates a new employee in the employees table."""
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
            cur.execute(
                "INSERT INTO employees (name, email, team_id, role, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING employee_id;",
                (name, email, team_id, role, password_hash)
            )
            employee_id = cur.fetchone()[0]
            conn.commit()
            logging.info(f"Employee created with employee_id: {employee_id}")
            return employee_id
    except psycopg2.Error as e:
        logging.error(f"Error creating employee: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def get_employee(employee_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves an employee from the employees table by employee_id."""
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
            cur.execute("SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees WHERE employee_id = %s;", (employee_id,))
            employee = cur.fetchone()
            if employee:
                logging.info(f"Employee retrieved with employee_id: {employee_id}")
                return {
                    'employee_id': employee[0],
                    'name': employee[1],
                    'email': employee[2],
                    'team_id': employee[3],
                    'role': employee[4],
                    'created_at': employee[5],
                    'updated_at': employee[6]
                }
            else:
                logging.info(f"Employee with employee_id: {employee_id} not found.")
                return None
    except psycopg2.Error as e:
        logging.error(f"Error retrieving employee: {e}")
        return None
    finally:
        if conn:
            conn.close()

def get_employee_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves an employee by their email address."""
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
            cur.execute("SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees WHERE email = %s;", (email,))
            employee = cur.fetchone()
            if employee:
                logging.info(f"Employee retrieved with email: {email}")
                return {
                    'employee_id': employee[0],
                    'name': employee[1],
                    'email': employee[2],
                    'team_id': employee[3],
                    'role': employee[4],
                    'created_at': employee[5],
                    'updated_at': employee[6]
                }
            else:
                logging.info(f"Employee with email: {email} not found.")
                return None
    except psycopg2.Error as e:
        logging.error(f"Error retrieving employee by email: {e}")
        return None
    finally:
        if conn:
            conn.close()

def search_employees(name: Optional[str] = None, email: Optional[str] = None, team_id: Optional[int] = None, role: Optional[str] = None) -> List[Dict[str, Any]]:
    """Searches for employees based on one or more criteria."""
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        query = "SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees WHERE 1=1"
        params = []

        if name:
            query += " AND name ILIKE %s"
            params.append(f"%{name}%")
        if email:
            query += " AND email ILIKE %s"
            params.append(f"%{email}%")
        if team_id:
            query += " AND team_id = %s"
            params.append(team_id)
        if role:
            query += " AND role = %s"
            params.append(role)

        with conn.cursor() as cur:
            cur.execute(query, params)
            employees = cur.fetchall()
            return [{
                'employee_id': employee[0],
                'name': employee[1],
                'email': employee[2],
                'team_id': employee[3],
                'role': employee[4],
                'created_at': employee[5],
                'updated_at': employee[6]
            } for employee in employees]
    except psycopg2.Error as e:
        logging.error(f"Error searching employees: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_employees_by_team(team_id: int) -> List[Dict[str, Any]]:
    """Retrieves all employees belonging to a specific team."""
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
            cur.execute("SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees WHERE team_id = %s;", (team_id,))
            employees = cur.fetchall()
            return [{
                'employee_id': employee[0],
                'name': employee[1],
                'email': employee[2],
                'team_id': employee[3],
                'role': employee[4],
                'created_at': employee[5],
                'updated_at': employee[6]
            } for employee in employees]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving employees by team: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_employees_by_role(role: str) -> List[Dict[str, Any]]:
    """Retrieves all employees with a specific role."""
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
            cur.execute("SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees WHERE role = %s;", (role,))
            employees = cur.fetchall()
            return [{
                'employee_id': employee[0],
                'name': employee[1],
                'email': employee[2],
                'team_id': employee[3],
                'role': employee[4],
                'created_at': employee[5],
                'updated_at': employee[6]
            } for employee in employees]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving employees by role: {e}")
        return []
    finally:
        if conn:
            conn.close()

def search_teams(team_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """Searches for teams based on name."""
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        query = "SELECT team_id, team_name, created_at, updated_at FROM teams WHERE 1=1"
        params = []

        if team_name:
            query += " AND team_name ILIKE %s"
            params.append(f"%{team_name}%")

        with conn.cursor() as cur:
            cur.execute(query, params)
            teams = cur.fetchall()
            return [{
                'team_id': team[0],
                'team_name': team[1],
                'created_at': team[2],
                'updated_at': team[3]
            } for team in teams]
    except psycopg2.Error as e:
        logging.error(f"Error searching teams: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_attendance_by_date_range(start_date: str, end_date: str, employee_id: Optional[int] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves attendance records within a date range with optional employee and status filters."""
    conn = None
    # Convert string dates to date objects
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        query = "SELECT record_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes, created_at, updated_at FROM attendance_records WHERE attendance_date BETWEEN %s AND %s"
        params = [start_date, end_date]

        if employee_id:
            query += " AND employee_id = %s"
            params.append(employee_id)
        if status:
            query += " AND status = %s"
            params.append(status)

        query += " ORDER BY attendance_date"

        with conn.cursor() as cur:
            cur.execute(query, params)
            records = cur.fetchall()
            return [{
                'record_id': record[0],
                'employee_id': record[1],
                'attendance_date': record[2],
                'status': record[3],
                'check_in_time': record[4],
                'check_out_time': record[5],
                'notes': record[6],
                'created_at': record[7],
                'updated_at': record[8]
            } for record in records]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance by date range: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_employee_attendance_stats(employee_id: int, start_date: str, end_date: str) -> Dict[str, int]:
    """Retrieves attendance statistics for an employee within a date range."""
    conn = None
    # Convert string dates to date objects
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    status,
                    COUNT(status) as count
                FROM attendance_records
                WHERE employee_id = %s
                AND attendance_date BETWEEN %s AND %s
                GROUP BY status;
            """, (employee_id, start_date, end_date))
            
            stats = cur.fetchall()
            return {row[0]: row[1] for row in stats}
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance stats: {e}")
        return {}
    finally:
        if conn:
            conn.close()

def get_team_attendance_stats(team_id: int, start_date: str, end_date: str) -> Dict[str, int]:
    """Retrieves attendance statistics for an entire team within a date range."""
    conn = None
    # Convert string dates to date objects
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    ar.status,
                    COUNT(ar.status) as count
                FROM attendance_records ar
                JOIN employees e ON ar.employee_id = e.employee_id
                WHERE e.team_id = %s
                AND ar.attendance_date BETWEEN %s AND %s
                GROUP BY ar.status;
            """, (team_id, start_date, end_date))
            
            stats = cur.fetchall()
            return {row[0]: row[1] for row in stats}
    except psycopg2.Error as e:
        logging.error(f"Error retrieving team attendance stats: {e}")
        return {}
    finally:
        if conn:
            conn.close()

def get_attendance_by_status(status: str, start_date: Optional[str] = None, end_date: Optional[str] = None, team_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Retrieves attendance records by status with optional date range and team filters."""
    conn = None
    # Convert string dates to date objects if provided
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        
        query = "SELECT ar.record_id, ar.employee_id, ar.attendance_date, ar.status, ar.check_in_time, ar.check_out_time, ar.notes, ar.created_at, ar.updated_at"
        
        if team_id:
            query += " FROM attendance_records ar JOIN employees e ON ar.employee_id = e.employee_id WHERE ar.status = %s AND e.team_id = %s"
            params = [status, team_id]
        else:
            query += " FROM attendance_records ar WHERE ar.status = %s"
            params = [status]
            
        if start_date and end_date:
            query += " AND ar.attendance_date BETWEEN %s AND %s"
            params.append(start_date)
            params.append(end_date)
        elif start_date:
            query += " AND ar.attendance_date >= %s"
            params.append(start_date)
        elif end_date:
            query += " AND ar.attendance_date <= %s"
            params.append(end_date)
            
        with conn.cursor() as cur:
            cur.execute(query, params)
            records = cur.fetchall()
            return [{
                'record_id': record[0],
                'employee_id': record[1],
                'attendance_date': record[2],
                'status': record[3],
                'check_in_time': record[4],
                'check_out_time': record[5],
                'notes': record[6],
                'created_at': record[7],
                'updated_at': record[8]
            } for record in records]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance by status: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_employees_without_attendance(date: str, team_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Find employees who don't have an attendance record for a specific date."""
    conn = None
    # Convert string date to date object
    date = datetime.strptime(date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        
        query = """
            SELECT e.employee_id, e.name, e.email, e.team_id, e.role
            FROM employees e
            WHERE e.employee_id NOT IN (
                SELECT ar.employee_id
                FROM attendance_records ar
                WHERE ar.attendance_date = %s
            )
        """
        params = [date]
        
        if team_id:
            query += " AND e.team_id = %s"
            params.append(team_id)
            
        with conn.cursor() as cur:
            cur.execute(query, params)
            employees = cur.fetchall()
            return [{
                'employee_id': employee[0],
                'name': employee[1],
                'email': employee[2],
                'team_id': employee[3],
                'role': employee[4]
            } for employee in employees]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving employees without attendance: {e}")
        return []
    finally:
        if conn:
            conn.close()

def update_employee(employee_id: int, name: str, email: str, team_id: Optional[int], role: str) -> bool:
    """Updates an employee's details in the employees table."""
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
            cur.execute(
                "UPDATE employees SET name = %s, email = %s, team_id = %s, role = %s WHERE employee_id = %s;",
                (name, email, team_id, role, employee_id)
            )
            conn.commit()
            logging.info(f"Employee with employee_id: {employee_id} updated.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error updating employee: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def delete_employee(employee_id: int) -> bool:
    """Deletes an employee from the employees table."""
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
            cur.execute("DELETE FROM employees WHERE employee_id = %s;", (employee_id,))
            conn.commit()
            logging.info(f"Employee with employee_id: {employee_id} deleted.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error deleting employee: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_attendance_record(employee_id: int, attendance_date: date, status: str, check_in_time: Optional[time], check_out_time: Optional[time], notes: Optional[str]) -> Optional[int]:
    """Creates a new attendance record in the attendance_records table."""
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
            cur.execute(
                "INSERT INTO attendance_records (employee_id, attendance_date, status, check_in_time, check_out_time, notes) VALUES (%s, %s, %s, %s, %s, %s) RETURNING record_id;",
                (employee_id, attendance_date, status, check_in_time, check_out_time, notes)
            )
            record_id = cur.fetchone()[0]
            conn.commit()
            logging.info(f"Attendance record created with record_id: {record_id}")
            return record_id
    except psycopg2.Error as e:
        logging.error(f"Error creating attendance record: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def get_attendance_record(record_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves an attendance record from the attendance_records table by record_id."""
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
            cur.execute("SELECT record_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes, created_at, updated_at FROM attendance_records WHERE record_id = %s;", (record_id,))
            record = cur.fetchone()
            if record:
                logging.info(f"Attendance record retrieved with record_id: {record_id}")
                return {
                    'record_id': record[0],
                    'employee_id': record[1],
                    'attendance_date': record[2],
                    'status': record[3],
                    'check_in_time': record[4],
                    'check_out_time': record[5],
                    'notes': record[6],
                    'created_at': record[7],
                    'updated_at': record[8]
                }
            else:
                logging.info(f"Attendance record with record_id: {record_id} not found.")
                return None
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance record: {e}")
        return None
    finally:
        if conn:
            conn.close()

def update_attendance_record(record_id: int, employee_id: int, attendance_date: date, status: str, check_in_time: Optional[time], check_out_time: Optional[time], notes: Optional[str]) -> bool:
    """Updates an attendance record's details in the attendance_records table."""
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
            cur.execute(
                "UPDATE attendance_records SET employee_id = %s, attendance_date = %s, status = %s, check_in_time = %s, check_out_time = %s, notes = %s WHERE record_id = %s;",
                (employee_id, attendance_date, status, check_in_time, check_out_time, notes, record_id)
            )
            conn.commit()
            logging.info(f"Attendance record with record_id: {record_id} updated.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error updating attendance record: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def delete_attendance_record(record_id: int) -> bool:
    """Deletes an attendance record from the attendance_records table."""
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
            cur.execute("DELETE FROM attendance_records WHERE record_id = %s;", (record_id,))
            conn.commit()
            logging.info(f"Attendance record with record_id: {record_id} deleted.")
            return True
    except psycopg2.Error as e:
        logging.error(f"Error deleting attendance record: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def get_all_employees() -> List[Dict[str, Any]]:
    """Retrieves all employees from the employees table."""
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
            cur.execute("SELECT employee_id, name, email, team_id, role, created_at, updated_at FROM employees;")
            employees = cur.fetchall()
            return [{
                'employee_id': employee[0],
                'name': employee[1],
                'email': employee[2],
                'team_id': employee[3],
                'role': employee[4],
            } for employee in employees]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving all employees: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_all_teams() -> List[Dict[str, Any]]:
    """Retrieves all teams from the teams table."""
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
            cur.execute("SELECT team_id, team_name, created_at, updated_at FROM teams;")
            teams = cur.fetchall()
            return [{
                'team_id': team[0],
                'team_name': team[1],
                'created_at': team[2],
                'updated_at': team[3]
            } for team in teams]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving all teams: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_all_attendance_records() -> List[Dict[str, Any]]:
    """Retrieves all attendance records from the attendance_records table."""
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
            cur.execute("SELECT record_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes, created_at, updated_at FROM attendance_records;")
            records = cur.fetchall()
            return [{
                'record_id': record[0],
                'employee_id': record[1],
                'attendance_date': record[2],
                'status': record[3],
                'check_in_time': record[4],
                'check_out_time': record[5],
                'notes': record[6],
            } for record in records]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving all attendance records: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_attendance_records_by_employee(employee_id: int) -> List[Dict[str, Any]]:
    """Retrieves attendance records for a specific employee from the attendance_records table."""
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
            cur.execute("SELECT record_id, employee_id, attendance_date, status, check_in_time, check_out_time, notes, created_at, updated_at FROM attendance_records WHERE employee_id = %s;", (employee_id,))
            records = cur.fetchall()
            return [{
                'record_id': record[0],
                'employee_id': record[1],
                'attendance_date': record[2],
                'status': record[3],
                'check_in_time': record[4],
                'check_out_time': record[5],
                'notes': record[6],
                'created_at': record[7],
                'updated_at': record[8]
            } for record in records]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance records by employee: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_attendance_records_by_team(team_id: int) -> List[Dict[str, Any]]:
    """Retrieves attendance records for all employees in a specific team."""
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
            # Join employees and attendance_records tables to filter by team_id
            cur.execute("""
                SELECT ar.record_id, ar.employee_id, ar.attendance_date, ar.status, ar.check_in_time, ar.check_out_time, ar.notes, ar.created_at, ar.updated_at
                FROM attendance_records ar
                JOIN employees e ON ar.employee_id = e.employee_id
                WHERE e.team_id = %s;
            """, (team_id,))
            records = cur.fetchall()
            return [{
                'record_id': record[0],
                'employee_id': record[1],
                'attendance_date': record[2],
                'status': record[3],
                'check_in_time': record[4],
                'check_out_time': record[5],
                'notes': record[6],
                'created_at': record[7],
                'updated_at': record[8]
            } for record in records]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance records by team: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_attendance_trends(
    start_date: str,
    end_date: str,
    group_by: str = "team",
    employee_id: Optional[int] = None,
    team_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieves attendance trends data aggregated by team or employee within a date range,
    with optional filtering by specific employee, team, or status.
    
    Args:
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
        group_by (str): Group results by 'team' or 'employee'
        employee_id (Optional[int]): Filter by specific employee ID
        team_id (Optional[int]): Filter by specific team ID
        status (Optional[str]): Filter by specific attendance status
        limit (int, optional): Limit the number of results
        
    Returns:
        List of dictionaries containing the aggregated attendance data
    """
    conn = None
    # Convert string dates to date objects
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        
        params = [start_date, end_date]
        where_clauses = ["ar.attendance_date BETWEEN %s AND %s"]
        
        # Add filters if provided
        if employee_id:
            where_clauses.append("e.employee_id = %s")
            params.append(employee_id)
        
        if team_id:
            where_clauses.append("e.team_id = %s")
            params.append(team_id)
            
        if status:
            where_clauses.append("ar.status = %s")
            params.append(status)
        
        where_clause = " AND ".join(where_clauses)
        
        if group_by == "team":
            query = f"""
                SELECT 
                    t.team_id,
                    t.team_name,
                    ar.status,
                    COUNT(ar.record_id) as count,
                    COUNT(ar.record_id) * 100.0 / 
                        NULLIF(SUM(COUNT(ar.record_id)) OVER (PARTITION BY t.team_id), 0) as percentage,
                    MIN(ar.attendance_date) as earliest_date,
                    MAX(ar.attendance_date) as latest_date
                FROM attendance_records ar
                JOIN employees e ON ar.employee_id = e.employee_id
                JOIN teams t ON e.team_id = t.team_id
                WHERE {where_clause}
                GROUP BY t.team_id, t.team_name, ar.status
                ORDER BY t.team_name, ar.status
            """
        elif group_by == "status":
            query = f"""
                SELECT 
                    ar.status,
                    COUNT(ar.record_id) as count,
                    COUNT(ar.record_id) * 100.0 / 
                        NULLIF(SUM(COUNT(ar.record_id)) OVER (), 0) as percentage,
                    MIN(ar.attendance_date) as earliest_date,
                    MAX(ar.attendance_date) as latest_date
                FROM attendance_records ar
                JOIN employees e ON ar.employee_id = e.employee_id
                LEFT JOIN teams t ON e.team_id = t.team_id
                WHERE {where_clause}
                GROUP BY ar.status
                ORDER BY ar.status
            """
        else:  # group_by == "employee"
            query = f"""
                SELECT 
                    e.employee_id,
                    e.name as employee_name,
                    ar.status,
                    COUNT(ar.record_id) as count,
                    COUNT(ar.record_id) * 100.0 / 
                        NULLIF(SUM(COUNT(ar.record_id)) OVER (PARTITION BY e.employee_id), 0) as percentage,
                    MIN(ar.attendance_date) as earliest_date,
                    MAX(ar.attendance_date) as latest_date
                FROM attendance_records ar
                JOIN employees e ON ar.employee_id = e.employee_id
                WHERE {where_clause}
                GROUP BY e.employee_id, e.name, ar.status
                ORDER BY e.name, ar.status
            """
            
        with conn.cursor() as cur:
            cur.execute(query, params)
            results = cur.fetchall()
            
            if group_by == "team":
                return [{
                    'team_id': result[0],
                    'team_name': result[1],
                    'status': result[2],
                    'count': result[3],
                    'percentage': float(result[4]) if result[4] is not None else 0.0,
                    'earliest_date': result[5],
                    'latest_date': result[6]
                } for result in results]
            elif group_by == "status":
                return [{
                    'status': result[0],
                    'count': result[1],
                    'percentage': float(result[2]) if result[2] is not None else 0.0,
                    'earliest_date': result[3],
                    'latest_date': result[4]
                } for result in results]
            else:  # group_by == "employee"
                return [{
                    'employee_id': result[0],
                    'employee_name': result[1],
                    'status': result[2],
                    'count': result[3],
                    'percentage': float(result[4]) if result[4] is not None else 0.0,
                    'earliest_date': result[5],
                    'latest_date': result[6]
                } for result in results]
    except psycopg2.Error as e:
        logging.error(f"Error retrieving attendance trends: {e}")
        return []
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Basic check to ensure credentials were loaded
    if not all([db_name, db_user, db_password, db_host, db_port]):
        logging.error("Error: Database configuration is missing in .env file or environment variables.")
    else:
        initialize_database()