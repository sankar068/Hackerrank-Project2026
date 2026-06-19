import type { ClaimInput, ReviewResult, RiskFlag } from "@/types/claim";
import type { ReviewService } from "./reviewService";
import { SCENARIOS } from "@/data/scenarios";

const STAGES = [
  "Reading claim conversation",
  "Extracting claimed issue",
  "Detecting claimed object part",
  "Inspecting image evidence",
  "Checking evidence requirements",
  "Reviewing image quality",
  "Analysing user history",
  "Estimating severity",
  "Generating final decision",
];

function detectInjection(text: string) {
  return /ignore.*(instruction|previous)|mark.*as.*supported|override/i.test(text);
}

export class MockReviewService implements ReviewService {
  async reviewClaim(
    input: ClaimInput,
    onStage?: (stage: string, progress: number) => void,
  ): Promise<ReviewResult> {
    for (let i = 0; i < STAGES.length; i++) {
      await new Promise((r) => setTimeout(r, 380));
      onStage?.(STAGES[i], Math.round(((i + 1) / STAGES.length) * 100));
    }

    // Match against built-in scenario if any image/title/userId matches.
    const scenario = SCENARIOS.find(
      (s) => s.input.userId === input.userId || s.input.claimTitle === input.claimTitle,
    );

    if (scenario) {
      const supporting = input.images[0]?.id ? [input.images[0].id] : [];
      return {
        ...scenario.result,
        claimId: input.claimId,
        userId: input.userId,
        supportingImageIds: supporting,
        imageReviews: input.images.map((img, idx) => ({
          imageId: img.id,
          detectedObject: scenario.result.extractedClaim.claimedObject,
          detectedPart: scenario.result.objectPart,
          visibleIssue: scenario.result.issueType,
          imageQuality: "good",
          evidenceRelevance: idx === 0 ? "high" : "medium",
          includedAsSupport: idx === 0,
          observation: scenario.result.evidenceStandardMetReason,
        })),
        reviewedAt: new Date().toISOString(),
        simulated: true,
      };
    }

    // Custom claim fallback simulation.
    const convoText = input.conversation.map((m) => m.text).join(" ");
    const injection = detectInjection(convoText);
    const hasImages = input.images.length > 0;
    const riskFlags: RiskFlag[] = [];
    if (injection) riskFlags.push("text_instruction_present");
    if (!hasImages) {
      riskFlags.push("damage_not_visible", "manual_review_required");
    }
    if (input.history.rejected >= 2 || input.history.recentClaims >= 3) {
      riskFlags.push("user_history_risk", "manual_review_required");
    }
    if (riskFlags.length === 0) riskFlags.push("none");

    const status = !hasImages ? "not_enough_information" : "supported";

    return {
      claimId: input.claimId,
      userId: input.userId,
      claimObject: input.claimObject,
      evidenceStandardMet: hasImages,
      evidenceStandardMetReason: hasImages
        ? "Submitted image(s) cover the claimed area at a usable angle."
        : "No image evidence was submitted.",
      issueType: hasImages ? "unknown" : "unknown",
      objectPart: input.claimTitle.slice(0, 40),
      claimStatus: status,
      claimStatusJustification: hasImages
        ? "Simulated review based on UI inputs. Visible evidence is consistent with the claim."
        : "No image evidence available to verify the claim.",
      supportingImageIds: hasImages ? [input.images[0].id] : [],
      validImage: hasImages,
      severity: hasImages ? "medium" : "unknown",
      riskFlags,
      extractedClaim: {
        claimedObject: input.claimObject,
        claimedIssue: "Custom claim",
        claimedPart: input.claimTitle,
        excludedParts: [],
      },
      imageReviews: input.images.map((img, idx) => ({
        imageId: img.id,
        detectedObject: input.claimObject,
        detectedPart: "Unspecified",
        visibleIssue: "Inspected",
        imageQuality: "good",
        evidenceRelevance: idx === 0 ? "high" : "medium",
        includedAsSupport: idx === 0,
        observation: "Simulated observation. Production VLM will provide the real description.",
      })),
      evidenceChecks: [
        { label: "Correct object visible", passed: hasImages },
        { label: "Correct object part visible", passed: hasImages },
        { label: "Damage area visible", passed: hasImages },
        { label: "Image quality sufficient", passed: hasImages },
        { label: "Evidence sufficient for decision", passed: hasImages },
      ],
      reasoning: {
        claimed: input.claimTitle || "Custom claim",
        observed: hasImages
          ? "Images were inspected by the simulation engine."
          : "No images were submitted.",
        decision: hasImages
          ? "Simulated supportive decision. A real VLM will produce the production decision."
          : "No images means the claim cannot be verified.",
      },
      minimumEvidenceExpected: "See the Evidence Rules library for object-specific requirements.",
      reviewedAt: new Date().toISOString(),
      simulated: true,
    };
  }
}
