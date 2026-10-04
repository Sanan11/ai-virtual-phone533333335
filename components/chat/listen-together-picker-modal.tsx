"use client";

import { useState, useEffect } from "react";
import { loadAllTracks, type MusicTrack } from "@/lib/music-storage";
import { searchNetease, type NeteaseSearchResult } from "@/lib/music-service";
import { useMusicControlsOptional } from "@/lib/music-context";
import { X, Search, Music, Disc, Loader2 } from "lucide-react";

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
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        loadAllTracks().then(tracks => {
            setLocalTracks(tracks);
            setLoadingLocal(false);
        });
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
                setSearchError("未找到相关歌曲，可尝试更换搜索词");
            }
        } catch (err) { 
            setSearchError("搜索失败，请检查音乐 API 配置或网络");
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
                <div className="p-3.5 border-b border-[var(--c-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🎵</span>
                        <div className="flex flex-col">
                            <span className="ts-14 font-semibold text-[var(--c-text-title)]">和 {characterName} 一起听歌</span>
                            <span className="ts-11 text-[var(--c-text-sub)]">搜索在线歌曲或挑选本地音乐，同步播放</span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="ui-bare-btn p-1 text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]">
                        <X size={18} />
                    </button>
                </div>

                {/* 当前正在播放的曲目（如果有） */}
                {player?.currentTrack && (
                    <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-[var(--c-primary)]/10 to-transparent border border-[var(--c-primary)]/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                            <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center text-white shrink-0 shadow-xs">
                                <Disc size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                            <div className="flex flex-col overflow-hidden truncate">
                                <span className="text-[10px] text-[var(--c-primary)] font-medium">当前正在播放</span>
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

                {/* 常驻置顶搜索框：无论何种情况都直接搜歌 */}
                <div className="px-3 pt-3 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                                placeholder="搜索歌曲或歌手..."
                                className="ui-input text-xs w-full py-1.5 pl-8 pr-3 rounded-full border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text-title)]"
                            />
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text-sub)] pointer-events-none" />
                        </div>
                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-3.5 py-1.5 rounded-full bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1"
                        >
                            {isSearching ? <Loader2 size={13} className="animate-spin" /> : "搜索"}
                        </button>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[220px]">
                    {/* 搜索结果 */}
                    {searchResults.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-2">
                            <span className="text-[11px] font-semibold text-[var(--c-text-sub)] px-1">搜索结果</span>
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
                                    className="p-2.5 rounded-xl border border-[var(--c-border)] hover:bg-[var(--c-input)] transition-all cursor-pointer flex items-center justify-between group active:scale-98 bg-[var(--c-card)]"
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
                                    <span className="text-[11px] text-[var(--c-primary)] font-semibold shrink-0">
                                        一起听 →
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchError && (
                        <div className="text-xs text-amber-500 py-2 px-1 text-center">
                            {searchError}
                        </div>
                    )}

                    {/* 本地歌曲列表（如果有） */}
                    <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-[11px] font-semibold text-[var(--c-text-sub)] px-1">
                            本地音乐库 ({localTracks.length})
                        </span>
                        {loadingLocal ? (
                            <div className="py-6 flex items-center justify-center text-xs text-[var(--c-text-sub)] gap-1.5">
                                <Loader2 size={14} className="animate-spin" />
                                <span>正在载入...</span>
                            </div>
                        ) : localTracks.length === 0 && searchResults.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-xs text-[var(--c-text-sub)] gap-2">
                                <Music size={26} strokeWidth={1.5} className="opacity-40" />
                                <span>本地暂无音频，可在上方搜索在线歌曲</span>
                                <span className="text-[10px] opacity-70">也可以在桌面「音乐」App 中放歌后一键同听</span>
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
                                    className="p-2.5 rounded-xl border border-[var(--c-border)] hover:bg-[var(--c-input)] transition-all cursor-pointer flex items-center justify-between group active:scale-98 bg-[var(--c-card)]"
                                >
                                    <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                                        <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center shrink-0">
                                            <Music size={14} className="text-[var(--c-primary)]" />
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-xs font-medium text-[var(--c-text-title)] truncate">{t.title}</span>
                                            <span className="text-[10px] text-[var(--c-text-sub)] truncate">{t.artist || "本地音乐"}</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-[var(--c-primary)] font-semibold shrink-0">
                                        一起听 →
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
