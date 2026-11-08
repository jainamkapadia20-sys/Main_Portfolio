# The drive's layout and timing, shared by the Blender build (build.py), the renderer (render.py) and, as numbers in
# manifest.json, the website. It mirrors the live carousel this replaces (CodeFiles/src/fx/roadtrip.ts): one
# billboard per project, alternating sides, the car easing off at each one and turning to look at it.
import math

N_BOARDS = 7
FIRST, GAP = 30.0, 34.0            # metres to the first billboard, and between billboards
LEAD = 0.625                       # how much road (in billboards) before the first stop and after the last
BOARD_X = 10.0                     # billboards stand on the back half of the pavement
BOARD_W, BOARD_H, BOARD_UP = 8.64, 5.4, 4.5  # face size (the posters' 16:10), and its lower edge above the pavement
LANE = 3.5
CAM_X, CAM_Z = 1.75, 1.22          # we drive in the inner lane; a sports car's eye height
SEG_SECONDS = 4.0                  # scene time per billboard: traffic moves on this clock
TRAFFIC_PERIOD = 8.0               # every lane repeats exactly after this, so any stretch of it loops cleanly

MODES = {
    # frames per billboard, image size, vertical field of view, how far short of a board the car stops,
    # and how far the driver turns and looks up at it
    'desktop': dict(per=48, w=1920, h=1080, fov=55.0, back=16.0, glance=0.95, look=0.9),
    'portrait': dict(per=40, w=900, h=1600, fov=68.0, back=19.0, glance=0.95, look=0.9),
}

def side(i): return 1 if i % 2 else -1          # board 0 on the left, then alternating
def board_y(i): return FIRST + i * GAP
def board_x(i): return side(i) * BOARD_X
def stop_y(i, mode): return board_y(i) - MODES[mode]['back']
def board_centre(i): return (board_x(i), board_y(i), BOARD_UP + BOARD_H / 2)

FACE_BACK = 12.0                   # each board faces a spot this far short of it, in our lane (fixed in the built city)

def board_yaw(i):
    """Each board turns a little toward the road: to face the spot FACE_BACK short of it in our lane. The face's front
    is its local -Y; turning by this angle about Z points it at that spot."""
    sx, sy = CAM_X, board_y(i) - FACE_BACK
    bx, by = board_x(i), board_y(i)
    return math.atan2(sx - bx, -(sy - by))

def t_range(): return -LEAD, N_BOARDS - 1 + LEAD

def frames(mode):
    """Frame count, and the t (in billboards, 0 = first stop) of each frame. Stop i lands exactly on a frame."""
    per = MODES[mode]['per']
    a, b = t_range()
    n = round((b - a) * per) + 1
    return n, [a + k / per for k in range(n)]

def stop_frame(i, mode): return round((i + LEAD) * MODES[mode]['per'])

def cam_y(t, mode):
    n = N_BOARDS
    if t < 0: return stop_y(0, mode) + t * GAP
    if t >= n - 1: return stop_y(n - 1, mode) + (t - (n - 1)) * GAP
    i = int(math.floor(t)); f = t - i
    slow = f - math.sin(f * 2 * math.pi) / (2 * math.pi) * 0.82   # slows near each whole t, quickest between
    return stop_y(i, mode) + (stop_y(i + 1, mode) - stop_y(i, mode)) * slow

def scene_time(t): return (t - t_range()[0]) * SEG_SECONDS

def clamp(v, a=0.0, b=1.0): return max(a, min(b, v))
def smooth(v): v = clamp(v); return v * v * (3 - 2 * v)

def camera(t, mode):
    """Where the camera is and where it looks at progress t."""
    m = MODES[mode]
    y = cam_y(t, mode)
    ts = scene_time(t)
    near = int(clamp(round(t), 0, N_BOARDS - 1))
    # how far the driver turns to the nearest board: fully (and steadily) around its stop, easing to straight ahead
    # before halfway to the next, so the gaze never jumps when the nearest board changes
    reach = smooth((0.5 - abs(t - near)) / 0.45)
    bx, by, bz = board_centre(near)
    dx, dy = bx - CAM_X, by - stop_y(near, mode)               # aimed as from the stop: one even turn there and back
    face = math.atan2(dx, dy)                                  # yaw that would face the board square on
    lift = math.atan2(bz - CAM_Z, math.hypot(dx, dy))
    yaw = face * reach * m['glance']
    pitch = lift * reach * m['look'] - 0.02
    # speed, for a slight widening of the view between boards (in m per scene second)
    dt = 1e-3
    speed = abs(cam_y(t + dt, mode) - cam_y(t - dt, mode)) / (2 * dt) / SEG_SECONDS
    fov = m['fov'] + clamp(speed / 16) * 3.0
    sway = math.sin(ts * 0.6) * 0.07
    bob = math.sin(ts * 1.7) * 0.008
    roll = math.sin(ts * 0.6) * 0.003
    return dict(x=CAM_X + sway, y=y, z=CAM_Z + bob, yaw=yaw, pitch=pitch, roll=roll, fov=fov, near=near, reach=reach, speed=speed, ts=ts)

def lit(i, t):
    """How lit board i is at t: it comes on as the car reaches it and goes off behind it; with a short flicker on."""
    return clamp(1 - abs(t - i) * 1.6)

# Traffic: each lane runs at one speed, with a fixed run of cars that repeats every v * TRAFFIC_PERIOD metres, so the
# whole street repeats exactly every TRAFFIC_PERIOD seconds. (dir +1 drives with us, -1 comes toward us.)
LANES = [
    # offsets chosen (by search) so no car sits right beside the camera at the first frame, and few do at the stops
    dict(x=+5.25, dir=+1, v=16.0, slots=[('gt3rs', 23.1), ('aventador', 59.0), ('city', 96.3), ('m4', 2.9)]),
    dict(x=-1.75, dir=-1, v=14.0, slots=[('agera', 60.3), ('city', 90.0), ('gt3rs', 14.0), ('rwb', 39.5)]),
    dict(x=-5.25, dir=-1, v=12.0, slots=[('aventador', 20.7), ('gt3rs', 61.0)]),
]
TRAFFIC_BEHIND, TRAFFIC_AHEAD = 40.0, 720.0

def traffic(lane, offset, ts, cy):
    """Where the cars of one slot of a lane are at scene time ts, within sight of a camera at y = cy."""
    P = lane['v'] * TRAFFIC_PERIOD
    base = offset + lane['dir'] * lane['v'] * ts
    lo, hi = cy - TRAFFIC_BEHIND, cy + TRAFFIC_AHEAD
    k = math.ceil((lo - base) / P)
    ys = []
    while base + k * P <= hi:
        ys.append(base + k * P); k += 1
    return ys
