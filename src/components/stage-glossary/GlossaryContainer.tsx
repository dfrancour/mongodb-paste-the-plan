"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Book, Filter } from "lucide-react";
import {
  getAllStages,
  isPipelineStage,
  isPlanningStage,
  isSbeStage,
  isClassicStage,
  isMongosStage,
} from "#data/stages";
import type { StageCategory } from "#data/stages/types";
import { ExpandableCard } from "#components/common/ExpandableCard";
import { Icon } from "#components/common/Icon";
import { SearchInput } from "#components/shared/SearchInput";
import { FilterPills } from "#components/shared/FilterPills";
import { ClearFiltersButton } from "#components/shared/ClearFiltersButton";
import { ResultsCount } from "#components/shared/ResultsCount";
import { StageList } from "./StageList";
import { StageTypeFilter, type StageType } from "./StageTypeFilter";

const CATEGORY_OPTIONS = [
  { value: "collectionScan" as const, label: "Collection Scans" },
  { value: "indexScan" as const, label: "Index Scans" },
  { value: "fetch" as const, label: "Fetch" },
  { value: "aggregation" as const, label: "Aggregation" },
  { value: "transformation" as const, label: "Transformations" },
  { value: "sort" as const, label: "Sorting" },
  { value: "join" as const, label: "Joins" },
  { value: "filter" as const, label: "Filtering" },
  { value: "geospatial" as const, label: "Geospatial" },
  { value: "textSearch" as const, label: "Text/Search" },
  { value: "timeSeries" as const, label: "Time Series" },
  { value: "vectorSearch" as const, label: "Vector Search" },
  { value: "window" as const, label: "Window Functions" },
  { value: "writes" as const, label: "Writes/Output" },
  { value: "queryPlanning" as const, label: "Query Planning" },
  { value: "systemMetadata" as const, label: "System/Metadata" },
  { value: "internal" as const, label: "Internal" },
] as const;

export function GlossaryContainer() {
  const [searchParams] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams(),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<StageCategory | null>(null);
  const [selectedStageType, setSelectedStageType] = useState<StageType | null>(
    null,
  );
  const [highlightedStage, setHighlightedStage] = useState<string | null>(null);

  // Track previous search query to detect typing vs other changes
  const prevSearchRef = useRef(searchQuery);

  const stages = useMemo(() => getAllStages(), []);

  // Initialize state from URL params on mount (one-time only)
  useEffect(() => {
    const query = searchParams.get("search") ?? "";
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    setSearchQuery(query);
    setSelectedCategory(
      category && CATEGORY_OPTIONS.some((opt) => opt.value === category)
        ? (category as StageCategory)
        : null,
    );
    const validStageTypes: StageType[] = [
      "pipeline",
      "planning",
      "sbe",
      "classic",
      "mongos",
    ];
    setSelectedStageType(
      type && validStageTypes.includes(type as StageType)
        ? (type as StageType)
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // URL will be updated via debounced effect below
  };

  const handleCategoryChange = (category: StageCategory) => {
    // Toggle: if already selected, deselect; otherwise select
    setSelectedCategory(selectedCategory === category ? null : category);
    // URL will be updated via effect below
  };

  const handleStageTypeChange = (stageType: StageType) => {
    // Toggle: if already selected, deselect; otherwise select
    setSelectedStageType(selectedStageType === stageType ? null : stageType);
    // URL will be updated via effect below
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedStageType(null);
    // URL will be updated via effect below
  };

  // Sync filters to URL (client-side only, no server requests)
  // Debounce search changes (500ms), update category/type immediately
  useEffect(() => {
    // Check if search query changed (typing) vs other filters (clicks)
    const isSearchTyping = searchQuery !== prevSearchRef.current;
    const delay = isSearchTyping ? 500 : 0;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();

      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedStageType) params.set("type", selectedStageType);

      const hash = window.location.hash;
      const queryString = params.toString();
      const newUrl = queryString
        ? `?${queryString}${hash}`
        : window.location.pathname + hash;

      // Use native History API - no server request, just updates browser URL
      window.history.replaceState(null, "", newUrl);

      // Update ref after URL is synced
      prevSearchRef.current = searchQuery;
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedStageType]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== null ||
    selectedStageType !== null;

  const filteredStages = useMemo(() => {
    let filtered = stages;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (stage) => stage.category === selectedCategory,
      );
    }

    // Filter by stage type (composite of layer + engine)
    if (selectedStageType) {
      filtered = filtered.filter((stage) => {
        if (selectedStageType === "pipeline") return isPipelineStage(stage);
        if (selectedStageType === "planning") return isPlanningStage(stage);
        if (selectedStageType === "sbe") return isSbeStage(stage);
        if (selectedStageType === "classic") return isClassicStage(stage);
        if (selectedStageType === "mongos") return isMongosStage(stage);
        return false;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (stage) =>
          stage.id.toLowerCase().includes(query) ||
          stage.fullName.toLowerCase().includes(query) ||
          stage.description.toLowerCase().includes(query),
      );
    }

    // Sort alphabetically by short name
    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [stages, selectedCategory, selectedStageType, searchQuery]);

  // Handle deep linking - scroll to stage on mount if hash exists
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (hash) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Highlight the stage briefly
          setHighlightedStage(hash);
          // Remove highlight after 2 seconds
          setTimeout(() => setHighlightedStage(null), 2000);
        }
      }, 100);
    }
  }, []);

  return (
    <div className="spacing-component">
      <ExpandableCard
        title="MongoDB Stage Glossary"
        icon={<Icon icon={Book} variant="primary" />}
        featured={true}
        showTabs={false}
        analysisContent={
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for MongoDB execution stages by name or description..."
                className="flex-1"
              />
              {hasActiveFilters && (
                <ClearFiltersButton onClick={clearFilters} />
              )}
            </div>

            <FilterPills
              mode="multi"
              options={CATEGORY_OPTIONS}
              selected={
                selectedCategory
                  ? new Set<StageCategory>([selectedCategory])
                  : new Set<StageCategory>()
              }
              onToggle={handleCategoryChange}
              label="Category"
              icon={
                <Filter className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              }
            />

            <StageTypeFilter
              selected={selectedStageType}
              onToggle={handleStageTypeChange}
            />

            <ResultsCount
              filtered={filteredStages.length}
              total={stages.length}
              itemName="stages"
            />
          </div>
        }
        jsonContent={null}
      />

      <StageList stages={filteredStages} highlightedStage={highlightedStage} />
    </div>
  );
}
