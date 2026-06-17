import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Circle } from '@/lib/api/circles';

interface WelcomeCircleStepProps {
  onNext: () => void;
  onPrev?: () => void;
  /** The circle to greet (resolved by the caller — never the global default). */
  circle: Circle | null;
}

export function WelcomeCircleStep({ onNext, onPrev, circle }: WelcomeCircleStepProps) {
  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center mb-4">
          {circle?.logo_url ? (
            <img src={circle.logo_url} alt={circle.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-primary" />
          )}
        </div>
        <CardTitle className="text-3xl font-medium">
          Welcome to the {circle?.name ?? '…'} Circle!
        </CardTitle>
        {circle?.description && (
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            {circle.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 pt-4">
          {onPrev && (
            <Button variant="outline" onClick={onPrev} className="transition-spring">
              Back
            </Button>
          )}
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
