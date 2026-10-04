"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useMusicPlayerOptional } from "@/lib/music-context";
import { resolveUserIdentity } from "@/lib/settings-storage";
import { loadChatSessions } from "@/lib/chat-storage";
import { loadCharacters } from "@/lib/character-storage";
import { Palette, Download, Upload, RotateCcw, X, Check } from "lucide-react";

const STORAGE_KEY_CARD_CSS = "custom_together_listen_card_css";

export const DEFAULT_TOGETHER_CARD_CSS = `/* 灵动岛一起听小卡片自定义样式 */
.tl-card {
  /* 卡片背景与毛玻璃 */
  background: rgba(22, 19, 28, 0.88);
  backdrop-filter: blur(28px) saturate(170%);
  border-radius: 30px;
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.46), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* 双人主题色定义 */
.tl-card {
  --pink: #ff7eb3;
  --mint: #5eead4;
}

/* 头像外圈光晕 */
.tl-pic.pink {
  background: linear-gradient(140deg, var(--pink), rgba(255, 126, 179, 0.25));
}
.tl-pic.mint {
  background: linear-gradient(220deg, var(--mint), rgba(94, 234, 212, 0.25));
}

/* 歌曲卡槽背景 */
.tl-song {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}

/* 进度条填充渐变 */
.tl-track i {
  background: linear-gradient(90deg, var(--pink), var(--mint));
}

/* 进入一起听按钮 */
.tl-cta {
  background: linear-gradient(90deg, rgba(255, 126, 179, 0.35), rgba(94, 234, 212, 0.35));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  border-radius: 16px;
}
`;

const BASE_CARD_CSS = `
.tl-root{position:absolute;inset:0;z-index:9999;pointer-events:none}
.tl-scrim{position:absolute;inset:0;pointer-events:auto;background:rgba(0,0,0,.28);transition:opacity .2s}
.tl-card{--pink:#ff7eb3;--mint:#5eead4;position:absolute;top:calc(var(--island-bottom,54px) + 8px);left:0;right:0;margin:0 auto;width:min(92%,340px);padding:18px 18px 16px;border-radius:30px;color:#fff;pointer-events:auto;transform-origin:50% 0;background:rgba(22,19,28,.88);-webkit-backdrop-filter:blur(28px) saturate(170%);backdrop-filter:blur(28px) saturate(170%);box-shadow:0 22px 56px rgba(0,0,0,.46),inset 0 0 0 1px rgba(255,255,255,.1);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif}
.tl-in{animation:tl-in .42s cubic-bezier(.2,.9,.25,1.1) both}
.tl-out{animation:tl-out .18s ease-in both}
@keyframes tl-in{from{opacity:0;transform:scale(.38,.18) translateY(-12px)}to{opacity:1;transform:none}}
@keyframes tl-out{to{opacity:0;transform:scale(.5,.28) translateY(-8px)}}

.tl-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:-6px;position:relative;z-index:2}
.tl-tool-btn{background:rgba(255,255,255,.08);border:0;outline:0;border-radius:999px;padding:4px 8px;font-size:11px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:4px;cursor:pointer;transition:all .15s}
.tl-tool-btn:hover{background:rgba(255,255,255,.16);color:#fff}

.tl-pair{display:flex;align-items:flex-start;justify-content:space-between;gap:4px}
.tl-person{display:flex;flex-direction:column;align-items:center;gap:8px;width:72px}
.tl-person em{font-style:normal;font-size:12px;color:rgba(255,255,255,.7);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tl-pic{width:56px;height:56px;border-radius:50%;padding:2px}
.tl-pic.pink{background:linear-gradient(140deg,var(--pink),rgba(255,126,179,.25))}
.tl-pic.mint{background:linear-gradient(220deg,var(--mint),rgba(94,234,212,.25))}
.tl-pic img,.tl-pic b{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid rgb(22,19,28);box-sizing:border-box}
.tl-pic b{font-size:22px;font-weight:600;background:#2b2635}
.tl-link{flex:1;margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:7px}
.tl-wave{display:flex;align-items:center;gap:3px;height:30px}
.tl-wave span{width:3px;height:26%;border-radius:3px}
.tl-wave .p{background:var(--pink)}
.tl-wave .m{background:var(--mint)}
.is-playing .tl-wave span{animation:tl-eq 1s ease-in-out infinite}
@keyframes tl-eq{0%,100%{height:22%}50%{height:100%}}
.tl-link small{font-size:11px;color:rgba(255,255,255,.6)}

.tl-song{display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px 12px;border-radius:20px;background:rgba(255,255,255,.07)}
.tl-cover{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:18px;color:rgba(255,255,255,.85);background:linear-gradient(135deg,rgba(255,126,179,.55),rgba(94,234,212,.55)) center/cover}
.tl-meta{flex:1;min-width:0}
.tl-title{overflow:hidden;white-space:nowrap;font-size:15px;font-weight:600}
.tl-title span{display:inline-block}
.tl-marquee{animation:tl-slide 8s ease-in-out infinite alternate}
@keyframes tl-slide{0%,15%{transform:translateX(0)}85%,100%{transform:translateX(var(--tl-shift))}}
.tl-artist{margin-top:3px;font-size:12px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl-btn{flex:none;width:36px;height:36px;border-radius:50%;border:0;display:grid;place-items:center;color:#1a1620;background:#fff;cursor:pointer;transition:transform .15s}
.tl-btn:active{transform:scale(.9)}

.tl-progress{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:10.5px;color:rgba(255,255,255,.55);font-variant-numeric:tabular-nums}
.tl-track{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}
.tl-track i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--pink),var(--mint));transition:width .4s linear}

.tl-cta{width:100%;margin-top:14px;padding:12px 0;border:0;border-radius:16px;color:#fff;font-size:13.5px;font-weight:600;letter-spacing:.03em;cursor:pointer;background:linear-gradient(90deg,rgba(255,126,179,.3),rgba(94,234,212,.3));box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);transition:transform .15s}
.tl-cta:active{transform:scale(.98)}

/* 美化面板 */
.tl-editor-box{margin-top:10px;background:rgba(0,0,0,.35);padding:12px;border-radius:18px;border:1px solid rgba(255,255,255,.1)}
.tl-editor-textarea{width:100%;height:140px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#7ee787;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;padding:8px;outline:none;resize:vertical}
.tl-editor-actions{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:10px;flex-wrap:wrap}
.tl-editor-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;border:0;font-size:11.5px;font-weight:500;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;transition:all .15s}
.tl-editor-btn:hover{background:rgba(255,255,255,.18)}
.tl-editor-btn.primary{background:linear-gradient(135deg,#ff7eb3,#5eead4);color:#121118;font-weight:600}
@media (prefers-reduced-motion:reduce){.tl-card,.tl-card *{animation:none!important}}
`;

const BARS = Array.from({ length: 9 }, (_, i) => i);

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

function Person({ person, tone }: { person: { name: string; avatar?: string | null }; tone: "pink" | "mint" }) {
  const name = person?.name || "";
  return (
    <div className="tl-person">
      <div className={`tl-pic ${tone}`}>
        {person?.avatar ? (
          <img src={person.avatar} alt={name} draggable={false} />
        ) : (
          <b>{name.slice(0, 1) || "♪"}</b>
        )}
      </div>
      <em>{name}</em>
    </div>
  );
}

interface TogetherListenCardProps {
  open: boolean;
  onClose: () => void;
  onOpenTogether: () => void;
}

export default function TogetherListenCard({
  open,
  onClose,
  onOpenTogether,
}: TogetherListenCardProps) {
  const player = useMusicPlayerOptional();
  const [closing, setClosing] = useState(false);
  const [shift, setShift] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [customCss, setCustomCss] = useState(DEFAULT_TOGETHER_CARD_CSS);
  const [draftCss, setDraftCss] = useState(DEFAULT_TOGETHER_CARD_CSS);
  const [copied, setCopied] = useState(false);

  const titleRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 读取保存的美化 CSS
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CARD_CSS);
      if (saved !== null) {
        setCustomCss(saved);
        setDraftCss(saved);
      } else {
        setCustomCss(DEFAULT_TOGETHER_CARD_CSS);
        setDraftCss(DEFAULT_TOGETHER_CARD_CSS);
      }
    } catch (e) {
      console.error("读取灵动岛美化 CSS 失败", e);
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // 获取当前一起听的人物
  const togetherChar = useMemo(() => {
    try {
      const sessions = loadChatSessions();
      const track = player?.currentTrack;
      const activeSess = sessions.find(s => s.listenTogetherTrack && (!track || s.listenTogetherTrack.id === track.id || s.listenTogetherTrack.name === track.title));
      if (activeSess) {
        const allChars = loadCharacters();
        const found = allChars.find(c => c.id === activeSess.contactId);
        if (found) {
          return { id: found.id, name: found.name, avatar: found.avatar || null };
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [player?.currentTrack]);

  // 获取当前用户身份
  const me = useMemo(() => {
    try {
      const identity = resolveUserIdentity();
      return {
        name: identity.name || "我",
        avatar: identity.avatar || null,
      };
    } catch {
      return { name: "我", avatar: null };
    }
  }, []);

  const partner = useMemo(() => {
    if (togetherChar) {
      return { name: togetherChar.name, avatar: togetherChar.avatar };
    }
    return { name: "TA", avatar: null };
  }, [togetherChar]);

  const currentTrack = player?.currentTrack;
  const isPlaying = !!player?.isPlaying;
  const currentTime = player?.currentTime || 0;
  const duration = player?.duration || 0;

  // 歌名滚动计算
  useEffect(() => {
    const el = titleRef.current;
    if (!open || !el || !el.parentElement) return;
    const diff = el.scrollWidth - el.parentElement.clientWidth;
    setShift(diff > 4 ? diff + 8 : 0);
  }, [open, currentTrack?.title]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    timerRef.current = setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  };

  const handleSaveCss = () => {
    setCustomCss(draftCss);
    try {
      localStorage.setItem(STORAGE_KEY_CARD_CSS, draftCss);
    } catch (e) {
      console.error("保存美化 CSS 失败", e);
    }
    setShowEditor(false);
  };

  const handleExportCss = () => {
    const blob = new Blob([draftCss], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `together-listen-island-${new Date().toISOString().slice(0, 10)}.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setDraftCss(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetCss = () => {
    if (window.confirm("确定恢复灵动岛默认美化样式吗？")) {
      setDraftCss(DEFAULT_TOGETHER_CARD_CSS);
      setCustomCss(DEFAULT_TOGETHER_CARD_CSS);
      try {
        localStorage.removeItem(STORAGE_KEY_CARD_CSS);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!open) return null;

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const titleStyle = shift
    ? ({ "--tl-shift": `-${shift}px`, animationDuration: `${Math.max(6, shift / 10)}s` } as React.CSSProperties)
    : undefined;

  return (
    <div className="tl-root" role="dialog" aria-label="正在一起听灵动卡片">
      <style>{BASE_CARD_CSS}</style>
      <style id="custom-together-listen-card-style">{customCss}</style>

      <div className="tl-scrim" onClick={handleClose} />

      <div className={`tl-card ${closing ? "tl-out" : "tl-in"} ${isPlaying ? "is-playing" : ""}`}>
        {/* 顶部美化快捷按钮 */}
        <div className="tl-top-actions">
          <button
            type="button"
            className="tl-tool-btn"
            onClick={() => setShowEditor(!showEditor)}
            title="自定义美化卡片 CSS"
          >
            <Palette size={12} />
            <span>{showEditor ? "收起美化" : "美化"}</span>
          </button>
        </div>

        {showEditor ? (
          <div className="tl-editor-box">
            <div className="flex items-center justify-between pb-1 text-xs text-white/80 font-medium">
              <span>灵动岛小卡片 CSS 美化</span>
              <button type="button" className="text-white/50 hover:text-white" onClick={() => setShowEditor(false)}>
                <X size={14} />
              </button>
            </div>
            <textarea
              className="tl-editor-textarea"
              value={draftCss}
              onChange={(e) => setDraftCss(e.target.value)}
              placeholder="输入 CSS 代码微调小卡片..."
              spellCheck={false}
            />
            <div className="tl-editor-actions">
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".css,text/css,text/plain"
                  style={{ display: "none" }}
                  onChange={handleImportFile}
                />
                <button type="button" className="tl-editor-btn" onClick={() => fileInputRef.current?.click()} title="从文件导入 CSS">
                  <Upload size={12} />
                  <span>导入</span>
                </button>
                <button type="button" className="tl-editor-btn" onClick={handleExportCss} title="导出当前美化 CSS">
                  <Download size={12} />
                  <span>导出</span>
                </button>
                <button type="button" className="tl-editor-btn" onClick={handleResetCss} title="恢复默认">
                  <RotateCcw size={12} />
                </button>
              </div>
              <button type="button" className="tl-editor-btn primary" onClick={handleSaveCss}>
                <Check size={12} />
                <span>保存应用</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="tl-pair">
              <Person person={me} tone="pink" />
              <div className="tl-link">
                <div className="tl-wave">
                  {BARS.map((i) => (
                    <span
                      key={i}
                      className={i % 2 ? "m" : "p"}
                      style={{ animationDelay: `${i * 0.09}s`, animationDuration: `${0.8 + (i % 3) * 0.18}s` }}
                    />
                  ))}
                </div>
                <small>正在一起听</small>
              </div>
              <Person person={partner} tone="mint" />
            </div>

            <div className="tl-song">
              <div
                className="tl-cover"
                style={currentTrack?.coverUrl ? { backgroundImage: `url("${currentTrack.coverUrl}")` } : undefined}
              >
                {currentTrack?.coverUrl ? null : "♪"}
              </div>
              <div className="tl-meta">
                <div className="tl-title">
                  <span ref={titleRef} className={shift ? "tl-marquee" : ""} style={titleStyle}>
                    {currentTrack?.title || "暂无播放歌曲"}
                  </span>
                </div>
                <div className="tl-artist">{currentTrack?.artist || "未知歌手"}</div>
              </div>
              {player ? (
                <button
                  type="button"
                  className="tl-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    player.togglePlay();
                  }}
                  aria-label={isPlaying ? "暂停" : "播放"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    {isPlaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
                  </svg>
                </button>
              ) : null}
            </div>

            {duration > 0 ? (
              <div className="tl-progress">
                <span>{fmt(currentTime)}</span>
                <div className="tl-track">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <span>{fmt(duration)}</span>
              </div>
            ) : null}

            <button
              type="button"
              className="tl-cta"
              onClick={() => {
                handleClose();
                onOpenTogether();
              }}
            >
              进入一起听
            </button>
          </>
        )}
      </div>
    </div>
  );
}
