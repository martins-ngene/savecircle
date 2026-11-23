import { Workspace } from "@/features/dashboard/workspace";
import { Shimmer } from "@/features/loading/shimmer";

export default function Loading() {
  return <Workspace current="circles"><Shimmer title="Loading circle setup…" rows={4} columns={2} /></Workspace>;
}
