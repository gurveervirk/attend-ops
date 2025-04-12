
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceApi } from '@/lib/api';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  record_id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

const statusColors = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  LATE: 'bg-amber-100 text-amber-800',
  LEAVE: 'bg-blue-100 text-blue-800',
  HOLIDAY: 'bg-purple-100 text-purple-800',
};

const AttendancePage = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        // Assumes this endpoint returns all records for the current user
        const response = await attendanceApi.getByEmployeeId('current'); 
        
        if (response.error || !response.data) {
          toast.error('Failed to load attendance records');
          return;
        }
        
        const sortedRecords = [...response.data].sort(
          (a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
        );
        
        setAttendanceRecords(sortedRecords);
        setFilteredRecords(sortedRecords);
      } catch (error) {
        console.error('Error fetching attendance:', error);
        toast.error('An error occurred while loading attendance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  useEffect(() => {
    // Apply filters whenever filter states change
    let result = [...attendanceRecords];
    
    if (statusFilter) {
      result = result.filter(record => record.status === statusFilter);
    }
    
    if (dateFilter) {
      const filterDate = format(dateFilter, 'yyyy-MM-dd');
      result = result.filter(record => record.attendance_date.includes(filterDate));
    }
    
    setFilteredRecords(result);
  }, [statusFilter, dateFilter, attendanceRecords]);

  const clearFilters = () => {
    setStatusFilter(null);
    setDateFilter(null);
    setFilteredRecords(attendanceRecords);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    
    try {
      // Assuming time format is HH:MM:SS
      return timeString.substring(0, 5); // Return just HH:MM
    } catch {
      return timeString;
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight">My Attendance</h1>
        <p className="text-muted-foreground">
          View and track your attendance history
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {filteredRecords.length} records found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      dateFilter && "text-primary"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Filter by date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter || undefined}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter || 'Filter by status'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('PRESENT')}>
                    Present
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('ABSENT')}>
                    Absent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('LATE')}>
                    Late
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('LEAVE')}>
                    Leave
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('HOLIDAY')}>
                    Holiday
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(statusFilter || dateFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.record_id}>
                      <TableCell>
                        {format(parseISO(record.attendance_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[record.status as keyof typeof statusColors] || 'bg-gray-100'}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No attendance records found</p>
              {(statusFilter || dateFilter) && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters to see all records
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
