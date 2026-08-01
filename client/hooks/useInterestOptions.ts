import { getInterestOptions } from "@/lib/api/interests";
import { INTEREST_OPTIONS } from "@/lib/profile/types";
import { useEffect, useState } from "react";

/** Loads interest options from the API, falling back to the local constant. */
export function useInterestOptions(): string[] {
  const [options, setOptions] = useState<string[]>([...INTEREST_OPTIONS]);

  useEffect(() => {
    let active = true;
    getInterestOptions()
      .then((fetched) => {
        if (active && fetched.length > 0) setOptions(fetched);
      })
      .catch(() => {
        // keep fallback constant on failure
      });
    return () => {
      active = false;
    };
  }, []);

  return options;
}
