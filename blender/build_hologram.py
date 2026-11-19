"""Builds the five hologram shapes of the portfolio and exports them as point clouds.

Run inside Blender (Scripting tab, or through the Blender MCP):

    __file__ = r"D:\\portofolio\\blender\\build_hologram.py"
    exec(compile(open(__file__).read(), __file__, "exec"))

Outputs
  public/models/hologram.bin   uint32 [shapes, points] + int16 xyz (three.js axes, Y up, radius ~1)
  blender/hologram.blend       the "R225_Hologram" scene with every source object, for editing

Shapes, in scroll order:
  0 cauri      cowrie shell, the hero artefact under scan
  1 bouclier   shield + keyhole, for the security skills
  2 manette    game controller, for the mobile games
  3 helice     double helix with 8 milestone nodes, for the timeline
  4 "225"      extruded digits, for the contact section
"""

import math
import os
import random
import struct

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

N = 12000
SEED = 225
SCENE = "R225_Hologram"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_BIN = os.path.join(ROOT, "public", "models", "hologram.bin")
OUT_BLEND = os.path.join(ROOT, "blender", "hologram.blend")
FONT = os.path.join(ROOT, "public", "cv", "fonts", "chakra-petch-latin-700-normal.woff2")

random.seed(SEED)
STAND_UP = Matrix.Rotation(math.radians(90), 4, "X")  # XY-plane design -> faces -Y (Blender front view)


# ---------------------------------------------------------------- scene helpers

def fresh_scene():
    scn = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    for ob in list(scn.collection.all_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    return scn


def link(scn, name, data, matrix=None):
    ob = bpy.data.objects.new(name, data)
    scn.collection.objects.link(ob)
    if matrix is not None:
        ob.matrix_world = matrix
    return ob


def bm_to_object(scn, name, bm, matrix=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(scn, name, me, matrix)


def world_bmesh(ob, dg):
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    ev.to_mesh_clear()
    bm.transform(ob.matrix_world)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return bm


# ---------------------------------------------------------------- sampling

def sample_part(bm, count, edge_frac, sharp_deg, jitter):
    pts = []
    faces = [f for f in bm.faces if f.calc_area() > 0]
    n_edge = int(count * edge_frac) if edge_frac else 0
    n_surf = count - n_edge

    if faces and n_surf:
        cum, acc = [], 0.0
        for f in faces:
            acc += f.calc_area()
            cum.append(acc)
        for f in random.choices(faces, cum_weights=cum, k=n_surf):
            a, b, c = (v.co for v in f.verts)
            s, r = math.sqrt(random.random()), random.random()
            pts.append(a * (1 - s) + b * (s * (1 - r)) + c * (s * r))

    if n_edge:
        edges = []
        for e in bm.edges:
            if sharp_deg is not None and e.is_manifold and e.calc_face_angle(0) < math.radians(sharp_deg):
                continue
            edges.append(e)
        if edges:
            cum, acc = [], 0.0
            for e in edges:
                acc += e.calc_length()
                cum.append(acc)
            for e in random.choices(edges, cum_weights=cum, k=n_edge):
                pts.append(e.verts[0].co.lerp(e.verts[1].co, random.random()))

    if jitter:
        pts = [p + Vector((random.gauss(0, jitter), random.gauss(0, jitter), random.gauss(0, jitter))) for p in pts]
    return pts


def sample_shape(parts, dg):
    """parts: list of (object, weight, edge_frac, sharp_deg, jitter). Point budget split by area * weight."""
    bms = [(world_bmesh(ob, dg), w, ef, sh, ji) for ob, w, ef, sh, ji in parts]

    def size(bm):  # surface area, or edge length for wire-only parts
        area = sum(f.calc_area() for f in bm.faces)
        return area if area > 0 else 0.05 * sum(e.calc_length() for e in bm.edges)

    sizes = [max(size(bm), 1e-6) * w for bm, w, *_ in bms]
    total = sum(sizes)
    counts = [int(N * s / total) for s in sizes]
    counts[0] += N - sum(counts)
    pts = []
    for (bm, _w, ef, sh, ji), c in zip(bms, counts):
        pts += sample_part(bm, c, ef, sh, ji)
        bm.free()
    return normalise(pts)


def normalise(pts):
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    mid = (lo + hi) / 2
    radius = max((p - mid).length for p in pts)
    # Blender (x, y, z) -> three.js (x, z, -y)
    out = [((p.x - mid.x) / radius, (p.z - mid.z) / radius, -(p.y - mid.y) / radius) for p in pts]
    out.sort(key=lambda q: q[1] + random.uniform(-0.02, 0.02))  # height order -> coherent morphs
    return out


# ---------------------------------------------------------------- shapes

def make_cauri(scn):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=160, v_segments=80, radius=1.0)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, "Y"))
    for v in bm.verts:  # poles now on the X axis: the two ends of the shell
        x, y, z = v.co
        t = abs(x)
        y *= 0.64 * (1 - 0.18 * t ** 4)
        z *= 0.52 * (1 - 0.12 * t ** 4)
        if z < 0:  # flat ventral face with the toothed aperture
            z *= 0.38
            w = abs(y)
            slit = 0.075 * (1 - t ** 2)
            if t < 0.93:
                if w < slit:
                    z += 0.24 * (1 - t ** 2) * (1 - (w / max(slit, 1e-4)) ** 2)
                elif w < slit + 0.13:
                    teeth = 0.5 + 0.5 * math.cos(x * 58)
                    z -= 0.055 * teeth * (1 - (w - slit) / 0.13)
        v.co = (x, y, z)
    # Teeth: short ridges across both lips, projected onto the ventral surface.
    tree = BVHTree.FromBMesh(bm)
    tb = bmesh.new()
    for k in range(-14, 15):
        x = 2 * math.pi * k / 58
        t = abs(x)
        if t > 0.82:
            continue
        slit = 0.075 * (1 - t ** 2)
        for side in (-1, 1):
            prev = None
            for j in range(7):
                hit = tree.ray_cast(Vector((x, side * (slit + 0.13 * j / 6), -2)), Vector((0, 0, 1)))[0]
                if hit is None:
                    continue
                v = tb.verts.new(hit - Vector((0, 0, 0.012)))
                if prev:
                    tb.edges.new((prev, v))
                prev = v
    # Long axis vertical (reads well while spinning), toothed aperture facing the camera.
    stand = Matrix.Rotation(math.radians(-90), 4, "Z") @ Matrix.Rotation(math.radians(-90), 4, "Y")
    shell = bm_to_object(scn, "Cauri", bm, stand)
    teeth = bm_to_object(scn, "Cauri_Dents", tb, stand)
    return [(shell, 1.0, 0.0, None, 0.0), (teeth, 6.0, 1.0, None, 0.004)]


def shield_outline(n_side=40, n_top=24):
    top = [(-0.8 + 1.6 * i / n_top, 0.85 + 0.1 * (1 - ((-0.8 + 1.6 * i / n_top) / 0.8) ** 2)) for i in range(n_top + 1)]
    right = [(0.8 * (1 - s ** 2.4) ** 0.7, 0.85 - 1.95 * s) for s in (i / n_side for i in range(1, n_side + 1))]
    left = [(-x, y) for x, y in reversed(right[:-1])]
    return top + right + left


def make_shield(scn):
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, -0.08)) for x, y in shield_outline()]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top_verts = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top_verts, vec=(0, 0, 0.16))
    front = [f for f in bm.faces if f.normal.z > 0.9]
    bmesh.ops.inset_individual(bm, faces=front, thickness=0.09, depth=-0.035)
    body = bm_to_object(scn, "Bouclier", bm, STAND_UP)

    kb = bmesh.new()
    ring = bmesh.ops.create_circle(kb, cap_ends=True, segments=40, radius=0.17)["verts"]
    bmesh.ops.translate(kb, verts=ring, vec=(0, 0.16, 0.04))
    stem = [kb.verts.new(p) for p in ((-0.06, 0.04, 0.04), (0.06, 0.04, 0.04), (0.13, -0.42, 0.04), (-0.13, -0.42, 0.04))]
    kb.faces.new(stem)
    caps = [f for f in kb.faces]
    ext = bmesh.ops.extrude_face_region(kb, geom=caps)
    bmesh.ops.translate(kb, verts=[g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)], vec=(0, 0, 0.09))
    key = bm_to_object(scn, "Bouclier_Serrure", kb, STAND_UP)
    return [(body, 1.0, 0.45, 25, 0.0), (key, 2.2, 0.5, 25, 0.0)]


def make_gamepad(scn):
    mb = bpy.data.metaballs.new("Manette")
    mb.resolution = mb.render_resolution = 0.035
    mb.threshold = 0.6
    for x, y, r in ((-0.36, 0.08, 0.42), (0, 0.1, 0.42), (0.36, 0.08, 0.42),
                    (-0.62, -0.26, 0.36), (0.62, -0.26, 0.36), (-0.74, -0.56, 0.28), (0.74, -0.56, 0.28)):
        el = mb.elements.new(type="BALL")
        el.co, el.radius = (x, y, 0), r
    flat = STAND_UP @ Matrix.Rotation(math.radians(-55), 4, "X") @ Matrix.Diagonal((1, 1, 0.42, 1))
    shell = link(scn, "Manette", mb, flat)

    tilt = STAND_UP @ Matrix.Rotation(math.radians(-55), 4, "X")
    bm = bmesh.new()
    def box(cx, cy, sx, sy, sz):
        r = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        bmesh.ops.scale(bm, verts=r, vec=(sx, sy, sz))
        bmesh.ops.translate(bm, verts=r, vec=(cx, cy, 0.2))
    box(-0.5, 0.12, 0.26, 0.08, 0.06)
    box(-0.5, 0.12, 0.08, 0.26, 0.06)
    for dx, dy in ((0.11, 0), (-0.11, 0), (0, 0.11), (0, -0.11)):
        r = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.055)["verts"]
        bmesh.ops.translate(bm, verts=r, vec=(0.5 + dx, 0.12 + dy, 0.19))
    for sx in (-0.2, 0.2):
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.1, radius2=0.1, depth=0.1)["verts"]
        bmesh.ops.translate(bm, verts=r, vec=(sx, -0.2, 0.2))
    controls = bm_to_object(scn, "Manette_Boutons", bm, tilt)
    return [(shell, 1.0, 0.0, None, 0.0), (controls, 2.5, 0.45, 30, 0.0)]


def make_helix(scn):
    bm = bmesh.new()
    turns, height, radius, steps = 2.25, 2.4, 0.42, 220
    strands = []
    for phase in (0, math.pi):
        vs = []
        for i in range(steps + 1):
            t = i / steps
            a = t * turns * 2 * math.pi + phase
            vs.append(bm.verts.new((radius * math.cos(a), radius * math.sin(a), (t - 0.5) * height)))
        for a, b in zip(vs, vs[1:]):
            bm.edges.new((a, b))
        strands.append(vs)
    for i in range(0, steps + 1, 10):  # base-pair rungs
        bm.edges.new((strands[0][i], strands[1][i]))
    helix = bm_to_object(scn, "Helice", bm)

    nodes = bmesh.new()  # 8 milestones of the timeline along the axis
    for k in range(8):
        r = bmesh.ops.create_icosphere(nodes, subdivisions=2, radius=0.07)["verts"]
        bmesh.ops.translate(nodes, verts=r, vec=(0, 0, (k / 7 - 0.5) * height * 0.92))
    milestones = bm_to_object(scn, "Helice_Jalons", nodes)
    return [(helix, 8.0, 1.0, None, 0.012), (milestones, 1.0, 0.0, None, 0.0)]


def make_225(scn):
    cu = bpy.data.curves.new("Signature_225", "FONT")
    cu.body = "225"
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.extrude, cu.bevel_depth, cu.resolution_u = 0.07, 0.008, 8
    try:
        cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    except Exception:
        pass  # Blender default font
    return [(link(scn, "Signature_225", cu, STAND_UP), 1.0, 0.62, 30, 0.0)]


# ---------------------------------------------------------------- run

def build():
    window = bpy.context.window
    previous = window.scene
    scn = fresh_scene()
    window.scene = scn
    try:
        builders = [make_cauri, make_shield, make_gamepad, make_helix, make_225]
        parts = [b(scn) for b in builders]
        dg = bpy.context.evaluated_depsgraph_get()
        dg.update()
        shapes = [sample_shape(p, dg) for p in parts]

        os.makedirs(os.path.dirname(OUT_BIN), exist_ok=True)
        with open(OUT_BIN, "wb") as fh:
            fh.write(struct.pack("<II", len(shapes), N))
            for pts in shapes:
                flat = [max(-32767, min(32767, round(c / 1.05 * 32767))) for p in pts for c in p]
                fh.write(struct.pack(f"<{len(flat)}h", *flat))

        bpy.data.libraries.write(OUT_BLEND, {scn}, fake_user=True, compress=True)
        return {"shapes": len(shapes), "points": N, "bin_bytes": os.path.getsize(OUT_BIN), "blend": OUT_BLEND}
    finally:
        window.scene = previous


result = build()
