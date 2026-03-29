import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { CircleProvider } from "./contexts/CircleContext";
import { ChatProvider } from "./contexts/ChatContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { ChatManager } from "./components/chat/ChatManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ClearSession from "./pages/ClearSession";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import ProfileEdit from "./pages/ProfileEdit";
import Settings from "./pages/Settings";
import CircleSettings from "./pages/CircleSettings";
import Call from "./pages/Call";
import Contacts from "./pages/Contacts";
import WaitingRoom from "./pages/WaitingRoom";
import Countdown from "./pages/Countdown";
import WrapUp from "./pages/WrapUp";
import NotFound from "./pages/NotFound";
// ⚠️ TEMPORARY - Remove before production
import { DevNavigationMenu } from "./components/dev/DevNavigationMenu";
import { DevViewportProvider, DevViewportWrapper } from "./components/dev/DevViewportContext";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CircleProvider>
          <ChatProvider>
            {/* ⚠️ TEMPORARY - Remove before production */}
            <DevViewportProvider>
            <DevNavigationMenu />
            
            <DevViewportWrapper>
            <Routes>
              {/* Landing page - redirects based on auth status */}
              <Route path="/" element={<Index />} />
              
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/clear-session" element={<ClearSession />} />
              
              {/* Protected routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/circle" element={<ProtectedRoute><CircleSettings /></ProtectedRoute>} />
              <Route path="/call" element={<ProtectedRoute><Call /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
              <Route path="/waiting" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />
              <Route path="/countdown" element={<ProtectedRoute><Countdown /></ProtectedRoute>} />
              <Route path="/wrap-up" element={<ProtectedRoute><WrapUp /></ProtectedRoute>} />
              
              {/* 404 - Keep this last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </DevViewportWrapper>
            
            {/* Global floating chat system (bubbles + chat windows) */}
            <ChatManager />
            
            <Toaster />
            </DevViewportProvider>
          </ChatProvider>
          </CircleProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
