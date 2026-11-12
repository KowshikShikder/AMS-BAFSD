// ---------------------------------------------------------------------------
// Application Types
// ---------------------------------------------------------------------------
export const APPLICATION_TYPES = {
  ADMISSION: "admission",
  SHIFT_CHANGE: "shift_change",
  VERSION_CHANGE: "version_change",
  MISCELLANEOUS: "miscellaneous",
};

export const APPLICATION_TYPE_LABELS = {
  [APPLICATION_TYPES.ADMISSION]: "Admission",
  [APPLICATION_TYPES.SHIFT_CHANGE]: "Shift Change",
  [APPLICATION_TYPES.VERSION_CHANGE]: "Version Change",
  [APPLICATION_TYPES.MISCELLANEOUS]: "Miscellaneous",
};

// Which fields are relevant / required for each type (drives the form + table columns)
export const APPLICATION_TYPE_FIELDS = {
  [APPLICATION_TYPES.ADMISSION]: [
    "version",
    "shift",
    "class",
    "group",
    "name",
    "guardianName",
    "category",
    "remarks",
    "reference",
  ],
  [APPLICATION_TYPES.SHIFT_CHANGE]: [
    "version",
    "shift",
    "class",
    "studentId",
    "reqShift",
    "name",
    "guardianName",
    "category",
    "remarks",
    "reference",
  ],
  [APPLICATION_TYPES.VERSION_CHANGE]: [
    "version",
    "shift",
    "class",
    "studentId",
    "reqVersion",
    "reqShift",
    "name",
    "guardianName",
    "category",
    "remarks",
    "reference",
  ],
  [APPLICATION_TYPES.MISCELLANEOUS]: [
    "subject",
    "class",
    "requirement",
    "remarks",
    "category",
    "reference",
  ],
};

// ---------------------------------------------------------------------------
// Fixed select-field options
// ---------------------------------------------------------------------------
export const VERSIONS = ["Bangla", "English"];
export const SHIFTS = ["Morning", "Day"];
export const CLASSES = [
  "KG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];
export const CATEGORIES = ["Civil", "BAF", "SD", "SEMC", "Navy", "Army"];

export const VERSION_ABBREV = { Bangla: "BV", English: "EV" };
export const SHIFT_ABBREV = { Morning: "Mor", Day: "Day" };

// ---------------------------------------------------------------------------
// Robust "type" resolver for batch import — accepts the raw enum value
// ("admission"), the human label ("Admission"), or minor spacing/case/
// underscore variants ("Shift_Change", "shift change") and maps them all to
// the correct APPLICATION_TYPES enum value. This is what re-import of a
// previously-exported sheet (which prints the human label) needs to work.
function normalizeKey(s) {
  return String(s || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const TYPE_ALIASES = (() => {
  const map = {};
  Object.values(APPLICATION_TYPES).forEach((enumVal) => {
    map[normalizeKey(enumVal)] = enumVal;
  });
  Object.entries(APPLICATION_TYPE_LABELS).forEach(([enumVal, label]) => {
    map[normalizeKey(label)] = enumVal;
  });
  return map;
})();

export function resolveApplicationType(raw) {
  return TYPE_ALIASES[normalizeKey(raw)] || null;
}

// Classes for which a "Group" selector appears on the Admission form
export const GROUP_ELIGIBLE_CLASSES = ["IX", "X", "XI", "XII"];

export const GROUPS = ["Science", "B. Studies", "Humanities"];

// ---------------------------------------------------------------------------
// Document uploads
// ---------------------------------------------------------------------------
export const DOCUMENT_TYPES = [
  "Result",
  "Marksheet",
  "Application",
  "TC",
  "BAF Job Testimonial",
  "Student's Birth Certificate",
  "Others",
];

export const MAX_DOCUMENT_SIZE_BYTES = 200 * 1024; // 200 KB
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ---------------------------------------------------------------------------
// Status Workflow (color-based)
// ---------------------------------------------------------------------------
export const STATUS = {
  APPLIED: "applied",
  SEEN: "seen",
  SHORT_LISTED: "short_listed",
  CALLED_FOR_EXAM: "called_for_exam",
  ATTENDED_EXAM: "attended_exam",
  ABSENT_ON_EXAM: "absent_on_exam",
  SELECTED_FOR_REEXAM: "selected_for_reexam",
  APPROVED: "approved",
  DECLINED: "declined",
};

export const STATUS_ORDER = [
  STATUS.APPLIED,
  STATUS.SEEN,
  STATUS.SHORT_LISTED,
  STATUS.CALLED_FOR_EXAM,
  STATUS.ATTENDED_EXAM,
  STATUS.ABSENT_ON_EXAM,
  STATUS.SELECTED_FOR_REEXAM,
  STATUS.APPROVED,
  STATUS.DECLINED,
];

// The only statuses shown (as clickable filter cards) at the top of the dashboard
export const HEADLINE_STATUSES = [
  STATUS.APPROVED,
  STATUS.SHORT_LISTED,
  STATUS.APPLIED,
];

export const STATUS_LABELS = {
  [STATUS.APPLIED]: "Applied",
  [STATUS.SEEN]: "Seen",
  [STATUS.SHORT_LISTED]: "Short Listed",
  [STATUS.CALLED_FOR_EXAM]: "Called For Exam",
  [STATUS.ATTENDED_EXAM]: "Attended Exam",
  [STATUS.ABSENT_ON_EXAM]: "Absent on Exam",
  [STATUS.SELECTED_FOR_REEXAM]: "Selected For Re-Exam",
  [STATUS.APPROVED]: "Approved",
  [STATUS.DECLINED]: "Declined",
};

// Robust "status" resolver for batch import — same idea as
// resolveApplicationType, accepts the raw enum value or the human label.
const STATUS_ALIASES = (() => {
  const map = {};
  Object.values(STATUS).forEach((enumVal) => {
    map[normalizeKey(enumVal)] = enumVal;
  });
  Object.entries(STATUS_LABELS).forEach(([enumVal, label]) => {
    map[normalizeKey(label)] = enumVal;
  });
  return map;
})();

export function resolveStatus(raw) {
  return STATUS_ALIASES[normalizeKey(raw)] || null;
}

// Used both server-side (PDF) and client-side (badges/table rows)
export const STATUS_COLORS = {
  [STATUS.APPLIED]: { bg: "#FFFFFF", text: "#374151", border: "#D1D5DB" },
  [STATUS.SEEN]: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  [STATUS.SHORT_LISTED]: { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  [STATUS.CALLED_FOR_EXAM]: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  [STATUS.ATTENDED_EXAM]: { bg: "#CFFAFE", text: "#155E75", border: "#67E8F9" },
  [STATUS.ABSENT_ON_EXAM]: { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
  [STATUS.SELECTED_FOR_REEXAM]: { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },
  [STATUS.APPROVED]: { bg: "#16A34A", text: "#FFFFFF", border: "#15803D" },
  [STATUS.DECLINED]: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
};

// Statuses visible to the applicant on the public tracker. Seen and Short
// Listed are internal review states — the public sees "Applied" until the
// application is Approved or Declined.
export const PUBLIC_VISIBLE_STATUSES = [
  STATUS.APPLIED,
  STATUS.APPROVED,
  STATUS.DECLINED,
];

export function toPublicStatus(status) {
  return PUBLIC_VISIBLE_STATUSES.includes(status) ? status : STATUS.APPLIED;
}

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN_PRINCIPAL: "admin_principal",
  ADMIN_OFFICE: "admin_office",
  ENTRY: "entry",
  ADMIN_OFFICER: "admin_officer",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN_PRINCIPAL]: "Admin (Principal)",
  [ROLES.ADMIN_OFFICE]: "Admin (Office)",
  [ROLES.ENTRY]: "Entry",
  [ROLES.ADMIN_OFFICER]: "Admin Officer",
};

// ---------------------------------------------------------------------------
// Permission helpers — single source of truth, used both server- and
// client-side (client checks are UX only; the API re-enforces every rule).
// ---------------------------------------------------------------------------

// Who can change an application's status
export const STATUS_CHANGE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN_PRINCIPAL,
  ROLES.ADMIN_OFFICE,
];
export function canChangeStatus(role) {
  return STATUS_CHANGE_ROLES.includes(role);
}

// Who can see every application (vs. Entry, who only sees their own submissions)
export function canViewAll(role) {
  return role !== ROLES.ENTRY;
}

// Who can run the Excel batch import / bulk export
export const DATA_ADMIN_ROLES = [ROLES.SUPER_ADMIN];
export function canManageData(role) {
  return DATA_ADMIN_ROLES.includes(role);
}

// Who can edit seat/section capacity data
export const SEAT_MANAGE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN_PRINCIPAL,
  ROLES.ADMIN_OFFICE,
];
export function canManageSeats(role) {
  return SEAT_MANAGE_ROLES.includes(role);
}

// Any authenticated user (any role) may set a Manual App Sl during entry;
// the public (unauthenticated) form never exposes this field.
export function canSetManualAppSl(role) {
  return !!role;
}

// ---------------------------------------------------------------------------
// Seat status colouring — header convention "Sup(+)  Vac(-)":
//   negative (vacant seats)   = green, deeper the more vacancies
//   zero                      = plain white
//   positive (surplus/over)   = red, deeper the larger the surplus
// ---------------------------------------------------------------------------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export const SEAT_GREEN_FULL_AT = 45; // |value| at which green is deepest
export const SEAT_RED_FULL_AT = 25; // value at which red is deepest

export function seatStatusStyle(n) {
  const v = Number(n);
  if (n === "" || n === null || n === undefined || Number.isNaN(v) || v === 0) {
    return { background: "#ffffff", color: "#374151" };
  }
  if (v < 0) {
    const t = Math.min(Math.abs(v) / SEAT_GREEN_FULL_AT, 1);
    return { background: mixHex("#e6f4ea", "#5dbb82", t), color: "#0b3d20" };
  }
  const t = Math.min(v / SEAT_RED_FULL_AT, 1);
  return { background: mixHex("#fde4e6", "#f58a90", t), color: "#5c0b12" };
}
