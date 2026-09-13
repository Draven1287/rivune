import type { Metadata } from "next";
import WorkspaceExperience from "./workspace-experience";

export const metadata: Metadata = {
  title: "Workspace — Rivune",
  description: "Your Rivune workspace, connected to the intelligence on your Mac.",
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <WorkspaceExperience />;
}
