import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '@/pages/Onboarding';

interface PersonalInfoStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev?: () => void;
  field?: 'firstName' | 'lastName' | 'dateOfBirth' | 'gender' | 'location';
  grouped?: boolean;
}

export function PersonalInfoStep({ data, updateData, onNext, onPrev, field, grouped = false }: PersonalInfoStepProps) {
  const [localData, setLocalData] = useState({
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    location: data.location,
  });

  const handleNext = () => {
    updateData(localData);
    onNext();
  };

  const handleSingleFieldNext = (value: string, fieldName: string) => {
    updateData({ [fieldName]: value });
    onNext();
  };

  if (!grouped && field) {
    // Mobile: Single field view
    const getTitle = () => {
      switch (field) {
        case 'firstName': return 'What\'s your first name?';
        case 'lastName': return 'What\'s your last name?';
        case 'dateOfBirth': return 'When were you born?';
        case 'gender': return 'How do you define yourself?';
        case 'location': return 'Where are you from?';
      }
    };

    const getValue = () => {
      switch (field) {
        case 'firstName': return data.firstName;
        case 'lastName': return data.lastName;
        case 'dateOfBirth': return data.dateOfBirth;
        case 'gender': return data.gender;
        case 'location': return data.location;
      }
    };

    const renderField = () => {
      switch (field) {
        case 'firstName':
        case 'lastName':
          return (
            <Input
              type="text"
              value={getValue()}
              onChange={(e) => handleSingleFieldNext(e.target.value, field)}
              placeholder={field === 'firstName' ? 'Enter your first name' : 'Enter your last name'}
              className="text-lg transition-spring"
              autoFocus
            />
          );
        case 'dateOfBirth':
          return (
            <Input
              type="date"
              value={getValue()}
              onChange={(e) => handleSingleFieldNext(e.target.value, field)}
              className="text-lg transition-spring"
              autoFocus
            />
          );
        case 'gender':
          return (
            <div className="space-y-3">
              {['Man', 'Woman', 'Non-binary', 'I prefer not to say'].map((option) => (
                <Button
                  key={option}
                  variant={getValue() === option ? 'default' : 'outline'}
                  className="w-full justify-start text-left transition-spring"
                  onClick={() => handleSingleFieldNext(option, field)}
                >
                  {option}
                </Button>
              ))}
            </div>
          );
        case 'location':
          return (
            <Input
              type="text"
              value={getValue()}
              onChange={(e) => handleSingleFieldNext(e.target.value, field)}
              placeholder="Enter your location"
              className="text-lg transition-spring"
              autoFocus
            />
          );
      }
    };

    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl font-medium">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderField()}
        </CardContent>
      </Card>
    );
  }

  // Desktop: Grouped view
  const isValid = localData.firstName && localData.lastName && localData.dateOfBirth && 
                  localData.gender && localData.location;

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={localData.firstName}
              onChange={(e) => setLocalData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter your first name"
              className="transition-spring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={localData.lastName}
              onChange={(e) => setLocalData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter your last name"
              className="transition-spring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={localData.dateOfBirth}
            onChange={(e) => setLocalData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            className="transition-spring"
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={localData.gender}
            onValueChange={(value) => setLocalData(prev => ({ ...prev, gender: value }))}
          >
            <SelectTrigger className="transition-spring">
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Man">Man</SelectItem>
              <SelectItem value="Woman">Woman</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="I prefer not to say">I prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={localData.location}
            onChange={(e) => setLocalData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Enter your location"
            className="transition-spring"
          />
        </div>

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