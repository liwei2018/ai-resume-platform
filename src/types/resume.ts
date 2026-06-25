export type CandidateStatus = 'pending' | 'passed' | 'interviewing' | 'hired' | 'rejected';

export interface WorkExperience {
  company: string;
  position: string;
  timeRange: string;
  summary: string;
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  graduationTime: string;
}

export interface ResumeData {
  name: string;
  phone: string;
  email: string;
  city: string;
  education: Education[];
  experience: WorkExperience[];
  skills: string[];
  projects?: {
    name: string;
    techStack: string[];
    responsibility: string;
    highlights: string;
  }[];
}

export interface MatchScore {
  totalScore: number;
  subScores: {
    skills: number;
    experience: number;
    education: number;
  };
  aiComment: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  skills: string[];
  matchScore?: MatchScore;
  createdAt: string;
  resumeUrl: string;
}