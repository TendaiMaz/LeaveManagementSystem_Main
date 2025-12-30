import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveType, LeaveRequestWithDetails } from '../../lib/database.types';
import { Calendar, FileText, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import ApplyLeaveModal from '../modals/ApplyLeaveModal';

export default function EmployeePortal() {
  const { profile } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaveTypesRes, leaveRequestsRes] = await Promise.all([
        supabase.from('leave_types').select('*').eq('is_active', true),
        supabase
          .from('leave_requests')
          .select(`
            *,
            employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, department),
            leave_type:leave_types(*)
          `)
          .eq('employee_id', profile?.id)
          .order('created_at', { ascending: false })
      ]);

      if (leaveTypesRes.error) throw leaveTypesRes.error;
      if (leaveRequestsRes.error) throw leaveRequestsRes.error;

      setLeaveTypes(leaveTypesRes.data || []);
      setLeaveRequests(leaveRequestsRes.data as LeaveRequestWithDetails[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Leave Requests</h2>
          <p className="text-slate-600 mt-1">Apply for leave and track your requests</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Apply for Leave</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Leave History</h3>
        </div>

        <div className="divide-y divide-slate-200">
          {leaveRequests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No leave requests yet</p>
              <p className="text-sm text-slate-500 mt-1">Click "Apply for Leave" to get started</p>
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {request.leave_type.name}
                      </h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Start Date</p>
                        <p className="text-slate-800 font-medium">
                          {new Date(request.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">End Date</p>
                        <p className="text-slate-800 font-medium">
                          {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Duration</p>
                        <p className="text-slate-800 font-medium">{request.total_days} days</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Applied On</p>
                        <p className="text-slate-800 font-medium">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-slate-500 text-sm">Reason</p>
                      <p className="text-slate-800">{request.reason}</p>
                    </div>
                    {request.document_url && (
                      <div className="mt-3">
                        <a
                          href={request.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Attached Document</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showApplyModal && (
        <ApplyLeaveModal
          leaveTypes={leaveTypes}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
