import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Helper page to clear session and redirect to auth
 * Navigate to /clear-session to use this
 */
export default function ClearSession() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const clearAndRedirect = async () => {
      await signOut();
      // Clear any other local storage
      localStorage.clear();
      sessionStorage.clear();
      // Wait a moment then redirect
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 500);
    };

    clearAndRedirect();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
          Clearing Session...
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Signing out and clearing all data
        </p>
      </div>
    </div>
  );
}

