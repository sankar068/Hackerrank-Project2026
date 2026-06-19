import type { StoredClaim, ClaimObject, ClaimStatus, Severity, RiskFlag, IssueType } from "@/types/claim";

interface Seed {
  claimId: string;
  userId: string;
  userName: string;
  claimObject: ClaimObject;
  claimTitle: string;
  summary: string;
  imageCount: number;
  status: ClaimStatus;
  severity: Severity;
  issueType: IssueType;
  objectPart: string;
  riskFlags: RiskFlag[];
  evidenceStandardMet: boolean;
  validImage: boolean;
  daysAgo: number;
}

const SEEDS: Seed[] = [
  { claimId: "CLM-10421", userId: "USR-2041", userName: "Maya Carter", claimObject: "car", claimTitle: "Rear bumper dent", summary: "Dent on rear bumper after parking incident.", imageCount: 2, status: "supported", severity: "medium", issueType: "dent", objectPart: "Rear bumper", riskFlags: ["none"], evidenceStandardMet: true, validImage: true, daysAgo: 0 },
  { claimId: "CLM-10408", userId: "USR-3120", userName: "Daniel Park", claimObject: "laptop", claimTitle: "Trackpad crack", summary: "Trackpad reported cracked, image shows undamaged surface.", imageCount: 1, status: "contradicted", severity: "none", issueType: "none", objectPart: "Trackpad", riskFlags: ["damage_not_visible", "claim_mismatch"], evidenceStandardMet: true, validImage: true, daysAgo: 0 },
  { claimId: "CLM-10399", userId: "USR-5512", userName: "Priya Sharma", claimObject: "package", claimTitle: "Missing contents", summary: "Items reported missing, only sealed exterior shown.", imageCount: 1, status: "not_enough_information", severity: "unknown", issueType: "unknown", objectPart: "Contents", riskFlags: ["wrong_object_part", "manual_review_required"], evidenceStandardMet: false, validImage: true, daysAgo: 1 },
  { claimId: "CLM-10387", userId: "USR-7781", userName: "Alex Reyes", claimObject: "laptop", claimTitle: "Broken hinge", summary: "Hinge separation visible. Conversation contained injection attempt.", imageCount: 2, status: "supported", severity: "high", issueType: "broken_part", objectPart: "Hinge", riskFlags: ["text_instruction_present"], evidenceStandardMet: true, validImage: true, daysAgo: 1 },
  { claimId: "CLM-10374", userId: "USR-9023", userName: "Jordan Lee", claimObject: "package", claimTitle: "Crushed corner", summary: "Crushed corner clearly visible. User has prior rejections.", imageCount: 3, status: "supported", severity: "medium", issueType: "crushed_packaging", objectPart: "Corner", riskFlags: ["user_history_risk", "manual_review_required"], evidenceStandardMet: true, validImage: true, daysAgo: 2 },
  { claimId: "CLM-10355", userId: "USR-4471", userName: "Sofia Martinez", claimObject: "car", claimTitle: "Windshield crack", summary: "Long horizontal crack across windshield.", imageCount: 2, status: "supported", severity: "high", issueType: "glass_shatter", objectPart: "Windshield", riskFlags: ["none"], evidenceStandardMet: true, validImage: true, daysAgo: 3 },
  { claimId: "CLM-10341", userId: "USR-6688", userName: "Hiro Tanaka", claimObject: "laptop", claimTitle: "Screen crack", summary: "Screen photo too blurry to confirm crack.", imageCount: 1, status: "not_enough_information", severity: "unknown", issueType: "unknown", objectPart: "Display", riskFlags: ["blurry_image", "manual_review_required"], evidenceStandardMet: false, validImage: false, daysAgo: 3 },
  { claimId: "CLM-10329", userId: "USR-1190", userName: "Emma Wilson", claimObject: "package", claimTitle: "Torn flap", summary: "Tear visible along top flap.", imageCount: 2, status: "supported", severity: "low", issueType: "torn_packaging", objectPart: "Top flap", riskFlags: ["none"], evidenceStandardMet: true, validImage: true, daysAgo: 4 },
  { claimId: "CLM-10312", userId: "USR-8842", userName: "Noah Bennett", claimObject: "car", claimTitle: "Scratch on door", summary: "Driver door scratch claim, possible image manipulation detected.", imageCount: 2, status: "not_enough_information", severity: "unknown", issueType: "unknown", objectPart: "Driver door", riskFlags: ["possible_manipulation", "manual_review_required"], evidenceStandardMet: true, validImage: false, daysAgo: 5 },
  { claimId: "CLM-10298", userId: "USR-2204", userName: "Olivia Brown", claimObject: "laptop", claimTitle: "Missing key", summary: "Keyboard missing two keys, clearly visible.", imageCount: 1, status: "supported", severity: "low", issueType: "missing_part", objectPart: "Keyboard", riskFlags: ["none"], evidenceStandardMet: true, validImage: true, daysAgo: 6 },
  { claimId: "CLM-10277", userId: "USR-3389", userName: "Ravi Patel", claimObject: "car", claimTitle: "Mirror dent", summary: "Wrong angle, mirror not visible in frame.", imageCount: 1, status: "not_enough_information", severity: "unknown", issueType: "unknown", objectPart: "Side mirror", riskFlags: ["wrong_angle", "wrong_object_part"], evidenceStandardMet: false, validImage: true, daysAgo: 7 },
  { claimId: "CLM-10260", userId: "USR-7724", userName: "Chloe Adams", claimObject: "package", claimTitle: "Broken seal", summary: "Seal clearly broken on arrival.", imageCount: 2, status: "supported", severity: "medium", issueType: "broken_part", objectPart: "Seal", riskFlags: ["none"], evidenceStandardMet: true, validImage: true, daysAgo: 8 },
];

function isoDaysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(9 + (d % 8), (d * 13) % 60, 0, 0);
  return dt.toISOString();
}

export const DEMO_CLAIMS: StoredClaim[] = SEEDS.map((s) => ({
  claimId: s.claimId,
  userId: s.userId,
  userName: s.userName,
  claimObject: s.claimObject,
  claimTitle: s.claimTitle,
  submittedAt: isoDaysAgo(s.daysAgo),
  conversation: [
    { role: "customer", text: s.summary },
    { role: "agent", text: "Thanks, the case has been queued for evidence review." },
  ],
  images: Array.from({ length: s.imageCount }).map((_, i) => ({
    id: `${s.claimId}-IMG-${i + 1}`,
    name: `evidence-${i + 1}.jpg`,
    size: 180000 + i * 12000,
    dataUrl: "",
  })),
  history: { totalClaims: 2, accepted: 1, rejected: 0, manualReview: 0, recentClaims: 1, riskNotes: "—" },
  result: {
    claimId: s.claimId,
    userId: s.userId,
    claimObject: s.claimObject,
    evidenceStandardMet: s.evidenceStandardMet,
    evidenceStandardMetReason: s.evidenceStandardMet ? "Required area is visible." : "Required area is not sufficiently visible.",
    issueType: s.issueType,
    objectPart: s.objectPart,
    claimStatus: s.status,
    claimStatusJustification: s.summary,
    supportingImageIds: s.imageCount > 0 ? [`${s.claimId}-IMG-1`] : [],
    validImage: s.validImage,
    severity: s.severity,
    riskFlags: s.riskFlags,
    extractedClaim: { claimedObject: s.claimObject, claimedIssue: s.issueType, claimedPart: s.objectPart, excludedParts: [] },
    imageReviews: [],
    evidenceChecks: [
      { label: "Correct object visible", passed: true },
      { label: "Correct object part visible", passed: s.evidenceStandardMet },
      { label: "Damage area visible", passed: s.evidenceStandardMet },
      { label: "Image quality sufficient", passed: s.validImage },
      { label: "Evidence sufficient for decision", passed: s.evidenceStandardMet },
    ],
    reasoning: { claimed: s.summary, observed: "See image evidence review.", decision: s.claimTitle },
    minimumEvidenceExpected: "See rule library.",
    reviewedAt: isoDaysAgo(s.daysAgo),
    simulated: true,
  },
}));
