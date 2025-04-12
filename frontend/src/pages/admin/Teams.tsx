import { useState, useEffect } from 'react';
import { teamApi } from '@/lib/api';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Pencil, Plus, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  team_id: number;
  team_name: string;
  created_at: string;
  updated_at: string;
}

const TeamsPage = () => {
  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    team_name: '',
  });

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      try {
        const response = await teamApi.getAll();
        
        if (response.error || !response.data) {
          toast.error('Failed to load teams');
        } else {
          setTeams(response.data);
          setTotalPages(Math.ceil(response.data.length / itemsPerPage));
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('An error occurred while loading teams');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Filter teams based on search query
  const filteredTeams = teams.filter((team) => {
    return team.team_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort teams by team_id ascending
  const sortedTeams = [...filteredTeams].sort((a, b) => a.team_id - b.team_id);

  // Paginate teams using the sorted array
  const paginatedTeams = sortedTeams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open dialog for create/edit
  const handleOpenDialog = (team: Team | null = null) => {
    setSelectedTeam(team);
    
    if (team) {
      setFormData({
        team_name: team.team_name,
      });
    } else {
      setFormData({
        team_name: '',
      });
    }
    
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Basic validation
    if (!formData.team_name) {
      toast.error('Team name is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (selectedTeam) {
        // Update existing team
        const response = await teamApi.update(
          selectedTeam.team_id.toString(),
          { team_name: formData.team_name }
        );
        
        if (response.error) {
          toast.error('Failed to update team');
        } else {
          toast.success('Team updated successfully');
          
          // Update the team in the local state
          setTeams(prev => prev.map(team => 
            team.team_id === selectedTeam.team_id 
              ? { ...team, team_name: formData.team_name }
              : team
          ));
        }
      } else {
        // Create new team
        const response = await teamApi.create({ team_name: formData.team_name });
        
        if (response.error) {
          toast.error('Failed to create team');
        } else {
          toast.success('Team created successfully');
          
          // Add the new team to the local state
          if (response.data) {
            setTeams(prev => [...prev, response.data as Team]);
          } else {
            // Refresh the entire list if we don't have the new team data
            const refreshResponse = await teamApi.getAll();
            if (!refreshResponse.error && refreshResponse.data) {
              setTeams(refreshResponse.data);
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
  const handleOpenDeleteDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  // Handle team deletion
  const handleDelete = async () => {
    if (!selectedTeam) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await teamApi.delete(selectedTeam.team_id.toString());
      
      if (response.error) {
        toast.error('Failed to delete team');
      } else {
        toast.success('Team deleted successfully');
        
        // Remove the team from the local state
        setTeams(prev => prev.filter(team => team.team_id !== selectedTeam.team_id));
      }
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting team:', error);
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
    <div className="p-6 space-y-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Teams Management</h1>
        <p className="text-muted-foreground">
          Create and manage teams or departments for your organization
        </p>
      </div>

      <Card>
        {/* Modified CardHeader for responsive layout using flex-wrap */}
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>All Teams</CardTitle>
            <CardDescription>
              Showing {filteredTeams.length} teams in total
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input 
              placeholder="Search teams..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="flex-1 min-w-[200px]" // allows input to shrink and grow
            />
            <Button onClick={() => handleOpenDialog()} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" /> Add Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeams.length > 0 ? (
                  paginatedTeams.map((team) => (
                    <TableRow key={team.team_id}>
                      <TableCell>{team.team_id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {team.team_name}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(team.created_at)}</TableCell>
                      <TableCell>{formatDate(team.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(team)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDeleteDialog(team)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No teams found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTeams.length > itemsPerPage && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
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
                    <PaginationNext
                      onClick={() => {
                        if (currentPage < totalPages) {
                          setCurrentPage(prev => Math.min(prev + 1, totalPages));
                        }
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
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
            <DialogTitle>{selectedTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
            <DialogDescription>
              {selectedTeam 
                ? 'Update team information in the system.' 
                : 'Add a new team to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team_name">Team Name</Label>
              <Input
                id="team_name"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                placeholder="Engineering, Marketing, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedTeam ? 'Update' : 'Create'}
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
              Are you sure you want to delete the team "{selectedTeam?.team_name}"? This may affect employee assignments and attendance records.
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

export default TeamsPage;