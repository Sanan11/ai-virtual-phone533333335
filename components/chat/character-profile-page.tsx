"use client";

import { useState, useMemo, useEffect } from "react";
import { Character } from "@/lib/character-types";
import { ChatSession, loadChatSessions } from "@/lib/chat-storage";
import { loadMomentPosts, loadMomentComments, addMomentComment, type MomentComment } from "@/lib/moments-storage";
import { resolveUserIdentity } from "@/lib/settings-storage";
import { triggerImmediatePost } from "@/lib/moments-engine";
import { ChevronLeft, MessageSquare, Heart, Send, Sparkles, Loader2, MapPin, SlidersHorizontal, X } from "lucide-react";
import { ChatFallbackAvatar } from "./chat-fallback-avatar";

interface CharacterProfilePageProps {
    character: Character;
    session?: ChatSession | null;
    onBack: () => void;
    onStartChat?: () => void;
}

export function CharacterProfilePage({
    character,
    session,
    onBack,
    onStartChat,
}: CharacterProfilePageProps) {
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 生成动态设置弹窗
    const [showMomentPromptModal, setShowMomentPromptModal] = useState(false);
    const [momentPrompt, setMomentPrompt] = useState("");
    const [isTriggeringPost, setIsTriggeringPost] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const userIdentity = useMemo(() => resolveUserIdentity(character.id, "chat"), [character.id]);

    // 显示 ID
    const displayId = useMemo(() => {
        const clean = character.name.replace(/[^a-zA-Z0-9]/g, "");
        if (clean && clean.length >= 2) return clean.toLowerCase();
        return character.id.slice(0, 8);
    }, [character.name, character.id]);

    // 随机但固定的粉丝/关注数据 & IP
    const stats = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < character.id.length; i++) {
            hash = (hash << 5) - hash + character.id.charCodeAt(i);
            hash |= 0;
        }
        const abs = Math.abs(hash);
        const ips = ["北京", "上海", "广东", "浙江", "江苏", "四川", "重庆", "山东", "东京", "首尔", "巴黎", "纽约"];
        return {
            following: 20 + (abs % 80),
            followers: 120 + (abs % 8800),
            ip: ips[abs % ips.length],
        };
    }, [character.id]);

    // 拉取该角色的朋友圈动态
    const posts = useMemo(() => {
        const allPosts = loadMomentPosts();
        return allPosts.filter(p => p.authorId === character.id);
    }, [character.id, refreshTrigger]);

    const postCommentsMap = useMemo(() => {
        const map: Record<string, MomentComment[]> = {};
        for (const p of posts) {
            map[p.id] = loadMomentComments(p.id);
        }
        return map;
    }, [posts, refreshTrigger]);

    useEffect(() => {
        const onDone = () => {
            setRefreshTrigger(v => v + 1);
            setIsTriggeringPost(false);
            setShowMomentPromptModal(false);
            setMomentPrompt("");
            showToast("TA 已经发布了新动态！");
        };
        window.addEventListener("moments-immediate-post-done", onDone);
        return () => window.removeEventListener("moments-immediate-post-done", onDone);
    }, []);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2500);
    };

    const handleSendComment = (postId: string) => {
        const text = commentDrafts[postId]?.trim();
        if (!text) return;
        addMomentComment({
            postId,
            authorType: "user",
            authorId: "user",
            authorName: userIdentity?.name || "我",
            content: text,
        });
        setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
        setRefreshTrigger(v => v + 1);
    };

    const handleGeneratePost = (customPrompt?: string) => {
        setIsTriggeringPost(true);
        showToast(customPrompt ? "正在按要求创作动态..." : "TA 正在构思最新动态...");
        triggerImmediatePost(character.id);
    };

    return (
        <div className="character-profile-page absolute inset-0 z-50 flex flex-col bg-[var(--c-bg,#fff)] text-[var(--c-text-title,#111)] overflow-y-auto select-none">
            {/* 顶栏：紧凑自适应手机视口 */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-[var(--c-bg)]/85 backdrop-blur-md border-b border-[var(--c-border)]/50 shrink-0">
                <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-[var(--c-input)] transition-colors text-[var(--c-text)]"
                    onClick={onBack}
                    aria-label="返回"
                >
                    <ChevronLeft size={22} />
                </button>
                <span className="text-xs font-semibold tracking-wide text-[var(--c-text-sub)] truncate max-w-[160px]">
                    @{displayId}
                </span>
                <button
                    type="button"
                    onClick={() => setShowMomentPromptModal(true)}
                    className="p-1.5 rounded-full hover:bg-[var(--c-input)] text-[var(--c-text-sub)] hover:text-[var(--c-primary)] transition-colors"
                    title="动态创作设置"
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {/* 顶部轻量背景横幅 */}
            <div className="relative w-full h-28 bg-gradient-to-r from-[var(--c-primary)]/15 via-[var(--c-primary)]/5 to-[var(--c-card)] shrink-0 overflow-hidden">
                {character.avatar && (
                    <img
                        src={character.avatar}
                        alt=""
                        className="w-full h-full object-cover filter blur-xl scale-110 opacity-25 select-none pointer-events-none"
                    />
                )}
            </div>

            {/* 头像与主要基础信息区 */}
            <div className="px-4 -mt-10 flex flex-col gap-2.5 relative z-10 shrink-0 pb-3 border-b border-[var(--c-border)]/60">
                <div className="flex items-end justify-between">
                    <div className="w-18 h-18 rounded-full ring-4 ring-[var(--c-bg)] overflow-hidden bg-[var(--c-card)] shadow-md shrink-0">
                        {character.avatar ? (
                            <img src={character.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <ChatFallbackAvatar />
                        )}
                    </div>
                    {onStartChat && (
                        <button
                            type="button"
                            onClick={onStartChat}
                            className="px-4 py-1.5 rounded-full bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                            <MessageSquare size={13} />
                            <span>发私信</span>
                        </button>
                    )}
                </div>

                {/* 姓名与 ID */}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--c-text-title)]">
                            {character.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--c-text-sub)]">
                        <span>ID: {displayId}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                            <MapPin size={11} className="opacity-70" />
                            <span>IP: {stats.ip}</span>
                        </span>
                    </div>
                </div>

                {/* 个性签名 */}
                <div className="text-xs text-[var(--c-text-sub)] leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {character.personality || "这个人很神秘，还没有写下个性签名。"}
                </div>

                {/* 关注、粉丝、动态统计 */}
                <div className="flex items-center gap-5 text-xs text-[var(--c-text-sub)] pt-1">
                    <span><strong className="text-[var(--c-text-title)] font-semibold">{stats.following}</strong> 关注</span>
                    <span><strong className="text-[var(--c-text-title)] font-semibold">{stats.followers}</strong> 粉丝</span>
                    <span><strong className="text-[var(--c-text-title)] font-semibold">{posts.length}</strong> 动态</span>
                </div>
            </div>

            {/* 动态流（纯净动态展示） */}
            <div className="flex-1 p-3.5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--c-text-title)] px-1">
                    <span>TA 的动态</span>
                    <span className="text-[11px] text-[var(--c-text-sub)] font-normal">共 {posts.length} 条</span>
                </div>

                {posts.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--c-text-sub)] gap-2.5 opacity-65">
                        <MessageSquare size={28} strokeWidth={1.5} />
                        <span>TA 还没有发布任何动态</span>
                        <button
                            type="button"
                            onClick={() => handleGeneratePost()}
                            className="mt-2 px-3 py-1 rounded-full bg-[var(--c-primary)]/10 text-[var(--c-primary)] text-xs font-medium hover:bg-[var(--c-primary)]/20 active:scale-95 transition-all"
                        >
                            让 TA 现在发一条
                        </button>
                    </div>
                ) : (
                    posts.map(post => {
                        const comments = postCommentsMap[post.id] || [];
                        return (
                            <div
                                key={post.id}
                                className="p-3.5 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] flex flex-col gap-2.5 shadow-xs"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--c-input)] shrink-0">
                                            {character.avatar ? <img src={character.avatar} alt="" className="w-full h-full object-cover" /> : <ChatFallbackAvatar />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[var(--c-text-title)]">{character.name}</span>
                                            <span className="text-[10px] text-[var(--c-text-sub)]">{new Date(post.createdAt).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs leading-relaxed text-[var(--c-text-title)] whitespace-pre-wrap">
                                    {post.content}
                                </div>

                                {post.photoUrl && (
                                    <div className="rounded-xl overflow-hidden max-h-56 border border-[var(--c-border)]/60 bg-black/5">
                                        <img src={post.photoUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="pt-2 border-t border-[var(--c-border)]/50 flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-xs text-[var(--c-text-sub)]">
                                        <span className="flex items-center gap-1">
                                            <Heart size={13} className="text-rose-500 fill-rose-500/20" />
                                            <span>{post.likes.length} 赞</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare size={13} />
                                            <span>{comments.length} 评论</span>
                                        </span>
                                    </div>

                                    {comments.length > 0 && (
                                        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[var(--c-bg)] text-xs">
                                            {comments.map(c => (
                                                <div key={c.id} className="leading-relaxed">
                                                    <strong className="text-[var(--c-primary)] font-medium mr-1">
                                                        {c.authorName || (c.authorType === "user" ? (userIdentity?.name || "我") : character.name)}:
                                                    </strong>
                                                    <span className="text-[var(--c-text-title)] opacity-90">{c.content}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <input
                                            type="text"
                                            value={commentDrafts[post.id] || ""}
                                            onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === "Enter") handleSendComment(post.id); }}
                                            placeholder="给 TA 评论..."
                                            className="ui-input flex-1 text-xs py-1.5 px-3 rounded-full bg-[var(--c-bg)] border border-[var(--c-border)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSendComment(post.id)}
                                            className="p-1.5 rounded-full bg-[var(--c-primary)] text-white hover:opacity-90 active:scale-95 transition-transform"
                                        >
                                            <Send size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 设置按钮弹出的专属创作动态 Modal */}
            {showMomentPromptModal && (
                <div className="modal-overlay z-50" onClick={() => setShowMomentPromptModal(false)}>
                    <div
                        className="modal-dialog max-w-sm w-full mx-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] shadow-2xl p-4 flex flex-col gap-3.5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-2.5">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--c-text-title)]">
                                <Sparkles size={16} className="text-[var(--c-primary)]" />
                                <span>动态生成设置</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMomentPromptModal(false)}
                                className="p-1 text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-[var(--c-text-title)]">给 TA 灵感提示词（可选）</span>
                            <textarea
                                value={momentPrompt}
                                onChange={e => setMomentPrompt(e.target.value)}
                                placeholder="例如：去看了海边的落日自拍、和朋友在咖啡厅聊天...（不填则角色自己发挥）"
                                rows={3}
                                className="ui-input text-xs p-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                disabled={isTriggeringPost}
                                onClick={() => handleGeneratePost()}
                                className="flex-1 py-2 rounded-xl border border-[var(--c-border)] hover:bg-[var(--c-input)] text-xs font-medium text-[var(--c-text-title)] transition-all flex items-center justify-center gap-1.5"
                            >
                                {isTriggeringPost ? <Loader2 size={13} className="animate-spin" /> : null}
                                <span>让TA自己发挥</span>
                            </button>
                            <button
                                type="button"
                                disabled={isTriggeringPost || !momentPrompt.trim()}
                                onClick={() => handleGeneratePost(momentPrompt.trim())}
                                className="flex-1 py-2 rounded-xl bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                            >
                                {isTriggeringPost ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                <span>按提示词生成</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 轻量 Toast 提示 */}
            {toastMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 rounded-full bg-black/75 text-white text-xs backdrop-blur-md shadow-lg pointer-events-none animate-in fade-in duration-150">
                    {toastMsg}
                </div>
            )}
        </div>
    );
}
