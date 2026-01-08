import { PersonalInfo, Education, Experience, Project, Certification } from "@/types";

interface ResumePreviewProps {
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  certifications?: Certification[];
  achievements?: string[];
}

export function ResumePreview({
  personalInfo,
  education,
  experience,
  projects,
  skills,
  certifications = [],
  achievements = [],
}: ResumePreviewProps) {
  return (
    <div className="bg-white text-black p-8 rounded-lg shadow-lg max-h-[800px] overflow-y-auto">
      <div className="space-y-6">
        <div className="border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">{personalInfo.name || "Your Name"}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-700">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>•</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>•</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-blue-600">
            {personalInfo.linkedin && (
              <a href={personalInfo.linkedin} className="hover:underline">
                LinkedIn
              </a>
            )}
            {personalInfo.github && (
              <a href={personalInfo.github} className="hover:underline">
                GitHub
              </a>
            )}
            {personalInfo.portfolio && (
              <a href={personalInfo.portfolio} className="hover:underline">
                Portfolio
              </a>
            )}
          </div>
        </div>

        {personalInfo.summary && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">PROFESSIONAL SUMMARY</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{personalInfo.summary}</p>
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              EDUCATION
            </h2>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{edu.institution}</h3>
                      <p className="text-sm text-gray-700">
                        {edu.degree} in {edu.field}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>
                        {edu.startYear} - {edu.current ? "Present" : edu.endYear}
                      </p>
                      {edu.grade && <p className="font-medium">Grade: {edu.grade}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              EXPERIENCE
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.role}</h3>
                      <p className="text-sm text-gray-700">{exp.company}</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                    </p>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              PROJECTS
            </h2>
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900">{proj.title}</h3>
                    {proj.link && (
                      <a
                        href={proj.link}
                        className="text-sm text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Link
                      </a>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Technologies:</span>{" "}
                      {proj.technologies.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              SKILLS
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              CERTIFICATIONS
            </h2>
            <div className="space-y-2">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    <p className="text-sm text-gray-700">{cert.issuer}</p>
                  </div>
                  <p className="text-sm text-gray-600">{cert.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              ACHIEVEMENTS
            </h2>
            <ul className="list-disc list-inside space-y-1">
              {achievements.map((achievement, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
