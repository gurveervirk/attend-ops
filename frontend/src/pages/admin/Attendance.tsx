import { useState, useEffect } from 'react';
import { attendanceApi, employeeApi, teamApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Pencil, Plus, Trash2, Loader2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AttendanceRecord {
  record_id: number;
  employee_id: number;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

interface Employee {
  employee_id: number;
  name: string;
  team_id: number | null;
}

interface Team {
  team_id: number;
  team_name: string;
}

const statusOptions = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'WFH', label: 'Work from Home' },
  { value: 'Leave', label: 'Leave' }
];

const AttendancePage = () => {
  // State management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState('all');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    attendance_date: new Date(),
    status: 'Present',
    check_in_time: '',
    check_out_time: '',
    notes: '',
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch attendance records
        const attendanceResponse = await attendanceApi.getAll();
        
        // Fetch employees for dropdown
        const employeesResponse = await employeeApi.getAll();
        
        // Fetch teams for filtering
        const teamsResponse = await teamApi.getAll();
        
        if (attendanceResponse.error || !attendanceResponse.data) {
          toast.error('Failed to load attendance records');
        } else {
          setAttendanceRecords(attendanceResponse.data);
          setTotalPages(Math.ceil(attendanceResponse.data.length / itemsPerPage));
        }
        
        if (employeesResponse.error || !employeesResponse.data) {
          toast.error('Failed to load employees');
        } else {
          setEmployees(employeesResponse.data);
        }
        
        if (teamsResponse.error || !teamsResponse.data) {
          toast.error('Failed to load teams');
        } else {
          setTeams(teamsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('An error occurred while loading data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter attendance records based on criteria
  const filteredRecords = attendanceRecords.filter((record) => {
    // Filter by date if selected
    if (dateFilter && format(new Date(record.attendance_date), 'yyyy-MM-dd') !== format(dateFilter, 'yyyy-MM-dd')) {
      return false;
    }
    
    // Filter by employee if selected
    if (employeeFilter && employeeFilter !== 'all' && record.employee_id.toString() !== employeeFilter) {
      return false;
    }
    
    // Filter by team if selected
    if (teamFilter && teamFilter !== 'all') {
      const employee = employees.find(e => e.employee_id === record.employee_id);
      if (!employee || employee.team_id?.toString() !== teamFilter) {
        return false;
      }
    }
    
    // Filter by status if selected
    if (statusFilter && statusFilter !== 'all' && record.status !== statusFilter) {
      return false;
    }
    
    // Filter by tab selection
    if (activeTab === 'today') {
      return format(new Date(record.attendance_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    } else if (activeTab === 'week') {
      const recordDate = new Date(record.attendance_date);
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return recordDate >= weekAgo && recordDate <= today;
    }
    
    return true;
  });

  // Sort attendance records by created date (attendance_date)
  const sortedRecords = filteredRecords.sort((a, b) => new Date(a.attendance_date).getTime() - new Date(b.attendance_date).getTime());

  // Paginate sorted records
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get employee name by ID
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    return employee ? employee.name : 'Unknown';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Format time for display
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return timeString;
  };

  // Status badge style based on status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800';
      case 'Absent':
        return 'bg-red-100 text-red-800';
      case 'WFH':
        return 'bg-blue-100 text-blue-800';
      case 'Leave':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle form input changes
  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open dialog for create/edit
  const handleOpenDialog = (record: AttendanceRecord | null = null) => {
    setSelectedRecord(record);
    
    if (record) {
      setFormData({
        employee_id: record.employee_id.toString(),
        attendance_date: new Date(record.attendance_date),
        status: record.status,
        check_in_time: record.check_in_time || '',
        check_out_time: record.check_out_time || '',
        notes: record.notes || '',
      });
    } else {
      setFormData({
        employee_id: '',
        attendance_date: new Date(),
        status: 'Present',
        check_in_time: '',
        check_out_time: '',
        notes: '',
      });
    }
    
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Basic validation
    if (!formData.employee_id || !formData.attendance_date) {
      toast.error('Employee and date are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const attendanceData = {
        employee_id: parseInt(formData.employee_id),
        attendance_date: format(formData.attendance_date, 'yyyy-MM-dd'),
        status: formData.status,
        check_in_time: formData.check_in_time || null,
        check_out_time: formData.check_out_time || null,
        notes: formData.notes || null,
      };
      
      if (selectedRecord) {
        // Update existing record
        const response = await attendanceApi.update(
          selectedRecord.record_id.toString(),
          attendanceData
        );
        
        if (response.error) {
          toast.error('Failed to update attendance record');
        } else {
          toast.success('Attendance record updated successfully');
          
          // Update the record in the local state
          setAttendanceRecords(prev => prev.map(record => 
            record.record_id === selectedRecord.record_id 
              ? { ...record, ...attendanceData }
              : record
          ));
        }
      } else {
        // Create new record
        const response = await attendanceApi.create(attendanceData);
        
        if (response.error) {
          toast.error('Failed to create attendance record');
        } else {
          toast.success('Attendance record created successfully');
          
          // Add the new record to the local state
          if (response.data) {
            setAttendanceRecords(prev => [...prev, response.data as AttendanceRecord]);
          } else {
            // Refresh the entire list if we don't have the new record data
            const refreshResponse = await attendanceApi.getAll();
            if (!refreshResponse.error && refreshResponse.data) {
              setAttendanceRecords(refreshResponse.data);
            }
          }
        }
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  // Handle record deletion
  const handleDelete = async () => {
    if (!selectedRecord) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await attendanceApi.delete(selectedRecord.record_id.toString());
      
      if (response.error) {
        toast.error('Failed to delete attendance record');
      } else {
        toast.success('Attendance record deleted successfully');
        
        // Remove the record from the local state
        setAttendanceRecords(prev => prev.filter(record => 
          record.record_id !== selectedRecord.record_id
        ));
      }
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setDateFilter(undefined);
    setEmployeeFilter('');
    setTeamFilter('');
    setStatusFilter('');
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
        <p className="text-muted-foreground">
          Track and manage employee attendance records
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                Showing {filteredRecords.length} records in total
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" /> Add Record
            </Button>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="all">All Records</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Last 7 Days</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Filter by date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.team_id} value={team.team_id.toString()}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={resetFilters} className="flex-none">
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record, index) => (
                    <TableRow key={record.record_id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>{formatDate(record.attendance_date)}</TableCell>
                      <TableCell className="font-medium">{getEmployeeName(record.employee_id)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex h-6 items-center rounded-md px-2 text-xs font-medium',
                          getStatusBadgeClass(record.status)
                        )}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{record.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDeleteDialog(record)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length > itemsPerPage && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    {currentPage > 1 && (
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      />
                    )}
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pagination window around current page
                    const pageOffset = Math.max(0, currentPage - 3);
                    const page = i + 1 + pageOffset;
                    if (page <= totalPages) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    {currentPage < totalPages && (
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      />
                    )}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRecord ? 'Edit Attendance Record' : 'Add Attendance Record'}</DialogTitle>
            <DialogDescription>
              {selectedRecord 
                ? 'Update employee attendance record.' 
                : 'Create a new attendance record.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee</Label>
              <Select 
                value={formData.employee_id}
                onValueChange={(value) => handleInputChange('employee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.attendance_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.attendance_date ? format(formData.attendance_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.attendance_date}
                    onSelect={(date) => handleInputChange('attendance_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="check_in_time">Check-in Time</Label>
                <div className="flex">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground self-center" />
                  <Input
                    id="check_in_time"
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => handleInputChange('check_in_time', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="check_out_time">Check-out Time</Label>
                <div className="flex">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground self-center" />
                  <Input
                    id="check_out_time"
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => handleInputChange('check_out_time', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any relevant notes here..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRecord ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;