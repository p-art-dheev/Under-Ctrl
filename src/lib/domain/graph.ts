// Skill graph rules. Edges always point prerequisite -> dependent.

export interface NodeRef {
  id: string;
}
export interface EdgeRef {
  from: string; // prerequisite
  to: string; // dependent
}

export interface GraphValidation {
  ok: boolean;
  errors: string[];
}

export function validateGraph(nodes: NodeRef[], edges: EdgeRef[]): GraphValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of nodes) {
    if (!n.id) errors.push("node with empty id");
    else if (ids.has(n.id)) errors.push(`duplicate node: ${n.id}`);
    ids.add(n.id);
  }
  const seen = new Set<string>();
  for (const e of edges) {
    if (!ids.has(e.from)) errors.push(`dangling prerequisite reference: ${e.from}`);
    if (!ids.has(e.to)) errors.push(`dangling dependent reference: ${e.to}`);
    if (e.from === e.to) errors.push(`self-loop on ${e.from}`);
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) errors.push(`duplicate edge: ${k}`);
    seen.add(k);
  }
  if (errors.length === 0) {
    const cycle = findCycle(nodes, edges);
    if (cycle) errors.push(`cycle: ${cycle.join(" -> ")}`);
  }
  return { ok: errors.length === 0, errors };
}

function findCycle(nodes: NodeRef[], edges: EdgeRef[]): string[] | null {
  const out = new Map<string, string[]>();
  for (const n of nodes) out.set(n.id, []);
  for (const e of edges) out.get(e.from)!.push(e.to);
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    color.set(id, 1);
    stack.push(id);
    for (const next of out.get(id)!) {
      const c = color.get(next) ?? 0;
      if (c === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (c === 0) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, 2);
    return null;
  };
  for (const n of nodes) {
    if ((color.get(n.id) ?? 0) === 0) {
      const found = visit(n.id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Stable topological order (Kahn). Among nodes whose prerequisites are all
 * placed, the one with the lowest `order` goes first, so the plan only changes
 * where the graph requires it. Throws on an invalid graph.
 */
export function topoOrder(nodes: (NodeRef & { order: number })[], edges: EdgeRef[]): string[] {
  const check = validateGraph(nodes, edges);
  if (!check.ok) throw new Error(`invalid graph: ${check.errors.join("; ")}`);
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const out = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    indegree.set(e.to, indegree.get(e.to)! + 1);
    out.get(e.from)!.push(e.to);
  }
  const orderOf = new Map(nodes.map((n, i) => [n.id, [n.order, i] as const]));
  const byOrder = (a: string, b: string) => {
    const [oa, ia] = orderOf.get(a)!;
    const [ob, ib] = orderOf.get(b)!;
    return oa - ob || ia - ib;
  };
  const ready = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const result: string[] = [];
  while (ready.length) {
    ready.sort(byOrder);
    const id = ready.shift()!;
    result.push(id);
    for (const next of out.get(id)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) ready.push(next);
    }
  }
  return result;
}

/** Validate a patch against the existing graph without mutating anything. */
export function validatePatch(
  nodes: NodeRef[],
  edges: EdgeRef[],
  patch: { addNodes: NodeRef[]; addEdges: EdgeRef[] },
): GraphValidation {
  return validateGraph([...nodes, ...patch.addNodes], [...edges, ...patch.addEdges]);
}

/** Longest-path depth of each node, used to lay the graph out in columns. */
export function depths(nodes: NodeRef[], edges: EdgeRef[]): Map<string, number> {
  const order = topoOrder(
    nodes.map((n, i) => ({ id: n.id, order: i })),
    edges,
  );
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const id of order) {
    for (const e of edges) {
      if (e.from === id) depth.set(e.to, Math.max(depth.get(e.to)!, depth.get(id)! + 1));
    }
  }
  return depth;
}
