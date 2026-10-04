"use client";

import { useState, useEffect, useMemo } from "react";
import { loadAllTracks, type MusicTrack } from "@/lib/music-storage";
import { isNeteaseConfigured, searchNetease, type NeteaseSearchResult } from "@/lib/music-service";
import { useMusicControlsOptional } from "@/lib/music-context";
import { X, Search, Music, Disc, Loader2, Sparkles } from "lucide-react";

interface ListenTogetherPickerModalProps {
    characterName: string;
    onSelectTrack: (track: { title: string; artist: string; id: string; coverUrl?: string; isOnline?: boolean }) => void;
    onClose: () => void;
}

export function ListenTogetherPickerModal({
    characterName,
    onSelectTrack,
    onClose,
}: ListenTogetherPickerModalProps) {
    const player = useMusicControlsOptional();
    const [localTracks, setLocalTracks] = useState<MusicTrack[]>([]);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NeteaseSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<"local" | "search">("local");

    const hasNetease = useMemo(() => isNeteaseConfigured(), []);

    useEffect(() => {
        loadAllTracks().then(tracks => {
            setLocalTracks(tracks);
            setLoadingLocal(false);
            // 如果本地没有上传歌曲，但配置了网易云 API，自动切换至在线曲库搜索，避免用户看到空白
            if (tracks.length === 0 && isNeteaseConfigured()) {
                setActiveTab("search");
            }
        });
    }, []);

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q || isSearching) return;
        setIsSearching(true);
        try {
            const results = await searchNetease(q);
            setSearchResults(results);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-dialog max-w-sm w-full mx-4 max-h-[82vh] overflow-hidden rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] shadow-2xl flex flex-col p-0 select-none"
                onClick={e => e.stopPropagation()}
            >
                {/* 顶栏 */}
                <div className="p-4 border-b border-[var(--c-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🎵</span>
                        <div className="flex flex-col">
                            <span className="ts-14 font-semibold text-[var(--c-text-title)]">和 {characterName} 一起听歌</span>
                            <span className="ts-11 text-[var(--c-text-sub)]">连接你的音乐库，实时同步播放</span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="ui-bare-btn">
                        <X size={18} />
                    </button>
                </div>

                {/* 如果播放器当前正在放歌，置顶一键同听卡片 */}
                {player?.currentTrack && (
                    <div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-[var(--c-primary)]/10 to-transparent border border-[var(--c-primary)]/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                            <div className="w-9 h-9 rounded-lg bg-black/60 flex items-center justify-center text-white shrink-0 shadow-xs">
                                <Disc size={18} className="animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                            <div className="flex flex-col overflow-hidden truncate">
                                <span className="text-[11px] text-[var(--c-primary)] font-medium">当前手机正在播放</span>
                                <span className="text-xs font-semibold text-[var(--c-text-title)] truncate">{player.currentTrack.title}</span>
                                <span className="text-[10px] text-[var(--c-text-sub)] truncate">{player.currentTrack.artist || "未知歌手"}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onSelectTrack({
                                    id: String(player.currentTrack!.id),
                                    title: player.currentTrack!.title,
                                    artist: player.currentTrack!.artist,
                                    coverUrl: player.currentTrack!.coverUrl,
                                });
                            }}
                            className="px-3 py-1.5 rounded-full bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 shadow-sm active:scale-95 shrink-0"
                        >
                            邀TA同听
                        </button>
                    </div>
                )}

                {/* 选项卡 */}
                <div className="flex border-b border-[var(--c-border)] mx-4 mt-3">
                    <button
                        type="button"
                        className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === "local"
                                ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                                : "border-transparent text-[var(--c-text-sub)]"
                        }`}
                        onClick={() => setActiveTab("local")}
                    >
                        本地音乐库 ({localTracks.length})
                    </button>
                    {hasNetease && (
                        <button
                            type="button"
                            className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors ${
                                activeTab === "search"
                                ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                                : "border-transparent text-[var(--c-text-sub)]"
                            }`}
                            onClick={() => setActiveTab("search")}
                        >
                            在线曲库搜索
                        </button>
                    )}
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[220px]">
                    {activeTab === "local" ? (
                        loadingLocal ? (
                            <div className="py-12 flex items-center justify-center text-xs text-[var(--c-text-sub)] gap-1.5">
                                <Loader2 size={16} className="animate-spin" />
                                <span>正在载入音乐库...</span>
                            </div>
                        ) : localTracks.length === 0 ? (
                            <div className="py-10 flex flex-col items-center justify-center text-xs text-[var(--c-text-sub)] gap-2.5">
                                <Music size={28} strokeWidth={1.5} className="opacity-40" />
                                <span>本地音乐库空空如也</span>
                                {hasNetease ? (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("search")}
                                        className="mt-1 px-3 py-1.5 rounded-full bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 shadow-sm flex items-center gap-1.5"
                                    >
                                        <Search size={13} />
                                        <span>去在线曲库搜索歌曲</span>
                                    </button>
                                ) : (
                                    <span className="text-[11px] opacity-75">可在桌面「音乐」App 中添加音频或配置网易云曲库</span>
                                )}
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
                                    }}
                                    className="p-2.5 rounded-xl border border-[var(--c-border)] hover:bg-[var(--c-input)] transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                                >
                                    <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                                        <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center shrink-0">
                                            <Music size={14} className="text-[var(--c-primary)]" />
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-xs font-medium text-[var(--c-text-title)] truncate">{t.title}</span>
                                            <span className="text-[10px] text-[var(--c-text-sub)] truncate">{t.artist || "未知歌手"}</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-[var(--c-primary)] opacity-0 group-hover:opacity-100 font-medium shrink-0">
                                        点此同听 →
                                    </span>
                                </div>
                            ))
                        )
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                                    placeholder="搜索在线曲目或歌手..."
                                    className="ui-input text-xs flex-1 py-1.5 px-3 rounded-full"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="p-2 rounded-full bg-[var(--c-primary)] text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                </button>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-1">
                                {searchResults.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            onSelectTrack({
                                                id: String(s.id),
                                                title: s.name,
                                                artist: s.artists?.map(a => a.name).join("/") || "",
                                                coverUrl: s.album?.picUrl,
                                                isOnline: true,
                                            });
                                        }}
                                        className="p-2.5 rounded-xl border border-[var(--c-border)] hover:bg-[var(--c-input)] transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                                    >
                                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/10 shrink-0">
                                                {s.album?.picUrl ? (
                                                    <img src={s.album.picUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Music size={14} className="text-[var(--c-primary)] m-auto" />
                                                )}
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-xs font-medium text-[var(--c-text-title)] truncate">{s.name}</span>
                                                <span className="text-[10px] text-[var(--c-text-sub)] truncate">
                                                    {s.artists?.map(a => a.name).join("/") || "在线单曲"}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-[var(--c-primary)] font-medium shrink-0">
                                            一起听
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
