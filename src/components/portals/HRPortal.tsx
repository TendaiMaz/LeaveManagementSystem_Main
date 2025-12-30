import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LeaveRequestWithDetails, Profile } from '../../lib/database.types';
import { FileText, Download, Calendar, Users, TrendingUp, Filter } from 'lucide-react';

export default function HRPortal() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('approved');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaveRequestsRes, employeesRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select(`
            *,
            employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, department),
            leave_type:leave_types(*),
            approvals:leave_approvals(*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      if (leaveRequestsRes.error) throw leaveRequestsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setLeaveRequests(leaveRequestsRes.data as LeaveRequestWithDetails[] || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[];

  const filteredRequests = leaveRequests.filter(request => {
    const matchesDepartment = filterDepartment === 'all' || request.employee.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesDateRange = (!dateRange.start || new Date(request.start_date) >= new Date(dateRange.start)) &&
                             (!dateRange.end || new Date(request.end_date) <= new Date(dateRange.end));
    return matchesDepartment && matchesStatus && matchesDateRange;
  });

  const generateReport = () => {
    const reportData = filteredRequests.map(request => ({
      'Employee Name': request.employee.full_name,
      'Email': request.employee.email,
      'Department': request.employee.department || 'N/A',
      'Leave Type': request.leave_type.name,
      'Start Date': new Date(request.start_date).toLocaleDateString(),
      'End Date': new Date(request.end_date).toLocaleDateString(),
      'Total Days': request.total_days,
      'Status': request.status,
      'Applied On': new Date(request.created_at).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(reportData[0] || {}).join(','),
      ...reportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = {
    totalLeaves: leaveRequests.length,
    approvedLeaves: leaveRequests.filter(r => r.status === 'approved').length,
    pendingLeaves: leaveRequests.filter(r => r.status === 'pending').length,
    totalDays: leaveRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.total_days, 0),
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
          <h2 className="text-2xl font-bold text-slate-800">HR Leave Management</h2>
          <p className="text-slate-600 mt-1">View all leave records and generate reports</p>
        </div>
        <button
          onClick={generateReport}
          disabled={filteredRequests.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span>Export Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Leaves</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalLeaves}</p>
            </div>
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.approvedLeaves}</p>
            </div>
            <Calendar className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Days</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalDays}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Employees</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{employees.length}</p>
            </div>
            <Users className="w-10 h-10 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            Leave Records ({filteredRequests.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Document
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-600">
                    No leave records found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{request.employee.full_name}</p>
                        <p className="text-sm text-slate-500">{request.employee.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800">
                      {request.employee.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800">
                      {request.leave_type.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800">
                      <div>
                        <p>{new Date(request.start_date).toLocaleDateString()}</p>
                        <p className="text-slate-500">to</p>
                        <p>{new Date(request.end_date).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {request.total_days}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.document_url ? (
                        <a
                          href={request.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-800"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">No file</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
