import type { ClaimObject } from "@/types/claim";

export interface EvidenceRule {
  id: string;
  object: ClaimObject;
  issueType: string;
  part: string;
  minimumEvidence: string;
  goodExample: string;
  insufficientExample: string;
  status: "active" | "draft";
}

export const EVIDENCE_RULES: EvidenceRule[] = [
  {
    id: "car-dent",
    object: "car",
    issueType: "Dent",
    part: "Body panel or bumper",
    minimumEvidence:
      "The affected panel or bumper must be clearly visible from an angle where deformation can be inspected.",
    goodExample:
      "Three-quarter angle of the bumper with visible inward deformation and reference for scale.",
    insufficientExample: "Straight-on shot with heavy glare hiding the surface.",
    status: "active",
  },
  {
    id: "car-scratch",
    object: "car",
    issueType: "Scratch",
    part: "Painted surface",
    minimumEvidence:
      "The claimed area must be visible with sufficient lighting and resolution to inspect surface marks.",
    goodExample: "Close-up showing scratch length, depth and surrounding paint.",
    insufficientExample: "Blurry photo taken at night with no scratch detail.",
    status: "active",
  },
  {
    id: "car-glass",
    object: "car",
    issueType: "Glass shatter",
    part: "Windshield, window or light",
    minimumEvidence:
      "The damaged glass must be clearly visible and the shatter pattern must be inspectable.",
    goodExample: "Front-facing photo showing crack pattern across the glass.",
    insufficientExample: "Reflection-only image where shatter pattern is not visible.",
    status: "active",
  },
  {
    id: "car-missing",
    object: "car",
    issueType: "Missing part",
    part: "Mirror, badge, light or trim",
    minimumEvidence:
      "The expected attachment area and surrounding vehicle structure must be visible.",
    goodExample: "Photo showing the mounting point where the part should be attached.",
    insufficientExample: "Distant shot that does not show the attachment area.",
    status: "active",
  },
  {
    id: "laptop-screen",
    object: "laptop",
    issueType: "Screen crack",
    part: "Display panel",
    minimumEvidence: "The screen surface must be visible with adequate lighting and minimal glare.",
    goodExample: "Powered-off screen with visible crack lines and clear focus.",
    insufficientExample: "Screen displaying bright content that hides surface cracks.",
    status: "active",
  },
  {
    id: "laptop-hinge",
    object: "laptop",
    issueType: "Broken hinge",
    part: "Hinge / lid-base connection",
    minimumEvidence: "The hinge area and connection between screen and base must be visible.",
    goodExample: "Side angle showing hinge separation or misalignment.",
    insufficientExample: "Top-down photo of the closed laptop.",
    status: "active",
  },
  {
    id: "laptop-keyboard",
    object: "laptop",
    issueType: "Keyboard damage",
    part: "Keyboard",
    minimumEvidence:
      "The keyboard must be visible clearly enough to identify missing or damaged keys.",
    goodExample: "Direct overhead photo of the keyboard area.",
    insufficientExample: "Side photo where individual keys are not legible.",
    status: "active",
  },
  {
    id: "laptop-trackpad",
    object: "laptop",
    issueType: "Trackpad damage",
    part: "Trackpad",
    minimumEvidence: "The complete trackpad surface should be visible.",
    goodExample: "Top-down shot of the trackpad with even lighting.",
    insufficientExample: "Photo cropped to show only one corner of the trackpad.",
    status: "active",
  },
  {
    id: "pkg-crush",
    object: "package",
    issueType: "Crushed packaging",
    part: "Box side or corner",
    minimumEvidence:
      "The box or package side must be visible from an angle showing structural deformation.",
    goodExample: "Three-quarter view showing the caved-in side or corner.",
    insufficientExample: "Top-only view that hides the deformed side.",
    status: "active",
  },
  {
    id: "pkg-tear",
    object: "package",
    issueType: "Torn packaging",
    part: "Side, flap, seal or corner",
    minimumEvidence: "The torn area must be clearly visible.",
    goodExample: "Close-up of tear with surrounding intact material for reference.",
    insufficientExample: "Far-away image where the tear is not visible.",
    status: "active",
  },
  {
    id: "pkg-seal",
    object: "package",
    issueType: "Broken seal",
    part: "Seal or opening mechanism",
    minimumEvidence: "The seal or opening mechanism must be directly visible.",
    goodExample: "Close-up of the broken seal showing tampering signs.",
    insufficientExample: "Bottom-of-box photo with no view of the seal.",
    status: "active",
  },
  {
    id: "pkg-missing",
    object: "package",
    issueType: "Missing contents",
    part: "Internal contents",
    minimumEvidence: "The opened package and the internal contents area must be visible.",
    goodExample: "Opened package showing what is and is not inside.",
    insufficientExample: "Sealed exterior photo with no contents view.",
    status: "active",
  },
];
