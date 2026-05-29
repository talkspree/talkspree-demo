import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { CircleProvider } from "./contexts/CircleContext";
import { ChatProvider } from "./contexts/ChatContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { ChatManager } from "./components/chat/ChatManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AffiliateInvite from "./pages/AffiliateInvite";
import ClearSession from "./pages/ClearSession";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import CircleSettings from "./pages/CircleSettings";
import Call from "./pages/Call";
import Contacts from "./pages/Contacts";
import WaitingRoom from "./pages/WaitingRoom";
import Countdown from "./pages/Countdown";
import WrapUp from "./pages/WrapUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CircleProvider>
          <ChatProvider>
            <Routes>
              {/* Landing page - redirects based on auth status */}
              <Route path="/" element={<Index />} />
              
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/clear-session" element={<ClearSession />} />

              {/* Legal pages - opened in new tab from auth links */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              
              {/* Protected routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              {/* /profile/edit is now a Settings tab; redirect for old links/bookmarks */}
              <Route path="/profile/edit" element={<Navigate to="/settings?tab=profile" replace />} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/circle" element={<ProtectedRoute><CircleSettings /></ProtectedRoute>} />
              <Route path="/call" element={<ProtectedRoute><Call /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
              <Route path="/waiting" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />
              <Route path="/countdown" element={<ProtectedRoute><Countdown /></ProtectedRoute>} />
              <Route path="/wrap-up" element={<ProtectedRoute><WrapUp /></ProtectedRoute>} />

              {/* Personal affiliate invite link: /<CIRCLE_ABBR>/<USER_SLUG> */}
              <Route path="/:circleAbbrev/:userSlug" element={<AffiliateInvite />} />

              {/* 404 - Keep this last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Global floating chat system (bubbles + chat windows) */}
            <ChatManager />
            
            <Toaster />
          </ChatProvider>
          </CircleProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
