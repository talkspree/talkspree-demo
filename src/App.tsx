import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import ProfileEdit from "./pages/ProfileEdit";
import Settings from "./pages/Settings";
import Call from "./pages/Call";
import Contacts from "./pages/Contacts";
import WaitingRoom from "./pages/WaitingRoom";
import Countdown from "./pages/Countdown";
import WrapUp from "./pages/WrapUp";
import NotFound from "./pages/NotFound";
// ⚠️ TEMPORARY - Remove before production
import { DevNavigationMenu } from "./components/dev/DevNavigationMenu";

function App() {
  return (
    <BrowserRouter>
      {/* ⚠️ TEMPORARY - Remove before production */}
      <DevNavigationMenu />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/call" element={<Call />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/waiting" element={<WaitingRoom />} />
        <Route path="/countdown" element={<Countdown />} />
        <Route path="/wrap-up" element={<WrapUp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
