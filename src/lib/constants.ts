// Define allowed emails for each role
// In production, this would be managed via Firestore
export const ALLOWED_ADMIN_EMAILS: string[] = [
  "eagle.business00@gmail.com",
];

export const ALLOWED_RECRUITER_EMAILS: string[] = [
  // Add recruiter emails here
];

// Students can sign up with any email (will need to complete onboarding)
// For hackathon demo, we allow specific emails
export const ALLOWED_STUDENT_EMAILS: string[] = [
  "vighneshbangar57@gmail.com",
];

export const APP_CONFIG = {
  name: "Placecraft",
  logo: "/logo.svg",
  description: "AI-Powered Placement & Internship Management Platform",
  primaryColor: "#4285f4",
};

export const COLLEGES = [
  "Indian Institute of Technology (IIT)",
  "National Institute of Technology (NIT)",
  "BITS Pilani",
  "VIT University",
  "SRM University",
  "Other",
] as const;

export const CURRENT_YEAR = new Date().getFullYear();
export const GRADUATION_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i - 1);
