import {
  Users,
  LayoutGrid,
  LucideIcon,
  FileText,
  Briefcase,
  User,
  GraduationCap,
  Building2,
  BookOpen,
  ClipboardList,
  Settings,
  History,
  Sparkles
} from "lucide-react";
import { UserRole } from "@/lib/firebase/auth";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

// Student menu
function getStudentMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/student",
          label: "Dashboard",
          icon: LayoutGrid,
          active: pathname === "/student",
        }
      ]
    },
    {
      groupLabel: "Placements",
      menus: [
        {
          href: "/student/drives",
          label: "Opportunities",
          icon: Briefcase,
          active: pathname.includes("/student/drives"),
        },
        {
          href: "/student/applications",
          label: "My Applications",
          icon: ClipboardList,
          active: pathname.includes("/student/applications"),
        }
      ]
    },
    {
      groupLabel: "Resume",
      menus: [
        {
          href: "/student/resume",
          label: "Resume Analysis",
          icon: FileText,
          active: pathname === "/student/resume",
        },
        {
          href: "/student/resume/history",
          label: "Resume History",
          icon: History,
          active: pathname.includes("/student/resume/history"),
        },
        {
          href: "/student/resume/improve",
          label: "Improve Resume",
          icon: Sparkles,
          active: pathname.includes("/student/resume/improve"),
        }
      ]
    },
    {
      groupLabel: "Profile",
      menus: [
        {
          href: "/student/profile",
          label: "My Profile",
          icon: User,
          active: pathname.includes("/student/profile"),
        },
        {
          href: "/student/learning",
          label: "Learning",
          icon: BookOpen,
          active: pathname.includes("/student/learning"),
        }
      ]
    }
  ];
}

// Admin (Placement Cell) menu
function getAdminMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: LayoutGrid,
          active: pathname === "/admin",
        }
      ]
    },
    {
      groupLabel: "Management",
      menus: [
        {
          href: "/admin/students",
          label: "Students",
          icon: GraduationCap,
          active: pathname.includes("/admin/students"),
        },
        {
          href: "/admin/drives",
          label: "Drives",
          icon: Briefcase,
          active: pathname.includes("/admin/drives"),
        },
        {
          href: "/admin/recruiters",
          label: "Recruiters",
          icon: Building2,
          active: pathname.includes("/admin/recruiters"),
        }
      ]
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/admin/settings",
          label: "Settings",
          icon: Settings,
          active: pathname.includes("/admin/settings"),
        }
      ]
    }
  ];
}

// Recruiter menu
function getRecruiterMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/recruiter",
          label: "Dashboard",
          icon: LayoutGrid,
          active: pathname === "/recruiter",
        }
      ]
    },
    {
      groupLabel: "Hiring",
      menus: [
        {
          href: "/recruiter/drives",
          label: "My Drives",
          icon: Briefcase,
          active: pathname.includes("/recruiter/drives"),
        },
        {
          href: "/recruiter/applications",
          label: "Applications",
          icon: Users,
          active: pathname.includes("/recruiter/applications"),
        }
      ]
    },
    {
      groupLabel: "Account",
      menus: [
        {
          href: "/recruiter/profile",
          label: "Company Profile",
          icon: Building2,
          active: pathname.includes("/recruiter/profile"),
        }
      ]
    }
  ];
}

export function getMenuList(pathname: string, role?: UserRole): Group[] {
  switch (role) {
    case "student":
      return getStudentMenuList(pathname);
    case "admin":
      return getAdminMenuList(pathname);
    case "recruiter":
      return getRecruiterMenuList(pathname);
    default:
      return [];
  }
}
