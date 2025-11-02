import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '@/pages/Onboarding';

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
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation *</Label>
          <Input
            id="occupation"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="e.g., Software Engineer, Marketing Manager, etc."
            disabled={isStudent}
            className="transition-spring"
            list="job-titles"
          />
          <datalist id="job-titles">
            <option value="Software Engineer" />
            <option value="Product Manager" />
            <option value="Data Scientist" />
            <option value="Marketing Manager" />
            <option value="Business Analyst" />
            <option value="Sales Manager" />
            <option value="Financial Analyst" />
            <option value="HR Manager" />
            <option value="Operations Manager" />
            <option value="Consultant" />
          </datalist>
        </div>

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
                  <SelectItem value="solopreneur">Solopreneur / Freelancer</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="own-business">Own/Family Business</SelectItem>
                  <SelectItem value="sme">SME</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="intl-corporation">International Corporation</SelectItem>
                  <SelectItem value="government">Government / Public administration</SelectItem>
                  <SelectItem value="education">School / University</SelectItem>
                  <SelectItem value="ngo">NGO / Think tank</SelectItem>
                  <SelectItem value="cultural">Cultural / Religious Institution</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  <SelectItem value="agriculture">Agriculture, Forestry & Fishing</SelectItem>
                  <SelectItem value="utilities">Utilities, Oil & Gas</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing (automobiles, electronics, textiles, products)</SelectItem>
                  <SelectItem value="chemistry">Chemistry & Pharmaceuticals</SelectItem>
                  <SelectItem value="metallurgy">Metallurgy & Machinery</SelectItem>
                  <SelectItem value="food">Food processing</SelectItem>
                  <SelectItem value="retail">Retail and wholesale trade</SelectItem>
                  <SelectItem value="transportation">Transportation, aviation and logistics</SelectItem>
                  <SelectItem value="finance">Finance, banking, and insurance</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="tourism">Tourism and hospitality</SelectItem>
                  <SelectItem value="real-estate">Real Estate & construction</SelectItem>
                  <SelectItem value="professional">Professional services (legal, consulting, marketing)</SelectItem>
                  <SelectItem value="security">Security and defense</SelectItem>
                  <SelectItem value="it">Information technology (IT)</SelectItem>
                  <SelectItem value="rnd">Research and development (R&D)</SelectItem>
                  <SelectItem value="data">Data analytics</SelectItem>
                  <SelectItem value="research">Scientific research</SelectItem>
                  <SelectItem value="media">Media and communications</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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

            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <Label htmlFor="university">In which University? *</Label>
              <Input
                id="university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="Enter your university name"
                className="transition-spring"
                list="universities"
              />
              <datalist id="universities">
                <option value="Harvard University" />
                <option value="Stanford University" />
                <option value="Massachusetts Institute of Technology" />
                <option value="University of Oxford" />
                <option value="University of Cambridge" />
                <option value="Yale University" />
                <option value="Princeton University" />
                <option value="Columbia University" />
                <option value="University of California, Berkeley" />
                <option value="University of Pennsylvania" />
              </datalist>
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
