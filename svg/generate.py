"""Silo Pets art set 'flat-v1'. Every pet is a stack of named layers on a 400x400 canvas
with fixed anchors, so any layer (or the whole set) can be swapped later."""
import os, math, json
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v3')

# ---- anchors: every art set must respect these ----
ANCHORS = dict(canvas=400, ground_y=352, center_x=200, sprout=(200, 92), face=(200, 210),
               hand_r=(344, 246), bubble=(330, 96))
STAGE_SCALE = {1: 0.78, 2: 0.86, 3: 0.95, 4: 0.95}

INK = '#2A2D3A'; EYE = '#16171F'; BLUSH = '#FFB1C2'
LEAF = '#6CC46E'; LEAF_D = '#4AA75A'

BLOB = 'M200 84 C292 84 332 146 332 218 C332 292 288 332 200 332 C112 332 68 292 68 218 C68 146 108 84 200 84 Z'
PEAR = 'M200 92 C290 92 328 150 332 214 C338 292 300 344 200 344 C100 344 62 292 68 214 C72 150 110 92 200 92 Z'

SPECIES = {
  'polar':  dict(name='북극곰', base='#FBFDFF', shade='#D3E0F0', limb='#FBFDFF', limb_shade='#D3E0F0', ears='round', ear_in='#FFC7D3',
                 muzzle='#F4F8FD', nose='bear', pad='#FFB8C6', bg='#E6F0FB', egg_spot='#CFE0F5', item='fish',
                 alt=dict(base='#FFF6E8', shade='#EADBC2', limb='#FFF6E8', limb_shade='#EADBC2', muzzle='#FFFBF3')),
  'panda':  dict(name='판다', base='#FFFFFF', shade='#ECE7E0', limb='#353543', limb_shade='#26262F', ears='round_dark', ear_in=None,
                 muzzle='#FFFFFF', nose='bear', pad='#5A5363', bg='#E5F4E3', egg_spot='#353543', item='bamboo', patches=True,
                 alt=dict(limb='#8B6A55', limb_shade='#6F5343', egg_spot='#8B6A55', pad='#6F5343')),
  'fennec': dict(name='사막여우', base='#F7B877', shade='#E39A5B', limb='#E8A161', limb_shade='#CF8649', ears='fox', ear_in='#FFE6CC',
                 muzzle='#FFF4E6', muzzle_big=True, nose='bear', pad='#FFB8C6', bg='#FDF0DF', egg_spot='#E39A5B', item='cactus', belly='#FFF1DE',
                 alt=dict(base='#F4E6D0', shade='#DFCBAD', limb='#E6D2B0', limb_shade='#CDB792', egg_spot='#DFCBAD')),
  'sloth':  dict(name='나무늘보', base='#D6BB98', shade='#BCA07D', limb='#A88763', limb_shade='#8E7050', ears='none', ear_in=None,
                 muzzle=None, mask='#F3E6D2', stripes='#8A6A52', nose='bear', pad='#8E7050', bg='#F1ECE2', egg_spot='#A88763', item='mug',
                 alt=dict(base='#CFC6BC', shade='#B4AA9E', limb='#958A7E', limb_shade='#7C7267', egg_spot='#958A7E')),
  'whale':  dict(name='고래상어', base='#7FA8D6', shade='#6590C2', limb='#6F99CB', limb_shade='#5A82B5', ears='fin', ear_in=None,
                 muzzle=None, nose='none', mouth_w=1.8, pad=None, bg='#E3F1FB', egg_spot='#FFFFFF', item='wand', belly='#EAF3FC', spots=True,
                 alt=dict(base='#9C9EE0', shade='#8083C9', limb='#8E91D6', limb_shade='#7376BE')),
  'pig':    dict(name='돼지', base='#FFD0D8', shade='#F4AEBB', limb='#FFC0CB', limb_shade='#EE9EAD', ears='pig', ear_in='#F4AEBB',
                 muzzle=None, nose='snout', pad='#F48FA3', bg='#FFEFF2', egg_spot='#F4AEBB', item='apple',
                 alt=dict(base='#F2E3D5', shade='#E1C9B5', limb='#EAD6C4', limb_shade='#D6BDA6', egg_spot='#C9A98E')),
  'frog':   dict(name='개구리', base='#9ADB72', shade='#78C056', limb='#86CF62', limb_shade='#6BB34C', ears='frog', ear_in=None,
                 muzzle=None, nose='dots', eye_up=True, mouth_w=1.6, pad=None, bg='#EAF7E0', egg_spot='#6BB34C', item='lotus', belly='#E6F6C6',
                 alt=dict(base='#FFD36B', shade='#F0B94A', limb='#FFC94D', limb_shade='#E8AD3A', egg_spot='#E8AD3A')),
}
ITEM_NAME = dict(fish='생선', bamboo='대나무', cactus='선인장 화분', mug='코코아 머그', wand='비눗방울 막대', apple='사과', lotus='연잎 우산')


def palette(species, color='base'):
    sp = dict(SPECIES[species])
    if color in ('alt',):
        sp.update(sp['alt'])
    return sp


def ell(cx, cy, rx, ry):
    return f'M{cx-rx} {cy} a{rx} {ry} 0 1 0 {2*rx} 0 a{rx} {ry} 0 1 0 {-2*rx} 0 Z'


def shaded(d, base, shade, k, hx, hy, hrx, hry):
    return (f'<clipPath id="c{k}"><path d="{d}"/></clipPath><path d="{d}" fill="{shade}"/>'
            f'<ellipse cx="{hx}" cy="{hy}" rx="{hrx}" ry="{hry}" fill="{base}" clip-path="url(#c{k})"/>')


def star(x, y, r, fill='#FFC93C'):
    return (f'<path d="M{x} {y-r} L{x+r*0.3} {y-r*0.3} L{x+r} {y} L{x+r*0.3} {y+r*0.3} L{x} {y+r} '
            f'L{x-r*0.3} {y+r*0.3} L{x-r} {y} L{x-r*0.3} {y-r*0.3} Z" fill="{fill}"/>')


# ---------------- layers ----------------
def L_sprout(x, y, stage, shiny=False):
    leaf, leaf_d = ('#FFD24D', '#E8B730') if shiny else (LEAF, LEAF_D)
    h = [10, 18, 24, 28, 32][stage]; ty = y - h
    s = [f'<path d="M{x} {y} L{x} {ty}" stroke="{LEAF_D}" stroke-width="6" stroke-linecap="round"/>']
    if stage == 0: s.append(f'<circle cx="{x}" cy="{ty-4}" r="7" fill="{leaf}"/>')
    if stage >= 1: s.append(f'<path d="M{x} {ty} C{x+10} {ty-20} {x+34} {ty-22} {x+42} {ty-12} C{x+30} {ty+4} {x+12} {ty+4} {x} {ty} Z" fill="{leaf}"/>')
    if stage >= 2: s.append(f'<path d="M{x} {ty+2} C{x-10} {ty-18} {x-32} {ty-20} {x-40} {ty-10} C{x-28} {ty+6} {x-12} {ty+6} {x} {ty+2} Z" fill="{leaf_d}"/>')
    if stage >= 3: s.append(f'<path d="M{x} {ty} C{x-8} {ty-16} {x-4} {ty-30} {x+4} {ty-34} C{x+12} {ty-22} {x+8} {ty-8} {x} {ty} Z" fill="{leaf}"/>')
    if stage >= 4:
        fy = ty - 34
        for dx, dy in ((0, -11), (10, -3), (6, 9), (-6, 9), (-10, -3)):
            s.append(f'<circle cx="{x+4+dx}" cy="{fy+dy}" r="8" fill="#FFB3C7"/>')
        s.append(f'<circle cx="{x+4}" cy="{fy}" r="6" fill="#FFD66B"/>')
    return ''.join(s)


def L_ears(sp, k, y, r):
    t = sp['ears']; o = []
    if t == 'none': return ''
    if t == 'fin':
        d = 'M124 128 C128 86 150 50 178 40 C176 70 184 96 198 112 Z'
        return shaded(d, sp['base'], sp['shade'], k + 'fin', 150, 70, 30, 60)
    if t == 'frog':
        for i, x in enumerate((138, 262)):
            o.append(shaded(ell(x, 122, 42, 40), sp['base'], sp['shade'], f'{k}fb{i}', x - 4, 116, 40, 38))
            o.append(f'<circle cx="{x}" cy="122" r="25" fill="#FFFFFF"/>')
        return ''.join(o)
    for i, (x, s) in enumerate(((200 - 84, -1), (200 + 84, 1))):
        if t in ('round', 'round_dark'):
            col, sh = (sp['limb'], sp['limb_shade']) if t == 'round_dark' else (sp['base'], sp['shade'])
            o.append(shaded(ell(x, y, r, r), col, sh, f'{k}e{i}', x - r * .15, y - r * .15, r * .95, r * .95))
            if sp['ear_in']: o.append(f'<circle cx="{x}" cy="{y+2}" r="{r*.52}" fill="{sp["ear_in"]}"/>')
        elif t == 'fox':
            x = 200 + s * 70
            A = (x + s * r, y + 1.4 * r); B = (x + s * .7 * r, y - 2.2 * r); C = (x - s * 1.3 * r, y + .7 * r)
            d = (f'M{A[0]} {A[1]} Q{x+s*1.4*r} {y-.6*r} {B[0]} {B[1]} Q{x-s*.5*r} {y-.9*r} {C[0]} {C[1]} Z')
            o.append(shaded(d, sp['base'], sp['shade'], f'{k}fx{i}', x - s * 10, y - 10, r * 1.2, r * 2))
            cx_, cy_ = (A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3 + 6
            o.append(f'<path d="{d}" fill="{sp["ear_in"]}" transform="translate({cx_} {cy_}) scale(.55) translate({-cx_} {-cy_})"/>')
        elif t == 'pig':
            x = 200 + s * 74
            d = f'M{x+s*1.0*r} {y+.9*r} Q{x+s*1.5*r} {y-.6*r} {x+s*1.1*r} {y-1.3*r} Q{x} {y-.7*r} {x-s*1.1*r} {y+.5*r} Z'
            o.append(f'<path d="{d}" fill="{sp["base"]}"/>')
            o.append(f'<path d="{d}" fill="{sp["ear_in"]}" transform="translate({x+s*8} {y}) scale(.55) translate({-x-s*8} {-y})"/>')
    return ''.join(o)


def L_body(sp, k, stage):
    d = BLOB if stage == 1 else PEAR
    return shaded(d, sp['base'], sp['shade'], k + 'body', 186, 198 if stage > 1 else 196, 138 if stage > 1 else 136, 132 if stage > 1 else 128)


def L_pattern(sp, k, stage):
    d = BLOB if stage == 1 else PEAR
    o = []
    if sp.get('belly'):
        o.append(f'<ellipse cx="200" cy="{318 if stage>1 else 306}" rx="96" ry="64" fill="{sp["belly"]}"/>')
    if sp.get('spots'):
        for x, y, r in ((120, 160, 7), (152, 128, 6), (262, 132, 7), (292, 166, 6), (100, 204, 5), (306, 206, 6), (236, 112, 5), (88, 248, 6), (316, 250, 5)):
            o.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" opacity=".9"/>')
    if sp.get('patches') and stage >= 3:
        o.append(f'<ellipse cx="72" cy="290" rx="40" ry="70" fill="{sp["limb"]}"/><ellipse cx="328" cy="290" rx="40" ry="70" fill="{sp["limb"]}"/>')
    if not o: return ''
    return f'<clipPath id="p{k}"><path d="{d}"/></clipPath><g clip-path="url(#p{k})">{"".join(o)}</g>'


def L_mark(mark, cx=200, cy=210):
    if mark == 'freckles':
        return ''.join(f'<circle cx="{cx+sx*(74+dx)}" cy="{cy+18+dy}" r="2.6" fill="#C98A6B"/>' for sx in (-1, 1) for dx, dy in ((-8, 0), (0, 7), (8, 1)))
    if mark == 'star':
        return star(cx, cy - 62, 11, '#FFD24D')
    if mark == 'heart':
        x, y = cx + 74, cy + 22
        return f'<path d="M{x} {y+5} c-7 -7 -13 2 -5 8 l5 5 l5 -5 c8 -6 2 -15 -5 -8 z" fill="#FF6F8E"/>'
    return ''


def L_face(sp, emotion, cx=200, cy=210):
    o = []
    up = sp.get('eye_up')
    ex, ey = (62, cy - 88) if up else (40, cy)
    if sp.get('mask'):
        o.append(f'<ellipse cx="{cx}" cy="{cy+12}" rx="104" ry="62" fill="{sp["mask"]}"/>')
        for sx in (-1, 1):
            x = cx + sx * 44
            o.append(f'<ellipse cx="{x}" cy="{cy+6}" rx="30" ry="16" transform="rotate({sx*-16} {x} {cy+6})" fill="{sp["stripes"]}"/>')
    if sp.get('patches'):
        for sx, rot in ((-1, 24), (1, -24)):
            x = cx + sx * 42
            o.append(f'<ellipse cx="{x}" cy="{cy+4}" rx="28" ry="36" transform="rotate({rot} {x} {cy+4})" fill="{sp["limb"]}"/>')
    for sx in (-1, 1):
        o.append(f'<ellipse cx="{cx+sx*74}" cy="{cy+26}" rx="17" ry="10" fill="{BLUSH}" opacity=".85"/>')
    mz_y = cy + 24
    if sp.get('muzzle'):
        rx, ry = (46, 30) if sp.get('muzzle_big') else (34, 23)
        o.append(f'<ellipse cx="{cx}" cy="{mz_y+ (4 if sp.get("muzzle_big") else 0)}" rx="{rx}" ry="{ry}" fill="{sp["muzzle"]}"/>')
    ecol = '#FFFFFF' if sp.get('mask') and False else EYE
    for sx in (-1, 1):
        x, y = cx + sx * ex, ey
        if emotion == 'idle':
            o.append(f'<ellipse cx="{x}" cy="{y}" rx="12" ry="16" fill="{ecol}"/><circle cx="{x-4}" cy="{y-6}" r="5" fill="#fff"/><circle cx="{x+4}" cy="{y+6}" r="2.2" fill="#fff"/>')
        elif emotion == 'happy':
            o.append(f'<path d="M{x-12} {y+4} Q{x} {y-14} {x+12} {y+4}" stroke="{EYE}" stroke-width="6" fill="none" stroke-linecap="round"/>')
        elif emotion == 'hungry':
            o.append(f'<ellipse cx="{x}" cy="{y+3}" rx="12" ry="13" fill="{EYE}"/><circle cx="{x-3}" cy="{y-2}" r="5" fill="#fff"/>')
            o.append(f'<path d="M{x-sx*14} {y-20} L{x+sx*8} {y-14}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
        elif emotion == 'sleepy':
            o.append(f'<path d="M{x-12} {y+2} Q{x} {y+10} {x+12} {y+2}" stroke="{EYE}" stroke-width="5" fill="none" stroke-linecap="round"/>')
        elif emotion == 'excited':
            pts = []
            for i in range(10):
                a = -math.pi / 2 + i * math.pi / 5; rr = 15 if i % 2 == 0 else 6.8
                pts.append(f'{x+rr*math.cos(a):.1f},{y+rr*math.sin(a):.1f}')
            o.append(f'<polygon points="{" ".join(pts)}" fill="#FFC93C" stroke="{EYE}" stroke-width="2.5" stroke-linejoin="round"/>')
    n = sp['nose']
    if n == 'bear':
        o.append(f'<rect x="{cx-10}" y="{mz_y-14}" width="20" height="12" rx="6" fill="{INK}"/>')
    elif n == 'snout':
        o.append(f'<ellipse cx="{cx}" cy="{mz_y-6}" rx="28" ry="19" fill="#FFA9B9"/><ellipse cx="{cx-9}" cy="{mz_y-6}" rx="4.5" ry="7" fill="#D9727F"/><ellipse cx="{cx+9}" cy="{mz_y-6}" rx="4.5" ry="7" fill="#D9727F"/>')
    elif n == 'dots':
        o.append(f'<circle cx="{cx-8}" cy="{mz_y-12}" r="3" fill="{INK}" opacity=".6"/><circle cx="{cx+8}" cy="{mz_y-12}" r="3" fill="{INK}" opacity=".6"/>')
    w = sp.get('mouth_w', 1.0)
    my = mz_y + (14 if n == 'snout' else 2)
    if emotion in ('idle', 'sleepy'):
        if w > 1:
            o.append(f'<path d="M{cx-12*w} {my-2} Q{cx} {my+10} {cx+12*w} {my-2}" stroke="{INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
        else:
            o.append(f'<path d="M{cx-10} {my} Q{cx-5} {my+7} {cx} {my} Q{cx+5} {my+7} {cx+10} {my}" stroke="{INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
    elif emotion in ('happy', 'excited'):
        o.append(f'<path d="M{cx-11*w} {my} Q{cx} {my+20} {cx+11*w} {my} Z" fill="#E2566E"/>')
        o.append(f'<path d="M{cx-6} {my+8} Q{cx} {my+3} {cx+6} {my+8} Q{cx} {my+14} {cx-6} {my+8} Z" fill="#FF97A8"/>')
    elif emotion == 'hungry':
        o.append(f'<ellipse cx="{cx}" cy="{my+5}" rx="6" ry="7" fill="{INK}"/>')
    return ''.join(o)


def L_feet(sp, k, stage):
    o = []
    if stage == 1:
        for i, x in enumerate((150, 250)):
            o.append(shaded(ell(x, 330, 32, 17), sp['limb'], sp['limb_shade'], f'{k}f{i}', x - 4, 324, 30, 15))
        return ''.join(o)
    big = stage >= 3
    for i, x in enumerate((146, 254)):
        rx, ry = (38, 21) if big else (32, 17)
        o.append(shaded(ell(x, 338, rx, ry), sp['limb'], sp['limb_shade'], f'{k}p{i}', x - 4, 333, rx - 2, ry - 2))
        if big and sp['pad']:
            o.append(f'<ellipse cx="{x}" cy="341" rx="12" ry="8" fill="{sp["pad"]}"/>')
            for dx in (-13, 0, 13):
                o.append(f'<circle cx="{x+dx}" cy="{329 + (4 if dx else 0)}" r="4.2" fill="{sp["pad"]}"/>')
    return ''.join(o)


def arm(sp, x, y, rx, ry, rot):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" transform="rotate({rot} {x} {y})" fill="{sp["limb"]}"/>'


def L_arm_l(sp, stage):
    if stage == 1: return arm(sp, 84, 262, 17, 25, 20)
    if stage == 4: return arm(sp, 70, 196, 19, 32, 40)
    return arm(sp, 80, 266, 19 if stage == 3 else 18, 32 if stage == 3 else 28, 20)


def L_arm_r(sp, stage):
    if stage == 1: return arm(sp, 316, 262, 17, 25, -20)
    if stage == 2: return arm(sp, 326, 214, 18, 28, -35)   # waving
    return arm(sp, 330, 268, 20, 32, -38)                  # holding the item (top of arm covers the grip)


def item_svg(item):
    """drawn around a grip point at (0,0); the hand covers the grip"""
    if item == 'bamboo':
        return ('<rect x="-10" y="-140" width="20" height="170" rx="10" fill="#7CCB6B"/>'
                '<rect x="-12" y="-96" width="24" height="6" rx="3" fill="#4AA75A"/><rect x="-12" y="-42" width="24" height="6" rx="3" fill="#4AA75A"/>'
                '<path d="M8 -128 C28 -146 54 -146 64 -136 C48 -118 24 -116 8 -128 Z" fill="#6CC46E"/>'
                '<path d="M-8 -112 C-26 -126 -46 -124 -54 -114 C-40 -100 -20 -100 -8 -112 Z" fill="#4AA75A"/>', -6)
    if item == 'fish':
        return ('<path d="M-16 14 L0 -8 L16 14 Z" fill="#6FA9DE"/>'
                '<ellipse cx="0" cy="-50" rx="24" ry="44" fill="#8EC3F0"/><ellipse cx="7" cy="-44" rx="11" ry="30" fill="#CFE6FA"/>'
                '<path d="M-24 -48 L-38 -38 L-24 -30 Z" fill="#6FA9DE"/><circle cx="-6" cy="-78" r="4.5" fill="#16171F"/>', 12)
    if item == 'cactus':
        return ('<rect x="-14" y="-108" width="28" height="74" rx="14" fill="#6CC46E"/>'
                '<rect x="-36" y="-88" width="14" height="32" rx="7" fill="#6CC46E"/><rect x="-28" y="-66" width="16" height="12" rx="6" fill="#6CC46E"/>'
                '<rect x="22" y="-78" width="14" height="26" rx="7" fill="#4AA75A"/><rect x="12" y="-60" width="16" height="12" rx="6" fill="#4AA75A"/>'
                '<circle cx="0" cy="-110" r="8" fill="#FF9DB4"/>'
                '<path d="M-26 -34 L26 -34 L20 10 L-20 10 Z" fill="#E8865A"/><rect x="-30" y="-44" width="60" height="13" rx="5" fill="#D9734A"/>', 0)
    if item == 'mug':
        return ('<path d="M-6 -70 q-8 -10 0 -20 q8 -10 0 -20" stroke="#C9CED8" stroke-width="4" fill="none" stroke-linecap="round"/>'
                '<path d="M10 -70 q-8 -10 0 -20" stroke="#C9CED8" stroke-width="4" fill="none" stroke-linecap="round"/>'
                '<circle cx="26" cy="-30" r="13" stroke="#FFC94D" stroke-width="8" fill="none"/>'
                '<rect x="-26" y="-60" width="52" height="64" rx="12" fill="#FFD66B"/><ellipse cx="0" cy="-56" rx="21" ry="5" fill="#9A6542"/>'
                '<circle cx="-8" cy="-26" r="5" fill="#FFFFFF" opacity=".7"/>', 0)
    if item == 'wand':
        return ('<path d="M0 14 L0 -84" stroke="#FF9DB4" stroke-width="9" stroke-linecap="round"/>'
                '<circle cx="0" cy="-104" r="21" stroke="#FF9DB4" stroke-width="7" fill="#E4F4FF" fill-opacity=".8"/>'
                '<circle cx="34" cy="-140" r="14" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/><circle cx="12" cy="-170" r="9" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/>'
                '<circle cx="46" cy="-178" r="6" fill="#EAF7FF" stroke="#9FD4FF" stroke-width="3"/><circle cx="29" cy="-145" r="3" fill="#fff"/>', -10)
    if item == 'apple':
        return ('<path d="M0 -58 C-34 -76 -48 -40 -40 -18 C-32 6 -12 8 0 2 C12 8 32 6 40 -18 C48 -40 34 -76 0 -58 Z" fill="#FF6B6B"/>'
                '<ellipse cx="-18" cy="-36" rx="7" ry="11" fill="#FF9B9B"/>'
                '<path d="M0 -58 L4 -74" stroke="#8A5A3C" stroke-width="5" stroke-linecap="round"/>'
                '<path d="M4 -70 C14 -84 30 -84 36 -76 C26 -64 12 -64 4 -70 Z" fill="#6CC46E"/>', 0)
    if item == 'lotus':
        return ('<path d="M0 14 L0 -112" stroke="#4AA75A" stroke-width="7" stroke-linecap="round"/>'
                '<path d="M-52 -104 Q0 -164 52 -104 Q28 -114 6 -104 L0 -114 L-6 -104 Q-28 -114 -52 -104 Z" fill="#5BBF68"/>'
                '<path d="M0 -112 L-24 -140 M0 -112 L0 -150 M0 -112 L24 -140" stroke="#3E9A4F" stroke-width="3" stroke-linecap="round"/>'
                '<circle cx="-30" cy="-108" r="5" fill="#FFB3C7"/>', -8)
    return ('', 0)


def L_item(sp, stage):
    if stage < 3: return ''
    body, rot = item_svg(sp['item'])
    gx, gy = ANCHORS['hand_r']
    return f'<g transform="translate({gx} {gy}) rotate({rot}) scale(1.15)">{body}</g>'


def L_fx_back(stage, shiny):
    o = []
    if stage == 4:
        o.append('<circle cx="200" cy="214" r="176" fill="#FFF4CC"/><circle cx="200" cy="214" r="150" fill="#FFEBA8" opacity=".6"/>')
        for a in range(12):
            ang = a * math.pi / 6
            o.append(f'<line x1="{200+158*math.cos(ang):.1f}" y1="{214+158*math.sin(ang):.1f}" x2="{200+172*math.cos(ang):.1f}" y2="{214+172*math.sin(ang):.1f}" stroke="#FFD24D" stroke-width="5" stroke-linecap="round"/>')
    o.append(f'<ellipse cx="200" cy="{350 if stage>1 else 344}" rx="{124 if stage>1 else 118}" ry="12" fill="#1C2A44" opacity=".08"/>')
    return ''.join(o)


def L_fx_front(emotion, stage, shiny, x=200, y=210):
    o = []
    if emotion == 'sleepy':
        o.append(f'<text x="{x+90}" y="{y-40}" font-family="Arial" font-weight="700" font-size="30" fill="#8FA3C8">z</text><text x="{x+112}" y="{y-66}" font-family="Arial" font-weight="700" font-size="22" fill="#8FA3C8">z</text>')
    if emotion == 'hungry':
        o.append(f'<path d="M{x+104} {y-50} q10 16 0 22 q-10 -6 0 -22 Z" fill="#8CC8FF"/>')
    if emotion == 'excited':
        for dx, dy, r in ((-118, -40, 9), (116, -58, 11), (128, 10, 7)):
            o.append(star(x + dx, y + dy, r))
    if emotion == 'happy':
        for dx, dy in ((-120, -30), (118, -44)):
            o.append(f'<path d="M{x+dx} {y+dy+6} c-8 -8 -14 2 -6 8 l6 6 l6 -6 c8 -6 2 -16 -6 -8 z" fill="#FF8FA6"/>')
    if stage == 4:
        for (sx, sy, r) in ((60, 110, 12), (348, 96, 10), (40, 300, 8), (362, 300, 9)):
            o.append(star(sx, sy, r))
    if shiny:
        for (sx, sy, r) in ((96, 150, 8), (300, 120, 6), (330, 210, 7), (84, 240, 5)):
            o.append(star(sx, sy, r, '#FFFFFF'))
            o.append(star(sx, sy, r * .55, '#FFE27A'))
    return ''.join(o)


LAYER_ORDER = ['fx_back', 'ears', 'sprout', 'body', 'pattern', 'mark', 'feet', 'face', 'item', 'arms', 'fx_front']


def layers(species, stage, emotion='idle', color='base', mark='none', k=None):
    """returns ordered [(layer_name, svg_fragment)] already in stage coordinates (before stage scale)"""
    k = k or f'{species}{stage}{emotion}{color}{mark}'
    sp = palette(species, color)
    shiny = color == 'shiny'
    if stage == 4 and emotion == 'idle':
        emotion = 'happy'
    if stage == 0:
        egg = 'M200 110 C258 110 296 190 296 252 C296 308 254 338 200 338 C146 338 104 308 104 252 C104 190 142 110 200 110 Z'
        spot = sp['egg_spot']
        body = (shaded(egg, sp['base'], sp['shade'], k + 'egg', 186, 220, 104, 120) +
                f'<clipPath id="ce{k}"><path d="{egg}"/></clipPath><g clip-path="url(#ce{k})">'
                f'<circle cx="150" cy="196" r="26" fill="{spot}"/><circle cx="252" cy="262" r="30" fill="{spot}"/>'
                f'<circle cx="176" cy="300" r="14" fill="{spot}"/><circle cx="232" cy="176" r="9" fill="{spot}"/></g>')
        return [('fx_back', '<ellipse cx="200" cy="344" rx="90" ry="10" fill="#1C2A44" opacity=".08"/>'),
                ('sprout', L_sprout(200, 112, 0, shiny)), ('body', body), ('fx_front', L_fx_front('idle', 0, shiny, 200, 240))]
    fy = 212 if stage == 1 else 210
    ey, er = (110, 34) if stage == 1 else (108, 36 if stage == 2 else 38)
    out = [
        ('fx_back', L_fx_back(stage, shiny)),
        ('ears', L_ears(sp, k, ey, er)),
        ('sprout', L_sprout(200, 86 if stage == 1 else 92, stage, shiny)),
        ('body', L_body(sp, k, stage)),
        ('pattern', L_pattern(sp, k, stage)),
        ('mark', L_mark(mark, 200, fy)),
        ('feet', L_feet(sp, k, stage)),
        ('face', L_face(sp, emotion, 200, fy)),
        ('item', L_item(sp, stage)),
        ('arms', L_arm_l(sp, stage) + L_arm_r(sp, stage)),
        ('fx_front', L_fx_front(emotion, stage, shiny, 200, fy)),
    ]
    # mark sits on top of the face so it stays visible
    out = [l for l in out if l[0] != 'mark']
    out.insert(out.index(next(l for l in out if l[0] == 'face')) + 1, ('mark', L_mark(mark, 200, fy)))
    return out


def compose(ls, stage, only=None):
    inner = ''.join(f'<g id="layer-{n}">{s}</g>' for n, s in ls if (only is None or n in only))
    sc = STAGE_SCALE.get(stage)
    if sc:
        inner = f'<g transform="translate(200 352) scale({sc}) translate(-200 -352)">{inner}</g>'
    return inner


def svg(inner, bg=None):
    b = f'<rect width="400" height="400" rx="36" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">{b}{inner}</svg>'


def write(name, s):
    open(os.path.join(OUT, name), 'w').write(s)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for spc in SPECIES:
        for st in range(5):
            write(f'{spc}-stage{st}.svg', svg(compose(layers(spc, st), st)))
        for emo in ('idle', 'happy', 'hungry', 'sleepy', 'excited'):
            # emotions shown at baby size without stage scale so faces read clearly
            write(f'{spc}-{emo}.svg', svg(compose(layers(spc, 1, emo), None)))
        write(f'{spc}-hero.svg', svg(compose(layers(spc, 1), None), bg=SPECIES[spc]['bg']))
        for c in ('base', 'alt', 'shiny'):
            write(f'{spc}-color-{c}.svg', svg(compose(layers(spc, 3, color=c), 3)))
    for m in ('none', 'freckles', 'star', 'heart'):
        write(f'fennec-mark-{m}.svg', svg(compose(layers('fennec', 1, mark=m), None)))
    # exploded layer view
    ls = layers('fennec', 3)
    acc = []
    for i, (n, s) in enumerate(ls):
        write(f'layer-{i:02d}-{n}.svg', svg(compose([(n, s)], 3)))
    json.dump(dict(anchors=ANCHORS, stage_scale=STAGE_SCALE, layer_order=LAYER_ORDER), open(os.path.join(OUT, 'anchors.json'), 'w'), ensure_ascii=False, indent=1)
    print('ok', len(os.listdir(OUT)))
