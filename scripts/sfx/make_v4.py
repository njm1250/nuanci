"""v4 후보: 정답·정답(신남)·연속 기록·놓기만 다시 만든다.
팡파르가 좋게 들린 이유(한 악기의 또렷한 멜로디 + 피치카토 베이스 받침, 위쪽을 깎지 않음)를 그대로 옮기고,
흐림의 원인으로 본 '한 옥타브 위 종소리 겹침'은 뺀다."""
import os
import make
from make import render, MARIMBA, KALIMBA, VIBES, PIZZ, CELESTA, MUSICBOX, XYLO

make.OUT = os.path.join(make.HERE, "out4")
os.makedirs(make.OUT, exist_ok=True)

# 팡파르와 같은 판: 위쪽을 깎지 않고, 뭉침만 살짝 정리
CLEAN = dict(hp=110, air=0.0, presence=0.0, mud=-1.5, lp=None, wet=0.1, decay=0.3)


def save(name, x, **m):
    make.save(name, x, **{**CLEAN, **m})


# 정답 A: 마림바만으로 솔→도·미, 피치카토가 도를 받친다(팡파르를 짧게 줄인 꼴)
save("good-a", render([(MARIMBA, False, [(0, 79, 104, 0.3), (0.09, 84, 112, 0.6), (0.09, 88, 100, 0.6)]), (PIZZ, False, [(0.09, 60, 96, 0.4)])], 1.0))
# 정답 B: 비브라폰(맑고 매끈한 쇠 울림)만, 같은 음. 마림바보다 소리가 길고 둥글다
save("good-b", render([(VIBES, False, [(0, 79, 100, 0.25), (0.09, 84, 108, 0.6), (0.09, 88, 98, 0.6)]), (PIZZ, False, [(0.09, 60, 92, 0.4)])], 1.1))
# 신남 A: 정답 A 위에 마림바로 한 음 더 튀어 오름(도→솔)
save("good-sparkle-a", render([(MARIMBA, False, [(0, 79, 104, 0.25), (0.08, 84, 110, 0.3), (0.16, 88, 108, 0.3), (0.24, 91, 114, 0.6)]), (PIZZ, False, [(0.08, 60, 96, 0.3), (0.24, 67, 96, 0.4)])], 1.1))
# 신남 B: 비브라폰 네 음 + 끝에 오르골 한 알(종 겹침 대신 끝에만 반짝임)
save("good-sparkle-b", render([(VIBES, False, [(0, 79, 100, 0.2), (0.08, 84, 104, 0.25), (0.16, 88, 104, 0.25), (0.24, 91, 110, 0.6)]), (PIZZ, False, [(0.08, 60, 92, 0.3)]), (MUSICBOX, False, [(0.3, 96, 44, 0.3)])], 1.2))
# 연속 기록 A: 마림바 두 음 위로 + 베이스
save("streak-a", render([(MARIMBA, False, [(0, 83, 104, 0.25), (0.1, 90, 112, 0.6)]), (PIZZ, False, [(0.1, 62, 92, 0.4)])], 1.0))
# 연속 기록 B: 칼림바 두 음(조금 더 손으로 튕긴 느낌)
save("streak-b", render([(KALIMBA, False, [(0, 83, 104, 0.3), (0.1, 90, 110, 0.7)]), (PIZZ, False, [(0.1, 62, 88, 0.4)])], 1.1))
# 놓기: 끊기지 않게 음을 길게 두고 꼬리를 넉넉히 남긴다
save("place", render([(MARIMBA, False, [(0, 67, 108, 0.45)]), (MARIMBA, False, [(0, 74, 70, 0.45)])], 0.9), hp=140, tail=0.18)
