"""v5 정답 후보: 귀엽고 따뜻하면서 계속 듣고 싶은 정답음.
고른 정답 A(마림바 + 피치카토 베이스, 위쪽 깎지 않음)의 결을 바탕으로, 해소감 있는 도약 음정과 짧은 꾸밈음을 더한다."""
import os
import make
from make import render, MARIMBA, KALIMBA, VIBES, PIZZ, MUSICBOX

make.OUT = os.path.join(make.HERE, "out5")
os.makedirs(make.OUT, exist_ok=True)
CLEAN = dict(hp=110, air=0.0, presence=0.0, mud=-1.5, lp=None, wet=0.1, decay=0.3)


def save(name, x, **m):
    make.save(name, x, **{**CLEAN, **m})


def bass(t, k, v=96):
    return (PIZZ, False, [(t, k, v, 0.4)])


# C. 톡-통! : 아주 짧은 꾸밈음 뒤 4도 위로 뛰는 두 음. 가장 단순하고 반복해도 덜 질린다
save("good-c", render([(MARIMBA, False, [(0, 84, 92, 0.05), (0.045, 79, 100, 0.12), (0.11, 84, 116, 0.6), (0.11, 88, 100, 0.6)]), bass(0.11, 60)], 1.0))
# D. 옥타브 도약: 솔 → 한 옥타브 위 솔. 마지막 음이 크게 뛰어 시원하다
save("good-d", render([(MARIMBA, False, [(0, 79, 106, 0.12), (0.075, 84, 104, 0.12), (0.15, 91, 118, 0.6), (0.15, 86, 90, 0.6)]), bass(0.15, 55)], 1.05))
# E. 마림바 + 칼림바 같은 음(옥타브 겹침 아님): 나무의 따뜻함에 손으로 튕긴 귀여움을 더함
save("good-e", render([(MARIMBA, False, [(0, 79, 102, 0.3), (0.09, 84, 110, 0.6), (0.09, 88, 98, 0.6)]), (KALIMBA, False, [(0, 79, 78, 0.3), (0.09, 84, 86, 0.6)]), bass(0.09, 60)], 1.0))
# F. 퐁(위로 살짝 휘는 첫 음) + 화음: 물방울이 튀는 듯한 귀여운 시작
save("good-f", render([(MARIMBA, False, [(0, 77, 104, 0.12, (1.0, 0.0, 0.06)), (0.1, 84, 114, 0.6), (0.1, 88, 100, 0.6), (0.1, 91, 86, 0.6)]), bass(0.1, 60)], 1.05))

# 콤보 시연: 정답 A를 연속으로 맞힐 때마다 한 칸씩 올림(장음계 도·레·미·솔·도). 화면에서는 재생 속도(rate)로 올린다
for i, shift in enumerate([0, 2, 4, 7, 12]):
    save(f"combo-{i + 1}", render([(MARIMBA, False, [(0, 79 + shift, 104, 0.3), (0.09, 84 + shift, 112, 0.6), (0.09, 88 + shift, 100, 0.6)]), bass(0.09, 60 + shift)], 1.0))
