import type { PostmanItem, PostmanItemGroup } from "@/modules/api-docs/types";
import { isItemGroup, normalizeRequest } from "@/modules/api-docs/lib/postman";

export type RequestNode = {
  kind: "request";
  id: string;
  name: string;
  method: string;
  item: PostmanItem;
};

export type FolderNode = {
  kind: "folder";
  id: string;
  name: string;
  children: TreeNode[];
};

export type TreeNode = RequestNode | FolderNode;

export function buildTree(
  items: (PostmanItem | PostmanItemGroup)[],
  prefix = "",
): TreeNode[] {
  return items.map((entry, index) => {
    const id = prefix ? `${prefix}.${index}` : String(index);
    if (isItemGroup(entry)) {
      return {
        kind: "folder",
        id,
        name: entry.name ?? "Untitled folder",
        children: buildTree(entry.item, id),
      };
    }
    return {
      kind: "request",
      id,
      name: entry.name ?? "Untitled request",
      method: normalizeRequest(entry.request).method,
      item: entry,
    };
  });
}

export function findRequest(nodes: TreeNode[], id: string): RequestNode | null {
  for (const node of nodes) {
    if (node.kind === "request") {
      if (node.id === id) return node;
    } else {
      const found = findRequest(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function firstRequest(nodes: TreeNode[]): RequestNode | null {
  for (const node of nodes) {
    if (node.kind === "request") return node;
    const found = firstRequest(node.children);
    if (found) return found;
  }
  return null;
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "request") {
      if (node.name.toLowerCase().includes(q)) result.push(node);
      continue;
    }
    const selfMatches = node.name.toLowerCase().includes(q);
    const children = selfMatches ? node.children : filterTree(node.children, q);
    if (selfMatches || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}
