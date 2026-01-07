"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { updateStudent } from "@/lib/firebase/firestore";
import { StudentProfile, BRANCHES, COMMON_SKILLS, Education, Experience, Project } from "@/types";
import { COLLEGES, GRADUATION_YEARS } from "@/lib/constants";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Calendar,
  Save,
  Plus,
  X,
  Briefcase,
  FolderGit2,
  Award
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function StudentProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "skills" | "experience" | "projects">("basic");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    college: "",
    branch: "",
    graduationYear: 2025,
    cgpa: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (studentProfile) {
      setFormData({
        name: studentProfile.name,
        phone: studentProfile.phone,
        college: studentProfile.college,
        branch: studentProfile.branch,
        graduationYear: studentProfile.graduationYear,
        cgpa: studentProfile.cgpa?.toString() || "",
      });
      setSkills(studentProfile.skills || []);
      setExperiences(studentProfile.experience || []);
      setProjects(studentProfile.projects || []);
    }
  }, [studentProfile]);

  const handleBasicSave = async () => {
    if (!studentProfile) return;
    setLoading(true);
    try {
      await updateStudent(studentProfile.id, {
        name: formData.name,
        phone: formData.phone,
        college: formData.college,
        branch: formData.branch,
        graduationYear: formData.graduationYear,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : undefined,
      });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillsSave = async () => {
    if (!studentProfile) return;
    setLoading(true);
    try {
      await updateStudent(studentProfile.id, { skills });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to update skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: uuidv4(),
      company: "",
      role: "",
      description: "",
      startDate: "",
      current: false,
      skills: [],
    };
    setExperiences([...experiences, newExp]);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean | string[]) => {
    setExperiences(experiences.map((exp) =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const removeExperience = (id: string) => {
    setExperiences(experiences.filter((exp) => exp.id !== id));
  };

  const handleExperienceSave = async () => {
    if (!studentProfile) return;
    setLoading(true);
    try {
      await updateStudent(studentProfile.id, { experience: experiences });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to update experience:", error);
    } finally {
      setLoading(false);
    }
  };

  const addProject = () => {
    const newProj: Project = {
      id: uuidv4(),
      title: "",
      description: "",
      technologies: [],
    };
    setProjects([...projects, newProj]);
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    setProjects(projects.map((proj) =>
      proj.id === id ? { ...proj, [field]: value } : proj
    ));
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter((proj) => proj.id !== id));
  };

  const handleProjectsSave = async () => {
    if (!studentProfile) return;
    setLoading(true);
    try {
      await updateStudent(studentProfile.id, { projects });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to update projects:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Profile">
      <div className="space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-2 border-b pb-2">
          {[
            { id: "basic", label: "Basic Info", icon: User },
            { id: "skills", label: "Skills", icon: Award },
            { id: "experience", label: "Experience", icon: Briefcase },
            { id: "projects", label: "Projects", icon: FolderGit2 },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="gap-2"
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Basic Info Tab */}
        {activeTab === "basic" && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your personal and academic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={studentProfile.email}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>College</Label>
                  <Select
                    value={formData.college}
                    onValueChange={(v) => setFormData({ ...formData, college: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLEGES.map((college) => (
                        <SelectItem key={college} value={college}>{college}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(v) => setFormData({ ...formData, branch: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Select
                    value={formData.graduationYear.toString()}
                    onValueChange={(v) => setFormData({ ...formData, graduationYear: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADUATION_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cgpa">CGPA</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                    placeholder="e.g., 8.5"
                  />
                </div>
              </div>
              <Button onClick={handleBasicSave} disabled={loading} className="mt-4">
                {loading ? <Spinner className="size-4" /> : <Save className="size-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your technical and soft skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                />
                <Button onClick={addSkill}>
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Suggested skills:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.filter((s) => !skills.includes(s)).slice(0, 10).map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setSkills([...skills, skill])}
                    >
                      <Plus className="size-3 mr-1" />
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleSkillsSave} disabled={loading} className="mt-4">
                {loading ? <Spinner className="size-4" /> : <Save className="size-4 mr-2" />}
                Save Skills
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Work Experience</CardTitle>
                  <CardDescription>Add your internships and work experience</CardDescription>
                </div>
                <Button onClick={addExperience} size="sm">
                  <Plus className="size-4 mr-2" />
                  Add Experience
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {experiences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No experience added yet</p>
                </div>
              ) : (
                experiences.map((exp, index) => (
                  <div key={exp.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Experience {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(exp.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={exp.role}
                        onChange={(e) => updateExperience(exp.id, "role", e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="Start Date"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="End Date"
                        value={exp.endDate || ""}
                        onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                        disabled={exp.current}
                      />
                    </div>
                    <Textarea
                      placeholder="Description of your role and responsibilities..."
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                    />
                  </div>
                ))
              )}

              <Button onClick={handleExperienceSave} disabled={loading}>
                {loading ? <Spinner className="size-4" /> : <Save className="size-4 mr-2" />}
                Save Experience
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>Showcase your personal and academic projects</CardDescription>
                </div>
                <Button onClick={addProject} size="sm">
                  <Plus className="size-4 mr-2" />
                  Add Project
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderGit2 className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No projects added yet</p>
                </div>
              ) : (
                projects.map((proj, index) => (
                  <div key={proj.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Project {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(proj.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Project Title"
                        value={proj.title}
                        onChange={(e) => updateProject(proj.id, "title", e.target.value)}
                      />
                      <Input
                        placeholder="Project Link (optional)"
                        value={proj.link || ""}
                        onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                      />
                    </div>
                    <Textarea
                      placeholder="Project description..."
                      value={proj.description}
                      onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                    />
                    <Input
                      placeholder="Technologies (comma-separated)"
                      value={proj.technologies.join(", ")}
                      onChange={(e) => updateProject(proj.id, "technologies", e.target.value.split(",").map((t) => t.trim()))}
                    />
                  </div>
                ))
              )}

              <Button onClick={handleProjectsSave} disabled={loading}>
                {loading ? <Spinner className="size-4" /> : <Save className="size-4 mr-2" />}
                Save Projects
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ContentLayout>
  );
}
