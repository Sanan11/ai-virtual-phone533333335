"use client";

import { useState, useEffect, useRef } from "react";
import { loadAllTracks, type MusicTrack } from "@/lib/music-storage";
import { searchNetease, type NeteaseSearchResult } from "@/lib/music-service";
import { useMusicControlsOptional } from "@/lib/music-context";
import { X, Search, Music, Disc, Loader2, Play, Pause, Palette, Download, Upload, SkipForward, RefreshCw } from "lucide-react";

interface ListenTogetherPickerModalProps {
    characterName: string;
    characterAvatar?: string;
    userName?: string;
    userAvatar?: string;
    onSelectTrack: (track: { title: string; artist: string; id: string; coverUrl?: string; duration?: number; isOnline?: boolean }) => void;
    onClose: () => void;
}

const STORAGE_KEY_CUSTOM_CSS = "custom_listen_together_css";

const DEFAULT_CSS = `/* 一起听歌界面自定义 CSS (网易云黑胶风) */
.together-modal-content {
    /* 背景与圆角 */
    backdrop-filter: blur(25px);
}

.together-vinyl-disc {
    /* 黑胶唱片微调 */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.together-user-avatar, .together-char-avatar {
    /* 双人头像样式 */
    border: 2px solid rgba(255, 255, 255, 0.8);
}

.together-connect-line {
    /* 双人连线脉冲颜色 */
    background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
}
`;

export function ListenTogetherPickerModal({
    characterName,
    characterAvatar,
    userName = "我",
    userAvatar,
    onSelectTrack,
    onClose,
}: ListenTogetherPickerModalProps) {
    const player = useMusicControlsOptional();
    const [localTracks, setLocalTracks] = useState<MusicTrack[]>([]);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NeteaseSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // 抽屉视图开关：'main' = 网易云双人黑胶主界面, 'picker' = 选歌搜索库, 'css' = CSS美化管理
    const [activeTab, setActiveTab] = useState<"main" | "picker" | "css">("main");

    // CSS 自定义管理状态
    const [customCss, setCustomCss] = useState<string>("");
    const [cssDraft, setCssDraft] = useState<string>("");
    const [copySuccess, setCopySuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // 读取本地音乐列表
        loadAllTracks().then(tracks => {
            setLocalTracks(tracks);
            setLoadingLocal(false);
        }).catch(() => setLoadingLocal(false));

        // 读取保存的自定义 CSS
        try {
            const savedCss = localStorage.getItem(STORAGE_KEY_CUSTOM_CSS);
            if (savedCss !== null) {
                setCustomCss(savedCss);
                setCssDraft(savedCss);
            } else {
                setCustomCss(DEFAULT_CSS);
                setCssDraft(DEFAULT_CSS);
            }
        } catch (e) {
            console.error("Failed to load custom css", e);
        }
    }, []);

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q || isSearching) return;
        setIsSearching(true);
        setSearchError(null);
        try {
            const results = await searchNetease(q);
            setSearchResults(results);
            if (results.length === 0) {
                setSearchError("未找到相关歌曲，可尝试更换关键词");
            }
        } catch (err) {
            setSearchError("搜索失败，请检查音乐 API 配置或网络");
        } finally {
            setIsSearching(false);
        }
    };

    const saveCss = () => {
        setCustomCss(cssDraft);
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_CSS, cssDraft);
        } catch (e) {
            console.error("Failed to save custom css", e);
        }
        setActiveTab("main");
    };

    const exportCssFile = () => {
        const blob = new Blob([cssDraft], { type: "text/css;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `together-music-style-${Date.now()}.css`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importCssFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setCssDraft(content);
            }
        };
        reader.readAsText(file);
    };

    const currentTrack = player?.currentTrack;
    const isPlaying = !!player?.isPlaying;

    return (
        <div className="modal-overlay fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in select-none" onClick={onClose}>
            {/* 动态注入自定义 CSS */}
            {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}

            <div
                className="together-modal-content relative w-full max-w-[360px] h-[580px] rounded-[32px] overflow-hidden bg-gradient-to-b from-[#2c223b] via-[#1a1429] to-[#120e1e] text-white shadow-2xl border border-white/10 flex flex-col justify-between p-5 transition-all duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* 顶栏控制 */}
                <div className="flex items-center justify-between z-10">
                    <button
                        type="button"
                        onClick={() => setActiveTab(activeTab === "css" ? "main" : "css")}
                        className={`p-2 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 ${
                            activeTab === "css" ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30" : "bg-white/10 text-white/80 hover:bg-white/20"
                        }`}
                        title="美化管理 / 自定义 CSS"
                    >
                        <Palette size={16} />
                        <span className="text-[11px] font-medium pr-1">美化</span>
                    </button>

                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-medium tracking-wide text-white/90">双人一起听</span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* 视图 1：主界面（网易云经典双人连线 + 黑胶唱片） */}
                {activeTab === "main" && (
                    <>
                        {/* 双人连线区 */}
                        <div className="flex items-center justify-between px-6 pt-2 pb-1 relative z-10">
                            {/* 用户头像与昵称 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="together-user-avatar relative w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white/10 ring-2 ring-white/20">
                                    {userAvatar ? (
                                        <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-tr from-purple-500 to-indigo-500">
                                            {userName.slice(0, 1)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] font-medium text-white/80 max-w-[70px] truncate">{userName}</span>
                            </div>

                            {/* 动态波纹连线 */}
                            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                                <div className="together-connect-line w-full h-[2px] rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-500 relative flex items-center justify-center">
                                    <span className="absolute w-3 h-3 rounded-full bg-pink-400/50 animate-ping" />
                                    <span className="relative w-2 h-2 rounded-full bg-white shadow-sm" />
                                </div>
                                <span className="text-[9px] text-pink-300/80 font-mono tracking-wider mt-1.5 flex items-center gap-1">
                                    <span>♥</span>
                                    <span>同频共听中</span>
                                </span>
                            </div>

                            {/* 角色头像与昵称 */}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="together-char-avatar relative w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white/10 ring-2 ring-pink-500/40">
                                    {characterAvatar ? (
                                        <img src={characterAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-tr from-pink-500 to-rose-500">
                                            {characterName.slice(0, 1)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] font-medium text-white/80 max-w-[70px] truncate">{characterName}</span>
                            </div>
                        </div>

                        {/* 仿网易云黑胶唱片区域 */}
                        <div className="flex-1 flex items-center justify-center relative py-2">
                            <div className="relative w-[210px] h-[210px] flex items-center justify-center">
                                {/* 唱片外圈光晕 */}
                                <div className={`absolute inset-0 rounded-full bg-pink-500/10 blur-xl transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-20'}`} />

                                {/* 黑胶唱片本体 */}
                                <div
                                    className={`together-vinyl-disc relative w-[200px] h-[200px] rounded-full bg-[#0d0d0f] border-4 border-[#1f1f23] p-1 flex items-center justify-center shadow-2xl ${
                                        isPlaying ? 'animate-spin' : ''
                                    }`}
                                    style={{ animationDuration: '20s', animationTimingFunction: 'linear' }}
                                >
                                    {/* 唱片经典同心凹槽纹理 */}
                                    <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
                                    <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
                                    <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />

                                    {/* 唱片中心封面 */}
                                    <div className="relative w-[110px] h-[110px] rounded-full overflow-hidden ring-4 ring-black/80 shadow-inner flex items-center justify-center bg-zinc-800">
                                        {currentTrack?.coverUrl ? (
                                            <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Music size={32} className="text-white/40 animate-pulse" />
                                        )}
                                        {/* 中心孔 */}
                                        <div className="absolute w-4 h-4 rounded-full bg-[#120e1e] border-2 border-white/20 shadow-md" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 曲目信息与控制器 */}
                        <div className="flex flex-col gap-3 pb-2 z-10">
                            <div className="text-center px-4">
                                <h3 className="text-base font-semibold text-white truncate leading-tight drop-shadow-sm">
                                    {currentTrack?.title || "暂无正在播放的歌曲"}
                                </h3>
                                <p className="text-xs text-white/50 truncate mt-1">
                                    {currentTrack?.artist || "点击下方「换一首歌」点歌互动"}
                                </p>
                            </div>

                            {/* 操作栏 */}
                            <div className="flex items-center justify-center gap-6 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("picker")}
                                    className="p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shadow-md"
                                    title="换一首歌"
                                >
                                    <Search size={16} />
                                    <span className="text-xs font-medium pr-1">换歌</span>
                                </button>

                                {currentTrack && player && (
                                    <button
                                        type="button"
                                        onClick={() => player.togglePlay()}
                                        className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xl shadow-pink-500/40 hover:brightness-110 active:scale-95 flex items-center justify-center transition-all"
                                    >
                                        {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-0.5" />}
                                    </button>
                                )}

                                {player?.next && (
                                    <button
                                        type="button"
                                        onClick={() => player.next()}
                                        className="p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95 shadow-md"
                                        title="下一首"
                                    >
                                        <SkipForward size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* 视图 2：点歌库与搜索抽屉（收纳于次级面板，不喧宾夺主） */}
                {activeTab === "picker" && (
                    <div className="flex-1 flex flex-col pt-3 overflow-hidden">
                        <div className="flex items-center justify-between pb-3">
                            <span className="text-sm font-semibold text-white/90">挑选音乐伴奏</span>
                            <button
                                type="button"
                                onClick={() => setActiveTab("main")}
                                className="text-xs text-pink-400 hover:text-pink-300 font-medium"
                            >
                                ← 返回一起听
                            </button>
                        </div>

                        {/* 搜索栏 */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                                    placeholder="搜索在线单曲或歌手..."
                                    className="w-full py-1.5 pl-8 pr-3 rounded-full text-xs bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-pink-500/80 transition-all"
                                />
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1"
                            >
                                {isSearching ? <Loader2 size={12} className="animate-spin" /> : "搜索"}
                            </button>
                        </div>

                        {/* 列表滚动区 */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {searchResults.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-[11px] text-pink-300/80 font-medium px-1">在线歌曲搜索结果</span>
                                    {searchResults.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                onSelectTrack({
                                                    id: String(s.id),
                                                    title: s.name,
                                                    artist: s.artists || "",
                                                    coverUrl: s.coverUrl,
                                                    duration: s.duration ? Math.round(s.duration / 1000) : undefined,
                                                    isOnline: true,
                                                });
                                                setActiveTab("main");
                                            }}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                                <div className="w-7 h-7 rounded-md overflow-hidden bg-black/40 shrink-0 flex items-center justify-center">
                                                    {s.coverUrl ? (
                                                        <img src={s.coverUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Music size={13} className="text-pink-400" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="text-xs text-white/90 truncate">{s.name}</span>
                                                    <span className="text-[10px] text-white/40 truncate">{s.artists || "在线单曲"}</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0 font-medium">播放 →</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchError && (
                                <div className="text-xs text-amber-400/90 py-2 text-center bg-amber-500/10 rounded-xl px-2">
                                    {searchError}
                                </div>
                            )}

                            {/* 本地歌曲库 */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] text-white/50 font-medium px-1">本地音乐库 ({localTracks.length})</span>
                                {loadingLocal ? (
                                    <div className="py-6 flex items-center justify-center text-xs text-white/40 gap-1.5">
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>读取本地曲目中...</span>
                                    </div>
                                ) : localTracks.length === 0 && searchResults.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-white/40 space-y-1">
                                        <Music size={24} className="mx-auto opacity-40 mb-1" />
                                        <p>暂无本地曲目</p>
                                        <p className="text-[10px] text-white/30">可在桌面「音乐」App 中导入或直接搜索在线单曲</p>
                                    </div>
                                ) : (
                                    localTracks.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                onSelectTrack({
                                                    id: t.id,
                                                    title: t.title,
                                                    artist: t.artist,
                                                    coverUrl: t.coverUrl,
                                                });
                                                setActiveTab("main");
                                            }}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                                                    <Music size={13} className="text-pink-400" />
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="text-xs text-white/90 truncate">{t.title}</span>
                                                    <span className="text-[10px] text-white/40 truncate">{t.artist || "本地音乐"}</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0 font-medium">播放 →</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 视图 3：CSS 美化管理面板 (支持查看、在线编写、导出、导入) */}
                {activeTab === "css" && (
                    <div className="flex-1 flex flex-col pt-3 overflow-hidden text-xs">
                        <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-1.5">
                                <Palette size={14} className="text-pink-400" />
                                <span className="text-sm font-semibold text-white/90">一起听 CSS 美化</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTab("main")}
                                className="text-xs text-pink-400 hover:text-pink-300 font-medium"
                            >
                                ← 返回主页
                            </button>
                        </div>

                        <p className="text-[10px] text-white/50 leading-relaxed mb-2">
                            可直接编辑 CSS 样式覆盖默认外观（类名：<code>.together-modal-content</code>, <code>.together-vinyl-disc</code>, <code>.together-user-avatar</code>, <code>.together-connect-line</code> 等）。
                        </p>

                        {/* CSS 编辑框 */}
                        <textarea
                            value={cssDraft}
                            onChange={e => setCssDraft(e.target.value)}
                            className="flex-1 w-full bg-black/40 border border-white/15 rounded-xl p-2.5 font-mono text-[11px] text-pink-200 placeholder-white/20 focus:outline-none focus:border-pink-500/80 resize-none leading-relaxed"
                            placeholder="输入自定义 CSS 代码..."
                            spellCheck={false}
                        />

                        {/* 导入 / 导出 / 保存 操作栏 */}
                        <div className="pt-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".css,text/css,text/plain"
                                    className="hidden"
                                    onChange={importCssFile}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 flex items-center gap-1 text-[11px] transition-all"
                                    title="导入 CSS 文件"
                                >
                                    <Upload size={12} />
                                    <span>导入</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={exportCssFile}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 flex items-center gap-1 text-[11px] transition-all"
                                    title="导出当前 CSS 为文件"
                                >
                                    <Download size={12} />
                                    <span>导出</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCssDraft(DEFAULT_CSS)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all"
                                    title="恢复预设样式"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={saveCss}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 active:scale-95 text-white font-medium text-xs shadow-md transition-all"
                            >
                                保存并生效
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
