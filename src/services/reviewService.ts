import type { ClaimInput, ReviewResult } from "@/types/claim";

export interface ReviewService {
  reviewClaim(
    input: ClaimInput,
    onStage?: (stage: string, progress: number) => void,
  ): Promise<ReviewResult>;
}

class ProductionReviewService implements ReviewService {
  async reviewClaim(
    input: ClaimInput,
    onStage?: (stage: string, progress: number) => void,
  ): Promise<ReviewResult> {
    if (onStage) onStage("Connecting to AI review backend...", 50);
    throw new Error(
      "AI_REVIEW_SERVICE_NOT_CONFIGURED: Connect the production backend to analyse this claim.",
    );
  }
}

export const reviewService: ReviewService = new ProductionReviewService();
