import { useState } from 'react';
import { LeaveRequestWithDetails } from '../../lib/database.types';
import { X, CheckCircle, XCircle, FileText } from 'lucide-react';

interface ApprovalModalProps {
  request: LeaveRequestWithDetails;
  onClose: () => void;
  onApprove: (comments: string) => void;
  onReject: (comments: string) => void;
}

export default function ApprovalModal({ request, onClose, onApprove, onReject }: ApprovalModalProps) {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(comments);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(comments);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Review Leave Request</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Employee</p>
              <p className="text-lg font-semibold text-slate-800">{request.employee.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Department</p>
              <p className="text-lg font-semibold text-slate-800">
                {request.employee.department || 'N/A'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-slate-500">Leave Type</p>
                <p className="text-slate-800 font-medium">{request.leave_type.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Duration</p>
                <p className="text-slate-800 font-medium">{request.total_days} days</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Start Date</p>
                <p className="text-slate-800 font-medium">
                  {new Date(request.start_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">End Date</p>
                <p className="text-slate-800 font-medium">
                  {new Date(request.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Reason</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-slate-800">{request.reason}</p>
              </div>
            </div>

            {request.document_url && (
              <div className="mt-4">
                <p className="text-sm text-slate-500 mb-2">Attached Document</p>
                <a
                  href={request.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Document</span>
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
              placeholder="Add any comments or feedback..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              <span>Reject</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Approve</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
