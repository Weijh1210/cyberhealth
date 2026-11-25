import type { Category, WorldNode } from "./model";
export const districtFor = (category: Category) =>
  ({
    home: "住宅区",
    office: "工作区",
    campus: "学习区",
    library: "学习区",
    subway: "交通区",
    bus: "交通区",
    park: "绿地区",
    restaurant: "生活街区",
    cafe: "生活街区",
    shop: "生活街区",
    gym: "绿地区",
    other: "生活街区",
  })[category];
export function nextPlot(category: Category, nodes: WorldNode[], seed: number) {
  const anchors: Record<Category, [number, number]> = {
    home: [-1, 0],
    office: [1, 0],
    campus: [1, -1],
    library: [2, -1],
    subway: [0, 1],
    bus: [0, 1],
    park: [0, -1],
    restaurant: [-1, 1],
    cafe: [-1, 1],
    shop: [-1, 1],
    gym: [0, -1],
    other: [1, 1],
  };
  const [ax, az] = anchors[category];
  const candidates: { x: number; z: number; distance: number }[] = [];
  for (let x = -8; x <= 8; x++)
    for (let z = -8; z <= 8; z++)
      candidates.push({
        x: x * 190,
        z: z * 190,
        distance:
          Math.abs(x - ax) +
          Math.abs(z - az) +
          ((((x * 17 + z * 31 + seed) % 7) + 7) % 7) * 0.01,
      });
  const available = candidates
    .sort((a, b) => a.distance - b.distance)
    .find(
      (p) =>
        !nodes.some(
          (n) => Math.abs(n.x - p.x) < 150 && Math.abs(n.z - p.z) < 150,
        ),
    );
  if (!available) throw Error("当前街区没有空地");
  return { x: available.x, z: available.z };
}
export const footprint = { width: 110, depth: 96 };
export const entrance = (node: WorldNode): [number, number] => [
  node.x,
  node.z + 55,
];
// All street segments follow the same off-center 190px lattice, outside every building footprint.
export function roadPoints(a: WorldNode, b: WorldNode): [number, number][] {
  return [
    entrance(a),
    [a.x, a.z + 75],
    [a.x + 75, a.z + 75],
    [b.x + 75, a.z + 75],
    [b.x + 75, b.z + 75],
    [b.x, b.z + 75],
    entrance(b),
  ];
}
