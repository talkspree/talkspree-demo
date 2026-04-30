import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Moon, Sun, Settings2, Shield, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDevice } from "@/hooks/useDevice";
import { useProfileData } from "@/hooks/useProfileData";
import { useCircleRole } from "@/hooks/useCircleRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const navigate = useNavigate();
  const device = useDevice();
  const { profileData } = useProfileData();
  const { isAdmin, adminType } = useCircleRole();
  const { user, updatePassword, resetPassword } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [theme, setTheme] = useState("light");

  const [email, setEmail] = useState(profileData.email || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [timezone, setTimezone] = useState("GMT+02:00");
  const [language, setLanguage] = useState("en");

  /**
   * Detect whether the user signed up with email/password vs an OAuth
   * provider (e.g. Google). Only email/password accounts can manage a
   * password directly inside the app.
   */
  const isEmailUser = useMemo(() => {
    if (!user) return false;
    const identities = user.identities ?? [];
    // If any identity is `email`, treat the account as managing its own password
    if (identities.some((i: any) => i.provider === 'email')) return true;
    // app_metadata.provider is the primary provider, providers is the full list
    const meta: any = user.app_metadata || {};
    if (meta.provider === 'email') return true;
    if (Array.isArray(meta.providers) && meta.providers.includes('email')) return true;
    return false;
  }, [user]);

  // Build sections dynamically based on admin status
  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "account", label: "Account", icon: Mail },
    { id: "theme", label: "Theme", icon: Moon },
    ...(isAdmin ? [{ id: "circle", label: "Circle Settings", icon: Settings2 }] : []),
  ];

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ description: 'Please fill in all password fields', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ description: "New passwords don't match", variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!user?.email) {
      toast({ description: 'Could not determine your email', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate with the old password before allowing the update.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        toast({
          description: 'Current password is incorrect',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ description: error.message, variant: 'destructive' });
        return;
      }

      toast({ description: 'Password updated successfully' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({
        description: err?.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      toast({ description: 'No email on file', variant: 'destructive' });
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        toast({ description: error.message, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Reset email sent',
        description: `Check ${user.email} for instructions.`,
      });
    } finally {
      setSendingReset(false);
    }
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>
      <Button 
        onClick={() => navigate("/profile/edit")}
        className="w-full md:w-auto"
      >
        Edit Profile
      </Button>
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Email */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Email</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Contact support to change the email associated with your account.
          </p>
        </div>
      </Card>

      {/* Password */}
      {isEmailUser ? (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="oldPassword">Current Password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {changingPassword ? 'Updating...' : 'Change Password'}
            </Button>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Forgot your current password?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendResetEmail}
                disabled={sendingReset}
              >
                {sendingReset && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send password reset email
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-2">Password</h3>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Managed by your sign-in provider</p>
              <p className="text-muted-foreground mt-1">
                You signed up with a single sign-on provider (e.g. Google), so
                your password is managed there. Update it from your provider's
                account settings.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Timezone & Language */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Preferences</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GMT-12:00">(GMT -12:00) Eniwetok, Kwajalein</SelectItem>
                <SelectItem value="GMT-11:00">(GMT -11:00) Midway Island, Samoa</SelectItem>
                <SelectItem value="GMT-10:00">(GMT -10:00) Hawaii</SelectItem>
                <SelectItem value="GMT-09:00">(GMT -09:00) Alaska</SelectItem>
                <SelectItem value="GMT-08:00">(GMT -08:00) Pacific Time (US & Canada)</SelectItem>
                <SelectItem value="GMT-07:00">(GMT -07:00) Mountain Time (US & Canada)</SelectItem>
                <SelectItem value="GMT-06:00">(GMT -06:00) Central Time (US & Canada), Mexico City</SelectItem>
                <SelectItem value="GMT-05:00">(GMT -05:00) Eastern Time (US & Canada), Bogota, Lima</SelectItem>
                <SelectItem value="GMT-04:00">(GMT -04:00) Atlantic Time (Canada), Caracas, La Paz</SelectItem>
                <SelectItem value="GMT-03:00">(GMT -03:00) Brazil, Buenos Aires, Georgetown</SelectItem>
                <SelectItem value="GMT-02:00">(GMT -02:00) Mid-Atlantic</SelectItem>
                <SelectItem value="GMT-01:00">(GMT -01:00) Azores, Cape Verde Islands</SelectItem>
                <SelectItem value="GMT+00:00">(GMT +00:00) Western Europe Time, London, Lisbon, Casablanca</SelectItem>
                <SelectItem value="GMT+01:00">(GMT +01:00) Brussels, Copenhagen, Madrid, Paris</SelectItem>
                <SelectItem value="GMT+02:00">(GMT +02:00) Europe/Sofia, Cairo, Athens</SelectItem>
                <SelectItem value="GMT+03:00">(GMT +03:00) Baghdad, Riyadh, Moscow, St. Petersburg</SelectItem>
                <SelectItem value="GMT+04:00">(GMT +04:00) Abu Dhabi, Muscat, Baku, Tbilisi</SelectItem>
                <SelectItem value="GMT+05:00">(GMT +05:00) Ekaterinburg, Islamabad, Karachi, Tashkent</SelectItem>
                <SelectItem value="GMT+06:00">(GMT +06:00) Almaty, Dhaka, Colombo</SelectItem>
                <SelectItem value="GMT+07:00">(GMT +07:00) Bangkok, Hanoi, Jakarta</SelectItem>
                <SelectItem value="GMT+08:00">(GMT +08:00) Beijing, Perth, Singapore, Hong Kong</SelectItem>
                <SelectItem value="GMT+09:00">(GMT +09:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk</SelectItem>
                <SelectItem value="GMT+10:00">(GMT +10:00) Eastern Australia, Guam, Vladivostok</SelectItem>
                <SelectItem value="GMT+11:00">(GMT +11:00) Magadan, Solomon Islands, New Caledonia</SelectItem>
                <SelectItem value="GMT+12:00">(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderThemeSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Theme</h2>
        <p className="text-muted-foreground">Choose your preferred theme</p>
      </div>
      <Card className="p-6">
        <Label htmlFor="theme-select">Theme</Label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger id="theme-select" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light (default)
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark (beta)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </Card>
    </div>
  );

  const renderCircleSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Circle Settings</h2>
        <p className="text-muted-foreground">Manage circle as {adminType === 'super_admin' ? 'Super Admin' : adminType === 'creator' ? 'Creator' : 'Admin'}</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Circle Administration</h3>
              <p className="text-sm text-muted-foreground">Edit circle details, roles, and topic presets</p>
            </div>
          </div>
          <Button onClick={() => navigate("/settings/circle")}>
            <Settings2 className="h-4 w-4 mr-2" />
            Open Settings
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "account":
        return renderAccountSection();
      case "theme":
        return renderThemeSection();
      case "circle":
        return renderCircleSection();
      default:
        return renderProfileSection();
    }
  };

  // Mobile view with horizontal tabs
  if (device === "mobile") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          
          {/* Mobile Tabs */}
          <div className="px-4 pb-2">
            <Tabs value={activeSection} onValueChange={setActiveSection}>
              <TabsList className="w-full grid grid-cols-3">
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="gap-2">
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Desktop/Tablet view with sidebar
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto p-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <Card className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* Content Area */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
