import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WelcomeCircleStepProps {
  onNext: () => void;
  onPrev: () => void;
}

export function WelcomeCircleStep({ onNext, onPrev }: WelcomeCircleStepProps) {
  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
          <span className="text-4xl">🎓</span>
        </div>
        <CardTitle className="text-3xl font-medium">Welcome to Mentor the Young Circle!</CardTitle>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">
          You're about to join a vibrant community dedicated to mentorship and growth. 
          Connect with mentors, mentees, and alumni who share your passion for learning and development.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <h3 className="font-semibold mb-1">Build Meaningful Connections</h3>
              <p className="text-sm text-muted-foreground">
                Match with people based on shared interests and complementary experiences
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold mb-1">Share Knowledge & Experience</h3>
              <p className="text-sm text-muted-foreground">
                Learn from others and contribute your unique perspective to the community
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h3 className="font-semibold mb-1">Grow Together</h3>
              <p className="text-sm text-muted-foreground">
                Develop professionally and personally through structured conversations
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onPrev} className="transition-spring">
            Back
          </Button>
          <Button 
            onClick={onNext}
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
