export interface MockContact {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employee" | "client";
  status: "online" | "offline" | "away";
  // employee fields
  jobTitle?: string;
  // client fields
  clientName?: string;
  industry?: string;
  assignedTo?: string;
  initials?: string;
  logoBg?: string;
}

const admins: MockContact[] = [
  { id: 99, name: "Agency Admin", email: "admin@thepiecraft.com", role: "admin", status: "online" },
];

const employees: MockContact[] = [
  { id: 1, name: "Priya Shah", email: "priya@piecraft.com", role: "employee", status: "online", jobTitle: "Lead Strategist" },
  { id: 2, name: "Mateo Alvarez", email: "mateo@piecraft.com", role: "employee", status: "online", jobTitle: "Performance Marketing" },
  { id: 3, name: "Lena Park", email: "lena@piecraft.com", role: "employee", status: "away", jobTitle: "Brand Designer" },
  { id: 4, name: "Jordan Wells", email: "jordan@piecraft.com", role: "employee", status: "online", jobTitle: "SEO & Analytics" },
  { id: 5, name: "Sam Okafor", email: "sam@piecraft.com", role: "employee", status: "online", jobTitle: "Senior Developer" },
  { id: 6, name: "Yuki Tanaka", email: "yuki@piecraft.com", role: "employee", status: "offline", jobTitle: "Content Lead" },
  { id: 7, name: "Aisha Rahman", email: "aisha@piecraft.com", role: "employee", status: "online", jobTitle: "Account Manager" },
  { id: 8, name: "Diego Costa", email: "diego@piecraft.com", role: "employee", status: "away", jobTitle: "Junior Developer" },
];

const clients: MockContact[] = [
  { id: 101, name: "Acme Corp Contact", email: "contact@acmecorp.com", role: "client", status: "online", clientName: "Acme Corp", industry: "E-commerce", assignedTo: "Priya Shah", initials: "AC", logoBg: "from-rose-500 to-orange-500" },
  { id: 102, name: "Stark Industries Contact", email: "contact@stark.com", role: "client", status: "online", clientName: "Stark Industries", industry: "Manufacturing", assignedTo: "Mateo Alvarez", initials: "SI", logoBg: "from-amber-500 to-rose-500" },
  { id: 103, name: "Wayne Enterprises Contact", email: "contact@wayne.com", role: "client", status: "away", clientName: "Wayne Enterprises", industry: "Real Estate", assignedTo: "Priya Shah", initials: "WE", logoBg: "from-slate-700 to-slate-900" },
  { id: 104, name: "Globex Contact", email: "contact@globex.com", role: "client", status: "offline", clientName: "Globex", industry: "SaaS", assignedTo: "Lena Park", initials: "GX", logoBg: "from-emerald-500 to-teal-500" },
  { id: 105, name: "Initech Contact", email: "contact@initech.com", role: "client", status: "online", clientName: "Initech", industry: "Fintech", assignedTo: "Jordan Wells", initials: "IT", logoBg: "from-indigo-500 to-violet-500" },
  { id: 106, name: "Hooli Contact", email: "contact@hooli.com", role: "client", status: "online", clientName: "Hooli", industry: "Tech", assignedTo: "Mateo Alvarez", initials: "HL", logoBg: "from-sky-500 to-indigo-500" },
  { id: 107, name: "Pied Piper Contact", email: "contact@piedpiper.com", role: "client", status: "offline", clientName: "Pied Piper", industry: "Tech", assignedTo: "Lena Park", initials: "PP", logoBg: "from-emerald-500 to-lime-500" },
  { id: 108, name: "Cyberdyne Systems Contact", email: "contact@cyberdyne.com", role: "client", status: "away", clientName: "Cyberdyne Systems", industry: "Defense", assignedTo: "Jordan Wells", initials: "CS", logoBg: "from-rose-600 to-pink-600" },
  { id: 109, name: "Soylent Corp Contact", email: "contact@soylent.com", role: "client", status: "offline", clientName: "Soylent Corp", industry: "Food & Bev", assignedTo: "Priya Shah", initials: "SO", logoBg: "from-lime-500 to-emerald-500" },
  { id: 110, name: "Massive Dynamic Contact", email: "contact@massive.com", role: "client", status: "online", clientName: "Massive Dynamic", industry: "R&D", assignedTo: "Mateo Alvarez", initials: "MD", logoBg: "from-violet-600 to-fuchsia-600" },
];

export function getAdminContacts(currentUserId?: number): {
  admins: MockContact[];
  employees: MockContact[];
  clients: MockContact[];
} {
  return {
    admins,
    employees,
    clients,
  };
}

export function getEmployeeContacts(currentUserName: string): {
  admins: MockContact[];
  employees: MockContact[];
  clients: MockContact[];
} {
  return {
    admins,
    employees: employees.filter((e) => e.name !== currentUserName),
    clients: clients.filter((c) => c.assignedTo === currentUserName),
  };
}

export function getContactById(id: number): MockContact | undefined {
  return [...admins, ...employees, ...clients].find((c) => c.id === id);
}

export function getAllContacts(): MockContact[] {
  return [...admins, ...employees, ...clients];
}
