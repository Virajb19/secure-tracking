'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Eye, Trash2, Loader2, Check, X, Clock } from 'lucide-react';
import { useGetEvents, useDeleteEvent, useGetEventById, useGetInvitableUsers, useInviteUsersToEvent } from '@/services/events.service';
import { useGetDistricts } from '@/services/user.service';
import { toast } from 'sonner';

type EventType = 'MEETING' | 'EXAM' | 'HOLIDAY' | 'OTHER';

const eventTypeLabels: Record<EventType, string> = {
  MEETING: 'Meeting',
  EXAM: 'Exam',
  HOLIDAY: 'Holiday',
  OTHER: 'Other',
};

const eventTypeColors: Record<EventType, string> = {
  MEETING: 'bg-blue-500/20 text-blue-400',
  EXAM: 'bg-red-500/20 text-red-400',
  HOLIDAY: 'bg-green-500/20 text-green-400',
  OTHER: 'bg-purple-500/20 text-purple-400',
};

export default function EventsPage() {
  const { data: events = [], isLoading, isError } = useGetEvents();
  const { data: districts = [] } = useGetDistricts();
  const deleteEventMutation = useDeleteEvent();
  const inviteUsersMutation = useInviteUsersToEvent();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Invite users
  const [inviteDistrictFilter, setInviteDistrictFilter] = useState<string>('all');
  const [inviteRoleFilter, setInviteRoleFilter] = useState<string>('all');
  const [inviteSelectedUsers, setInviteSelectedUsers] = useState<string[]>([]);

  // Get event details when viewing
  const { data: eventDetails, isLoading: isLoadingDetails } = useGetEventById(selectedEventId || undefined);

  // Get invitable users
  const { data: invitableUsers = [] } = useGetInvitableUsers({
    district_id: inviteDistrictFilter !== 'all' ? inviteDistrictFilter : undefined,
    role: inviteRoleFilter !== 'all' ? inviteRoleFilter : undefined,
    exclude_event_id: selectedEventId || undefined,
  });

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.creator?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
      
      const now = new Date();
      const eventDate = new Date(event.event_date);
      const isUpcoming = eventDate >= now;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'upcoming' && isUpcoming) ||
        (statusFilter === 'past' && !isUpcoming);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [events, searchQuery, typeFilter, statusFilter]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await deleteEventMutation.mutateAsync(eventId);
      toast.success('Event deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleInviteUsers = async () => {
    if (!selectedEventId || inviteSelectedUsers.length === 0) {
      toast.error('Please select at least one user to invite');
      return;
    }

    try {
      const result = await inviteUsersMutation.mutateAsync({
        eventId: selectedEventId,
        userIds: inviteSelectedUsers,
      });
      toast.success(`Invited ${result.invited_count} user(s)`);
      setInviteModalOpen(false);
      setInviteSelectedUsers([]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to invite users');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-400">Loading events...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 text-lg">Failed to load events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Events</h1>
      </div>

      {/* Filters Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        {/* Filter Row */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="min-w-[140px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(eventTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Event</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Date & Time</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Location</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Invitations</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No events found
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {event.flyer_url ? (
                          <img 
                            src={event.flyer_url} 
                            alt={event.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-blue-400 font-medium">{event.title}</p>
                          <p className="text-slate-500 text-sm">
                            by {event.creator?.name || 'Admin'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={eventTypeColors[event.event_type as EventType] || eventTypeColors.OTHER}>
                        {eventTypeLabels[event.event_type as EventType] || event.event_type}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        {formatDate(event.event_date)}
                        {event.event_time && (
                          <>
                            <Clock className="h-4 w-4 text-slate-500 ml-2" />
                            {event.event_time}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {event.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {event.location}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          <Check className="h-3 w-3 mr-1" />
                          {event.invitation_stats.accepted}
                        </Badge>
                        <Badge variant="outline" className="text-red-400 border-red-400">
                          <X className="h-3 w-3 mr-1" />
                          {event.invitation_stats.rejected}
                        </Badge>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {event.invitation_stats.pending}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setViewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-400 border-green-400 hover:bg-green-400/10"
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setInviteModalOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-400 hover:bg-red-400/10"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Event Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-slate-900 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Event Details</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : eventDetails ? (
            <div className="space-y-6 mt-4">
              <div className="flex gap-4">
                {eventDetails.flyer_url && (
                  <img 
                    src={eventDetails.flyer_url} 
                    alt={eventDetails.title}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{eventDetails.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(eventDetails.event_date)}
                    </div>
                    {eventDetails.event_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {eventDetails.event_time}
                      </div>
                    )}
                    {eventDetails.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {eventDetails.location}
                      </div>
                    )}
                  </div>
                  {eventDetails.description && (
                    <p className="text-slate-400 mt-3">{eventDetails.description}</p>
                  )}
                </div>
              </div>

              {/* Invitation Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{eventDetails.invitation_stats.accepted}</p>
                  <p className="text-sm text-green-400/80">Accepted</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{eventDetails.invitation_stats.rejected}</p>
                  <p className="text-sm text-red-400/80">Rejected</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-400">{eventDetails.invitation_stats.pending}</p>
                  <p className="text-sm text-yellow-400/80">Pending</p>
                </div>
              </div>

              {/* Invitations List */}
              <div>
                <h4 className="text-lg font-medium mb-3">Invited Users ({eventDetails.invitations.length})</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {eventDetails.invitations.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No users invited yet</p>
                  ) : (
                    eventDetails.invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{inv.user.name}</p>
                          <p className="text-slate-400 text-sm">{inv.user.email || inv.user.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {inv.status === 'ACCEPTED' && (
                            <Badge className="bg-green-500/20 text-green-400">Accepted</Badge>
                          )}
                          {inv.status === 'REJECTED' && (
                            <div className="text-right">
                              <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>
                              {inv.rejection_reason && (
                                <p className="text-xs text-red-400 mt-1">{inv.rejection_reason}</p>
                              )}
                            </div>
                          )}
                          {inv.status === 'PENDING' && (
                            <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setViewModalOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Users Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="bg-slate-900 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Invite Users</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={inviteDistrictFilter} onValueChange={setInviteDistrictFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={inviteRoleFilter} onValueChange={setInviteRoleFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="HEADMASTER">Headmasters</SelectItem>
                    <SelectItem value="TEACHER">Teachers</SelectItem>
                    <SelectItem value="SEBA_OFFICER">SEBA Officers</SelectItem>
                    <SelectItem value="CENTER_SUPERINTENDENT">Center Superintendents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-2">
              {invitableUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No users available to invite</p>
              ) : (
                invitableUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer"
                    onClick={() => {
                      if (inviteSelectedUsers.includes(user.id)) {
                        setInviteSelectedUsers(inviteSelectedUsers.filter(id => id !== user.id));
                      } else {
                        setInviteSelectedUsers([...inviteSelectedUsers, user.id]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={inviteSelectedUsers.includes(user.id)}
                      className="border-slate-500"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-slate-400 text-sm">
                        {user.role} • {user.faculty?.school?.name || 'No school'} • {user.faculty?.school?.district?.name || ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-slate-400">
              {inviteSelectedUsers.length} user(s) selected
            </p>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInviteModalOpen(false);
                setInviteSelectedUsers([]);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUsers}
              disabled={inviteUsersMutation.isPending || inviteSelectedUsers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {inviteUsersMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Inviting...</>
              ) : `Invite ${inviteSelectedUsers.length} User(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
