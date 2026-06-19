export type ClaimObject = "car" | "laptop" | "package";

export type ClaimStatus = "supported" | "contradicted" | "not_enough_information";

export type Severity = "none" | "low" | "medium" | "high" | "unknown";

export type IssueType =
  | "dent"
  | "scratch"
  | "crack"
  | "glass_shatter"
  | "broken_part"
  | "missing_part"
  | "torn_packaging"
  | "crushed_packaging"
  | "water_damage"
  | "stain"
  | "none"
  | "unknown";

export type RiskFlag =
  | "blurry_image"
  | "cropped_or_obstructed"
  | "low_light_or_glare"
  | "wrong_angle"
  | "wrong_object"
  | "wrong_object_part"
  | "damage_not_visible"
  | "claim_mismatch"
  | "possible_manipulation"
  | "non_original_image"
  | "text_instruction_present"
  | "user_history_risk"
  | "manual_review_required"
  | "none";

export interface ConversationMessage {
  role: "customer" | "agent";
  text: string;
}

export interface ClaimImage {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  primary?: boolean;
}

export interface UserHistory {
  totalClaims: number;
  accepted: number;
  rejected: number;
  manualReview: number;
  recentClaims: number;
  riskNotes: string;
}

export interface ClaimInput {
  claimId: string;
  userId: string;
  userName: string;
  claimObject: ClaimObject;
  claimTitle: string;
  submittedAt: string;
  conversation: ConversationMessage[];
  images: ClaimImage[];
  history: UserHistory;
}

export interface ImageReview {
  imageId: string;
  detectedObject: string;
  detectedPart: string;
  visibleIssue: string;
  imageQuality: "good" | "fair" | "poor";
  evidenceRelevance: "high" | "medium" | "low";
  includedAsSupport: boolean;
  observation: string;
}

export interface ExtractedClaim {
  claimedObject: string;
  claimedIssue: string;
  claimedPart: string;
  locationQualifier?: string;
  excludedParts: string[];
}

export interface EvidenceCheck {
  label: string;
  passed: boolean;
}

export interface ReviewResult {
  claimId: string;
  userId: string;
  claimObject: ClaimObject;
  evidenceStandardMet: boolean;
  evidenceStandardMetReason: string;
  issueType: IssueType;
  objectPart: string;
  claimStatus: ClaimStatus;
  claimStatusJustification: string;
  supportingImageIds: string[];
  validImage: boolean;
  severity: Severity;
  riskFlags: RiskFlag[];
  extractedClaim: ExtractedClaim;
  imageReviews: ImageReview[];
  evidenceChecks: EvidenceCheck[];
  reasoning: { claimed: string; observed: string; decision: string };
  minimumEvidenceExpected: string;
  reviewedAt: string;
  simulated: boolean;
}

export interface StoredClaim extends ClaimInput {
  result: ReviewResult;
}
