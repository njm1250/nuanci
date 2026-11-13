import os, io, subprocess, sys
import numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SET={"shocked":"final-react/shocked-a-foley","puzzled":"final-foley/puzzled-45","dizzy":"final-foley/dizzy-45","awkward":"final-foley/awkward-1","neutral":"final-foley/neutral-1",
"happy":"final-r2/happy-b-chip","delighted":"final-r2/delighted-1","love":"final-r2/love-b-twinkle","angry":"final-r2/angry-a-brass","crying":"final-r2/crying-b-chip",
"sleepy":"final-r2/sleepy-a-musicbox","stuffed":"final-r2/stuffed-a-bongo","stamp":"final-foley/stamp-2"}
def load(p):
    raw=subprocess.run(["ffmpeg","-loglevel","error","-i",p,"-f","wav","-ac","1","-"],capture_output=True).stdout
    return sf.read(io.BytesIO(raw))[0]
def report(suffix=".mp3", base=None):
    print(f"{'표정':9s} {'길이':>5s} {'중심Hz':>7s} {'5k~dB':>6s} {'잡음비':>6s} {'꼬리ms':>6s}")
    for k,p in SET.items():
        x=load((base(k) if base else p)+suffix); sr=44100
        X=np.abs(np.fft.rfft(x*np.hanning(len(x))))**2; f=np.fft.rfftfreq(len(x),1/sr)
        cen=(np.sqrt(X)*f).sum()/np.sqrt(X).sum(); hi=10*np.log10(X[f>5000].sum()/X[f>100].sum())
        Xs=X[(f>200)&(f<8000)]+1e-12; flat=np.exp(np.mean(np.log(Xs)))/np.mean(Xs)
        env=np.abs(x); pk=np.argmax(env); after=np.where(env[pk:]>env[pk]*0.01)[0]; tail=(after[-1] if len(after) else 0)/sr*1000
        print(f"{k:9s} {len(x)/sr:5.2f} {cen:7.0f} {hi:6.1f} {flat:6.3f} {tail:6.0f}")
if __name__=="__main__": report()
