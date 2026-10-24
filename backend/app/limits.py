import time
from collections import deque


class Limiter:
    def __init__(self, per_window=30, window_s=600, per_day=100, global_per_day=400, clock=time.time):
        self.per_window, self.window_s, self.per_day, self.global_per_day, self.clock = per_window, window_s, per_day, global_per_day, clock
        self.hits = {}
        self.global_hits = deque()

    def allow(self, key: str) -> bool:
        now, day = self.clock(), 86400
        g = self.global_hits
        while g and now - g[0] > day:
            g.popleft()
        h = self.hits.setdefault(key, deque())
        while h and now - h[0] > day:
            h.popleft()
        recent = sum(1 for x in h if now - x <= self.window_s)
        if len(g) >= self.global_per_day or len(h) >= self.per_day or recent >= self.per_window:
            return False
        g.append(now); h.append(now)
        return True
