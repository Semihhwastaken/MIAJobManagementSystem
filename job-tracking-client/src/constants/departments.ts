export const DEPARTMENTS = [
    "Frontend Development",
    "Backend Development",
    "Full Stack Development",
    "Mobile Development",
    "DevOps",
    "Quality Assurance (QA)",
    "UI/UX Design",
    "Software Architecture",
    "Database Administration",
    "Cloud Engineering",
    "System Administration",
    "Information Security",
    "Data Science",
    "Machine Learning",
    "Artificial Intelligence",
    "Business Analysis",
    "Product Management",
    "Project Management",
    "Technical Support",
    "Research and Development",
    "Infrastructure",
    "Network Engineering",
    "Embedded Systems",
    "IoT Development",
    "Blockchain Development"
] as const;

export type Department = typeof DEPARTMENTS[number];
