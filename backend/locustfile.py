from locust import HttpUser, task, between
import random

class AttendancePlatformUser(HttpUser):
    wait_time = between(0.1, 0.3)  # Simulate user think time between requests
    
    def on_start(self):
        """
        Optional: Authenticate the user at the start of the test.
        Replace with your actual authentication logic.
        """
        # Obtain an access token
        response = self.client.post("/token", data={"username": "ignacio.krammer@hotmail.com", "password": "password001"})
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
        else:
            print("Failed to authenticate:", response.text)
            self.interrupt()  # Stop the user if authentication fails

    @task(3)
    def get_all_employees(self):
        """
        Task: Get all employees (only for ADMIN).
        """
        headers = {"Authorization": f"Bearer {self.access_token}"}
        self.client.get("/employees/", headers=headers)

    @task(2)
    def get_all_teams(self):
        """
        Task: Get all teams (only for ADMIN).
        """
        headers = {"Authorization": f"Bearer {self.access_token}"}
        self.client.get("/teams/", headers=headers)

    @task(1)
    def get_all_attendance(self):
        """
        Task: Get all attendance records (only for ADMIN).
        """
        headers = {"Authorization": f"Bearer {self.access_token}"}
        self.client.get("/attendance/", headers=headers)

    @task(2)
    def get_attendance_by_employee(self):
         """
         Task: Get attendance records for a specific employee.
         """
         employee_id = random.randint(1, 100)  # Replace with a valid employee ID range
         headers = {"Authorization": f"Bearer {self.access_token}"}
         self.client.get(f"/attendance/employee/{employee_id}", headers=headers)
