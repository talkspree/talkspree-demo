import { Briefcase, MapPin, User, GraduationCap, Building2 } from 'lucide-react';
import { getIndustryLabel } from '@/data/occupationOptions';

interface AboutMeSectionProps {
  role?: string;
  occupation: string;
  industry?: string;
  studyField?: string;
  university?: string;
  age: number | string;
  gender: string;
  location: string;
  className?: string;
  compact?: boolean;
}

export function AboutMeSection({
  role,
  occupation,
  industry,
  studyField,
  university,
  age,
  gender,
  location,
  className = '',
  compact = false
}: AboutMeSectionProps) {
  const getRoleIcon = (roleValue?: string) => {
    if (!roleValue) return '👤';
    switch (roleValue.toLowerCase()) {
      case 'mentor': return '🧭';
      case 'mentee': return '🌱';
      case 'alumni': return '🎓';
      default: return '👤';
    }
  };

  const getOccupationDetails = () => {
    if (role === 'student' && studyField && university) {
      return `${studyField} · ${university}`;
    }
    if (industry) {
      return `${occupation} · ${getIndustryLabel(industry)}`;
    }
    return occupation;
  };

  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = compact ? 'text-xs' : 'text-sm';
  const spacing = compact ? 'space-y-1' : 'space-y-2';

  return (
    <div className={`${spacing} ${className}`}>
      {/* Role in the circle */}
      {role && (
        <div className={`flex items-center gap-2 ${textSize}`}>
          <span className="flex-shrink-0">{getRoleIcon(role)}</span>
          <span className="capitalize">{role}</span>
        </div>
      )}

      {/* Occupation · Industry or Field · University */}
      <div className={`flex items-start gap-2 ${textSize}`}>
        {role === 'student' ? (
          <GraduationCap className={`${iconSize} flex-shrink-0 mt-0.5`} />
        ) : (
          <Briefcase className={`${iconSize} flex-shrink-0 mt-0.5`} />
        )}
        <span className="break-words">{getOccupationDetails()}</span>
      </div>

      {/* Age · Gender */}
      <div className={`flex items-center gap-2 ${textSize}`}>
        <User className={`${iconSize} flex-shrink-0`} />
        <span>{typeof age === 'number' ? `${age}y` : age} · {gender}</span>
      </div>

      {/* Location */}
      <div className={`flex items-center gap-2 ${textSize}`}>
        <MapPin className={`${iconSize} flex-shrink-0`} />
        <span>{location}</span>
      </div>
    </div>
  );
}
