import type { ClaimStatus, IssueType, RiskFlag, Severity, ClaimObject } from "@/types/claim";

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  supported: "Supported",
  contradicted: "Contradicted",
  not_enough_information: "Not Enough Information",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown",
};

export const ISSUE_LABEL: Record<IssueType, string> = {
  dent: "Dent",
  scratch: "Scratch",
  crack: "Crack",
  glass_shatter: "Glass shatter",
  broken_part: "Broken part",
  missing_part: "Missing part",
  torn_packaging: "Torn packaging",
  crushed_packaging: "Crushed packaging",
  water_damage: "Water damage",
  stain: "Stain",
  none: "None",
  unknown: "Unknown",
};

export const RISK_LABEL: Record<RiskFlag, string> = {
  blurry_image: "Blurry image",
  cropped_or_obstructed: "Cropped or obstructed",
  low_light_or_glare: "Low light or glare",
  wrong_angle: "Wrong angle",
  wrong_object: "Wrong object",
  wrong_object_part: "Wrong object part",
  damage_not_visible: "Damage not visible",
  claim_mismatch: "Claim mismatch",
  possible_manipulation: "Possible manipulation",
  non_original_image: "Non-original image",
  text_instruction_present: "Text instruction present",
  user_history_risk: "User history risk",
  manual_review_required: "Manual review required",
  none: "None",
};

export const OBJECT_LABEL: Record<ClaimObject, string> = {
  car: "Car",
  laptop: "Laptop",
  package: "Package",
};

export const OBJECT_DESCRIPTION: Record<ClaimObject, string> = {
  car: "Vehicle body, glass, mirror, light or exterior damage.",
  laptop: "Screen, keyboard, hinge, trackpad, lid or corner damage.",
  package: "Crushed box, torn packaging, broken seal or missing contents.",
};

export function statusTone(s: ClaimStatus): "success" | "destructive" | "warning" {
  return s === "supported" ? "success" : s === "contradicted" ? "destructive" : "warning";
}

export function severityTone(s: Severity): "muted" | "info" | "warning" | "destructive" {
  return s === "high" ? "destructive" : s === "medium" ? "warning" : s === "low" ? "info" : "muted";
}
