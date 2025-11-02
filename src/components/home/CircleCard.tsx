import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sampleUserManager } from "@/data/sampleUsers";

export function CircleCard() {
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setOnlineCount(sampleUserManager.getOnlineCount());
      setTotalMembers(sampleUserManager.getUsers().length);
    };
    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const circleData = {
    name: "Mentor the Young",
    members: totalMembers.toString(),
    online: onlineCount.toString(),
    bio: "Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering...",
    inviteLink: "http://talkspree.com/mentortheyoung/136872/invite",
    socials: {
      website: "https://example.com",
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      linkedin: "https://linkedin.com",
      email: "mailto:info@example.com",
    },
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(circleData.inviteLink);
    toast({ description: "Invite link copied!" });
  };

  return (
    // OUTER WRAPPER - Full height container
    <div className="relative min-h-full">
      {/* COVER = gradient background - wraps around content */}
      <div className="relative rounded-[2rem] overflow-visible shadow-apple-lg bg-gradient-primary pb-4">
        {/* subtle dot overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-30 rounded-[2rem] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

        {/* Top cover section - fixed height */}
        <div className="h-32 rounded-t-[2rem]" />

        {/* Avatar - positioned to be half on cover, half on content */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
          <Avatar className="h-32 w-32 border-4 border-card shadow-apple-lg">
            <AvatarImage src="" />
            <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">M</AvatarFallback>
          </Avatar>
        </div>

        {/* CONTENT BUBBLE - positioned inside cover with margin */}
        <div className="px-4">
          <Card className="bg-card border-2 shadow-apple-md">
            <CardContent className="relative pt-20 pb-6 px-6">
              <div className="space-y-4 text-center">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">{circleData.name}</h2>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">{circleData.members} members</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="font-medium">{circleData.online} online</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {circleData.bio}
                  <button className="text-primary hover:underline ml-1">read more</button>
                </p>

                {/* Social Links */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Connect with us:</h3>
                  <div className="flex gap-2 justify-center">
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.website} target="_blank" rel="noreferrer">
                        <Globe className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.instagram} target="_blank" rel="noreferrer">
                        <Instagram className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.facebook} target="_blank" rel="noreferrer">
                        <Facebook className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.linkedin} target="_blank" rel="noreferrer">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.email}>
                        <Mail className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Or invite members to the Circle:</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-xs truncate">
                      {circleData.inviteLink}
                    </div>
                    <Button size="icon" variant="outline" onClick={copyInviteLink}>
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
