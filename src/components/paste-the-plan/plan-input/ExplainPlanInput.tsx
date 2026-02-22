"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Play,
  AlertCircle,
  CheckCircle,
  TextCursorInput,
  Loader2,
  Upload,
  Copy,
  Check,
  Download,
} from "lucide-react";
import { Icon } from "#components/common/Icon";
import { PlanParser, PlanParseError } from "#lib/parsers/planParser";
import type {
  ExplainPlan,
  ParsedSBEPlan,
  HybridSBEPlan,
} from "#types/explain-plan";
import { HowToUse } from "./HowToUse";
import { ContributeLink } from "#components/common/ContributeLink";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { CodeViewer } from "#components/common/CodeViewer";
import { SharePlanButton } from "./SharePlanButton";

const explainPlanSchema = z.object({
  planJson: z.string().min(1, "Explain plan JSON is required"),
});

type ExplainPlanForm = z.infer<typeof explainPlanSchema>;

interface ExplainPlanInputProps {
  onPlanAnalyzed: (planData: {
    raw: ExplainPlan;
    sbe?: ParsedSBEPlan;
    hybridSBE?: HybridSBEPlan;
    isSBE: boolean;
  }) => void;
  onClearPlan: () => void;
  hasAnalyzedPlan: boolean;
  /** Plan data loaded from URL hash (if any) */
  initialPlan?: unknown | null;
  /** Whether the URL plan is still loading */
  initialPlanLoading?: boolean;
  /** Error message if URL plan loading failed */
  initialPlanError?: string | null;
}

export function ExplainPlanInput({
  onPlanAnalyzed,
  onClearPlan,
  hasAnalyzedPlan,
  initialPlan,
  initialPlanLoading = false,
  initialPlanError,
}: ExplainPlanInputProps) {
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastAnalyzedPlan, setLastAnalyzedPlan] = useState<{
    raw: ExplainPlan;
    rawInput: unknown;
    sbe?: ParsedSBEPlan;
    hybridSBE?: HybridSBEPlan;
    isSBE: boolean;
  } | null>(null);

  // Track if we've already processed the initial plan from URL
  const hasProcessedInitialPlan = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExplainPlanForm>({
    resolver: zodResolver(explainPlanSchema),
    defaultValues: { planJson: "" },
  });

  const planJson = watch("planJson");
  const { onChange: rhfOnChange, ...planJsonRegistration } =
    register("planJson");

  // Auto-process plan loaded from URL
  useEffect(() => {
    if (
      initialPlan &&
      !initialPlanLoading &&
      !hasProcessedInitialPlan.current
    ) {
      hasProcessedInitialPlan.current = true;

      // Populate the textarea with the JSON
      const jsonString = JSON.stringify(initialPlan, null, 2);
      setValue("planJson", jsonString);
      setValidationStatus("valid");

      // Auto-submit the form to process the plan
      const processInitialPlan = async () => {
        setIsProcessing(true);
        try {
          const validatedPlan = PlanParser.parse(initialPlan);
          const isSBE = PlanParser.isSBEPlan(validatedPlan);
          let sbePlan: ParsedSBEPlan | undefined;

          let planData: {
            raw: ExplainPlan;
            rawInput: unknown;
            sbe?: ParsedSBEPlan;
            hybridSBE?: HybridSBEPlan;
            isSBE: boolean;
          };

          if (isSBE) {
            const extractedSBEPlan = PlanParser.extractSBEPlan(validatedPlan);
            if (extractedSBEPlan) {
              sbePlan = extractedSBEPlan;
              planData = {
                raw: validatedPlan,
                rawInput: initialPlan,
                sbe: sbePlan,
                isSBE,
              };
            } else {
              const hybridSBEPlan =
                PlanParser.extractHybridSBEPlan(validatedPlan);
              if (hybridSBEPlan) {
                planData = {
                  raw: validatedPlan,
                  rawInput: initialPlan,
                  hybridSBE: hybridSBEPlan,
                  isSBE,
                };
              } else {
                throw new Error("Failed to extract SBE plan data");
              }
            }
          } else {
            planData = {
              raw: validatedPlan,
              rawInput: initialPlan,
              sbe: sbePlan,
              isSBE,
            };
          }

          setLastAnalyzedPlan(planData);
          onPlanAnalyzed(planData);
        } catch (error) {
          setValidationError(
            error instanceof Error
              ? error.message
              : "Failed to process plan from URL",
          );
          setValidationStatus("invalid");
        } finally {
          setIsProcessing(false);
        }
      };

      processInitialPlan();
    }
  }, [initialPlan, initialPlanLoading, setValue, onPlanAnalyzed]);

  // Show URL plan error if present
  useEffect(() => {
    if (initialPlanError) {
      setValidationError(initialPlanError);
      setValidationStatus("invalid");
    }
  }, [initialPlanError]);

  const validateJson = (jsonString: string) => {
    if (!jsonString.trim()) {
      setValidationStatus("idle");
      setValidationError(null);
      return;
    }

    try {
      JSON.parse(jsonString);
      setValidationStatus("valid");
      setValidationError(null);
    } catch {
      setValidationStatus("invalid");
      setValidationError("Invalid JSON format");
    }
  };

  const onSubmit = async (data: ExplainPlanForm) => {
    setIsProcessing(true);
    try {
      const rawPlan: unknown = JSON.parse(data.planJson);
      const validatedPlan = PlanParser.parse(rawPlan);

      // Check if this is an SBE plan
      const isSBE = PlanParser.isSBEPlan(validatedPlan);
      let sbePlan: ParsedSBEPlan | undefined;

      let planData: {
        raw: ExplainPlan;
        rawInput: unknown; // Original input before Extended JSON transform
        sbe?: ParsedSBEPlan;
        hybridSBE?: HybridSBEPlan;
        isSBE: boolean;
      };

      if (isSBE) {
        // Try to parse regular SBE plan first for multi-stage visualization
        const extractedSBEPlan = PlanParser.extractSBEPlan(validatedPlan);
        if (extractedSBEPlan) {
          sbePlan = extractedSBEPlan;
          planData = {
            raw: validatedPlan,
            rawInput: rawPlan,
            sbe: sbePlan,
            isSBE,
          };
        } else {
          // Fallback to hybrid SBE parsing if regular SBE fails
          const hybridSBEPlan = PlanParser.extractHybridSBEPlan(validatedPlan);
          if (hybridSBEPlan) {
            planData = {
              raw: validatedPlan,
              rawInput: rawPlan,
              hybridSBE: hybridSBEPlan,
              isSBE,
            };
          } else {
            throw new Error("Failed to extract SBE plan data");
          }
        }
      } else {
        planData = {
          raw: validatedPlan,
          rawInput: rawPlan,
          sbe: sbePlan,
          isSBE,
        };
      }

      setLastAnalyzedPlan(planData);
      onPlanAnalyzed(planData);
    } catch (error) {
      const detail =
        error instanceof PlanParseError
          ? error.message
          : error instanceof Error
            ? error.message
            : undefined;
      setValidationError(
        detail ? `Unable to parse plan: ${detail}` : "Unable to parse plan",
      );
      setValidationStatus("invalid");
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate on input change
  const handleInputChange = (value: string) => {
    validateJson(value);
  };

  // File drop handlers
  const handleFileDrop = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      setValidationError("Please drop a .json file");
      setValidationStatus("invalid");
      return;
    }

    const text = await file.text();
    setValue("planJson", text);
    handleInputChange(text);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileDrop(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileDrop(file);
    }
  };

  const handleCopy = async () => {
    if (!planJson?.trim()) return;
    try {
      await navigator.clipboard.writeText(planJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write can fail in some browsers
    }
  };

  const handleDownload = () => {
    if (!planJson?.trim()) return;
    const blob = new Blob([planJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "explain-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnClass =
    "flex cursor-pointer items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 shadow transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-800 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200";

  const actionButtons = (
    <>
      {!hasAnalyzedPlan && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={btnClass}
          title="Upload .json file"
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
      )}
      {planJson?.trim() && (
        <button
          type="button"
          onClick={handleCopy}
          className={btnClass}
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
      {hasAnalyzedPlan && (
        <button
          type="button"
          onClick={handleDownload}
          className={btnClass}
          title="Download as JSON file"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      )}
    </>
  );

  return (
    <div className="spacing-component">
      <ExpandableCard
        title="MongoDB Paste the Plan"
        icon={<Icon icon={TextCursorInput} variant="primary" />}
        headerAction={<ContributeLink />}
        featured={true}
        showTabs={hasAnalyzedPlan}
        analysisContent={
          <div className="space-y-6">
            {/* How to Use Section */}
            <HowToUse
              onPlanSelect={(planContent: string) => {
                // Clear existing plan first
                setLastAnalyzedPlan(null);
                setValidationStatus("idle");
                setValidationError(null);
                onClearPlan();

                // Then populate with new plan
                setValue("planJson", planContent);
                handleInputChange(planContent);
              }}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="planJson"
                  className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  MongoDB explain plan JSON
                </label>
                <div
                  className="relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <textarea
                    {...planJsonRegistration}
                    id="planJson"
                    rows={6}
                    readOnly={hasAnalyzedPlan}
                    className={`w-full rounded-md border px-3 py-2 font-mono text-sm shadow-sm sm:h-72 ${
                      hasAnalyzedPlan
                        ? "cursor-default bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        : "focus:ring-primary focus:border-primary bg-white text-neutral-900 placeholder-neutral-500 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-400"
                    } ${
                      isDragging
                        ? "border-primary border-2 border-dashed"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="Paste, upload, or drag and drop a MongoDB explain plan JSON"
                    onChange={(e) => {
                      rhfOnChange(e);
                      handleInputChange(e.target.value);
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-label="Upload explain plan JSON file"
                  />
                  {/* Desktop: buttons float inside textarea top-right */}
                  {!isDragging && (
                    <div className="absolute top-2 right-2 z-10 hidden gap-1 sm:flex">
                      {actionButtons}
                    </div>
                  )}
                  {isDragging && (
                    <div className="pointer-events-none absolute inset-0 hidden flex-col items-center justify-center rounded-md bg-white/90 sm:flex dark:bg-neutral-800/90">
                      <Icon icon={Upload} size="lg" variant="primary" />
                      <span className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Drop .json file here
                      </span>
                    </div>
                  )}
                </div>
                {/* Mobile: buttons in a toolbar row below textarea */}
                {!isDragging && (
                  <div className="flex gap-1 pt-2 sm:hidden">
                    {actionButtons}
                  </div>
                )}
                {errors.planJson && (
                  <p className="text-performance-poor mt-1 text-sm">
                    {errors.planJson.message}
                  </p>
                )}
              </div>

              {/* Validation Status */}
              {validationStatus !== "idle" && !hasAnalyzedPlan && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    validationStatus === "valid"
                      ? "text-performance-good"
                      : "text-performance-poor"
                  }`}
                >
                  {validationStatus === "valid" ? (
                    <Icon icon={CheckCircle} size="sm" variant="success" />
                  ) : (
                    <Icon icon={AlertCircle} size="sm" variant="error" />
                  )}
                  <span>
                    {validationStatus === "valid"
                      ? "Valid JSON"
                      : (validationError ?? "Invalid JSON format")}
                  </span>
                </div>
              )}

              {/* Loading indicator for URL plan */}
              {initialPlanLoading && (
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Icon
                    icon={Loader2}
                    size="sm"
                    variant="muted"
                    className="animate-spin"
                  />
                  <span>Loading plan from URL...</span>
                </div>
              )}

              <div className="flex flex-wrap items-start gap-3">
                {!hasAnalyzedPlan && (
                  <button
                    type="submit"
                    disabled={
                      validationStatus !== "valid" ||
                      isProcessing ||
                      initialPlanLoading
                    }
                    className="btn-primary flex items-center gap-2"
                  >
                    <Icon icon={Play} size="sm" variant="inherit" />
                    {isProcessing ? "Processing..." : "Analyze Plan"}
                  </button>
                )}
                {hasAnalyzedPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setLastAnalyzedPlan(null);
                      setValue("planJson", "");
                      setValidationStatus("idle");
                      onClearPlan();
                      // Clear URL hash (preserve query params)
                      if (typeof window !== "undefined") {
                        window.history.replaceState(
                          null,
                          "",
                          window.location.pathname + window.location.search,
                        );
                      }
                    }}
                    className="btn-secondary"
                  >
                    Reset
                  </button>
                )}
                {/* Share button - shown after plan is analyzed */}
                {lastAnalyzedPlan && (
                  <SharePlanButton plan={lastAnalyzedPlan.rawInput} />
                )}
              </div>
            </form>
          </div>
        }
        jsonContent={
          lastAnalyzedPlan ? (
            <CodeViewer
              content={lastAnalyzedPlan.raw}
              displayFormat="json"
              maxHeight={400}
              copyLabel="Copy Plan JSON"
            />
          ) : (
            <div className="py-8 text-center text-neutral-500 italic">
              Analyze a plan to view formatted JSON
            </div>
          )
        }
        tabLabels={{
          analysis: "Plan Input",
          json: "JSON",
        }}
        defaultExpanded={!hasAnalyzedPlan}
        defaultView="analysis"
      />
    </div>
  );
}
