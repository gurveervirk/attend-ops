import { useState, useEffect } from 'react';
import { employeeApi, teamApi } from '@/lib/api';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  employee_id: number;
  name: string;
  email: string;
  team_id: number | null;
  role: string;
}

interface Team {
  team_id: number;
  team_name: string;
}

const EmployeesPage = () => {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team_id: 'none',
    role: 'EMPLOYEE',
    password: '',
  });

  // Fetch employees and teams on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const employeesResponse = await employeeApi.getAll();
        const teamsResponse = await teamApi.getAll();
        
        if (employeesResponse.error || !employeesResponse.data) {
          toast.error('Failed to load employees');
        } else {
          setEmployees(employeesResponse.data);
          setTotalPages(Math.ceil(employeesResponse.data.length / itemsPerPage));
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

  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee) => {
    return (
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Sort employees by employee_id ascending
  const sortedEmployees = [...filteredEmployees].sort((a, b) => a.employee_id - b.employee_id);

  // Paginate employees using the sorted array
  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get team name by team id
  const getTeamNameById = (teamId: number | null) => {
    if (!teamId) return 'Not assigned';
    const team = teams.find(team => team.team_id === teamId);
    return team ? team.team_name : 'Unknown';
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    console.log('Selected value:', value);
  };

  // Open dialog for create/edit
  const handleOpenDialog = (employee: Employee | null = null) => {
    setSelectedEmployee(employee);
    
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        team_id: employee.team_id !== null ? employee.team_id.toString() : 'none',
        role: employee.role,
        password: '', // Leave password empty for edit
      });
    } else {
      setFormData({
        name: '',
        email: '',
        team_id: 'none',
        role: 'EMPLOYEE',
        password: '',
      });
    }
    
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    // New employee requires password
    if (!selectedEmployee && !formData.password) {
      toast.error('Password is required for new employees');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (selectedEmployee) {
        // Update existing employee
        const response = await employeeApi.update(
          selectedEmployee.employee_id.toString(),
          {
            name: formData.name,
            email: formData.email,
            team_id: formData.team_id !== 'none' ? parseInt(formData.team_id) : null,
            role: formData.role,
            // Password is optional for updates
            ...(formData.password && { password: formData.password })
          }
        );
        
        if (response.error) {
          toast.error('Failed to update employee');
        } else {
          toast.success('Employee updated successfully');
          
          // Update the employee in the local state
          setEmployees(prev => prev.map(emp => 
            emp.employee_id === selectedEmployee.employee_id 
              ? { ...emp, name: formData.name, email: formData.email, team_id: formData.team_id !== 'none' ? parseInt(formData.team_id) : null, role: formData.role }
              : emp
          ));
        }
      } else {
        // Create new employee
        const response = await employeeApi.create({
          name: formData.name,
          email: formData.email,
          team_id: formData.team_id !== 'none' ? parseInt(formData.team_id) : null,
          role: formData.role,
          password: formData.password
        });
        
        if (response.error) {
          toast.error('Failed to create employee');
        } else {
          toast.success('Employee created successfully');
          
          // Add the new employee to the local state
          if (response.data) {
            if (response.data && typeof response.data === 'object' && 'employee_id' in response.data) {
              setEmployees(prev => [...prev, response.data as Employee]);
            } else {
              toast.error('Invalid employee data received');
            }
          } else {
            // Refresh the entire list if we don't have the new employee data
            const refreshResponse = await employeeApi.getAll();
            if (!refreshResponse.error && refreshResponse.data) {
              setEmployees(refreshResponse.data);
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
  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  // Handle employee deletion
  const handleDelete = async () => {
    if (!selectedEmployee) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await employeeApi.delete(selectedEmployee.employee_id.toString());
      
      if (response.error) {
        toast.error('Failed to delete employee');
      } else {
        toast.success('Employee deleted successfully');
        
        // Remove the employee from the local state
        setEmployees(prev => prev.filter(emp => emp.employee_id !== selectedEmployee.employee_id));
      }
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
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
    <div className="container mx-auto p-6 space-y-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Employees Management</h1>
        <p className="text-muted-foreground">
          Add, edit, or remove employees from the system
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between">
          <div>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>
              Showing {filteredEmployees.length} employees in total
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Search employees..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-64"
            />
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border w-full overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((employee) => (
                    <TableRow key={employee.employee_id}>
                      <TableCell>{employee.employee_id}</TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{getTeamNameById(employee.team_id)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex h-6 items-center justify-center rounded-full px-2 text-xs font-medium ${employee.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {employee.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(employee)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDeleteDialog(employee)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredEmployees.length > itemsPerPage && (
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
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {selectedEmployee 
                ? 'Update employee information in the system.' 
                : 'Add a new employee to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => handleSelectChange('team_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.team_id} value={team.team_id.toString()}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleSelectChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">
                {selectedEmployee ? 'Password (leave empty to keep unchanged)' : 'Password'}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={selectedEmployee ? '••••••••' : 'Enter password'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedEmployee ? 'Update' : 'Create'}
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
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
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

export default EmployeesPage;