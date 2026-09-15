"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { MethodLabel } from "@/modules/api-docs/components/method-badge";
import { filterTree, type TreeNode } from "@/modules/api-docs/lib/tree";

function FolderRow({
  node,
  depth,
  selectedId,
  onSelect,
  forceOpen,
}: {
  node: Extract<TreeNode, { kind: "folder" }>;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(true);
  const isOpen = forceOpen || open;
  return (
    <li>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          aria-hidden
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
        />
        <Folder aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              forceOpen={forceOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  forceOpen,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
  forceOpen: boolean;
}) {
  if (node.kind === "folder") {
    return (
      <FolderRow
        node={node}
        depth={depth}
        selectedId={selectedId}
        onSelect={onSelect}
        forceOpen={forceOpen}
      />
    );
  }
  const selected = node.id === selectedId;
  return (
    <li>
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted",
          selected ? "bg-primary/10 font-medium text-primary hover:bg-primary/10" : "text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <MethodLabel method={node.method} />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}

export function SidebarTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: TreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const hasQuery = query.trim().length > 0;
  const filteredNodes = useMemo(() => filterTree(nodes, query), [nodes, query]);

  return (
    <div className="space-y-2">
      <InputGroup className="h-8">
        <InputGroupAddon align="inline-start">
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search requests…"
          aria-label="Search API requests"
        />
        {hasQuery && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Clear search" onClick={() => setQuery("")}>
              <X aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <p role="status" aria-live="polite" className="sr-only">
        {hasQuery
          ? filteredNodes.length === 0
            ? `No requests match "${query.trim()}".`
            : `Showing requests matching "${query.trim()}".`
          : ""}
      </p>

      {hasQuery && filteredNodes.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching requests"
          description={`No requests match "${query.trim()}".`}
          className="border-none px-3 py-6"
        />
      ) : (
        <nav aria-label="API requests">
          <ul className="space-y-0.5">
            {filteredNodes.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                forceOpen={hasQuery}
              />
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
