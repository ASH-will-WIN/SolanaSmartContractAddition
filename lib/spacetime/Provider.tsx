"use client";

import { useMemo } from "react";
import { SpacetimeDBProvider } from "spacetimedb/react";
import { DbConnection, tables } from "./module_bindings";

export function SpacetimeProvider({ children }: { children: React.ReactNode }) {
  const connectionBuilder = useMemo(() => DbConnection.builder()
    .withUri(process.env.NEXT_PUBLIC_SPACETIMEDB_URI || "ws://127.0.0.1:3001")
    .withDatabaseName(process.env.NEXT_PUBLIC_SPACETIMEDB_DATABASE || "condition-oracle")
    .onConnect((connection) => {
      connection.subscriptionBuilder().subscribe([
        tables.condition,
        tables.verificationCheck,
        tables.evidence,
        tables.uploadedDocument,
      ]);
    }), []);

  return <SpacetimeDBProvider connectionBuilder={connectionBuilder}>{children}</SpacetimeDBProvider>;
}
