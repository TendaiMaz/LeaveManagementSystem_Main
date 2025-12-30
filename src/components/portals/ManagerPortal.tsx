import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveRequestWithDetails } from '../../lib/database.types';
import { Calendar, Clock, CheckCircle, XCircle, FileText, Users } from 'lucide-react';
import ApprovalModal from '../modals/ApprovalModal';

export default function ManagerPortal() {
  const { profile } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithDetails | null>(null);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, department),
          leave_type:leave_types(*),
          approvals:leave_approvals(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamRequests = (data as LeaveRequestWithDetails[] || []).filter(request =>
        request.employee.manager_id === profile?.id
      );

      setLeaveRequests(teamRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId: string, status: 'approved' | 'rejected', comments: string) => {
    try {
      const { error: approvalError } = await supabase
        .from('leave_approvals')
        .insert({
          leave_request_id: requestId,
          approver_id: profile!.id,
          status,
          comments: comments || null,
        });

      if (approvalError) throw approvalError;

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await fetchLeaveRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating leave request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  const filteredRequests = leaveRequests.filter(request =>
    filter === 'all' ? true : request.status === filter
  );

  const checkConflicts = (request: LeaveRequestWithDetails): LeaveRequestWithDetails[] => {
    return leaveRequests.filter(r =>
      r.id !== request.id &&
      r.status === 'approved' &&
      r.employee.department === request.employee.department &&
      (
        (new Date(r.start_date) <= new Date(request.end_date) &&
         new Date(r.end_date) >= new Date(request.start_date))
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Team Leave Management</h2>
        <p className="text-slate-600 mt-1">Review and approve leave requests from your team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Requests</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{leaveRequests.length}</p>
            </div>
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {leaveRequests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Team Members</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {new Set(leaveRequests.map(r => r.employee_id)).size}
              </p>
            </div>
            <Users className="w-10 h-10 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Leave Requests</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredRequests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No leave requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const conflicts = checkConflicts(request);
              return (
                <div key={request.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-800">
                          {request.employee.full_name}
                        </h4>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-500">Leave Type</p>
                          <p className="text-slate-800 font-medium">{request.leave_type.name}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Department</p>
                          <p className="text-slate-800 font-medium">
                            {request.employee.department || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Duration</p>
                          <p className="text-slate-800 font-medium">{request.total_days} days</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Dates</p>
                          <p className="text-slate-800 font-medium">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-slate-500 text-sm">Reason</p>
                        <p className="text-slate-800">{request.reason}</p>
                      </div>
                      {conflicts.length > 0 && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
                          <p className="text-sm text-orange-800 font-medium">
                            Conflict Warning: {conflicts.length} team member(s) from {request.employee.department} will be on approved leave during this period
                          </p>
                        </div>
                      )}
                      {request.document_url && (
                        <a
                          href={request.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Attached Document</span>
                        </a>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="ml-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={(comments) => handleApproveReject(selectedRequest.id, 'approved', comments)}
          onReject={(comments) => handleApproveReject(selectedRequest.id, 'rejected', comments)}
        />
      )}
    </div>
  );
}
