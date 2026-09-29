/*
  A B+ tree: the index structure most databases use.

  Keys live in sorted nodes of up to `order - 1` keys. Internal nodes only
  route; every key and its row ids live in the leaves, and the leaves are
  linked left to right, so a range scan is one descent plus a walk along the
  leaf chain.

  Duplicate keys are allowed (a non-unique index): each key holds an array of
  row ids.

  Deletion removes the row id, and the key once it has none left, but does not
  merge under-full nodes. Many production engines do the same and reclaim
  space later; lookups stay correct, the tree just never shrinks in height.
*/

export function compareKeys(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function lowerBound(keys, key) {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareKeys(keys[mid], key) < 0) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/* In an internal node, the child to follow: keys equal to a separator live
   in the right-hand child, because a separator is its right leaf's first key. */
function childIndex(keys, key) {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareKeys(keys[mid], key) <= 0) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const leaf = () => ({ leaf: true, keys: [], vals: [], next: null });

export class BPlusTree {
  constructor(order = 32) {
    if (order < 3) throw new Error('order must be at least 3');
    this.order = order;
    this.root = leaf();
    this.size = 0;
  }

  findLeaf(key, path) {
    let node = this.root;
    while (!node.leaf) {
      const i = childIndex(node.keys, key);
      if (path) path.push([node, i]);
      node = node.children[i];
    }
    return node;
  }

  insert(key, rowId) {
    const path = [];
    const node = this.findLeaf(key, path);
    const i = lowerBound(node.keys, key);
    if (i < node.keys.length && compareKeys(node.keys[i], key) === 0) {
      node.vals[i].push(rowId);
      this.size += 1;
      return;
    }
    node.keys.splice(i, 0, key);
    node.vals.splice(i, 0, [rowId]);
    this.size += 1;
    if (node.keys.length >= this.order) this.splitLeaf(node, path);
  }

  splitLeaf(node, path) {
    const mid = Math.ceil(node.keys.length / 2);
    const right = leaf();
    right.keys = node.keys.splice(mid);
    right.vals = node.vals.splice(mid);
    right.next = node.next;
    node.next = right;
    this.insertInParent(node, right.keys[0], right, path);
  }

  insertInParent(left, sep, right, path) {
    if (!path.length) {
      this.root = { leaf: false, keys: [sep], children: [left, right] };
      return;
    }
    const [parent, i] = path.pop();
    parent.keys.splice(i, 0, sep);
    parent.children.splice(i + 1, 0, right);
    if (parent.keys.length >= this.order) {
      const mid = Math.floor(parent.keys.length / 2);
      const up = parent.keys[mid];
      const sibling = {
        leaf: false,
        keys: parent.keys.splice(mid + 1),
        children: parent.children.splice(mid + 1),
      };
      parent.keys.pop();
      this.insertInParent(parent, up, sibling, path);
    }
  }

  delete(key, rowId) {
    const node = this.findLeaf(key);
    const i = lowerBound(node.keys, key);
    if (i >= node.keys.length || compareKeys(node.keys[i], key) !== 0) return false;
    const ids = node.vals[i];
    const at = ids.indexOf(rowId);
    if (at < 0) return false;
    ids.splice(at, 1);
    this.size -= 1;
    if (!ids.length) {
      node.keys.splice(i, 1);
      node.vals.splice(i, 1);
    }
    return true;
  }

  /* Row ids for one key, and how many tree nodes were read to find them. */
  get(key) {
    let visited = 1;
    let node = this.root;
    while (!node.leaf) {
      node = node.children[childIndex(node.keys, key)];
      visited += 1;
    }
    const i = lowerBound(node.keys, key);
    const ids = i < node.keys.length && compareKeys(node.keys[i], key) === 0 ? node.vals[i].slice() : [];
    return { ids, visited };
  }

  /* Row ids with lo <(=) key <(=) hi, in key order. Either end may be
     undefined for an open range. */
  range(lo, hi, loInclusive = true, hiInclusive = true) {
    let node = this.root;
    let visited = 1;
    if (lo === undefined) {
      while (!node.leaf) { node = node.children[0]; visited += 1; }
    } else {
      node = this.findLeaf(lo);
      visited += this.height() - 1;
    }
    const ids = [];
    let i = lo === undefined ? 0 : lowerBound(node.keys, lo);
    while (node) {
      for (; i < node.keys.length; i += 1) {
        const k = node.keys[i];
        if (lo !== undefined && !loInclusive && compareKeys(k, lo) === 0) continue;
        if (hi !== undefined) {
          const c = compareKeys(k, hi);
          if (c > 0 || (c === 0 && !hiInclusive)) return { ids, visited };
        }
        ids.push(...node.vals[i]);
      }
      node = node.next;
      i = 0;
      if (node) visited += 1;
    }
    return { ids, visited };
  }

  height() {
    let h = 1;
    let node = this.root;
    while (!node.leaf) { node = node.children[0]; h += 1; }
    return h;
  }

  stats() {
    let nodes = 0;
    let leaves = 0;
    const walk = (n) => {
      nodes += 1;
      if (n.leaf) leaves += 1; else n.children.forEach(walk);
    };
    walk(this.root);
    return { height: this.height(), nodes, leaves, entries: this.size };
  }

  /* Structural checks, used by the tests: sorted keys everywhere, separators
     bound their subtrees, every leaf at the same depth, and the leaf chain
     visits every key in order. */
  check() {
    const depths = new Set();
    const walk = (n, lo, hi, depth) => {
      for (let i = 1; i < n.keys.length; i += 1) {
        if (compareKeys(n.keys[i - 1], n.keys[i]) >= 0) throw new Error('keys out of order');
      }
      for (const k of n.keys) {
        if (lo !== undefined && compareKeys(k, lo) < 0) throw new Error('key below separator');
        if (hi !== undefined && compareKeys(k, hi) >= 0) throw new Error('key above separator');
      }
      if (n.leaf) { depths.add(depth); return; }
      if (n.children.length !== n.keys.length + 1) throw new Error('child count mismatch');
      n.children.forEach((c, i) => walk(c, i === 0 ? lo : n.keys[i - 1], i === n.keys.length ? hi : n.keys[i], depth + 1));
    };
    walk(this.root, undefined, undefined, 0);
    if (depths.size > 1) throw new Error('leaves at different depths');
    let node = this.root;
    while (!node.leaf) node = node.children[0];
    let prev;
    let count = 0;
    for (; node; node = node.next) {
      for (let i = 0; i < node.keys.length; i += 1) {
        if (prev !== undefined && compareKeys(prev, node.keys[i]) >= 0) throw new Error('leaf chain out of order');
        prev = node.keys[i];
        count += node.vals[i].length;
      }
    }
    if (count !== this.size) throw new Error(`leaf chain has ${count} entries, expected ${this.size}`);
    return true;
  }
}
