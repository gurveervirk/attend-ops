import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { format, subDays, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell, LabelList } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';
import { TrendResult, TrendParams, attendanceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';

interface AttendanceTrendsChartProps {
  employees?: { employee_id: number; name: string }[];
  teams?: { team_id: number; team_name: string }[];
}

const statusColors = {
  'Present': '#22c55e', // green
  'Absent': '#ef4444',  // red
  'WFH': '#3b82f6',     // blue
  'Leave': '#f59e0b',   // amber
};

export function AttendanceTrendsChart({ employees, teams }: AttendanceTrendsChartProps) {
  // Date range state
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(today);
  
  // Filter states - using "all" instead of empty string for default values
  const [groupBy, setGroupBy] = useState<'team' | 'employee' | 'status'>('status');
  const [teamId, setTeamId] = useState<string | null>("all");
  const [employeeId, setEmployeeId] = useState<string | null>("all");
  const [status, setStatus] = useState<string | null>("all");
  
  // Data state
  const [trendsData, setTrendsData] = useState<TrendResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle fetch data
  const fetchTrends = async () => {
    setIsLoading(true);
    
    const params: TrendParams = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      group_by: groupBy,
    };
    
    // Only add filter parameters if they're not set to "all"
    if (teamId && teamId !== "all") params.team_id = Number(teamId);
    if (employeeId && employeeId !== "all") params.employee_id = Number(employeeId);
    if (status && status !== "all") params.status = status;
    
    try {
      const response = await attendanceApi.getTrends(params);
      
      if (response.error || !response.data) {
        toast.error('Failed to load trends data');
        return;
      }
      
      setTrendsData(response.data);
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('An error occurred while loading trends data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trends on component mount and filter changes
  React.useEffect(() => {
    fetchTrends();
  }, []);

  // Apply preset date ranges
  const applyPreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case 'week':
        setStartDate(subDays(today, 7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(today);
        break;
      case 'quarter':
        setStartDate(subDays(today, 90));
        setEndDate(today);
        break;
      default:
        break;
    }
  };

  // Process data for chart display
  const chartData = useMemo(() => {
    if (!trendsData.length) return [];
    
    return trendsData.map(item => {
      let name = item.status;
      
      if (groupBy === 'team' && item.team_name) {
        name = item.team_name;
      } else if (groupBy === 'employee' && item.employee_name) {
        name = item.employee_name;
      }
      
      return {
        name,
        value: item.count,
        percentage: Math.round(item.percentage),
        status: item.status,
      };
    });
  }, [trendsData, groupBy]);

  // Configure Y-axis to show appropriate max based on data
  const maxValue = useMemo(() => {
    if (!chartData.length) return 100;
    const max = Math.max(...chartData.map(item => item.value));
    return Math.ceil(max * 1.2); // Add 20% padding
  }, [chartData]);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0">
        <div>
          <CardTitle>Attendance Trends</CardTitle>
          <CardDescription>
            Attendance distribution for the selected period
          </CardDescription>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date range selector */}
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-sm">to</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  initialFocus
                  disabled={(date) => date < startDate}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Preset buttons */}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => applyPreset('week')}>Week</Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('month')}>Month</Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('quarter')}>Quarter</Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Group by select */}
          <div className="flex-1 min-w-[150px]">
            <Select value={groupBy} onValueChange={(value: 'team' | 'employee' | 'status') => setGroupBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Team filter */}
          {teams && teams.length > 0 && (
            <div className="flex-1 min-w-[150px]">
              <Select value={teamId || "all"} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id.toString()}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Employee filter */}
          {employees && employees.length > 0 && (
            <div className="flex-1 min-w-[150px]">
              <Select value={employeeId || "all"} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Status filter */}
          <div className="flex-1 min-w-[150px]">
            <Select value={status || "all"} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="WFH">Work from Home</SelectItem>
                <SelectItem value="Leave">Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Apply filters button */}
          <Button onClick={fetchTrends} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Apply Filters
          </Button>
        </div>
        
        <div className="h-[350px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, maxValue]}
                  tickFormatter={(value) => value.toString()} 
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="font-medium">{data.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Count: {data.value}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Percentage: {data.percentage}%
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" name="Count">
                  {chartData.map((entry, index) => {
                    const color = statusColors[entry.status as keyof typeof statusColors] || '#888888';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                  <LabelList dataKey="percentage" position="top" formatter={(value: number) => `${value}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available for the selected filters</p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Data range: {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}
        </p>
        <div className="flex gap-1">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1 text-xs">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
              <span>{status}</span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
