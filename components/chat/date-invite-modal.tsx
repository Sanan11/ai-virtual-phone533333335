"use client";

import { useState } from "react";

interface DateInviteModalProps {
    characterName: string;
    onSend: (location: string, time: string, matter: string) => void;
    onAIGenerate?: () => Promise<{ location: string; time: string; matter: string }>;
    onClose: () => void;
}

export function DateInviteModal({ characterName, onSend, onAIGenerate, onClose }: DateInviteModalProps) {
    const [location, setLocation] = useState("暮色街角咖啡馆");
    const [time, setTime] = useState("今晚八点");
    const [matter, setMatter] = useState("想和你一起散步喝咖啡，聊聊最近的心情");
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAutoGenerate = async () => {
        if (!onAIGenerate || isAiLoading) return;
        setIsAiLoading(true);
        try {
            const res = await onAIGenerate();
            if (res.location) setLocation(res.location);
            if (res.time) setTime(res.time);
            if (res.matter) setMatter(res.matter);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="modal-dialog max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="ts-16 font-semibold text-[var(--c-text)]">发起浪漫线下邀约</div>
                    {onAIGenerate && (
                        <button
                            type="button"
                            onClick={handleAutoGenerate}
                            disabled={isAiLoading}
                            className="text-xs text-[var(--c-primary)] hover:underline flex items-center gap-1"
                        >
                            {isAiLoading ? "推敲契机中..." : "✨ 让TA主动发起邀约"}
                        </button>
                    )}
                </div>
                <p className="ts-12 text-[var(--c-text-sub)] mb-4">
                    向 {characterName} 发送赴约卡片，点击卡片直接开启「剧情」模式浪漫故事。
                </p>

                <div className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-[var(--c-text)]">约会地点</span>
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="例如：海边栈道、暮色街角咖啡馆..."
                            className="ui-input text-xs w-full py-2 px-3 rounded-xl"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-[var(--c-text)]">约定时分</span>
                        <input
                            type="text"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            placeholder="例如：今晚八点、周末夕阳时分..."
                            className="ui-input text-xs w-full py-2 px-3 rounded-xl"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-[var(--c-text)]">想说的话 / 约会事项</span>
                        <textarea
                            value={matter}
                            onChange={e => setMatter(e.target.value)}
                            placeholder="写下你想说的心动低语..."
                            rows={3}
                            className="ui-input text-xs w-full p-2.5 rounded-xl resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 w-full mt-5">
                    <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost ui-btn-bordered-ghost flex-1">
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!location.trim() || !matter.trim()) return;
                            onSend(location.trim(), time.trim(), matter.trim());
                        }}
                        disabled={!location.trim() || !matter.trim()}
                        className="ui-btn ui-btn-primary flex-1"
                    >
                        发送邀约卡片
                    </button>
                </div>
            </div>
        </div>
    );
}
