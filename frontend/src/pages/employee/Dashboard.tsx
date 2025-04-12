import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceApi, employeeApi, teamApi } from '@/lib/api';
import { Loader2, Calendar, Clock, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Employee {
  employee_id: string;
  name: string;
  email: string;
  team_id: string;
  role: string;
}

interface Team {
  team_id: string;
  team_name: string;
}

interface AttendanceRecord {
  record_id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  check_in_time: string;
  check_out_time: string;
  notes: string;
}

const Dashboard = () => {
  const { userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get employee information
        const employeeResponse = await employeeApi.getById('current');
        
        if (employeeResponse.error || !employeeResponse.data) {
          toast.error('Failed to load your profile');
          return;
        }
        
        const employeeData = employeeResponse.data;
        setEmployee(employeeData);
        
        // Get team information
        if (employeeData.team_id) {
          const teamResponse = await teamApi.getById(employeeData.team_id);
          if (!teamResponse.error && teamResponse.data) {
            setTeam(teamResponse.data);
          }
        }
        
        // Get recent attendance
        const attendanceResponse = await attendanceApi.getByEmployeeId(employeeData.employee_id);
        if (!attendanceResponse.error && attendanceResponse.data) {
          // Sort by date (newest first) and take the 5 most recent
          const sortedRecords = [...attendanceResponse.data]
            .sort((a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime())
            .slice(0, 5);
          
          setRecentAttendance(sortedRecords);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {employee?.name || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your attendance information
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Your Profile
            </CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {employee ? (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {employee.name}</p>
                <p><span className="font-medium">Email:</span> {employee.email}</p>
                <p><span className="font-medium">Team:</span> {team?.team_name || 'Loading...'}</p>
                <p><span className="font-medium">Role:</span> {employee.role}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Failed to load profile data
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Attendance
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentAttendance.length > 0 ? (
              <div className="space-y-2">
                {recentAttendance.map((record) => (
                  <div key={record.record_id} className="text-sm flex justify-between border-b pb-1 last:border-0">
                    <span>{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</span>
                    <span className={
                      record.status === 'PRESENT' 
                        ? 'text-green-600 font-medium' 
                        : record.status === 'ABSENT' 
                          ? 'text-red-600 font-medium' 
                          : 'text-amber-600 font-medium'
                    }>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent attendance records</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
