import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OccupationAutocomplete } from '@/components/ui/OccupationAutocomplete';
import { UniversityAutocomplete } from '@/components/ui/UniversityAutocomplete';
import { OnboardingData } from '@/pages/Onboarding';
import { INDUSTRY_OPTIONS, WORKPLACE_OPTIONS } from '@/data/occupationOptions';

interface OccupationStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function OccupationStep({ data, updateData, onNext, onPrev }: OccupationStepProps) {
  const [occupation, setOccupation] = useState(data.occupation);
  const [isStudent, setIsStudent] = useState(data.isStudent);
  const [studyField, setStudyField] = useState(data.studyField);
  const [university, setUniversity] = useState(data.university);
  const [workPlace, setWorkPlace] = useState(data.workPlace);
  const [industry, setIndustry] = useState(data.industry);

  const handleNext = () => {
    updateData({
      occupation: isStudent ? 'Student' : occupation,
      isStudent,
      studyField: isStudent ? studyField : '',
      university: isStudent ? university : '',
      workPlace: !isStudent ? workPlace : '',
      industry: !isStudent ? industry : '',
    });
    onNext();
  };

  const isValid = isStudent ? (studyField.trim() && university.trim()) : occupation.trim();

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">What do you do?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <OccupationAutocomplete
          value={occupation}
          onChange={setOccupation}
          label="Occupation *"
          placeholder="e.g., Software Engineer, Marketing Manager, etc."
          disabled={isStudent}
          className="transition-spring"
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="student"
            checked={isStudent}
            onCheckedChange={(checked) => {
              setIsStudent(checked as boolean);
              if (checked) {
                setOccupation('');
                setWorkPlace('');
                setIndustry('');
              } else {
                setStudyField('');
                setUniversity('');
              }
            }}
          />
          <Label
            htmlFor="student"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I am a student
          </Label>
        </div>

        {!isStudent && (
          <>
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <Label htmlFor="workPlace">Where do you work? (Optional)</Label>
              <Select value={workPlace} onValueChange={setWorkPlace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workplace type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKPLACE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <Label htmlFor="industry">In what Industry? (Optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {isStudent && (
          <>
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <Label htmlFor="studyField">What are you studying? *</Label>
              <Input
                id="studyField"
                value={studyField}
                onChange={(e) => setStudyField(e.target.value)}
                placeholder="Enter your field of study"
                className="transition-spring"
              />
            </div>

            <div className="animate-in slide-in-from-top-1 duration-300">
              <UniversityAutocomplete
                value={university}
                onChange={setUniversity}
                label="In which University? *"
                placeholder="e.g., Harvard University, MIT, etc."
                className="transition-spring"
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onPrev} className="transition-spring">
            Back
          </Button>
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
