import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy } from "lucide-react";

export interface CircleCardPreviewData {
  name: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  abbreviation: string;
  socialLinks: {
    website?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    email?: string;
    youtube?: string;
  };
}

interface Props {
  data: CircleCardPreviewData;
  /** "desktop" mirrors CircleCard.tsx, "mobile" mirrors only the cover + avatar + name area of MobileHome.tsx */
  viewport: "desktop" | "mobile";
}

const PATTERN_BG =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]";

/**
 * Read-only preview of how the circle's CircleCard will look on the homepage.
 * Used in Circle Settings so admins can see their changes live.
 *
 * NOT a real CircleCard – avoids data fetching, uploads, navigation. Purely
 * visual mirror of `CircleCard.tsx` (desktop) and the cover/avatar/name area
 * of `MobileHome.tsx` (mobile).
 */
export function CircleCardPreview({ data, viewport }: Props) {
  const { name, description, logoUrl, coverImageUrl, abbreviation, socialLinks } = data;
  const fallbackInitial = name?.trim()?.[0]?.toUpperCase() || "C";
  // Preview only — `your-slug` is a static placeholder for the viewer's
  // 6-char personal slug. The real card on the homepage substitutes the
  // current user's actual slug from `useProfileData()`.
  const inviteLink = `https://talkspree.com/${abbreviation || "MTY"}/your-slug`;

  if (viewport === "mobile") {
    return (
      <div className="mx-auto w-full max-w-[300px]">
        {/* Phone frame */}
        <div className="rounded-[2.5rem] border-[10px] border-foreground/80 bg-background shadow-apple-lg overflow-hidden">
          {/* Notch */}
          <div className="h-6 bg-foreground/80 flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-background/40" />
          </div>

          <div className="bg-background">
            {/* Cover */}
            <div
              className="h-24 bg-gradient-primary relative"
              style={
                coverImageUrl
                  ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : {}
              }
            >
              {!coverImageUrl && <div className={`absolute inset-0 ${PATTERN_BG} opacity-30`} />}
            </div>

            {/* Avatar + name */}
            <div className="px-4 -mt-12 pb-6">
              <div className="flex justify-center mb-3">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback className="bg-warning text-warning-foreground text-xl font-semibold">
                    {fallbackInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold leading-tight break-words">{name || "Circle Name"}</h1>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="h-5 bg-background flex items-center justify-center">
            <div className="w-20 h-1 rounded-full bg-foreground/40" />
          </div>
        </div>
      </div>
    );
  }

  // Desktop preview – mirrors `src/components/home/CircleCard.tsx`
  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <div
        className="relative rounded-[1.5rem] overflow-visible shadow-apple-lg bg-gradient-primary pb-4"
        style={
          coverImageUrl
            ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {}
        }
      >
        {!coverImageUrl && (
          <div className={`pointer-events-none absolute inset-0 opacity-30 rounded-[1.5rem] ${PATTERN_BG}`} />
        )}

        <div className="h-32 rounded-t-[1.5rem]" />

        {/* Avatar – half on cover, half on content */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
          <Avatar className="h-32 w-32 border-4 border-card shadow-apple-lg">
            <AvatarImage src={logoUrl} />
            <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="px-4">
          <Card className="bg-card border-2 shadow-apple-md">
            <CardContent className="relative pt-20 pb-6 px-6">
              <div className="space-y-4 text-center">
                <div>
                  <h2 className="text-2xl font-semibold mb-1 break-words">{name || "Circle Name"}</h2>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">— members</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="font-medium">— online</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed text-center">
                  <p className="line-clamp-3 whitespace-pre-wrap">
                    {description || "Add a description to tell people what your circle is about."}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Connect with us:</h3>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <SocialPreviewButton href={socialLinks.website} icon={<Globe className="h-5 w-5" />} />
                    <SocialPreviewButton href={socialLinks.instagram} icon={<Instagram className="h-5 w-5" />} />
                    <SocialPreviewButton href={socialLinks.facebook} icon={<Facebook className="h-5 w-5" />} />
                    <SocialPreviewButton href={socialLinks.linkedin} icon={<Linkedin className="h-5 w-5" />} />
                    <SocialPreviewButton href={socialLinks.email} icon={<Mail className="h-5 w-5" />} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Or invite members to the Circle:</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-xs truncate">{inviteLink}</div>
                    <Button size="icon" variant="outline" type="button" tabIndex={-1} aria-hidden>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SocialPreviewButton({ href, icon }: { href?: string; icon: React.ReactNode }) {
  // Use a div instead of a Button-as-anchor so the preview stays click-inert.
  const baseClasses =
    "rounded-full h-12 w-12 inline-flex items-center justify-center border bg-background text-foreground";
  const dimmed = !href ? "opacity-60" : "";
  return (
    <div className={`${baseClasses} ${dimmed}`} aria-hidden>
      {icon}
    </div>
  );
}
