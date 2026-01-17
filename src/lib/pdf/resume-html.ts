import { ExtractedPersonalInfo, ExtractedEducation, ExtractedExperience, ExtractedProject, ExtractedCertification, ExtractedAchievement } from "@/types/resume";

export function generateResumeHTML(data: {
  personalInfo: ExtractedPersonalInfo;
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  skills: string[];
  certifications: ExtractedCertification[];
  achievements: ExtractedAchievement[];
}): string {
  const { personalInfo, education, experience, projects, skills, certifications, achievements } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      padding: 40px;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .contact {
      font-size: 10pt;
      color: #333;
    }
    .contact span {
      margin-right: 10px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .entry {
      margin-bottom: 12px;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .entry-title {
      font-weight: bold;
    }
    .entry-subtitle {
      color: #333;
      font-size: 10pt;
    }
    .entry-date {
      color: #666;
      font-size: 10pt;
    }
    .entry-description {
      margin-top: 5px;
      text-align: justify;
    }
    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill {
      background: #f0f0f0;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 10pt;
    }
    ul {
      margin-left: 20px;
      margin-top: 5px;
    }
    li {
      margin-bottom: 3px;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${personalInfo.name || "Your Name"}</div>
    <div class="contact">
      ${personalInfo.email ? `<span>${personalInfo.email}</span>` : ""}
      ${personalInfo.phone ? `<span>•</span><span>${personalInfo.phone}</span>` : ""}
      ${personalInfo.location ? `<span>•</span><span>${personalInfo.location}</span>` : ""}
    </div>
    ${personalInfo.linkedin || personalInfo.github || personalInfo.portfolio
      ? `<div class="contact" style="margin-top: 3px;">
            ${personalInfo.linkedin ? `<span><a href="${personalInfo.linkedin}">LinkedIn</a></span>` : ""}
            ${personalInfo.github ? `<span><a href="${personalInfo.github}">GitHub</a></span>` : ""}
            ${personalInfo.portfolio ? `<span><a href="${personalInfo.portfolio}">Portfolio</a></span>` : ""}
          </div>`
      : ""
    }
  </div>

  ${personalInfo.summary
      ? `<div class="section">
          <div class="section-title">Professional Summary</div>
          <p>${personalInfo.summary}</p>
        </div>`
      : ""
    }

  ${education.length > 0
      ? `<div class="section">
          <div class="section-title">Education</div>
          ${education
        .map(
          (edu) => `
            <div class="entry">
              <div class="entry-header">
                <div>
                  <div class="entry-title">${edu.institution}</div>
                  <div class="entry-subtitle">${edu.degree} in ${edu.field}</div>
                </div>
                <div style="text-align: right;">
                  <div class="entry-date">${edu.startYear} - ${edu.current ? "Present" : edu.endYear}</div>
                  ${edu.grade ? `<div class="entry-date">Grade: ${edu.grade}</div>` : ""}
                </div>
              </div>
            </div>
          `
        )
        .join("")}
        </div>`
      : ""
    }

  ${experience.length > 0
      ? `<div class="section">
          <div class="section-title">Experience</div>
          ${experience
        .map(
          (exp) => `
            <div class="entry">
              <div class="entry-header">
                <div>
                  <div class="entry-title">${exp.role}</div>
                  <div class="entry-subtitle">${exp.company}</div>
                </div>
                <div class="entry-date">${exp.startDate} - ${exp.current ? "Present" : exp.endDate}</div>
              </div>
              ${exp.description ? `<div class="entry-description">${exp.description.replace(/\n/g, "<br>")}</div>` : ""}
            </div>
          `
        )
        .join("")}
        </div>`
      : ""
    }

  ${projects.length > 0
      ? `<div class="section">
          <div class="section-title">Projects</div>
          ${projects
        .map(
          (proj) => `
            <div class="entry">
              <div class="entry-header">
                <div class="entry-title">${proj.title}</div>
                ${proj.link ? `<a href="${proj.link}" class="entry-date">Link</a>` : ""}
              </div>
              ${proj.description ? `<div class="entry-description">${proj.description}</div>` : ""}
              ${proj.technologies && proj.technologies.length > 0
              ? `<div class="entry-subtitle" style="margin-top: 5px;">Technologies: ${proj.technologies.join(", ")}</div>`
              : ""
            }
            </div>
          `
        )
        .join("")}
        </div>`
      : ""
    }

  ${skills.length > 0
      ? `<div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-container">
            ${skills.map((skill) => `<span class="skill">${skill}</span>`).join("")}
          </div>
        </div>`
      : ""
    }

  ${certifications.length > 0
      ? `<div class="section">
          <div class="section-title">Certifications</div>
          ${certifications
        .map(
          (cert) => `
            <div class="entry">
              <div class="entry-header">
                <div>
                  <div class="entry-title">${cert.name}</div>
                  <div class="entry-subtitle">${cert.issuer}</div>
                </div>
                <div class="entry-date">${cert.date}</div>
              </div>
            </div>
          `
        )
        .join("")}
        </div>`
      : ""
    }

  ${achievements.length > 0
      ? `<div class="section">
          <div class="section-title">Achievements</div>
          <ul>
            ${achievements.map((achievement) => `<li>${achievement.title}${achievement.description ? ` - ${achievement.description}` : ""}</li>`).join("")}
          </ul>
        </div>`
      : ""
    }
</body>
</html>
  `;
}
