import { z } from "zod";

export type VisionProviderId = "mock" | "qwen" | "algorithm";
export type OverallStatus = "complete" | "missing" | "review";
export type ConfidenceLevel = "high" | "medium" | "low";
export type BBox = [number, number, number, number];

const finiteCoordinate = z.number().finite().min(0).max(1000);

export const BBoxSchema = z
  .tuple([finiteCoordinate, finiteCoordinate, finiteCoordinate, finiteCoordinate])
  .refine(([x1, y1, x2, y2]) => x2 > x1 && y2 > y1, {
    message: "BBox must satisfy x2 > x1 and y2 > y1",
  });

const positiveInteger = z.number().int().positive();
const nonNegativeInteger = z.number().int().nonnegative();
const confidenceSchema = z.number().finite().min(0).max(1);

export const VisionProviderIdSchema = z.enum(["mock", "qwen", "algorithm"]);
export const OverallStatusSchema = z.enum(["complete", "missing", "review"]);
export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export const MimeTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

export const ToolInventoryItemSchema = z.object({
  classId: z.string().min(1),
  label: z.string().min(1),
  expectedCount: nonNegativeInteger,
  unit: z.string().min(1),
  provisional: z.boolean(),
  countingMode: z.enum(["individual", "assembly", "group_count"]),
});

export const ToolInventorySchema = z
  .object({
    inventoryId: z.string().min(1),
    name: z.string().min(1),
    provisional: z.boolean(),
    items: z.array(ToolInventoryItemSchema),
  })
  .superRefine((inventory, context) => {
    const seen = new Set<string>();
    inventory.items.forEach((item, index) => {
      if (seen.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "classId"],
          message: "classId must be unique within inventory",
        });
      }
      seen.add(item.classId);
    });
  });

export const VisionAnalyzeInputSchema = z.object({
  requestId: z.string().min(1),
  image: z.custom<Buffer>(
    (value) => typeof Buffer !== "undefined" && Buffer.isBuffer(value),
    { message: "image must be a Buffer" },
  ),
  mimeType: MimeTypeSchema,
  originalFileName: z.string().min(1),
  inventory: ToolInventorySchema,
  sampleId: z.string().min(1).optional(),
});

export const DetectionSchema = z.object({
  id: z.string().min(1),
  classId: z.string().min(1),
  label: z.string().min(1),
  bbox: BBoxSchema,
  count: positiveInteger,
  confidence: confidenceSchema.optional(),
  confidenceLevel: ConfidenceLevelSchema.optional(),
});

export const MissingItemSchema = z
  .object({
    classId: z.string().min(1),
    label: z.string().min(1),
    expectedCount: nonNegativeInteger,
    observedCount: nonNegativeInteger,
    missingCount: nonNegativeInteger,
    unit: z.string().min(1),
    locationText: z.string().min(1).optional(),
    slotBbox: BBoxSchema.nullable().optional(),
    locationReliable: z.boolean(),
    confidenceLevel: ConfidenceLevelSchema,
  })
  .superRefine((item, context) => {
    if (item.observedCount + item.missingCount !== item.expectedCount) {
      context.addIssue({
        code: "custom",
        path: ["missingCount"],
        message: "observedCount + missingCount must equal expectedCount",
      });
    }
    if (item.locationReliable && !item.slotBbox) {
      context.addIssue({
        code: "custom",
        path: ["slotBbox"],
        message: "slotBbox is required when locationReliable is true",
      });
    }
    if (!item.locationReliable && item.slotBbox != null) {
      context.addIssue({
        code: "custom",
        path: ["slotBbox"],
        message: "slotBbox must be absent when locationReliable is false",
      });
    }
  });

export const InventoryComparisonSchema = z
  .object({
    classId: z.string().min(1),
    label: z.string().min(1),
    expectedCount: nonNegativeInteger,
    observedCount: nonNegativeInteger,
    missingCount: nonNegativeInteger,
    excessCount: nonNegativeInteger,
    unit: z.string().min(1),
    status: z.enum(["ok", "missing", "review"]),
    provisional: z.boolean(),
  })
  .superRefine((item, context) => {
    const expected = item.expectedCount;
    const observed = item.observedCount;
    const missing = item.missingCount;
    const excess = item.excessCount;
    if (missing !== Math.max(expected - observed, 0)) {
      context.addIssue({
        code: "custom",
        path: ["missingCount"],
        message: "missingCount must equal max(expectedCount - observedCount, 0)",
      });
    }
    if (excess !== Math.max(observed - expected, 0)) {
      context.addIssue({
        code: "custom",
        path: ["excessCount"],
        message: "excessCount must equal max(observedCount - expectedCount, 0)",
      });
    }
    if (item.status === "missing" && missing === 0 || item.status === "ok" && (missing > 0 || excess > 0 || item.provisional)) {
      context.addIssue({code:"custom",path:["status"],message:"status is inconsistent with counts or provisional standard"});
    }
  });

export const VisionAnalysisSchema = z
  .object({
    requestId: z.string().min(1),
    provider: VisionProviderIdSchema,
    sourceLabel: z.string().min(1),
    model: z.string().min(1).optional(),
    algorithmVersion: z.string().min(1).optional(),
    overallStatus: OverallStatusSchema,
    coordinateSystem: z.literal("normalized_0_1000"),
    imageWidth: positiveInteger,
    imageHeight: positiveInteger,
    expectedTotal: nonNegativeInteger,
    observedTotal: nonNegativeInteger,
    missingTotal: nonNegativeInteger,
    reviewCount: nonNegativeInteger,
    inventory: z.array(InventoryComparisonSchema),
    detections: z.array(DetectionSchema),
    missingItems: z.array(MissingItemSchema),
    uncertainRegions: z.array(BBoxSchema),
    warnings: z.array(z.string()),
  })
  .superRefine((analysis, context) => {
    const inventoryIds = new Set<string>();
    let expectedTotal = 0;
    let observedTotal = 0;
    let missingTotal = 0;
    let reviewCount = 0;

    analysis.inventory.forEach((item, index) => {
      if (inventoryIds.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["inventory", index, "classId"],
          message: "classId must be unique",
        });
      }
      inventoryIds.add(item.classId);
      expectedTotal += item.expectedCount;
      observedTotal += item.observedCount;
      missingTotal += item.missingCount;
      if (item.status === "review") reviewCount += 1;
    });

    const detectionIds = new Set<string>();
    let detectionObservedTotal = 0;
    analysis.detections.forEach((detection, index) => {
      if (detectionIds.has(detection.id)) {
        context.addIssue({
          code: "custom",
          path: ["detections", index, "id"],
          message: "detection id must be unique",
        });
      }
      detectionIds.add(detection.id);
      if (!inventoryIds.has(detection.classId)) {
        context.addIssue({
          code: "custom",
          path: ["detections", index, "classId"],
          message: "unknown classId",
        });
      }
      detectionObservedTotal += detection.count;
    });

    for (const item of analysis.inventory) {
      const sum=analysis.detections.filter(d=>d.classId===item.classId).reduce((n,d)=>n+d.count,0);
      if(sum!==item.observedCount)context.addIssue({code:"custom",path:["detections"],message:"detection counts must match each inventory class"});
      if(item.status==="missing"){
        const missing=analysis.missingItems.find(m=>m.classId===item.classId);
        if(!missing?.locationReliable || !missing.slotBbox)context.addIssue({code:"custom",path:["missingItems"],message:"confirmed missing requires reliable empty-slot evidence"});
      }
    }
    const missingIds = new Set<string>();
    analysis.missingItems.forEach((item, index) => {
      if (missingIds.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["missingItems", index, "classId"],
          message: "missingItems classId must be unique",
        });
      }
      missingIds.add(item.classId);
      if (!inventoryIds.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["missingItems", index, "classId"],
          message: "unknown classId",
        });
      }
      const comparison = analysis.inventory.find(
        (candidate) => candidate.classId === item.classId,
      );
      if (
        comparison &&
        (comparison.expectedCount !== item.expectedCount ||
          comparison.observedCount !== item.observedCount ||
          comparison.missingCount !== item.missingCount ||
          comparison.label !== item.label ||
          comparison.unit !== item.unit)
      ) {
        context.addIssue({
          code: "custom",
          path: ["missingItems", index],
          message: "missing item must match its inventory comparison",
        });
      }
    });

    analysis.inventory.forEach((item, index) => {
      if (item.missingCount > 0 && !missingIds.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["inventory", index, "classId"],
          message: "missing inventory item must have a corresponding missingItems entry",
        });
      }
      if (item.missingCount === 0 && missingIds.has(item.classId)) {
        context.addIssue({
          code: "custom",
          path: ["missingItems"],
          message: "missingItems must contain only items with missing counts",
        });
      }
    });

    if (analysis.expectedTotal !== expectedTotal) {
      context.addIssue({
        code: "custom",
        path: ["expectedTotal"],
        message: "expectedTotal must equal the inventory-derived total",
      });
    }
    if (analysis.observedTotal !== observedTotal) {
      context.addIssue({
        code: "custom",
        path: ["observedTotal"],
        message: "observedTotal must equal the inventory-derived total",
      });
    }
    if (analysis.missingTotal !== missingTotal) {
      context.addIssue({
        code: "custom",
        path: ["missingTotal"],
        message: "missingTotal must equal the inventory-derived total",
      });
    }
    if (analysis.reviewCount !== reviewCount) {
      context.addIssue({
        code: "custom",
        path: ["reviewCount"],
        message: "reviewCount must equal the number of review comparisons",
      });
    }
    if (detectionObservedTotal !== observedTotal) {
      context.addIssue({
        code: "custom",
        path: ["detections"],
        message: "detection counts must equal observedTotal",
      });
    }

    const expectedOverallStatus: OverallStatus =
      analysis.inventory.some(item=>item.status === "missing") ? "missing" : reviewCount > 0 || analysis.uncertainRegions.length > 0 ? "review" : "complete";
    if (analysis.overallStatus !== expectedOverallStatus) {
      context.addIssue({
        code: "custom",
        path: ["overallStatus"],
        message: "overallStatus is inconsistent with missing and review totals",
      });
    }
  });

export const ProviderHealthSchema = z.object({
  provider: VisionProviderIdSchema,
  configured: z.boolean(),
  available: z.boolean(),
  message: z.string(),
});

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

export interface VisionProviderCapabilities {
  supportsMimeTypes?: Array<"image/jpeg" | "image/png" | "image/webp">;
  supportsNormalizedCoordinates?: boolean;
  supportsAssemblies?: boolean;
  supportsGroupCounts?: boolean;
  supportsSlotBboxes?: boolean;
  maxImageBytes?: number;
  [key: string]: unknown;
}

export interface VisionProvider {
  readonly id: VisionProviderId;
  readonly displayName: string;
  readonly capabilities?: VisionProviderCapabilities;
  isConfigured(): Promise<boolean>;
  healthCheck(): Promise<ProviderHealth>;
  analyze(input: VisionAnalyzeInput): Promise<VisionAnalysis>;
}

export class VisionError extends Error {
  readonly code: string;
  readonly status: number;
  readonly provider?: VisionProviderId;
  readonly requestId?: string;
  readonly sourceLabel?: string;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      provider?: VisionProviderId;
      requestId?: string;
      sourceLabel?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "VisionError";
    this.code = options.code;
    this.status = options.status;
    this.provider = options.provider;
    this.requestId = options.requestId;
    this.sourceLabel = options.sourceLabel;
  }

  toResponseBody(): {
    message: string;
    code: string;
    status: number;
    provider?: VisionProviderId;
    requestId?: string;
    sourceLabel?: string;
  } {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
      ...(this.provider === undefined ? {} : { provider: this.provider }),
      ...(this.requestId === undefined ? {} : { requestId: this.requestId }),
      ...(this.sourceLabel === undefined ? {} : { sourceLabel: this.sourceLabel }),
    };
  }
}