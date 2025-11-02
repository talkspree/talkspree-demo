import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OnboardingData } from '@/pages/Onboarding';

interface PersonalInfoStepMobileProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev?: () => void;
  field: 'firstName' | 'dateOfBirth' | 'gender' | 'location';
}

const locations = [
  'New York, USA',
  'London, UK',
  'Paris, France',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Sydney, Australia',
  'Toronto, Canada',
  'Singapore',
  'Dubai, UAE',
  'Mumbai, India',
  'São Paulo, Brazil',
  'Mexico City, Mexico',
  'Seoul, South Korea',
  'Madrid, Spain',
  'Amsterdam, Netherlands',
  'Stockholm, Sweden',
  'Copenhagen, Denmark',
  'Vienna, Austria',
  'Prague, Czech Republic',
  'Budapest, Hungary',
];

export function PersonalInfoStepMobile({ data, updateData, onNext, onPrev, field }: PersonalInfoStepMobileProps) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth || '');
  const [gender, setGender] = useState(data.gender || '');
  const [location, setLocation] = useState(data.location || '');
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleLocationChange = (input: string) => {
    setLocation(input);
    if (input.length > 0) {
      const filtered = locations.filter(loc =>
        loc.toLowerCase().includes(input.toLowerCase())
      );
      setFilteredLocations(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectLocation = (loc: string) => {
    setLocation(loc);
    setShowSuggestions(false);
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
    else if (field === 'location') handleLocationChange(newValue);
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
              <div className="flex items-center space-x-2 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all cursor-pointer">
                <RadioGroupItem value="Man" id="man" />
                <Label htmlFor="man" className="flex-1 cursor-pointer">Man</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all cursor-pointer">
                <RadioGroupItem value="Woman" id="woman" />
                <Label htmlFor="woman" className="flex-1 cursor-pointer">Woman</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all cursor-pointer">
                <RadioGroupItem value="Non-binary" id="non-binary" />
                <Label htmlFor="non-binary" className="flex-1 cursor-pointer">Non-binary</Label>
              </div>
              <div className="flex items-center space-x-2 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all cursor-pointer">
                <RadioGroupItem value="Prefer not to say" id="prefer-not" />
                <Label htmlFor="prefer-not" className="flex-1 cursor-pointer">I prefer not to say</Label>
              </div>
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
        ) : (
          <div className="space-y-2 relative">
            <Label htmlFor={field}>{getLabel()}</Label>
            <Input
              id={field}
              type={field === 'dateOfBirth' ? 'date' : 'text'}
              placeholder={
                field === 'location' ? 'Start typing...' : ''
              }
              value={getCurrentValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => field === 'location' && location && setShowSuggestions(true)}
              className="transition-spring"
            />
            {field === 'location' && showSuggestions && filteredLocations.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border-2 border-border rounded-xl shadow-apple-lg max-h-60 overflow-auto">
                {filteredLocations.map((location, index) => (
                  <div
                    key={index}
                    onClick={() => selectLocation(location)}
                    className="p-3 hover:bg-accent cursor-pointer transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {location}
                  </div>
                ))}
              </div>
            )}
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