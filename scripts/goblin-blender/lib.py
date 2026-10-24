# Goblin Defenders: Blender (bpy, Cycles) helpers shared by the model and render scripts.
# Run with a Python that has the bpy module (pip install bpy); see render.py.
import bpy, math, os, random
from mathutils import Vector, Euler

ELEV = math.radians(48)
MATS = {}   # camera elevation, as the game draws it (heights use cos, ground depth sin of this)

# ── Scene ─────────────────────────────────────────────────────────────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.exposure = -0.1
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.74, 0.92, 1); bg.inputs[1].default_value = 0.7
    # the sun from the upper left, behind the viewer's shoulder, with soft shadows
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.4; sun.angle = math.radians(6); sun.color = (1, 0.95, 0.86)
    o = bpy.data.objects.new('sun', sun); sc.collection.objects.link(o); o.rotation_euler = Euler((math.radians(38), math.radians(-28), math.radians(-30)))
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.9; fill.angle = math.radians(20); fill.color = (0.8, 0.88, 1)
    o2 = bpy.data.objects.new('fill', fill); sc.collection.objects.link(o2); o2.rotation_euler = Euler((math.radians(60), math.radians(40), math.radians(150)))
    return sc

def camera(w, h, unit, ax, ay, elev=ELEV):
    """An orthographic camera looking at the origin from the front (−Y) at the game's elevation; the origin lands on
    pixel (ax, ay) of a w × h frame with `unit` pixels per world unit."""
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    m = max(w, h); cam.ortho_scale = m / unit; cam.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'
    cam.shift_x = (w / 2 - ax) / m; cam.shift_y = (ay - h / 2) / m
    cam.clip_start = 0.1; cam.clip_end = 200
    o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(o)
    d = 40
    o.location = (0, -d * math.cos(elev), d * math.sin(elev)); o.rotation_euler = Euler((math.pi / 2 - elev, 0, 0))
    sc.camera = o; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    return o

def shadow_catcher(size=3):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0)); p = bpy.context.object; p.is_shadow_catcher = True; p.name = 'catcher'
    return p

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

# ── Materials ────────────────────────────────────────────────────────────────
def _mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; [nt.nodes.remove(n) for n in list(nt.nodes)]
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0]); return m, nt, bsdf
def _rgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1,)
def _aoMix(nt, col_socket_from, strength=0.7, dist=0.08):
    """darken crevices with ambient occlusion and lift worn edges with pointiness: the hand-painted look"""
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = dist
    nt.links.new(col_socket_from, ao.inputs['Color'])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.blend_type = 'MULTIPLY'; mixc.inputs['Factor'].default_value = strength
    nt.links.new(col_socket_from, mixc.inputs[6])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.25, 0.2, 0.18, 1); ramp.color_ramp.elements[1].position = 0.85
    nt.links.new(ao.outputs['AO'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], mixc.inputs[7])
    geo = nt.nodes.new('ShaderNodeNewGeometry'); pr = nt.nodes.new('ShaderNodeValToRGB')
    pr.color_ramp.elements[0].position = 0.52; pr.color_ramp.elements[0].color = (0, 0, 0, 1); pr.color_ramp.elements[1].position = 0.62; pr.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(geo.outputs['Pointiness'], pr.inputs[0])
    edge = nt.nodes.new('ShaderNodeMix'); edge.data_type = 'RGBA'; edge.blend_type = 'SCREEN'
    nt.links.new(pr.outputs[0], edge.inputs['Factor']); nt.links.new(mixc.outputs[2], edge.inputs[6]); edge.inputs[7].default_value = (0.35, 0.33, 0.3, 1)
    return edge.outputs[2]
def flat(name, hexc, rough=0.55, metal=0.0, ao=0.6, emit=None, emitStr=1.0, coat=0.0, trans=0.0, edge=True):
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = _rgb(hexc)
    col = _aoMix(nt, rgb.outputs[0], ao) if edge else rgb.outputs[0]
    nt.links.new(col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat: b.inputs['Coat Weight'].default_value = coat
    if trans: b.inputs['Transmission Weight'].default_value = trans
    if emit: b.inputs['Emission Color'].default_value = _rgb(emit); b.inputs['Emission Strength'].default_value = emitStr
    MATS[name] = m; return m
def wood(name, light='#d4782e', dark='#7a3410', scale=6.0, stripes=True):
    """orange goblin planks: lengthwise grain and the dark painted stripes of the original's carts"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Y'; wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = 6; wave.inputs['Detail'].default_value = 3; wave.inputs['Detail Scale'].default_value = 1.5
    nt.links.new(mp.outputs[0], wave.inputs['Vector'])
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 18; noise.inputs['Detail'].default_value = 6
    nt.links.new(mp.outputs[0], noise.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = 0.25; e[0].color = _rgb(dark); e[1].position = 0.8; e[1].color = _rgb(light)
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY_ADD'; mx.inputs[1].default_value = 0.45; mx.inputs[2].default_value = 0.3
    nt.links.new(wave.outputs['Fac'], mx.inputs[0])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'; nt.links.new(mx.outputs[0], add.inputs[0])
    n2 = nt.nodes.new('ShaderNodeMath'); n2.operation = 'MULTIPLY'; n2.inputs[1].default_value = 0.35; nt.links.new(noise.outputs['Fac'], n2.inputs[0]); nt.links.new(n2.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], ramp.inputs[0])
    col = ramp.outputs[0]
    if stripes:   # the dark lengthwise stripes painted along each beam
        st = nt.nodes.new('ShaderNodeTexWave'); st.wave_type = 'BANDS'; st.bands_direction = 'Z'; st.inputs['Scale'].default_value = 2.2; st.inputs['Distortion'].default_value = 0.6
        nt.links.new(mp.outputs[0], st.inputs['Vector'])
        sr = nt.nodes.new('ShaderNodeValToRGB'); sr.color_ramp.elements[0].position = 0.12; sr.color_ramp.elements[0].color = (0, 0, 0, 1); sr.color_ramp.elements[1].position = 0.2; sr.color_ramp.elements[1].color = (1, 1, 1, 1)
        nt.links.new(st.outputs['Fac'], sr.inputs[0])
        sm = nt.nodes.new('ShaderNodeMix'); sm.data_type = 'RGBA'; sm.blend_type = 'MIX'
        nt.links.new(sr.outputs[0], sm.inputs['Factor']); sm.inputs[6].default_value = _rgb('#4a1c08'); nt.links.new(col, sm.inputs[7]); col = sm.outputs[2]
    col = _aoMix(nt, col, 0.75)
    nt.links.new(col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.62
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; nt.links.new(wave.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    MATS[name] = m; return m
def metal(name, hexc, rough=0.35, metal=0.85, grime=0.5, ao=0.7):
    """painted or bare metal with scuffs: noise in the roughness and a little dirt in the base colour"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 30; noise.inputs['Detail'].default_value = 8
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements; e[0].position = 0.35; e[0].color = _rgb(hexc)
    c2 = list(_rgb(hexc)); c2 = [x * (1 - grime * 0.45) for x in c2[:3]] + [1]; e[1].position = 0.75; e[1].color = tuple(c2)
    nt.links.new(noise.outputs['Fac'], ramp.inputs[0])
    col = _aoMix(nt, ramp.outputs[0], ao)
    nt.links.new(col, b.inputs['Base Color']); b.inputs['Metallic'].default_value = metal
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough * 0.7; rr.inputs['To Max'].default_value = rough * 1.4
    nt.links.new(noise.outputs['Fac'], rr.inputs[0]); nt.links.new(rr.outputs[0], b.inputs['Roughness'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08; nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    MATS[name] = m; return m
def glow(name, hexc, strength=4.0, base=None):
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    b.inputs['Base Color'].default_value = _rgb(base or hexc); b.inputs['Emission Color'].default_value = _rgb(hexc); b.inputs['Emission Strength'].default_value = strength
    b.inputs['Roughness'].default_value = 0.3
    MATS[name] = m; return m
def glass(name, hexc, emit=None, strength=0.8):
    """the acid bottle and ice: glossy, partly see-through, lit from inside"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    b.inputs['Base Color'].default_value = _rgb(hexc); b.inputs['Roughness'].default_value = 0.08
    b.inputs['Transmission Weight'].default_value = 0.35; b.inputs['IOR'].default_value = 1.3; b.inputs['Coat Weight'].default_value = 0.6
    b.inputs['Subsurface Weight'].default_value = 0.5; b.inputs['Subsurface Radius'].default_value = (0.3, 0.6, 0.2)
    if emit: b.inputs['Emission Color'].default_value = _rgb(emit); b.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m

def M():
    """the shared palette, matched to the original's: orange striped wood, cream painted steel, dark iron, brass"""
    return {
        'wood': wood('wood', '#f08a2a', '#9a3a0c'), 'woodPlain': wood('woodPlain', '#e0904a', '#8a4416', stripes=False),
        'woodDark': wood('woodDark', '#8a4a22', '#3a1806', stripes=False), 'woodRed': wood('woodRed', '#c8442a', '#5a1408', stripes=False),
        'cream': metal('cream', '#e9dcc0', rough=0.42, metal=0.35, grime=0.55), 'creamDark': metal('creamDark', '#bfae8e', rough=0.45, metal=0.35),
        'iron': metal('iron', '#5b6068', rough=0.38, metal=0.85), 'ironDark': metal('ironDark', '#2e3136', rough=0.42, metal=0.8),
        'steel': metal('steel', '#c9d2dc', rough=0.22, metal=0.95, grime=0.25), 'brass': metal('brass', '#e3a83e', rough=0.28, metal=1.0, grime=0.3),
        'gold': metal('gold', '#ffc23a', rough=0.22, metal=1.0, grime=0.15), 'copper': metal('copper', '#d2733e', rough=0.3, metal=1.0),
        'rope': flat('rope', '#2a2420', 0.8), 'string': flat('string', '#1e1a18', 0.7),
        'black': metal('black', '#1c1d20', rough=0.4, metal=0.6, grime=0.2),
        'acid': glass('acid', '#7ee030', '#55c018', 1.2), 'ice': glass('ice', '#58b8ff', '#2a7ad0', 0.6), 'iceDeep': glass('iceDeep', '#2f7ff0', '#1a50c0', 0.9),
        'orb': glow('orb', '#ff3ad0', 2.2, '#ff8ae8'), 'orbCore': glow('orbCore', '#ffd8f6', 5.0),
        'coilPink': metal('coilPink', '#e06ad8', rough=0.25, metal=0.8, grime=0.1), 'glowRed': glow('glowRed', '#ff4a10', 10.0), 'lava': glow('lava', '#ff6a10', 6),
        'purple': metal('purple', '#8a4ad0', rough=0.35, metal=0.6, grime=0.2),
        'redCloth': flat('redCloth', '#c8202a', 0.7), 'blueCloth': flat('blueCloth', '#2a4ab8', 0.7), 'greenCloth': flat('greenCloth', '#3a8a3a', 0.75), 'purpleCloth': flat('purpleCloth', '#6a2aa8', 0.7),
        'bone': flat('bone', '#efe2c4', 0.55, ao=0.85), 'skin': flat('skin', '#e8a57a', 0.6), 'leather': flat('leather', '#6a3c1c', 0.7),
        'eye': flat('eye', '#0a0a0a', 0.2, edge=False), 'eyeRed': glow('eyeRed', '#ff2a10', 8), 'eyeGlow': glow('eyeGlow', '#ffd21a', 8),
        'fur': flat('fur', '#6a4428', 0.95), 'wool': flat('wool', '#f6f2e8', 0.95, ao=0.9), 'dark': flat('dark', '#0c0806', 1.0, edge=False),
        'leaf': flat('leaf', '#3fa83a', 0.7), 'leafDark': flat('leafDark', '#23762e', 0.75), 'leafLight': flat('leafLight', '#86d03a', 0.7),
        'stone': metal('stone', '#c8bca4', rough=0.9, metal=0.0, grime=0.5), 'stoneGrey': metal('stoneGrey', '#a2a8b0', rough=0.9, metal=0.0, grime=0.6),
        'sandstone': metal('sandstone', '#e2be7a', rough=0.9, metal=0.0, grime=0.5), 'rock': metal('rock', '#8f877b', rough=0.95, metal=0.0, grime=0.7),
        'snow': flat('snow', '#f6faff', 0.6, ao=0.5), 'shingle': wood('shingle', '#b07038', '#5a2c10', 12, False),
    }

# ── Shapes ───────────────────────────────────────────────────────────────────
_root = None
def group(name='g', parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o); o.location = loc; o.rotation_euler = Euler(rot)
    if parent: o.parent = parent
    return o
def _place(o, mat, loc, rot, parent, bevel=0.0, smooth=True, seg=3):
    o.location = loc; o.rotation_euler = Euler(rot)
    if mat: o.data.materials.append(mat)
    if parent: o.parent = parent
    if bevel:
        m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = seg; m.limit_method = 'ANGLE'; m.harden_normals = False
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        if bevel: o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
        try:
            o.modifiers.new('ws', 'WEIGHTED_NORMAL').keep_sharp = True
        except Exception: pass
    return o
def box(sx, sy, sz, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _place(o, mat, loc, rot, parent, bevel)
def cyl(r, h, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, verts=28, r2=None, bevel=0.01, cap=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, end_fill_type='NGON' if cap else 'NOTHING')
    return _place(bpy.context.object, mat, loc, rot, parent, bevel)
def sphere(r, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _place(o, mat, loc, rot, parent)
def torus(R, r, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, maj=32, mn=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mn)
    return _place(bpy.context.object, mat, loc, rot, parent)
def cone(r, h, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, verts=16, r2=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h)
    return _place(bpy.context.object, mat, loc, rot, parent)
def ico(r, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, sub=1, scale=(1, 1, 1), smooth=False):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=sub); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _place(o, mat, loc, rot, parent, smooth=smooth)
def capsule(r, h, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    g = group('cap', parent, loc, rot)
    cyl(r, h, mat, (0, 0, 0), parent=g, bevel=0); sphere(r, mat, (0, 0, h / 2), parent=g); sphere(r, mat, (0, 0, -h / 2), parent=g)
    return g
def beam(a, b, w, h, mat, parent=None, bevel=0.012):
    """a box from point a to point b (its length along the line), w wide and h tall, kept level"""
    A, B = Vector(a), Vector(b); d = B - A
    o = box(d.length, w, h, mat, tuple((A + B) / 2), (0, -math.atan2(d.z, math.hypot(d.x, d.y)), math.atan2(d.y, d.x)), parent, bevel)
    return o
def rod(a, b, r, mat, parent=None, verts=10):
    A, B = Vector(a), Vector(b); d = B - A
    o = cyl(r, d.length, mat, tuple((A + B) / 2), parent=parent, verts=verts, bevel=0)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o
def rock(r, mat, loc=(0, 0, 0), parent=None, seed=1, flat=0.75):
    """a lumpy boulder: a subdivided ico sphere pushed about by noise"""
    o = ico(r, mat, loc, parent=parent, sub=2)
    rnd = random.Random(seed)
    for v in o.data.vertices:
        k = 1 + (math.sin(v.co.x * 9.1 + seed) * math.cos(v.co.y * 7.3) + math.sin(v.co.z * 5.7 + seed)) * 0.12 + rnd.uniform(-0.04, 0.04)
        v.co.x *= k; v.co.y *= k; v.co.z *= k * flat
    for p in o.data.polygons: p.use_smooth = False
    return o
def rivets(R, z, n, mat, parent, r=0.022, start=0.0):
    for i in range(n):
        a = start + i / n * math.tau; sphere(r, mat, (math.cos(a) * R, math.sin(a) * R, z), parent=parent, seg=10)
def hexbolt(r, h, mat, loc, rot=(0, 0, 0), parent=None):
    o = cyl(r, h, mat, loc, rot, parent, verts=6, bevel=0.006); return o

def lathe(profile, mat, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, seg=32):
    """a surface of revolution round Z from a list of (radius, height) points"""
    mesh = bpy.data.meshes.new('lathe'); verts = []; faces = []
    n = len(profile)
    for i in range(seg):
        a = i / seg * math.tau
        for (r, z) in profile: verts.append((math.cos(a) * r, math.sin(a) * r, z))
    for i in range(seg):
        for j in range(n - 1):
            a = i * n + j; b = ((i + 1) % seg) * n + j; faces.append((a, b, b + 1, a + 1))
    mesh.from_pydata(verts, [], faces); mesh.update()
    o = bpy.data.objects.new('lathe', mesh); bpy.context.scene.collection.objects.link(o)
    return _place(o, mat, loc, rot, parent)

def clear_objects(keep=('sun', 'fill', 'cam')):
    for o in list(bpy.context.scene.objects):
        if o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)

# ── Additions for the creatures (enemies.py): swept tubes, extruded slabs, painted organic materials ─────────────
import bmesh
from mathutils import Matrix
def _finish_mesh(mesh, name):
    bm = bmesh.new(); bm.from_mesh(mesh); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(mesh); bm.free(); mesh.update()
    o = bpy.data.objects.new(name, mesh); bpy.context.scene.collection.objects.link(o); return o
def tube(pts, radii, mat=None, parent=None, seg=12, cap=True, loc=(0, 0, 0), rot=(0, 0, 0), scale_y=1.0):
    """a tube swept along a list of points with a radius per point (horns, tails, claws, bones, wisps, legs);
    a radius of 0 ends in a point. scale_y squashes the section (flat ribbons)."""
    P = [Vector(p) for p in pts]; n = len(P)
    if isinstance(radii, (int, float)): radii = [radii] * n
    T = [(P[min(i + 1, n - 1)] - P[max(i - 1, 0)]).normalized() for i in range(n)]
    up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = T[0].cross(up).normalized(); verts = []; faces = []; rings = []
    for i in range(n):
        if i:
            ax = T[i - 1].cross(T[i])
            if ax.length > 1e-7: N = Matrix.Rotation(T[i - 1].angle(T[i]), 3, ax.normalized()) @ N
        B = T[i].cross(N)
        if radii[i] <= 1e-5: rings.append([len(verts)]); verts.append(tuple(P[i])); continue
        ring = []
        for j in range(seg):
            a = j / seg * math.tau; ring.append(len(verts))
            verts.append(tuple(P[i] + (N * math.cos(a) + B * math.sin(a) * scale_y) * radii[i]))
        rings.append(ring)
    for i in range(n - 1):
        A, Bn = rings[i], rings[i + 1]
        if len(A) == 1 and len(Bn) == 1: continue
        for j in range(seg):
            if len(A) == 1: faces.append((A[0], Bn[j], Bn[(j + 1) % seg]))
            elif len(Bn) == 1: faces.append((A[j], A[(j + 1) % seg], Bn[0]))
            else: faces.append((A[j], A[(j + 1) % seg], Bn[(j + 1) % seg], Bn[j]))
    if cap:
        if len(rings[0]) > 1: faces.append(tuple(reversed(rings[0])))
        if len(rings[-1]) > 1: faces.append(tuple(rings[-1]))
    mesh = bpy.data.meshes.new('tube'); mesh.from_pydata(verts, [], faces)
    return _place(_finish_mesh(mesh, 'tube'), mat, loc, rot, parent)
def slab(poly, depth, mat=None, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, bevel=0.0, smooth=False, bulge=0.0):
    """a flat plate cut to a 2-D outline [(x, y), …] in its local XY plane, `depth` thick along Z (shields, wings,
    capes, plates); bulge pushes the middle of the front face out (a domed shield)."""
    n = len(poly); verts = []
    cx = sum(p[0] for p in poly) / n; cy = sum(p[1] for p in poly) / n
    rmax = max(math.hypot(p[0] - cx, p[1] - cy) for p in poly) or 1
    for z in (depth / 2, -depth / 2):
        for (x, y) in poly: verts.append((x, y, z))
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
    for i in range(n): j = (i + 1) % n; faces.append((i, n + i, n + j, j))
    if bulge:   # a centre vertex fanned to the rim, pushed out
        verts.append((cx, cy, depth / 2 + bulge)); c = len(verts) - 1
        faces[0] = None; faces = [f for f in faces if f]
        for i in range(n): faces.append((i, (i + 1) % n, c))
    mesh = bpy.data.meshes.new('slab'); mesh.from_pydata(verts, [], faces)
    o = _finish_mesh(mesh, 'slab')
    return _place(o, mat, loc, rot, parent, bevel, smooth=smooth)
def subsurf(o, levels=1):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = levels; m.render_levels = levels
    o.modifiers.move(len(o.modifiers) - 1, 0) if len(o.modifiers) > 1 else None
    return o
def painted(name, hexc, hex2=None, scale=9.0, bump=0.35, rough=0.6, ao=0.75, sss=0.0, metal=0.0, emit=None, emitStr=1.0, edge=False):
    """hand-painted organic surface (skin, fur, hide, stone): two tones mottled by noise, crevices darkened, a soft bump"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = scale; noise.inputs['Detail'].default_value = 6
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = 0.3; e[0].color = _rgb(hexc); e[1].position = 0.75
    if hex2: e[1].color = _rgb(hex2)
    else: c2 = list(_rgb(hexc)); e[1].color = tuple([x * 0.72 for x in c2[:3]] + [1])
    nt.links.new(noise.outputs['Fac'], ramp.inputs[0])
    col = _aoMix(nt, ramp.outputs[0], ao) if edge else ramp.outputs[0]
    nt.links.new(col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.08, 0.04, 0.03)
    if emit: b.inputs['Emission Color'].default_value = _rgb(emit); b.inputs['Emission Strength'].default_value = emitStr
    if bump:
        bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; bm.inputs['Distance'].default_value = 0.02
        n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = scale * 4; n2.inputs['Detail'].default_value = 8
        nt.links.new(n2.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs[0], b.inputs['Normal'])
    MATS[name] = m; return m
def banded(name, hexc, hexBand, scale=6.0, axis='X', width=0.25, rough=0.45, coat=0.4):
    """a creature's banded markings (spider abdomens, tails): dark stripes across the object's own axis"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = axis; wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = 1.5; wave.inputs['Detail'].default_value = 2
    nt.links.new(tc.outputs['Object'], wave.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
    e[0].position = width; e[0].color = _rgb(hexBand); e[1].position = width + 0.08; e[1].color = _rgb(hexc)
    nt.links.new(wave.outputs['Fac'], ramp.inputs[0])
    col = _aoMix(nt, ramp.outputs[0], 0.75)
    nt.links.new(col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough; b.inputs['Coat Weight'].default_value = coat
    MATS[name] = m; return m
def spectral(name, hexc, rim='#ffb0ff', strength=1.2, alpha=0.88):
    """a ghost's glowing, faintly see-through body: lit from within, brightest at its silhouette"""
    if name in MATS: return MATS[name]
    m, nt, b = _mat(name)
    b.inputs['Base Color'].default_value = _rgb(hexc); b.inputs['Roughness'].default_value = 0.4
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.45
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[6].default_value = _rgb(hexc); mix.inputs[7].default_value = _rgb(rim)
    nt.links.new(lw.outputs['Facing'], mix.inputs['Factor'])
    nt.links.new(mix.outputs[2], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = strength
    b.inputs['Alpha'].default_value = alpha
    MATS[name] = m; return m
