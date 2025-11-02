// ⚠️ TEMPORARY SAMPLE DATA - DELETE BEFORE PRODUCTION ⚠️
// These are fake users for testing matchmaking functionality
// To remove: Delete this file and remove all imports/references to sampleUsers

export interface SampleUser {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  occupation: string;
  bio: string;
  interests: string[];
  role: 'mentor' | 'mentee' | 'alumni';
  university: string;
  studyField: string;
  workPlace: string;
  industry: string;
  phone: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  isOnline: boolean;
  inCall: boolean;
  callStartTime: number | null; // timestamp when fake call started
}

// Sample users that are always "online" and participate in fake 1-minute calls
export const SAMPLE_USERS: SampleUser[] = [
  {
    id: 'sample-user-1',
    firstName: 'Alex',
    lastName: 'Thompson',
    dateOfBirth: '1995-03-15',
    gender: 'Male',
    location: 'San Francisco, CA',
    occupation: 'Senior Software Engineer',
    bio: 'Passionate about mentoring and web technologies. Love helping others grow in their careers.',
    interests: ['ai-robotics', 'it-software', 'hardware-dev', 'psychology', 'astronomy', 'engineering', 'finance', 'crypto', 'entrepreneurship', 'statistics', 'traveling', 'reading', 'music', 'cooking', 'podcasts', 'gaming', 'hiking', 'fitness', 'cinema', 'sci-fi'],
    role: 'mentor',
    university: 'Stanford University',
    studyField: 'Computer Science',
    workPlace: 'Tech Corp',
    industry: 'Technology',
    phone: '+1-555-0101',
    instagram: '@alexthompson_dev',
    facebook: 'alex.thompson.dev',
    linkedin: 'alex-thompson-tech',
    youtube: '@AlexTechTalks',
    tiktok: '@alexcodes',
    isOnline: true,
    inCall: false,
    callStartTime: null,
  },
  {
    id: 'sample-user-2',
    firstName: 'Maria',
    lastName: 'Garcia',
    dateOfBirth: '2001-07-22',
    gender: 'Female',
    location: 'Austin, TX',
    occupation: 'Junior Developer',
    bio: 'Eager to learn from experienced professionals. Recently graduated and looking for guidance.',
    interests: ['it-software', 'design', 'vr-ar', 'psychology', 'languages', 'business', 'media-film', 'traveling', 'music', 'partying', 'painting', 'cooking', 'podcasts', 'dancing', 'gaming', 'restaurants', 'fitness', 'cinema', 'festivals', 'anime'],
    role: 'mentee',
    university: 'University of Texas',
    studyField: 'Software Engineering',
    workPlace: 'StartupXYZ',
    industry: 'Technology',
    phone: '+1-555-0102',
    instagram: '@maria.codes',
    facebook: 'maria.garcia.dev',
    linkedin: 'maria-garcia-developer',
    youtube: '@MariaLearns',
    tiktok: '@mariacodes',
    isOnline: true,
    inCall: false,
    callStartTime: null,
  },
  {
    id: 'sample-user-3',
    firstName: 'David',
    lastName: 'Chen',
    dateOfBirth: '1998-11-08',
    gender: 'Male',
    location: 'New York, NY',
    occupation: 'Product Manager',
    bio: 'Alumni looking to give back to the community. Happy to share my journey and insights.',
    interests: ['business', 'entrepreneurship', 'finance', 'statistics', 'politics', 'psychology', 'law', 'design', 'media-film', 'traveling', 'sightseeing', 'reading', 'podcasts', 'events', 'restaurants', 'running', 'fitness', 'tennis', 'cinema', 'museums'],
    role: 'alumni',
    university: 'NYU',
    studyField: 'Business Administration',
    workPlace: 'Big Tech Inc',
    industry: 'Technology',
    phone: '+1-555-0103',
    instagram: '@davidchen_pm',
    facebook: 'david.chen.pm',
    linkedin: 'david-chen-product',
    youtube: '@DavidProductTalks',
    tiktok: '@davidpm',
    isOnline: true,
    inCall: false,
    callStartTime: null,
  },
  {
    id: 'sample-user-4',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1992-05-30',
    gender: 'Female',
    location: 'Seattle, WA',
    occupation: 'UX Designer',
    bio: 'Creative problem solver with 8 years of experience. Love mentoring designers and developers.',
    interests: ['design', 'art', 'psychology', 'media-film', 'fashion', 'photography', 'traveling', 'nature', 'painting', 'cooking', 'music', 'podcasts', 'museums', 'hiking', 'camping', 'yoga', 'fitness', 'cinema', 'theatre', 'festivals'],
    role: 'mentor',
    university: 'University of Washington',
    studyField: 'Design',
    workPlace: 'Design Studio',
    industry: 'Design & Creative',
    phone: '+1-555-0104',
    instagram: '@sarahjohnson_ux',
    facebook: 'sarah.johnson.design',
    linkedin: 'sarah-johnson-ux',
    youtube: '@SarahDesigns',
    tiktok: '@sarahux',
    isOnline: true,
    inCall: false,
    callStartTime: null,
  },
];

// Manages fake call sessions between sample users
class SampleUserManager {
  private users: SampleUser[] = JSON.parse(JSON.stringify(SAMPLE_USERS));
  private callPairs: Array<[string, string]> = [];
  
  constructor() {
    this.startFakeCalls();
    // Refresh calls every 10 seconds to check if any should end
    setInterval(() => this.updateCallStatus(), 10000);
  }

  // Start fake calls between sample users (pair them up)
  private startFakeCalls() {
    // Pair users 1&2, and 3&4 in fake calls
    this.startCall('sample-user-1', 'sample-user-2');
    this.startCall('sample-user-3', 'sample-user-4');
  }

  private startCall(userId1: string, userId2: string) {
    const now = Date.now();
    const user1 = this.users.find(u => u.id === userId1);
    const user2 = this.users.find(u => u.id === userId2);
    
    if (user1 && user2) {
      user1.inCall = true;
      user1.callStartTime = now;
      user2.inCall = true;
      user2.callStartTime = now;
      this.callPairs.push([userId1, userId2]);
    }
  }

  private endCall(userId1: string, userId2: string) {
    const user1 = this.users.find(u => u.id === userId1);
    const user2 = this.users.find(u => u.id === userId2);
    
    if (user1 && user2) {
      user1.inCall = false;
      user1.callStartTime = null;
      user2.inCall = false;
      user2.callStartTime = null;
    }
    
    this.callPairs = this.callPairs.filter(
      pair => !(pair.includes(userId1) && pair.includes(userId2))
    );
  }

  private updateCallStatus() {
    const now = Date.now();
    const CALL_DURATION = 60000; // 1 minute in milliseconds

    this.users.forEach(user => {
      if (user.inCall && user.callStartTime) {
        const elapsed = now - user.callStartTime;
        if (elapsed >= CALL_DURATION) {
          // Find the pair and end the call
          const pair = this.callPairs.find(p => p.includes(user.id));
          if (pair) {
            this.endCall(pair[0], pair[1]);
            // Start a new call after a short delay (5 seconds)
            setTimeout(() => this.startCall(pair[0], pair[1]), 5000);
          }
        }
      }
    });
  }

  getUsers(): SampleUser[] {
    return JSON.parse(JSON.stringify(this.users));
  }

  getAvailableUsers(): SampleUser[] {
    return this.users.filter(u => u.isOnline && !u.inCall);
  }

  getOnlineUsers(): SampleUser[] {
    return this.users.filter(u => u.isOnline);
  }

  getOccupiedUsers(): SampleUser[] {
    return this.users.filter(u => u.inCall);
  }

  getOnlineCount(): number {
    return this.users.filter(u => u.isOnline).length;
  }

  getInCallCount(): number {
    return this.users.filter(u => u.inCall).length;
  }

  getUserById(id: string): SampleUser | undefined {
    return this.users.find(u => u.id === id);
  }
}

// Singleton instance
export const sampleUserManager = new SampleUserManager();
