"use client";

import { AccountClient } from "./account-client";
import WorkspaceClient from "./workspace-client";

export default function WorkspaceExperience() {
  return <AccountClient>{(accountAccess) => <WorkspaceClient accountAccess={accountAccess} />}</AccountClient>;
}
