// components/music/music-float.tsx — Floating music control widget (draggable vinyl)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMusicPlayerOptional } from "@/lib/music-context";

const DRAG_START_THRESHOLD = 6;
const SWIPE_DISMISS_EDGE_X = 4;
const SWIPE_DISMISS_SPEED = 1.5; // px/ms
const SWIPE_DISMISS_ARMING_X = 88;
const SWIPE_INERTIA_MS = 140;
const SWIPE_VELOCITY_RECENT_MS = 180;

function formatTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function MusicFloat({ hidden }: { hidden?: boolean }) {
    const player = useMusicPlayerOptional();
    const floatRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 310, y: 680 });
    const dragRef = useRef<{
        pointerId: number | null; active: boolean;
        startX: number; startY: number; origX: number; origY: number;
        lastX: number; lastTime: number;
        lastLeftSpeed: number; lastLeftSpeedTime: number;
        moved: boolean; startedOnInfo: boolean;
    }>({
        pointerId: null,
        active: false,
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
        lastX: 0,
        lastTime: 0,
        lastLeftSpeed: 0,
        lastLeftSpeedTime: 0,
        moved: false,
        startedOnInfo: false,
    });
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [isIslandExpanded, setIsIslandExpanded] = useState(false);
    const [dismissing, setDismissing] = useState(false);

    const clampPos = useCallback((x: number, y: number) => {
        const el = floatRef.current;
        const parent = el?.closest("[data-ui='phone-screen']") as HTMLElement | null;
        if (!el || !parent) return { x, y };
        const pw = parent.clientWidth;
        const ph = parent.clientHeight;
        const ew = el.offsetWidth;
        const eh = el.offsetHeight;
        return {
            x: Math.max(0, Math.min(x, pw - ew)),
            y: Math.max(0, Math.min(y, ph - eh)),
        };
    }, []);

    const dismissFloat = useCallback(() => {
        if (!player) return;
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setDismissing(true);
        dismissTimerRef.current = setTimeout(() => {
            player.dismissFloat();
            setDismissing(false);
            setExpanded(false);
            dismissTimerRef.current = null;
        }, 250);
    }, [player]);

    useEffect(() => () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    }, []);
    useEffect(() => {
        const handleIslandToggle = () => setIsIslandExpanded(prev => !prev);
        window.addEventListener("music-island-toggle", handleIslandToggle);
        return () => window.removeEventListener("music-island-toggle", handleIslandToggle);
    }, []);

    useEffect(() => {
        if (!isIslandExpanded) return;
        const close = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest(".status-island") || target?.closest(".music-float")) return;
            setIsIslandExpanded(false);
        };
        document.addEventListener("click", close, true);
        return () => document.removeEventListener("click", close, true);
    }, [isIslandExpanded]);



    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        // Let transport buttons keep their native click behavior.
        if (target.closest("button")) return;
        e.preventDefault();
        e.stopPropagation();
        floatRef.current?.setPointerCapture?.(e.pointerId);
        const now = performance.now();
        dragRef.current = {
            pointerId: e.pointerId,
            active: true,
            startX: e.clientX, startY: e.clientY,
            origX: pos.x, origY: pos.y,
            lastX: e.clientX,
            lastTime: now,
            lastLeftSpeed: 0,
            lastLeftSpeedTime: 0,
            moved: false,
            startedOnInfo: Boolean(target.closest(".music-float-info")),
        };
    }, [pos]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d.active || d.pointerId !== e.pointerId) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (Math.abs(dx) > DRAG_START_THRESHOLD || Math.abs(dy) > DRAG_START_THRESHOLD) d.moved = true;
        if (d.moved) {
            const nextPos = clampPos(d.origX + dx, d.origY + dy);
            const now = performance.now();
            const dt = Math.max(1, now - d.lastTime);
            const stepDx = e.clientX - d.lastX;
            const leftSpeed = stepDx < 0 ? Math.abs(stepDx) / dt : 0;
            if (leftSpeed > 0) {
                d.lastLeftSpeed = leftSpeed;
                d.lastLeftSpeedTime = now;
            }
            d.lastX = e.clientX;
            d.lastTime = now;
            setPos(nextPos);
        }
    }, [clampPos]);

    const finishPointer = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d.active || d.pointerId !== e.pointerId) return;
        if (floatRef.current?.hasPointerCapture?.(e.pointerId)) {
            floatRef.current.releasePointerCapture(e.pointerId);
        }
        d.active = false;
        d.pointerId = null;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const finalPos = clampPos(d.origX + dx, d.origY + dy);
        const now = performance.now();
        const dt = Math.max(1, now - d.lastTime);
        const stepDx = e.clientX - d.lastX;
        const leftSpeed = stepDx < 0 ? Math.abs(stepDx) / dt : 0;
        const recentMoveSpeed = now - d.lastLeftSpeedTime <= SWIPE_VELOCITY_RECENT_MS ? d.lastLeftSpeed : 0;
        const effectiveLeftSpeed = Math.max(leftSpeed, recentMoveSpeed);
        const inertialX = finalPos.x - effectiveLeftSpeed * SWIPE_INERTIA_MS;
        const shouldDismiss = d.moved
            && finalPos.x <= SWIPE_DISMISS_ARMING_X
            && effectiveLeftSpeed >= SWIPE_DISMISS_SPEED
            && inertialX <= SWIPE_DISMISS_EDGE_X;

        if (shouldDismiss) {
            dismissFloat();
            return;
        }

        if (d.moved) {
            setPos(finalPos);
            return;
        }

        if (!d.moved && player) {
            // The Dynamic Island expansion is intentionally not a gateway to the full Music app.
            // Full player remains accessible from the Music app's own now-playing bar.
            setExpanded(prev => !prev);
        }
    }, [player, clampPos, dismissFloat]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => finishPointer(e), [finishPointer]);
    const handlePointerCancel = useCallback((e: React.PointerEvent) => finishPointer(e), [finishPointer]);

    if (!player || !player.currentTrack || hidden || player.floatDismissed || !isIslandExpanded) return null;

    const track = player.currentTrack;

    const progress = player.duration > 0 ? Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100)) : 0;

    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!player.duration || player.duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        player.seek(ratio * player.duration);
    };

    return (
        <div
            ref={floatRef}
            className="music-float music-float-glow-card"
            {...(expanded ? { "data-expanded": "" } : {})}
            {...(dismissing ? { "data-dismissing": "" } : {})}
            style={{ left: "50%", top: 44, transform: "translateX(-50%)" }}
            onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e); }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            {/* 专辑流光背景环境氛围层 */}
            {track.coverUrl && (
                <div
                    className="music-float-ambient-glow"
                    style={{ backgroundImage: `url(${track.coverUrl})` }}
                />
            )}
            <div className="music-float-glass-shimmer" />

            <div className="music-float-inner-glow">
                {/* 顶部主信息行：微黑胶封面 + 歌曲信息 + 跳动声波 */}
                <div className="music-float-main-row">
                    {/* 微黑胶微缩组 */}
                    <div className="music-float-vinyl-pocket" {...(player.isPlaying ? { "data-playing": "" } : {})}>
                        {/* 黑胶盘片 */}
                        <div className="music-float-disc-disc">
                            <div className="music-float-disc-ring" />
                            <div className="music-float-disc-ring music-float-disc-ring-sub" />
                            <div className="music-float-disc-center" />
                        </div>
                        {/* 正方形唱片封套 */}
                        <div className="music-float-jacket-cover">
                            {track.coverUrl ? (
                                <img src={track.coverUrl} alt="" className="music-float-cover-img" draggable={false} />
                            ) : (
                                <div className="music-float-cover-placeholder">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 歌曲与歌手信息 */}
                    <div className="music-float-info">
                        <div className="music-float-title-row">
                            <span className="music-float-title">{track.title}</span>
                        </div>
                        <div className="music-float-artist-row">
                            <span className="music-float-artist">{track.artist}</span>
                        </div>
                    </div>

                    {/* 右侧动态流光声波条 */}
                    <div className="music-float-wave-badge" {...(player.isPlaying ? { "data-playing": "" } : {})}>
                        <span className="music-float-wave-bar b1" />
                        <span className="music-float-wave-bar b2" />
                        <span className="music-float-wave-bar b3" />
                        <span className="music-float-wave-bar b4" />
                    </div>
                </div>

                {/* 中间进度条 + 发光滑轨 */}
                <div className="music-float-progress-section">
                    <div className="music-float-progress-track" onClick={handleSeekClick}>
                        <div className="music-float-progress-fill" style={{ width: `${progress}%` }}>
                            <div className="music-float-progress-thumb" />
                        </div>
                    </div>
                    <div className="music-float-time-row">
                        <span>{formatTime(player.currentTime)}</span>
                        <span>{formatTime(player.duration)}</span>
                    </div>
                </div>

                {/* 底部控制按键栏 */}
                <div className="music-float-controls-row">
                    <button className="music-float-ctrl-btn" onClick={(e) => { e.stopPropagation(); player.prev(); }} title="上一首">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2.2v12H6zm3.5 6l9.5 6.5V5.5z" />
                        </svg>
                    </button>
                    <button
                        className="music-float-ctrl-btn music-float-ctrl-play"
                        onClick={(e) => { e.stopPropagation(); player.togglePlay(); }}
                        title={player.isPlaying ? "暂停" : "播放"}
                    >
                        {player.isPlaying ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                    <button className="music-float-ctrl-btn" onClick={(e) => { e.stopPropagation(); player.next(); }} title="下一首">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18.5l9.5-6.5L6 5.5v13zm9.5-12.5H18v12h-2.5z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
