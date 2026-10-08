// Certification recommendations. A small catalog maintained by the team,
// matched to the learner's goal and skill titles by keyword. Nothing here is
// fetched or checked at runtime: exam codes, formats and prices change, so the
// UI sends learners to the provider's page and states no fees or durations.

export interface Certification {
  id: string;
  name: string;
  provider: string;
  url: string;
  kind: "proctored exam" | "course certificate";
  level: "beginner" | "intermediate";
  /** why someone would take it, in our words */
  blurb: string;
  /** lowercase; multi-word phrases are matched as phrases, longer = more specific */
  keywords: string[];
}

export const CERTIFICATIONS: Certification[] = [
  {
    id: "pcep",
    name: "PCEP: Certified Entry-Level Python Programmer",
    provider: "Python Institute",
    url: "https://pythoninstitute.org/pcep",
    kind: "proctored exam",
    level: "beginner",
    blurb: "A vendor-neutral check of core Python: syntax, data types, control flow, functions and basic error handling.",
    keywords: ["python", "programming basics", "loops", "functions", "variables", "beginner programming"],
  },
  {
    id: "pcap",
    name: "PCAP: Certified Associate in Python Programming",
    provider: "Python Institute",
    url: "https://pythoninstitute.org/pcap",
    kind: "proctored exam",
    level: "intermediate",
    blurb: "The next step after PCEP: modules, object-oriented Python, exceptions and standard-library use.",
    keywords: ["python", "object oriented", "classes", "modules", "exceptions", "packages"],
  },
  {
    id: "google-data-analytics",
    name: "Google Data Analytics Professional Certificate",
    provider: "Google, on Coursera",
    url: "https://www.coursera.org/professional-certificates/google-data-analytics",
    kind: "course certificate",
    level: "beginner",
    blurb: "Entry-level data analysis: cleaning, analysing and visualising data with spreadsheets, SQL and R.",
    keywords: ["data analysis", "data analytics", "data analyst", "spreadsheet", "sql", "data cleaning", "visualization", "dashboard"],
  },
  {
    id: "freecodecamp-data-analysis",
    name: "freeCodeCamp: Data Analysis with Python",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn",
    kind: "course certificate",
    level: "beginner",
    blurb: "A free, project-based certification covering NumPy, pandas and visualisation in Python.",
    keywords: ["pandas", "numpy", "data analysis", "python", "dataframe", "matplotlib", "data science"],
  },
  {
    id: "freecodecamp-web",
    name: "freeCodeCamp: Responsive Web Design and JavaScript",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn",
    kind: "course certificate",
    level: "beginner",
    blurb: "Free, project-based certifications for HTML, CSS and JavaScript.",
    keywords: ["html", "css", "javascript", "web development", "frontend", "front-end", "responsive", "web design"],
  },
  {
    id: "meta-frontend",
    name: "Meta Front-End Developer Professional Certificate",
    provider: "Meta, on Coursera",
    url: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    kind: "course certificate",
    level: "beginner",
    blurb: "A guided path through HTML, CSS, JavaScript and React ending in a portfolio project.",
    keywords: ["react", "frontend", "front-end", "javascript", "web development", "html", "css"],
  },
  {
    id: "ml-specialization",
    name: "Machine Learning Specialization",
    provider: "DeepLearning.AI and Stanford Online, on Coursera",
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    kind: "course certificate",
    level: "beginner",
    blurb: "Foundations of supervised and unsupervised learning, neural networks and practical model building.",
    keywords: ["machine learning", "neural network", "regression", "classification", "deep learning", "supervised", "model training", "artificial intelligence"],
  },
  {
    id: "ai-900",
    name: "Microsoft Certified: Azure AI Fundamentals (AI-900)",
    provider: "Microsoft",
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Core AI and machine-learning concepts and the Azure services that implement them. No coding required.",
    keywords: ["artificial intelligence", "machine learning", "ai fundamentals", "generative ai", "computer vision", "nlp", "azure"],
  },
  {
    id: "aws-ccp",
    name: "AWS Certified Cloud Practitioner",
    provider: "Amazon Web Services",
    url: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Foundational cloud concepts, core AWS services, security and billing.",
    keywords: ["aws", "cloud", "cloud computing", "amazon web services", "devops", "infrastructure"],
  },
  {
    id: "az-900",
    name: "Microsoft Certified: Azure Fundamentals (AZ-900)",
    provider: "Microsoft",
    url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Foundational cloud concepts and core Azure services, pricing and governance.",
    keywords: ["azure", "cloud", "cloud computing", "microsoft cloud", "infrastructure"],
  },
  {
    id: "gcp-cdl",
    name: "Google Cloud Digital Leader",
    provider: "Google Cloud",
    url: "https://cloud.google.com/learn/certification/cloud-digital-leader",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Cloud fundamentals and how Google Cloud products map to business needs.",
    keywords: ["google cloud", "gcp", "cloud", "cloud computing"],
  },
  {
    id: "gcp-mle",
    name: "Google Cloud Professional Machine Learning Engineer",
    provider: "Google Cloud",
    url: "https://cloud.google.com/learn/certification/machine-learning-engineer",
    kind: "proctored exam",
    level: "intermediate",
    blurb: "Designing, building and operating ML systems on Google Cloud. Assumes hands-on ML experience.",
    keywords: ["machine learning", "mlops", "ml engineer", "model deployment", "google cloud", "tensorflow"],
  },
  {
    id: "security-plus",
    name: "CompTIA Security+",
    provider: "CompTIA",
    url: "https://www.comptia.org/certifications/security",
    kind: "proctored exam",
    level: "intermediate",
    blurb: "Widely recognised baseline for cybersecurity roles: threats, controls, network security and risk.",
    keywords: ["cybersecurity", "security", "network security", "encryption", "threats", "risk", "information security"],
  },
  {
    id: "isc2-cc",
    name: "ISC2 Certified in Cybersecurity (CC)",
    provider: "ISC2",
    url: "https://www.isc2.org/certifications/cc",
    kind: "proctored exam",
    level: "beginner",
    blurb: "An entry-level cybersecurity credential for people starting out in the field.",
    keywords: ["cybersecurity", "security", "information security", "beginner security", "networking"],
  },
  {
    id: "cka",
    name: "Certified Kubernetes Administrator (CKA)",
    provider: "Linux Foundation / CNCF",
    url: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
    kind: "proctored exam",
    level: "intermediate",
    blurb: "A hands-on, performance-based exam on running and troubleshooting Kubernetes clusters.",
    keywords: ["kubernetes", "containers", "docker", "devops", "orchestration", "cluster"],
  },
  {
    id: "terraform",
    name: "HashiCorp Certified: Terraform Associate",
    provider: "HashiCorp",
    url: "https://developer.hashicorp.com/certifications/infrastructure-automation",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Infrastructure-as-code concepts and everyday Terraform workflow.",
    keywords: ["terraform", "infrastructure as code", "devops", "cloud", "automation"],
  },
  {
    id: "capm",
    name: "Certified Associate in Project Management (CAPM)",
    provider: "Project Management Institute",
    url: "https://www.pmi.org/certifications/certified-associate-capm",
    kind: "proctored exam",
    level: "beginner",
    blurb: "Project-management fundamentals for people early in their careers.",
    keywords: ["project management", "agile", "scrum", "planning", "stakeholders", "product management"],
  },
  {
    id: "google-ux",
    name: "Google UX Design Professional Certificate",
    provider: "Google, on Coursera",
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
    kind: "course certificate",
    level: "beginner",
    blurb: "User research, wireframing and prototyping, finishing with portfolio projects.",
    keywords: ["ux", "user experience", "ui design", "design", "prototyping", "wireframe", "user research", "figma"],
  },
];

export interface CertMatch {
  cert: Certification;
  score: number;
  /** the keywords that matched, for "why this one" */
  matched: string[];
}

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;

/**
 * Ranks catalog entries for a learner. The goal text and course title count
 * double; skill titles count once. Longer keywords are more specific, so they
 * weigh more. Entries with no keyword hit are not returned.
 */
export function recommendCertifications(input: { goal: string; title?: string; skills: string[] }, limit = 3): CertMatch[] {
  const strong = norm(`${input.goal} ${input.title ?? ""}`);
  const weak = norm(input.skills.join(" "));
  return CERTIFICATIONS.map((cert) => {
    const matched: string[] = [];
    let score = 0;
    for (const k of cert.keywords) {
      const needle = norm(k);
      const hits = (strong.includes(needle) ? 2 : 0) + (weak.includes(needle) ? 1 : 0);
      if (hits) {
        matched.push(k);
        score += hits * k.length;
      }
    }
    return { cert, score, matched };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.cert.level.localeCompare(b.cert.level))
    .slice(0, limit);
}
