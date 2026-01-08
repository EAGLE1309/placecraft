"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ResumePreview } from "@/components/resume/resume-preview";
import { StudentProfile, PersonalInfo, Education, Experience, Project, Certification } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Download,
  CheckCircle,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

export default function ResumeImprovePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const studentProfile = profile as StudentProfile | null;

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
  });

  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentProfile) {
      setPersonalInfo({
        name: studentProfile.name,
        email: studentProfile.email,
        phone: studentProfile.phone,
        location: studentProfile.college,
        linkedin: "",
        github: "",
        portfolio: "",
        summary: "",
      });
      setEducation(studentProfile.education || []);
      setExperience(studentProfile.experience || []);
      setProjects(studentProfile.projects || []);
      setSkills(studentProfile.skills || []);
    }
  }, [studentProfile]);

  const addEducation = () => {
    setEducation([
      ...education,
      {
        id: uuidv4(),
        institution: "",
        degree: "",
        field: "",
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear(),
        grade: "",
        current: false,
      },
    ]);
  };

  const updateEducation = (id: string, field: keyof Education, value: string | number | boolean) => {
    setEducation(education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)));
  };

  const removeEducation = (id: string) => {
    setEducation(education.filter((edu) => edu.id !== id));
  };

  const addExperience = () => {
    setExperience([
      ...experience,
      {
        id: uuidv4(),
        company: "",
        role: "",
        description: "",
        startDate: "",
        endDate: "",
        current: false,
        skills: [],
      },
    ]);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | string[] | boolean) => {
    setExperience(experience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const removeExperience = (id: string) => {
    setExperience(experience.filter((exp) => exp.id !== id));
  };

  const addProject = () => {
    setProjects([
      ...projects,
      {
        id: uuidv4(),
        title: "",
        description: "",
        technologies: [],
        link: "",
        startDate: "",
        endDate: "",
      },
    ]);
  };

  const updateProject = (id: string, field: keyof Project, value: string | string[]) => {
    setProjects(projects.map((proj) => (proj.id === id ? { ...proj, [field]: value } : proj)));
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter((proj) => proj.id !== id));
  };

  const addCertification = () => {
    setCertifications([
      ...certifications,
      {
        id: uuidv4(),
        name: "",
        issuer: "",
        date: "",
        credentialId: "",
        url: "",
      },
    ]);
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    setCertifications(certifications.map((cert) => (cert.id === id ? { ...cert, [field]: value } : cert)));
  };

  const removeCertification = (id: string) => {
    setCertifications(certifications.filter((cert) => cert.id !== id));
  };

  const addAchievement = () => {
    setAchievements([...achievements, ""]);
  };

  const updateAchievement = (index: number, value: string) => {
    const newAchievements = [...achievements];
    newAchievements[index] = value;
    setAchievements(newAchievements);
  };

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleGeneratePreview = () => {
    setShowPreview(true);
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/resume/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalInfo,
          education,
          experience,
          projects,
          skills,
          certifications,
          achievements,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${personalInfo.name.replace(/\s+/g, "_")}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setError(null);

    try {
      if (!studentProfile) throw new Error("Student profile not found");

      const response = await fetch("/api/resume/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          personalInfo,
          education,
          experience,
          projects,
          skills,
          certifications,
          achievements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to finalize resume");
      }

      router.push("/student/resume/history");
    } catch (err) {
      console.error("Failed to finalize resume:", err);
      setError(err instanceof Error ? err.message : "Failed to finalize resume");
    } finally {
      setFinalizing(false);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Improve Resume">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Improve Resume">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/student/resume">
              <ArrowLeft className="size-4 mr-2" />
              Back to Resume
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGeneratePreview}>
              <Eye className="size-4 mr-2" />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={generating}>
              {generating ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Finalize Resume
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your basic contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={personalInfo.linkedin}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                      placeholder="linkedin.com/in/johndoe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={personalInfo.github}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                      placeholder="github.com/johndoe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio Website</Label>
                  <Input
                    id="portfolio"
                    value={personalInfo.portfolio}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, portfolio: e.target.value })}
                    placeholder="https://johndoe.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    value={personalInfo.summary}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, summary: e.target.value })}
                    placeholder="A brief summary of your professional background and goals..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Your academic background</CardDescription>
                  </div>
                  <Button size="sm" onClick={addEducation}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.map((edu) => (
                  <div key={edu.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Education Entry</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(edu.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                          placeholder="University Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                          placeholder="Bachelor of Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                          placeholder="Computer Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Grade/CGPA</Label>
                        <Input
                          value={edu.grade || ""}
                          onChange={(e) => updateEducation(edu.id, "grade", e.target.value)}
                          placeholder="3.8/4.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Year</Label>
                        <Input
                          type="number"
                          value={edu.startYear}
                          onChange={(e) => updateEducation(edu.id, "startYear", parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Year</Label>
                        <Input
                          type="number"
                          value={edu.endYear || ""}
                          onChange={(e) => updateEducation(edu.id, "endYear", parseInt(e.target.value))}
                          disabled={edu.current}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {education.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No education entries yet. Click &quot;Add&quot; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Experience</CardTitle>
                    <CardDescription>Your work experience and internships</CardDescription>
                  </div>
                  <Button size="sm" onClick={addExperience}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {experience.map((exp) => (
                  <div key={exp.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Experience Entry</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(exp.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                          placeholder="Company Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, "role", e.target.value)}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="month"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="month"
                          value={exp.endDate || ""}
                          onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                          disabled={exp.current}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                        placeholder="Describe your responsibilities and achievements..."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                {experience.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No experience entries yet. Click &quot;Add&quot; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>Your personal and academic projects</CardDescription>
                  </div>
                  <Button size="sm" onClick={addProject}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Project Entry</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(proj.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Project Title</Label>
                        <Input
                          value={proj.title}
                          onChange={(e) => updateProject(proj.id, "title", e.target.value)}
                          placeholder="E-commerce Platform"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={proj.description}
                          onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                          placeholder="Describe what the project does and your role..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Link</Label>
                        <Input
                          value={proj.link || ""}
                          onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                          placeholder="https://github.com/..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No projects yet. Click &quot;Add&quot; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Your technical and soft skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    id="new-skill"
                    placeholder="Add a skill..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addSkill(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById("new-skill") as HTMLInputElement;
                      addSkill(input.value);
                      input.value = "";
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Certifications</CardTitle>
                    <CardDescription>Professional certifications and courses</CardDescription>
                  </div>
                  <Button size="sm" onClick={addCertification}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {certifications.map((cert) => (
                  <div key={cert.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Certification</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertification(cert.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Certification Name</Label>
                        <Input
                          value={cert.name}
                          onChange={(e) => updateCertification(cert.id, "name", e.target.value)}
                          placeholder="AWS Certified Developer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Issuer</Label>
                        <Input
                          value={cert.issuer}
                          onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)}
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="month"
                          value={cert.date}
                          onChange={(e) => updateCertification(cert.id, "date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Credential URL</Label>
                        <Input
                          value={cert.url || ""}
                          onChange={(e) => updateCertification(cert.id, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {certifications.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No certifications yet. Click &quot;Add&quot; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Awards, honors, and notable accomplishments</CardDescription>
                  </div>
                  <Button size="sm" onClick={addAchievement}>
                    <Plus className="size-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={achievement}
                      onChange={(e) => updateAchievement(index, e.target.value)}
                      placeholder="Describe your achievement..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAchievement(index)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No achievements yet. Click &quot;Add&quot; to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-purple-600" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your resume will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumePreview
                    personalInfo={personalInfo}
                    education={education}
                    experience={experience}
                    projects={projects}
                    skills={skills}
                    certifications={certifications}
                    achievements={achievements}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  );
}
