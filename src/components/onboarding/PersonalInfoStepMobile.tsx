import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete';
import { OnboardingData } from '@/pages/Onboarding';
import { GENDER_OPTIONS, normalizeGender } from '@/data/occupationOptions';

interface PersonalInfoStepMobileProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev?: () => void;
  field: 'firstName' | 'dateOfBirth' | 'gender' | 'location';
}

export function PersonalInfoStepMobile({ data, updateData, onNext, onPrev, field }: PersonalInfoStepMobileProps) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth || '');
  const [gender, setGender] = useState(normalizeGender(data.gender));
  const [location, setLocation] = useState(data.location || '');

  const handleNext = () => {
    if (field === 'firstName') {
      updateData({ firstName, lastName });
    } else if (field === 'dateOfBirth') {
      updateData({ dateOfBirth });
    } else if (field === 'gender') {
      updateData({ gender });
    } else if (field === 'location') {
      updateData({ location });
    }
    onNext();
  };

  const getTitle = () => {
    switch (field) {
      case 'firstName': return 'Who are you?';
      case 'dateOfBirth': return 'How old are you?';
      case 'gender': return 'How do you define yourself?';
      case 'location': return 'Where are you from?';
    }
  };

  const getLabel = () => {
    switch (field) {
      case 'firstName': return 'First and Last Name';
      case 'dateOfBirth': return 'Date of Birth';
      case 'gender': return 'Gender';
      case 'location': return 'Location';
    }
  };

  const getCurrentValue = () => {
    if (field === 'firstName') return '';
    if (field === 'dateOfBirth') return dateOfBirth;
    if (field === 'gender') return gender;
    if (field === 'location') return location;
    return '';
  };

  const handleValueChange = (newValue: string) => {
    if (field === 'dateOfBirth') setDateOfBirth(newValue);
    else if (field === 'gender') setGender(newValue);
    else if (field === 'location') setLocation(newValue);
  };

  const isValid = field === 'firstName' 
    ? (firstName.trim().length > 0 && lastName.trim().length > 0)
    : getCurrentValue().trim().length > 0;

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {field === 'gender' ? (
          <RadioGroup value={gender} onValueChange={setGender}>
            <div className="space-y-3">
              {GENDER_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center space-x-2 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all cursor-pointer"
                >
                  <RadioGroupItem value={opt.id} id={`gender-${opt.id}`} />
                  <Label htmlFor={`gender-${opt.id}`} className="flex-1 cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        ) : field === 'firstName' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="transition-spring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="transition-spring"
              />
            </div>
          </div>
        ) : field === 'location' ? (
          <PlacesAutocomplete
            value={location}
            onChange={setLocation}
            label={getLabel()}
            placeholder="Start typing a city name..."
            className="transition-spring"
          />
        ) : (
          <div className="space-y-2 relative">
            <Label htmlFor={field}>{getLabel()}</Label>
            <Input
              id={field}
              type={field === 'dateOfBirth' ? 'date' : 'text'}
              value={getCurrentValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              className="transition-spring"
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {onPrev && (
            <Button variant="outline" onClick={onPrev} className="transition-spring">
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={!isValid}
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
