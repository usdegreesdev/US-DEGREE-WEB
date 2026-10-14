"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  fetchCourseOptions,
  fetchCredentialOptions,
  fetchStateOptions,
  SelectOption,
} from "@/lib/home/heroSearchApi";

export function useHeroSearch() {
  const router = useRouter();

  const [levels, setLevels] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [courses, setCourses] = useState<SelectOption[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [stateOptions, credentialOptions] = await Promise.all([
          fetchStateOptions(),
          fetchCredentialOptions(),
        ]);
        if (stateOptions) setStates(stateOptions);
        if (credentialOptions) setLevels(credentialOptions);
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    };

    fetchOptions();
  }, []);

  const fetchCourses = useCallback(
    async (level: string | null, state: string | null) => {
      setIsCoursesLoading(true);

      try {
        const courseOptions = await fetchCourseOptions(level, state);
        if (courseOptions) {
          setCourses(courseOptions);
          // Only drop the current course if it isn't actually offered under
          // the new level/state — a state chosen from the already-narrowed
          // list (see computeAvailableStates) will always still have it.
          setSelectedCourse((current) =>
            current && courseOptions.some((option) => option.value === current)
              ? current
              : null,
          );
        } else {
          setSelectedCourse(null);
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
        setSelectedCourse(null);
      } finally {
        setIsCoursesLoading(false);
      }
    },
    [],
  );

  // Courses depend on the chosen level/state — react to the change event
  // directly rather than via an effect to avoid cascading renders.
  const updateCourses = useCallback(
    (level: string | null, state: string | null) => {
      if (level || state) {
        fetchCourses(level, state);
      } else {
        setCourses([]);
        setSelectedCourse(null);
      }
    },
    [fetchCourses],
  );

  const handleLevelChange = (value: string | null) => {
    setSelectedLevel(value);
    updateCourses(value, selectedState);
  };

  const handleStateChange = (value: string | null) => {
    setSelectedState(value);
    updateCourses(selectedLevel, value);
  };

  const handleCourseChange = (value: string | null) => {
    setSelectedCourse(value);
  };

  const handleSearch = () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    params.append("type", "programs");

    if (selectedLevel) params.append("credential_title", selectedLevel);
    if (selectedState) params.append("state", selectedState);
    if (selectedCourse) params.append("title", selectedCourse);

    router.push(`/search?${params.toString()}`);
  };

  return {
    levels,
    states,
    courses,
    selectedLevel,
    selectedState,
    selectedCourse,
    isLoading,
    isCoursesLoading,
    isStatesLoading: false,
    setSelectedCourse: handleCourseChange,
    handleLevelChange,
    handleStateChange,
    handleSearch,
  };
}

export type HeroSearchState = ReturnType<typeof useHeroSearch>;
