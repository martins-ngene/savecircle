import type { Metadata } from "next";
import { Workspace } from "@/features/dashboard/workspace";
import { CreateCircle } from "@/features/circles/create-circle";
import "../circles.css";

export const metadata: Metadata = { title: "Create circle | SaveCircle" };

export default function CreateCirclePage() {
  return <Workspace current="circles"><CreateCircle /></Workspace>;
}
