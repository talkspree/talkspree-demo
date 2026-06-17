import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Save,
  Shield,
  User,
  Users,
  Loader2,
  Info,
  Upload,
  Trash2,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { useDevice } from "@/hooks/useDevice";
import { useProfileData } from "@/hooks/useProfileData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  updateProfile as updateProfileAPI,
  uploadProfilePicture,
} from "@/lib/api/profiles";
import {
  getMyCircles,
  updateMyCircleRole,
  getAdministeredCircles,
  type AdministeredCircle,
} from "@/lib/api/circles";
import {
  GENDER_OPTIONS,
  INDUSTRY_OPTIONS,
  WORKPLACE_OPTIONS,
  normalizeGender,
} from "@/data/occupationOptions";
import { interestCategories, getInterestsByCategory } from "@/data/interests";

type SectionId = "profile" | "account" | "role" | "circle";

const ROLE_OPTIONS = [
  { value: "Mentor", label: "Mentor" },
  { value: "Mentee", label: "Mentee" },
  { value: "Alumni", label: "Alumni" },
];

interface CircleMembership {
  circle_id: string;
  role: string | null;
  status: string;
  circles: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
  } | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const device = useDevice();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profileData, reloadProfile, loading: profileLoading } = useProfileData();
  const { user, updatePassword, resetPassword } = useAuth();

  const initialTab = (searchParams.get("tab") as SectionId) || "profile";
  const [activeSection, setActiveSection] = useState<SectionId>(initialTab);

  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== activeSection) {
      setSearchParams({ tab: activeSection }, { replace: true });
    }
  }, [activeSection, searchParams, setSearchParams]);

  // ────────────────────────────────────────────────────────────
  // PROFILE FORM STATE
  // ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blankForm = useMemo(() => ({
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    dateOfBirth: profileData.dateOfBirth,
    gender: normalizeGender(profileData.gender),
    location: profileData.location,
    occupation: profileData.occupation,
    bio: profileData.bio,
    instagram: profileData.instagram,
    facebook: profileData.facebook,
    linkedin: profileData.linkedin,
    youtube: profileData.youtube,
    tiktok: profileData.tiktok,
    profilePicture: profileData.profilePicture || "",
    industry: profileData.industry || "",
    workPlace: profileData.workPlace || "",
    university: profileData.university || "",
    studyField: profileData.studyField || "",
  }), [profileData]);

  const [formData, setFormData] = useState(blankForm);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profileData.interests);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  // Reset form whenever fresh profile data arrives
  useEffect(() => {
    setFormData(blankForm);
    setSelectedInterests(profileData.interests);
    setUploadedFile(null);
  }, [blankForm, profileData.interests]);

  const MAX_INTERESTS = 20;

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length < MAX_INTERESTS) return [...prev, id];
      return prev;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError("");
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, HEIC, or WebP image");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be less than 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setCropSource(file);
    setShowCropModal(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = (croppedFile: File, dataUrl: string) => {
    setUploadedFile(croppedFile);
    setFormData((prev) => ({ ...prev, profilePicture: dataUrl }));
    setCropSource(null);
  };

  // ────────────────────────────────────────────────────────────
  // ROLE TAB STATE
  // ────────────────────────────────────────────────────────────
  const [userCircles, setUserCircles] = useState<CircleMembership[]>([]);
  const [circleRoleChanges, setCircleRoleChanges] = useState<Record<string, string>>({});
  const [loadingCircles, setLoadingCircles] = useState(true);

  // Circles this user can manage — loaded independently of the active-circle
  // route context, so the "Circles" tab works from anywhere (incl. the hub).
  const [adminCircles, setAdminCircles] = useState<AdministeredCircle[]>([]);
  const [loadingAdminCircles, setLoadingAdminCircles] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [circles, administered] = await Promise.all([
          getMyCircles(),
          getAdministeredCircles().catch(() => [] as AdministeredCircle[]),
        ]);
        if (!cancelled) {
          setUserCircles(circles as unknown as CircleMembership[]);
          setAdminCircles(administered);
        }
      } catch (err) {
        console.error("Error loading circles:", err);
      } finally {
        if (!cancelled) {
          setLoadingCircles(false);
          setLoadingAdminCircles(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCircleRoleChange = (circleId: string, role: string) => {
    setCircleRoleChanges((prev) => {
      // If user reverted to the membership's original role, drop the entry
      const membership = userCircles.find((m) => m.circle_id === circleId);
      if (membership && membership.role === role) {
        const { [circleId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [circleId]: role };
    });
  };

  // ────────────────────────────────────────────────────────────
  // ACCOUNT TAB STATE
  // ────────────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [resetStatus, setResetStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEmailUser = useMemo(() => {
    if (!user) return false;
    const identities = user.identities ?? [];
    if (identities.some((i) => i.provider === "email")) return true;
    const meta = (user.app_metadata || {}) as { provider?: string; providers?: string[] };
    if (meta.provider === "email") return true;
    if (Array.isArray(meta.providers) && meta.providers.includes("email")) return true;
    return false;
  }, [user]);

  const setStatus = (
    setter: typeof setPasswordStatus,
    msg: string,
    ok: boolean,
  ) => {
    setter({ msg, ok });
    setTimeout(() => setter(null), 3000);
  };

  const handleChangePassword = async () => {
    setPasswordStatus(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setStatus(setPasswordStatus, "Please fill in all password fields", false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus(setPasswordStatus, "New passwords don't match", false);
      return;
    }
    if (newPassword.length < 6) {
      setStatus(setPasswordStatus, "Password must be at least 6 characters", false);
      return;
    }
    if (!user?.email) {
      setStatus(setPasswordStatus, "Could not determine your email", false);
      return;
    }
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        setStatus(setPasswordStatus, "Current password is incorrect", false);
        return;
      }
      const { error } = await updatePassword(newPassword);
      if (error) {
        setStatus(setPasswordStatus, error.message, false);
        return;
      }
      setStatus(setPasswordStatus, "Password updated successfully", true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setStatus(setPasswordStatus, msg, false);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      setStatus(setResetStatus, "No email on file", false);
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await resetPassword(user.email);
      if (error) {
        setStatus(setResetStatus, error.message, false);
        return;
      }
      setStatus(setResetStatus, `Reset email sent — check ${user.email}`, true);
    } finally {
      setSendingReset(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // DIRTY TRACKING
  // ────────────────────────────────────────────────────────────
  const profileDirty = useMemo(() => {
    if (uploadedFile) return true;
    const keys: (keyof typeof formData)[] = [
      "firstName", "lastName", "dateOfBirth", "gender", "location", "occupation",
      "bio", "instagram", "facebook", "linkedin", "youtube", "tiktok",
      "industry", "workPlace", "university", "studyField",
    ];
    for (const k of keys) {
      const original = blankForm[k] || "";
      if ((formData[k] || "") !== original) return true;
    }
    return false;
  }, [formData, blankForm, uploadedFile]);

  const interestsDirty = useMemo(() => {
    if (selectedInterests.length !== profileData.interests.length) return true;
    const setA = new Set(selectedInterests);
    for (const i of profileData.interests) if (!setA.has(i)) return true;
    return false;
  }, [selectedInterests, profileData.interests]);

  const roleDirty = Object.keys(circleRoleChanges).length > 0;

  const isDirty = profileDirty || interestsDirty || roleDirty;

  // ────────────────────────────────────────────────────────────
  // SAVE
  // ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [pageStatus, setPageStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const flashStatus = (msg: string, ok: boolean) => {
    setPageStatus({ msg, ok });
    setTimeout(() => setPageStatus(null), 2500);
  };

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      // Profile fields + photo
      if (profileDirty) {
        let profilePictureUrl = formData.profilePicture;

        if (uploadedFile) {
          // Delete prior uploaded picture from storage (best-effort)
          if (profileData.profilePicture && !profileData.profilePicture.startsWith("data:")) {
            try {
              const urlWithoutQuery = profileData.profilePicture.split("?")[0];
              const urlParts = urlWithoutQuery.split("/");
              const fileName = urlParts[urlParts.length - 1];
              await supabase.storage.from("avatars").remove([`profile-pictures/${fileName}`]);
            } catch (err) {
              console.error("Failed to delete old profile picture:", err);
            }
          }
          const uploadedUrl = await uploadProfilePicture(uploadedFile, false);
          if (uploadedUrl) profilePictureUrl = uploadedUrl;
        }

        await updateProfileAPI({
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          location: formData.location,
          occupation: formData.occupation,
          bio: formData.bio,
          profile_picture_url: profilePictureUrl || null,
          industry: formData.industry || null,
          work_place: formData.workPlace || null,
          university: formData.university || null,
          study_field: formData.studyField || null,
        });

        // Social links — wipe and reinsert the 5 platforms we manage
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from("social_links").delete().eq("user_id", authUser.id);
          const socialLinks: { user_id: string; platform: string; url: string }[] = [];
          if (formData.instagram) socialLinks.push({ user_id: authUser.id, platform: "instagram", url: formData.instagram });
          if (formData.facebook) socialLinks.push({ user_id: authUser.id, platform: "facebook", url: formData.facebook });
          if (formData.linkedin) socialLinks.push({ user_id: authUser.id, platform: "linkedin", url: formData.linkedin });
          if (formData.youtube) socialLinks.push({ user_id: authUser.id, platform: "youtube", url: formData.youtube });
          if (formData.tiktok) socialLinks.push({ user_id: authUser.id, platform: "tiktok", url: formData.tiktok });
          if (socialLinks.length > 0) {
            await supabase.from("social_links").insert(socialLinks);
          }
        }
      }

      // Interests
      if (interestsDirty) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from("user_interests").delete().eq("user_id", authUser.id);
          if (selectedInterests.length > 0) {
            await supabase.from("user_interests").insert(
              selectedInterests.map((interestId) => ({ user_id: authUser.id, interest_id: interestId })),
            );
          }
        }
      }

      // Circle roles
      if (roleDirty) {
        const updates = Object.entries(circleRoleChanges);
        await Promise.all(updates.map(([cid, role]) => updateMyCircleRole(cid, role)));
        setCircleRoleChanges({});
        // Refresh memberships so the role select reflects the latest server state
        const refreshed = await getMyCircles();
        setUserCircles(refreshed as unknown as CircleMembership[]);
      }

      await reloadProfile();
      setUploadedFile(null);
      flashStatus("Changes saved", true);
    } catch (err) {
      console.error("Error saving settings:", err);
      const e = err as { message?: string } | null;
      flashStatus(e?.message || "Failed to save changes", false);
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // NAV SECTIONS
  // ────────────────────────────────────────────────────────────
  const sections: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "account", label: "Account", icon: Mail },
    { id: "role", label: "Roles", icon: Users },
    ...(adminCircles.length > 0 ? [{ id: "circle" as const, label: "Circles", icon: Shield }] : []),
  ];

  // ────────────────────────────────────────────────────────────
  // RENDER SECTIONS
  // ────────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300">
      <SectionHeader
        title="Profile"
        description="Update how others see you across TalkSpree."
      />

      {/* Avatar */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background shadow-lg">
                <AvatarImage src={formData.profilePicture} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                  {(formData.firstName[0] || "?")}{(formData.lastName[0] || "")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Change profile picture"
              >
                <Upload className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <h3 className="font-semibold text-lg">Profile picture</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Recommended 512×512 px. JPG, PNG, HEIC or WebP, max 10MB.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-start justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" /> Upload new
                </Button>
                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <h3 className="font-semibold text-base">Personal information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location">
              <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </Field>
            <Field label="Occupation">
              <Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
            </Field>
            <Field label="Industry">
              <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Place of work">
              <Select value={formData.workPlace} onValueChange={(value) => setFormData({ ...formData, workPlace: value })}>
                <SelectTrigger><SelectValue placeholder="Select workplace type" /></SelectTrigger>
                <SelectContent>
                  {WORKPLACE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="University">
              <Input value={formData.university} onChange={(e) => setFormData({ ...formData, university: e.target.value })} placeholder="University name" />
            </Field>
            <Field label="Field of study">
              <Input value={formData.studyField} onChange={(e) => setFormData({ ...formData, studyField: e.target.value })} placeholder="e.g., Computer Science" />
            </Field>
          </div>
          <Field label="Bio">
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="Tell others a bit about yourself..."
            />
          </Field>
        </CardContent>
      </Card>

      {/* Social */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <h3 className="font-semibold text-base">Social media</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Instagram">
              <Input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@username" />
            </Field>
            <Field label="Facebook">
              <Input value={formData.facebook} onChange={(e) => setFormData({ ...formData, facebook: e.target.value })} placeholder="facebook.com/username" />
            </Field>
            <Field label="LinkedIn">
              <Input value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} placeholder="linkedin.com/in/username" />
            </Field>
            <Field label="YouTube">
              <Input value={formData.youtube} onChange={(e) => setFormData({ ...formData, youtube: e.target.value })} placeholder="youtube.com/@username" />
            </Field>
            <Field label="TikTok">
              <Input value={formData.tiktok} onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })} placeholder="@username" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-base">Interests</h3>
            <span className={`text-sm font-medium tabular-nums ${selectedInterests.length >= MAX_INTERESTS ? "text-destructive" : "text-muted-foreground"}`}>
              {selectedInterests.length}/{MAX_INTERESTS}
            </span>
          </div>
          {selectedInterests.length >= MAX_INTERESTS && (
            <p className="text-xs text-destructive font-medium -mt-3">Maximum interests reached</p>
          )}
          <div className="space-y-5">
            {interestCategories.map((category) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {getInterestsByCategory(category).map((interest) => {
                    const selected = selectedInterests.includes(interest.id);
                    const atMax = !selected && selectedInterests.length >= MAX_INTERESTS;
                    return (
                      <Badge
                        key={interest.id}
                        variant={selected ? "default" : "secondary"}
                        className={`cursor-pointer px-3 py-2 text-sm transition-all duration-200 ${
                          selected ? "shadow-md scale-[1.02]" : "hover:scale-[1.02] hover:shadow-sm"
                        } ${atMax ? "opacity-40 cursor-not-allowed" : ""}`}
                        onClick={() => !atMax && toggleInterest(interest.id)}
                      >
                        {interest.emoji} {interest.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRole = () => (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300">
      <SectionHeader
        title="Roles"
        description="Pick how you want to participate in each of your circles."
      />
      {loadingCircles ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : userCircles.length === 0 ? (
        <Card className="border-dashed border-2 border-border/70 shadow-none">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-muted-foreground">You're not a member of any circles yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userCircles.map((m) => {
            const circle = m.circles;
            if (!circle) return null;
            const pendingRole = circleRoleChanges[m.circle_id];
            const currentRole = pendingRole ?? m.role ?? "";
            const changed = pendingRole !== undefined && pendingRole !== m.role;
            return (
              <Card
                key={m.circle_id}
                className={`border-border/60 shadow-sm transition-all duration-200 ${changed ? "ring-2 ring-primary/30" : ""}`}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-background shadow-sm">
                        <AvatarImage src={circle.logo_url || undefined} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                          {circle.name?.[0] || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold truncate">{circle.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {circle.description || "Pick your role in this circle"}
                        </p>
                      </div>
                    </div>
                    <div className="sm:w-48 w-full">
                      <Select
                        value={currentRole}
                        onValueChange={(value) => handleCircleRoleChange(m.circle_id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300">
      <SectionHeader
        title="Account"
        description="Manage your sign-in, email, and account preferences."
      />

      {/* Email */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <h3 className="font-semibold text-base">Email</h3>
          <Field label="">
            <Input value={profileData.email || ""} disabled />
          </Field>
          <p className="text-xs text-muted-foreground">
            Contact support to change the email associated with your account.
          </p>
        </CardContent>
      </Card>

      {/* Password */}
      {isEmailUser ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h3 className="font-semibold text-base">Change password</h3>
            <Field label="Current password">
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </Field>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {changingPassword ? "Updating..." : "Update password"}
            </Button>
            {passwordStatus && (
              <p className={`text-sm ${passwordStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {passwordStatus.msg}
              </p>
            )}

            <div className="pt-3 border-t border-border/60">
              <p className="text-sm text-muted-foreground mb-2">Forgot your current password?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendResetEmail}
                disabled={sendingReset}
                className="-ml-2"
              >
                {sendingReset && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send password reset email
              </Button>
              {resetStatus && (
                <p className={`text-sm mt-2 ${resetStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {resetStatus.msg}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h3 className="font-semibold text-base">Password</h3>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Managed by your sign-in provider</p>
                <p className="text-muted-foreground mt-1">
                  You signed up with a single sign-on provider (e.g. Google), so your password is managed there.
                  Update it from your provider's account settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-destructive/40 shadow-sm bg-destructive/[0.02]">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-base text-destructive">Danger zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full sm:w-auto gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const adminTypeLabel = (t: AdministeredCircle["adminType"]) =>
    t === "super_admin" ? "Super Admin" : t === "creator" ? "Creator" : "Admin";

  const renderCircle = () => (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300">
      <SectionHeader
        title="Circles"
        description="Open settings for any circle you manage."
      />
      {loadingAdminCircles ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : adminCircles.length === 0 ? (
        <Card className="border-dashed border-2 border-border/70 shadow-none">
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-muted-foreground">You don't manage any circles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {adminCircles.map((c) => (
            <Card
              key={c.id}
              onClick={() => navigate(`/settings/circle/${c.abbreviation}`)}
              className="border-border/60 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 group"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-background shadow-md">
                    <AvatarImage src={c.logo_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                      {c.name?.[0] || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg truncate">{c.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{adminTypeLabel(c.adminType)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0">
                    <Settings2 className="h-4 w-4 hidden sm:block" />
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile": return renderProfile();
      case "role": return renderRole();
      case "account": return renderAccount();
      case "circle": return renderCircle();
      default: return renderProfile();
    }
  };

  // ────────────────────────────────────────────────────────────
  // LAYOUT
  // ────────────────────────────────────────────────────────────
  const SaveButton = (
    <Button onClick={handleSave} disabled={!isDirty || saving} className="shadow-sm">
      {saving ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Save className="h-4 w-4 mr-2" />
      )}
      <span className="hidden sm:inline">{saving ? "Saving..." : "Save changes"}</span>
      <span className="sm:hidden">{saving ? "Saving" : "Save"}</span>
    </Button>
  );

  const StatusPill = pageStatus && (
    <span
      className={`hidden sm:inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
        pageStatus.ok
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/15 text-destructive"
      }`}
    >
      {pageStatus.msg}
    </span>
  );

  const Header = (
    <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/home")}
          className="rounded-full flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">Settings</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {StatusPill}
          {SaveButton}
        </div>
      </div>
      {/* Mobile + tablet horizontal tab strip */}
      {device !== "desktop" && (
        <div className="border-t border-border/60 bg-background/60">
          <div className="container mx-auto max-w-7xl px-2 sm:px-4">
            <nav
              className="flex gap-1 overflow-x-auto hide-scrollbar -mx-1 px-1 py-2"
              role="tablist"
              aria-label="Settings sections"
            >
              {sections.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {Header}

      {/* Mobile/tablet status pill (header version is hidden on mobile) */}
      {pageStatus && (
        <div className="sm:hidden container mx-auto max-w-7xl px-4 pt-3">
          <span
            className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg ${
              pageStatus.ok
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {pageStatus.msg}
          </span>
        </div>
      )}

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-8">
        {device === "desktop" ? (
          <div className="flex gap-8">
            {/* Sidebar — fixed width so it never resizes */}
            <aside className="w-60 flex-shrink-0">
              <div className="sticky top-28">
                <Card className="p-2 border-border/60 shadow-sm">
                  <nav className="space-y-1" role="tablist" aria-label="Settings sections">
                    {sections.map((s) => {
                      const Icon = s.icon;
                      const active = activeSection === s.id;
                      return (
                        <button
                          key={s.id}
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveSection(s.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-all duration-200 ${
                            active
                              ? "bg-primary/10 text-primary font-medium shadow-sm"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className={`h-4 w-4 transition-transform ${active ? "scale-110" : ""}`} />
                          <span className="flex-1 truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </Card>
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderContent()
              )}
            </main>
          </div>
        ) : (
          <main className="min-w-0">
            {profileLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderContent()
            )}
          </main>
        )}
      </div>

      <ImageCropModal
        open={showCropModal}
        onOpenChange={setShowCropModal}
        source={cropSource}
        aspect={1}
        shape="round"
        outputFileName={`profile-${Date.now()}.jpg`}
        title="Adjust your profile picture"
        onCropComplete={handleCropComplete}
      />

      <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm sm:text-base text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
