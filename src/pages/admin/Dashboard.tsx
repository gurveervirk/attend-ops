
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceApi, employeeApi, teamApi } from '@/lib/api';
import { Loader2, Users, Building2, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  totalTeams: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceByStatus: { name: string; value: number }[];
  attendanceByDepartment: { name: string; value: number }[];
  recentActivity: any[];
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalTeams: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    attendanceByStatus: [],
    attendanceByDepartment: [],
    recentActivity: []
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Get summary data (assuming this is a pre-computed endpoint)
        const summaryResponse = await attendanceApi.getSummary();
        
        if (summaryResponse.error || !summaryResponse.data) {
          toast.error('Failed to load attendance summary');
          return;
        }
        
        const summary = summaryResponse.data;
        
        // Get employees count
        const employeesResponse = await employeeApi.getAll();
        const totalEmployees = !employeesResponse.error && employeesResponse.data ? 
          employeesResponse.data.length : 0;
        
        // Get teams count
        const teamsResponse = await teamApi.getAll();
        const totalTeams = !teamsResponse.error && teamsResponse.data ? 
          teamsResponse.data.length : 0;
        
        // Sample data for charts (in a real app, this would come from the API)
        const attendanceByStatus = [
          { name: 'Present', value: summary.present_count || 28 },
          { name: 'Absent', value: summary.absent_count || 5 },
          { name: 'Late', value: summary.late_count || 8 },
          { name: 'On Leave', value: summary.leave_count || 3 },
        ];
        
        const attendanceByDepartment = [
          { name: 'Engineering', value: 18 },
          { name: 'Sales', value: 12 },
          { name: 'Marketing', value: 8 },
          { name: 'HR', value: 5 },
          { name: 'Finance', value: 7 },
        ];
        
        setStats({
          totalEmployees,
          totalTeams,
          presentToday: summary.present_today || 35,
          absentToday: summary.absent_today || 3,
          lateToday: summary.late_today || 5,
          onLeaveToday: summary.on_leave_today || 2,
          attendanceByStatus,
          attendanceByDepartment,
          recentActivity: summary.recent_activity || []
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
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
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of attendance statistics and employee data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teams
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              Active departments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Present Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% of total employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Absent Today
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.absentToday / stats.totalEmployees) * 100)}% of total employees
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Attendance by Status</CardTitle>
            <CardDescription>
              Distribution of attendance statuses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.attendanceByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.attendanceByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Attendance by Department</CardTitle>
            <CardDescription>
              Employee attendance broken down by department
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.attendanceByDepartment}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Overview</CardTitle>
          <CardDescription>
            Quick summary of today's attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Present</p>
                <p className="text-2xl font-bold">{stats.presentToday}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Absent</p>
                <p className="text-2xl font-bold">{stats.absentToday}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Late</p>
                <p className="text-2xl font-bold">{stats.lateToday}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
