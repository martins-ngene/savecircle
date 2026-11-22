"use client";

import { useState } from "react";
import { searchDashboard } from "./model";

export function useDashboardSearch() {
  const [query, setQuery] = useState("");
  return { query, setQuery, results: searchDashboard(query) };
}
