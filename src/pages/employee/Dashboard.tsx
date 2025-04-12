
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceApi, employeeApi } from '@/lib/api';
import { Loader2, Calendar, Clock, Users, UserCircle } from 'lucide-react';
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

interface TeamMember {
  employee_id: string;
  name: string;
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // First get the user's employee data
        const employeeResponse = await employeeApi.getById('current'); // Assuming endpoint to get current user
        
        if (employeeResponse.error || !employeeResponse.data) {
          toast.error('Failed to load your profile');
          return;
        }
        
        const employeeData = employeeResponse.data;
        setEmployee(employeeData);
        
        // Get team information
        if (employeeData.team_id) {
          const teamResponse = await employeeApi.getById(employeeData.team_id);
          if (!teamResponse.error && teamResponse.data) {
            setTeam(teamResponse.data);
          }
          
          // Get team members
          const teamMembersResponse = await employeeApi.getAll();
          if (!teamMembersResponse.error && teamMembersResponse.data) {
            const filteredMembers = teamMembersResponse.data
              .filter((member: Employee) => member.team_id === employeeData.team_id && member.employee_id !== employeeData.employee_id)
              .map((member: Employee) => ({
                employee_id: member.employee_id,
                name: member.name
              }));
            
            setTeamMembers(filteredMembers);
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
                <Button variant="outline" size="sm" className="mt-2">
                  View Full Profile
                </Button>
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
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All Records
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent attendance records</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Team Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.employee_id} className="text-sm py-1 border-b last:border-0">
                    {member.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No team members found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Today's Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {/* Dynamically get today's status from API */}
                  Your status today: <span className="font-medium text-green-600">Present</span>
                </p>
              </div>
            </div>
            <Button disabled={userRole !== 'ADMIN'}>
              View Today's Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
