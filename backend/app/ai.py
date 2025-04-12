from fastapi import APIRouter, Depends, HTTPException
# from llama_index.llms.google_genai import GoogleGenAI
from llama_index.llms.gemini import Gemini
from llama_index.core.agent.workflow import FunctionAgent, AgentWorkflow
from llama_index.core.tools import FunctionTool
from llama_index.core.agent.workflow import (
    AgentOutput,
    ToolCall,
    ToolCallResult,
)
from datetime import datetime, timedelta
from pydantic import Field
from .helper import get_attendance_data
from .models import Employee
from .auth import get_current_active_user
from pydantic import BaseModel
import logging
from .db import (
    get_all_employees,
    get_all_teams,
    get_attendance_by_date_range,
    get_employee,
    get_team, 
    get_attendance_record,
    get_attendance_records_by_employee,
    get_attendance_records_by_team,
    get_employee_attendance_stats,
    get_team_attendance_stats,
    get_employees_without_attendance,
    get_attendance_by_status,
    search_employees,
    search_teams
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# System prompts for specialized agents
MANAGER_SYSTEM_PROMPT = """
Your name is "Manager Agent".
You are an intelligent assistant for an employee attendance management system. 
You analyze user queries and determine which specialist agent to delegate to.

Choose from these specialist agents:
1. Employee Agent: For questions about employee details, searching employees, etc.
2. Team Agent: For questions about team information, team membership, etc.
3. Attendance Agent: For questions about attendance records, statistics, trends, etc.

Your task is to determine which specialist is most appropriate for handling the user's query.
Handoff the query to the appropriate agent and provide a summary of the response, answering the user's question.

**IMPORTANT NOTES**:
- You will, more often than not, have to handoff to multiple agents, in an iterative manner, to get the final answer.
- You will have to analyze the user's query, and use the tools available to you to find relevant data.
- YOU WILL BE HANDED OFF TO BY THE OTHER AGENTS, AND YOU WILL PROVIDE THE FINAL ANSWER TO THE USER ONLY.
"""

EMPLOYEE_SYSTEM_PROMPT = """
Your name is "Employee Agent".
You are an Employee Data Specialist for an attendance management system.
You handle all employee-related queries, providing detailed information about employees in the system.

## Available Functions
1. `get_all_employees() -> List[dict]`
   - Retrieves all employees in the system

2. `get_employee(employee_id: int) -> dict`
   - Retrieves details for a specific employee by employee_id

3. `search_employees(name: Optional[str] = None, email: Optional[str] = None, team_id: Optional[int] = None, role: Optional[str] = None) -> List[dict]`
   - Searches for employees by name, email, team_id, or role

## Guidelines
- Employee roles are either "ADMIN" or "EMPLOYEE"
- When asked for specific employee details, provide all relevant information
- Format responses in a clear, structured way
- If searching by partial name, use the search_employees function
- Once done, handoff to the manager agent for further processing
"""

TEAM_SYSTEM_PROMPT = """
Your name is "Team Agent".
You are a Team Data Specialist for an attendance management system.
You handle all team-related queries, providing detailed information about teams in the system.

## Available Functions
1. `get_all_teams() -> List[dict]`
   - Retrieves all teams in the system

2. `get_team(team_id: int) -> dict`
   - Retrieves details for a specific team by team_id

3. `search_teams(team_name: Optional[str] = None) -> List[dict]`
   - Searches for teams by name

## Guidelines
- Format team data in a clear, structured way
- Include all available team information when responding to queries
- If searching by partial team name, use the search_teams function
- The query may required fetching team, employee, or attendance data
- Analyze the user's query, and use the tools available to you to find relevant team data
- Once done, **ALWAYS** handoff to the manager agent for further processing
"""

ATTENDANCE_SYSTEM_PROMPT = """
Your name is "Attendance Agent".
You are an Attendance Records Specialist for an attendance management system.
You handle queries about attendance data, statistics, and trends.

## Available Functions
1. `get_attendance_data(timeframe: str) -> str`
   - Retrieves attendance summary for a specific timeframe: "last week", "last month", or "today"
   - Use this function, if the query mentions timeframe like "last week", "last month", or "today"
   - The function returns all details about the attendance data for the specified timeframe

2. `get_attendance_by_date_range(start_date: str, end_date: str, employee_id: Optional[int] = None, status: Optional[str] = None) -> List[dict]`
   - Gets attendance records within a date range with optional employee and status filters
   - Date format should be YYYY-MM-DD

3. `get_attendance_records_by_employee(employee_id: int) -> List[dict]`
   - Gets all attendance records for a specific employee

4. `get_attendance_records_by_team(team_id: int) -> List[dict]`
   - Gets attendance records for all employees in a specific team

5. `get_employee_attendance_stats(employee_id: int, start_date: str, end_date: str) -> dict`
   - Gets attendance statistics (counts by status) for an employee within a date range

6. `get_team_attendance_stats(team_id: int, start_date: str, end_date: str) -> dict`
   - Gets attendance statistics (counts by status) for a team within a date range

7. `get_attendance_by_status(status: str, start_date: Optional[str] = None, end_date: Optional[str] = None, team_id: Optional[int] = None) -> List[dict]`
   - Gets attendance records with a specific status, with optional date range and team filters
   - Valid status values: "Present", "Absent", "WFH", "Leave"
   - Use this function if the query mentions a specific status, like "Present", "Absent", "WFH", or "Leave"
   - You may still use this function, if no date range or team_id is provided, but the query mentions a specific status

8. `get_employees_without_attendance(date: str, team_id: Optional[int] = None) -> List[dict]`
   - Gets employees who don't have an attendance record for a specific date

9. `get_attendance_record(record_id: int) -> dict`
   - Retrieves a specific attendance record by record_id

10. `get_today_date() -> str`
    - Gets today's date in YYYY-MM-DD format

11. `process_date(date: str, days: Optional[int], weeks: Optional[int], operation: str) -> str`
    - Processes a date string by adding or subtracting days or weeks

## Guidelines
- For date inputs, use the format YYYY-MM-DD
- Use the `get_today_date` function to get today's date
- Use the `process_date` function to add or subtract days, months, and years from a date
- Valid attendance status values are: "Present", "Absent", "WFH", "Leave"
- When summarizing data, present it in a clear, structured format
- Choose the most appropriate function based on the user's query
- Once done, handoff to the manager agent for further processing
- Prioritize using the tools available to you, before asking the manager agent for help
- Only ask the manager agent for help if you are unable to find a solution using the tools available to you, by handing off the query to the manager agent
"""

def get_today_date():
    """Get today's date in YYYY-MM-DD format."""
    return datetime.today().strftime('%Y-%m-%d')

def process_date(date: str = get_today_date(), days: int = 0, weeks: int = 0, operation: str = "add") -> str:
    """Process a date string by adding or subtracting days, months, and years."""
    date_obj = datetime.strptime(date, '%Y-%m-%d')
    
    if operation == "add":
        new_date = date_obj + timedelta(days=days, weeks=weeks)
    else:
        new_date = date_obj - timedelta(days=days, weeks=weeks)

    return new_date.strftime('%Y-%m-%d')

class AttendanceAgentWorkflow:
    """Workflow manager for attendance system agents"""
    
    def __init__(self, llm):
        """Initialize the agent workflow with specialized agents."""
        self.llm = llm
        self.handler = None
        
        # Create specialized tools for each agent
        employee_tools = [
            FunctionTool.from_defaults(
                fn=get_all_employees,
                name="get_all_employees",
                description="Retrieve all employees in the system.",
            ),
            FunctionTool.from_defaults(
                fn=get_employee,
                name="get_employee",
                description="Retrieve details for a specific employee by employee_id.",
            ),
            FunctionTool.from_defaults(
                fn=search_employees,
                name="search_employees",
                description="Search for employees by name, email, team_id, or role.",
            ),
        ]
        
        team_tools = [
            FunctionTool.from_defaults(
                fn=get_all_teams,
                name="get_all_teams",
                description="Retrieve all teams in the system.",
            ),
            FunctionTool.from_defaults(
                fn=get_team,
                name="get_team",
                description="Retrieve details for a specific team by team_id.",
            ),
            FunctionTool.from_defaults(
                fn=search_teams,
                name="search_teams",
                description="Search for teams by name.",
            ),
        ]
        
        attendance_tools = [
            FunctionTool.from_defaults(
                fn=get_attendance_data,
                name="get_attendance_data",
                description="Retrieve attendance data for a specific timeframe.",
            ),
            FunctionTool.from_defaults(
                fn=get_attendance_by_date_range,
                name="get_attendance_by_date_range",
                description="Retrieve attendance records within a specific date range with optional employee and status filters.",
            ),
            FunctionTool.from_defaults(
                fn=get_attendance_records_by_employee,
                name="get_attendance_records_by_employee",
                description="Retrieve all attendance records for a specific employee.",
            ),
            FunctionTool.from_defaults(
                fn=get_attendance_records_by_team,
                name="get_attendance_records_by_team",
                description="Retrieve attendance records for all employees in a specific team.",
            ),
            FunctionTool.from_defaults(
                fn=get_employee_attendance_stats,
                name="get_employee_attendance_stats",
                description="Get attendance statistics (counts by status) for an employee within a date range.",
            ),
            FunctionTool.from_defaults(
                fn=get_team_attendance_stats,
                name="get_team_attendance_stats",
                description="Get attendance statistics (counts by status) for a team within a date range.",
            ),
            FunctionTool.from_defaults(
                fn=get_attendance_by_status,
                name="get_attendance_by_status",
                description="Retrieve attendance records with a specific status and optional date range and team filters.",
            ),
            FunctionTool.from_defaults(
                fn=get_employees_without_attendance,
                name="get_employees_without_attendance",
                description="Find employees who don't have an attendance record for a specific date, optionally filtered by team.",
            ),
            FunctionTool.from_defaults(
                fn=get_attendance_record,
                name="get_attendance_record",
                description="Retrieve a specific attendance record by record_id.",
            ),
            FunctionTool.from_defaults(
                fn=get_today_date,
                name="get_today_date",
                description="Get today's date in YYYY-MM-DD format.",
            ),
            FunctionTool.from_defaults(
                fn=process_date,
                name="process_date",
                description="Process a date string by adding or subtracting days, months, and years.",
            ),
        ]
        
        # Create the specialized agents
        self.manager_agent = FunctionAgent(
            llm=llm,
            tools=[],
            name="manager_agent",
            system_prompt=MANAGER_SYSTEM_PROMPT,
            description="Manager Agent: Analyzes user queries and delegates to the appropriate specialist agent.",
            can_handoff_to=["employee_agent", "team_agent", "attendance_agent"],
        )
        
        self.employee_agent = FunctionAgent(
            llm=llm,
            tools=employee_tools,
            name="employee_agent",
            system_prompt=EMPLOYEE_SYSTEM_PROMPT,
            description="Employee Agent: Handles all employee-related queries.",
            can_handoff_to=["manager_agent"],
        )
        
        self.team_agent = FunctionAgent(
            llm=llm,
            tools=team_tools,
            name="team_agent",
            system_prompt=TEAM_SYSTEM_PROMPT,
            description="Team Agent: Handles all team-related queries.",
            can_handoff_to=["manager_agent"],
        )
        
        self.attendance_agent = FunctionAgent(
            llm=llm,
            tools=attendance_tools,
            name="attendance_agent",
            system_prompt=ATTENDANCE_SYSTEM_PROMPT,
            description="Attendance Agent: Handles all attendance-related queries.",
            can_handoff_to=["manager_agent"],
        )
        
        # Define the workflow
        self.workflow = AgentWorkflow(
            agents=[
                self.manager_agent,
                self.employee_agent,
                self.team_agent,
                self.attendance_agent
            ],
            root_agent="manager_agent"
        )
        
    async def chat(self, message: str) -> str:
        """Process a user message through the agent workflow."""
        try:
            current_agent = None

            ctx = self.handler.ctx if self.handler != None else None
            handler = self.workflow.run(
                ctx=ctx,
                user_msg=message
            )
            complete_response = None

            async for event in handler.stream_events():
                if (
                    hasattr(event, "current_agent_name")
                    and event.current_agent_name != current_agent
                ):
                    current_agent = event.current_agent_name
                    logging.info(f"🤖 Agent: {current_agent}")

                elif isinstance(event, AgentOutput):
                    if event.response.content:
                        logging.info("📤 Output: " + event.response.content)
                        complete_response = event.response.content
                    if event.tool_calls:
                        logging.info(
                            "🛠️  Planning to use tools: " +
                            str([call.tool_name for call in event.tool_calls]),
                        )
                elif isinstance(event, ToolCallResult):
                    logging.info(f"🔧 Tool Result ({event.tool_name}):")
                    logging.info(f"  Arguments: {event.tool_kwargs}")
                    logging.info(f"  Output: {event.tool_output}")
                elif isinstance(event, ToolCall):
                    logging.info(f"🔨 Calling Tool: {event.tool_name}")
                    logging.info(f"  With arguments: {event.tool_kwargs}")
            
            # Clean up the response to remove any "assistant:" prefixes
            if complete_response.startswith("assistant: "):
                complete_response = complete_response[len("assistant: "):]

            self.handler = handler

            if current_agent != "manager_agent":
                # If the last agent was not the manager agent, Reset the handler (FIX IN FUTURE)
                self.handler = None
                
            return complete_response or "I'm sorry, I couldn't process your request."
            
        except Exception as e:
            logger.error(f"Error in agent workflow: {str(e)}")
            return f"I encountered an error while processing your request: {str(e)}"

# Data model for chat input
class ChatInput(BaseModel):
    message: str = Field(..., description="The message to send to the agent")

# Instantiate the agent workflow for the FastAPI app
agent_workflow = AttendanceAgentWorkflow(llm=Gemini())

@router.post("/chat/")
async def chat(chat_input: ChatInput, current_user: Employee = Depends(get_current_active_user)):
    """Chat with an agent that can access attendance data."""
    try:
        # Check if the user is an admin, for now
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Get the message from the input
        message = chat_input.message

        # Log the message
        logger.info(f"User message: {message}")

        # Get the response from the agent workflow
        response = await agent_workflow.chat(message)

        return {"response": str(response)}
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")
