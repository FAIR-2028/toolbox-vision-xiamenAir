/**
 * Stable application contract for all toolbox vision providers.
 * All coordinates use normalized_0_1000 relative to the displayed source image.
 * This is an integration contract, not a detection algorithm.
 */

export type VisionProviderId = "mock" | "qwen" | "algorithm";
export type OverallStatus = "complete" | "missing" | "review";
export type ConfidenceLevel = "high" | "medium" | "low";
export type BBox = [number, number, number, number];

export interface VisionAnalyzeInput {
  requestId: string;
  image: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalFileName: string;
  inventory: ToolInventory;
  sampleId?: string;
}

export interface ToolInventoryItem {
  classId: string;
  label: string;
  expectedCount: number;
  unit: string;
  provisional: boolean;
  countingMode: "individual" | "assembly" | "group_count";
}

export interface ToolInventory {
  inventoryId: string;
  name: string;
  provisional: boolean;
  items: ToolInventoryItem[];
}

export interface Detection {
  id: string;
  classId: string;
  label: string;
  bbox: BBox;
  count: number;
  confidence?: number;
  confidenceLevel?: ConfidenceLevel;
}

export interface MissingItem {
  classId: string;
  label: string;
  expectedCount: number;
  observedCount: number;
  missingCount: number;
  unit: string;
  locationText?: string;
  slotBbox?: BBox | null;
  locationReliable: boolean;
  confidenceLevel: ConfidenceLevel;
}

export interface InventoryComparison {
  classId: string;
  label: string;
  expectedCount: number;
  observedCount: number;
  missingCount: number;
  excessCount: number;
  unit: string;
  status: "ok" | "missing" | "review";
  provisional: boolean;
}

export interface VisionAnalysis {
  requestId: string;
  provider: VisionProviderId;
  sourceLabel: string;
  model?: string;
  algorithmVersion?: string;
  overallStatus: OverallStatus;
  coordinateSystem: "normalized_0_1000";
  imageWidth: number;
  imageHeight: number;
  expectedTotal: number;
  observedTotal: number;
  missingTotal: number;
  reviewCount: number;
  inventory: InventoryComparison[];
  detections: Detection[];
  missingItems: MissingItem[];
  uncertainRegions: BBox[];
  warnings: string[];
}

export interface ProviderHealth {
  provider: VisionProviderId;
  configured: boolean;
  available: boolean;
  message: string;
}

export interface VisionProvider {
  readonly id: VisionProviderId;
  readonly displayName: string;
  isConfigured(): Promise<boolean>;
  healthCheck(): Promise<ProviderHealth>;
  analyze(input: VisionAnalyzeInput): Promise<VisionAnalysis>;
}
