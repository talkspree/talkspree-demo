import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Countdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(5);
  const matchedUser = location.state?.matchedUser;

  useEffect(() => {
    if (count === 0) {
      // Navigate to call with the matched user
      navigate('/call', { 
        state: { matchedUser },
        replace: true 
      });
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, navigate, matchedUser]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <div className="text-center">
        <div className="text-9xl font-bold text-primary mb-4 animate-pulse">
          {count}
        </div>
        <p className="text-xl text-muted-foreground">
          Connecting you now...
        </p>
      </div>
    </div>
  );
}
