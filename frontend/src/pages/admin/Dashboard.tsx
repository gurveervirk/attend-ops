import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceApi, employeeApi, teamApi } from '@/lib/api';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalEmployees: number;
  totalTeams: number;
  yesterdaySummary: string;
  lastWeekSummary: string;
}

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalTeams: 0,
    yesterdaySummary: '',
    lastWeekSummary: ''
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Get summary data
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
        
        setStats({
          totalEmployees,
          totalTeams,
          yesterdaySummary: summary.yesterday_summary,
          lastWeekSummary: summary.last_week_summary
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
          Overview of attendance statistics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Organization Overview
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Yesterday's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {stats.yesterdaySummary}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last Week's Summary</CardTitle>
          <CardDescription>
            Detailed breakdown of attendance for the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-line">
            {stats.lastWeekSummary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
