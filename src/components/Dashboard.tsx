import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import EmployeePortal from './portals/EmployeePortal';
import ManagerPortal from './portals/ManagerPortal';
import HRPortal from './portals/HRPortal';
import AdminPortal from './portals/AdminPortal';

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderPortal = () => {
    switch (profile.role) {
      case 'employee':
        return <EmployeePortal />;
      case 'manager':
        return <ManagerPortal />;
      case 'hr':
        return <HRPortal />;
      case 'admin':
        return <AdminPortal />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Leave Management System
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Portal
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-slate-700">
                <User className="w-5 h-5" />
                <div className="text-right">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-slate-500">{profile.department || 'No Department'}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPortal()}
      </main>
    </div>
  );
}
