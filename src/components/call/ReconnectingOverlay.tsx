import { Loader2 } from 'lucide-react';

interface ReconnectingOverlayProps {
  show: boolean;
  userName: string;
}

export function ReconnectingOverlay({ show, userName }: ReconnectingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-3">
          Reconnecting...
        </h3>
        <p className="text-gray-600 text-lg">
          {userName || 'Your partner'}'s connection was lost.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Waiting for them to rejoin...
        </p>
      </div>
    </div>
  );
}
