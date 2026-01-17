"use client";

import { useEffect, useState, useMemo } from "react";
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
import { mergeSkills, mergeEducation, mergeExperience, getUniqueSkills, getResumeOnlyCount, MergedSkill, MergedEducation, MergedExperience } from "@/lib/profile-merge-utils";
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
  Award,
  FileText
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function StudentProfilePage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [loading, setLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
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

  // Merged data from manual + resume extraction
  const mergedSkills = useMemo(() => {
    if (!studentProfile) return [];
    return mergeSkills(
      skills,
      studentProfile.resumeExtractedSkills || []
    );
  }, [skills, studentProfile]);

  const mergedEducation = useMemo(() => {
    if (!studentProfile) return [];
    return mergeEducation(
      studentProfile.education || [],
      studentProfile.resumeExtractedEducation || []
    );
  }, [studentProfile]);

  const mergedExperience = useMemo(() => {
    if (!studentProfile) return [];
    return mergeExperience(
      experiences,
      studentProfile.resumeExtractedExperience || []
    );
  }, [experiences, studentProfile]);

  // Sync form data with Firebase profile data
  useEffect(() => {
    if (studentProfile && !initialDataLoaded) {
      setFormData({
        name: studentProfile.name || "",
        phone: studentProfile.phone || "",
        college: studentProfile.college || "",
        branch: studentProfile.branch || "",
        graduationYear: studentProfile.graduationYear || 2025,
        cgpa: studentProfile.cgpa?.toString() || "",
      });
      setSkills(studentProfile.skills || []);
      setExperiences(studentProfile.experience || []);
      setProjects(studentProfile.projects || []);
      setInitialDataLoaded(true);
    }
  }, [studentProfile, initialDataLoaded]);

  // Re-sync when profile is refreshed (after save) - using updatedAt as trigger
  useEffect(() => {
    if (studentProfile && initialDataLoaded) {
      // Update local state with fresh data from Firebase after save
      setSkills(studentProfile.skills || []);
      setExperiences(studentProfile.experience || []);
      setProjects(studentProfile.projects || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile?.updatedAt]);

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
      // Save the unique merged skills list
      const uniqueSkills = getUniqueSkills(mergedSkills);
      await updateStudent(studentProfile.id, { skills: uniqueSkills });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to update skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    const normalizedNewSkill = newSkill.trim();
    if (normalizedNewSkill && !mergedSkills.some(ms => ms.skill.toLowerCase() === normalizedNewSkill.toLowerCase())) {
      setSkills([...skills, normalizedNewSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    // Remove from manual skills
    setSkills(skills.filter((s) => s !== skill));

    // If it's a resume-extracted skill, we need to remove it from the profile
    if (studentProfile?.resumeExtractedSkills?.includes(skill)) {
      const updatedResumeSkills = studentProfile.resumeExtractedSkills.filter((s) => s !== skill);
      updateStudent(studentProfile.id, { resumeExtractedSkills: updatedResumeSkills })
        .then(() => refreshProfile())
        .catch((err) => console.error("Failed to remove resume skill:", err));
    }
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
    // Remove from manual experiences
    setExperiences(experiences.filter((exp) => exp.id !== id));

    // If it's a resume-extracted experience, remove it from the profile
    if (studentProfile?.resumeExtractedExperience?.some((exp) => exp.id === id)) {
      const updatedResumeExp = studentProfile.resumeExtractedExperience.filter((exp) => exp.id !== id);
      updateStudent(studentProfile.id, { resumeExtractedExperience: updatedResumeExp })
        .then(() => refreshProfile())
        .catch((err) => console.error("Failed to remove resume experience:", err));
    }
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
              {typeof tab.icon === 'function' ? <tab.icon className="size-4" /> : null}
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
            <CardContent className="space-y-6">
              {/* Add New Skill Section */}
              <div className="space-y-2">
                <Label htmlFor="new-skill" className="text-sm font-medium">Add New Skill</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-skill"
                    placeholder="e.g., React, Python, Machine Learning..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSkill()}
                  />
                  <Button onClick={addSkill} disabled={!newSkill.trim()}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Your Skills Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Your Skills ({mergedSkills.length})
                    {getResumeOnlyCount(mergedSkills) > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({getResumeOnlyCount(mergedSkills)} from resume)
                      </span>
                    )}
                  </Label>
                  {mergedSkills.length > 0 && (
                    <span className="text-xs text-muted-foreground">Click × to remove</span>
                  )}
                </div>
                {mergedSkills.length > 0 ? (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex flex-wrap gap-2">
                      {mergedSkills.map((mergedSkill) => (
                        <Badge
                          key={typeof mergedSkill.skill === 'string' ? mergedSkill.skill : String(mergedSkill.skill)}
                          variant={mergedSkill.source === "resume" ? "secondary" : "default"}
                          className="px-3 py-1.5 text-sm font-medium gap-2"
                        >
                          {mergedSkill.source === "resume" && (
                            <FileText className="size-3 opacity-70" />
                          )}
                          {typeof mergedSkill.skill === 'string' ? mergedSkill.skill : String(mergedSkill.skill)}
                          <button
                            onClick={() => removeSkill(typeof mergedSkill.skill === 'string' ? mergedSkill.skill : String(mergedSkill.skill))}
                            className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${typeof mergedSkill.skill === 'string' ? mergedSkill.skill : 'skill'}`}
                          >
                            <X className="size-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {getResumeOnlyCount(mergedSkills) > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <FileText className="size-3.5" />
                          Skills with this icon were extracted from your resume
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed rounded-lg text-center">
                    <Award className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-1">No skills added yet</p>
                    <p className="text-xs text-muted-foreground">Add skills manually or select from suggestions below</p>
                  </div>
                )}
              </div>

              {/* Suggested Skills Section */}
              <div className="pt-4 border-t space-y-3">
                <Label className="text-sm font-medium">Suggested Skills</Label>
                <p className="text-xs text-muted-foreground">Click to add these common skills to your profile</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.filter((s) => !skills.includes(s)).slice(0, 15).map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setSkills([...skills, skill])}
                    >
                      <Plus className="size-3.5 mr-1.5" />
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <Button onClick={handleSkillsSave} disabled={loading} size="lg" className="w-full sm:w-auto">
                  {loading ? <Spinner className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
                  Save Skills
                </Button>
              </div>
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
              {mergedExperience.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No experience added yet</p>
                </div>
              ) : (
                mergedExperience.map((exp, index) => (
                  <div key={String(exp.id)} className={`p-4 border rounded-lg space-y-3 ${exp.source === "resume" ? "bg-secondary/20" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Experience {index + 1}</h4>
                        {exp.source === "resume" && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="size-3 mr-1" />
                            From Resume
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(String(exp.id))}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => updateExperience(String(exp.id), "company", e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={exp.role}
                        onChange={(e) => updateExperience(String(exp.id), "role", e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="Start Date"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(String(exp.id), "startDate", e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="End Date"
                        value={exp.endDate || ""}
                        onChange={(e) => updateExperience(String(exp.id), "endDate", e.target.value)}
                        disabled={exp.current}
                      />
                    </div>
                    <Textarea
                      placeholder="Description of your role and responsibilities..."
                      value={exp.description}
                      onChange={(e) => updateExperience(String(exp.id), "description", e.target.value)}
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
                  <div key={String(proj.id)} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Project {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(String(proj.id))}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Project Title"
                        value={proj.title}
                        onChange={(e) => updateProject(String(proj.id), "title", e.target.value)}
                      />
                      <Input
                        placeholder="Project Link (optional)"
                        value={proj.link || ""}
                        onChange={(e) => updateProject(String(proj.id), "link", e.target.value)}
                      />
                    </div>
                    <Textarea
                      placeholder="Project description..."
                      value={proj.description}
                      onChange={(e) => updateProject(String(proj.id), "description", e.target.value)}
                    />
                    <Input
                      placeholder="Technologies (comma-separated)"
                      value={proj.technologies.join(", ")}
                      onChange={(e) => updateProject(String(proj.id), "technologies", e.target.value.split(",").map((t) => t.trim()))}
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
