"use client";

import { useState, useMemo, useEffect } from "react";
import { Character } from "@/lib/character-types";
import { ChatSession, loadChatSessions, saveChatSessions } from "@/lib/chat-storage";
import { loadMomentPosts, loadMomentComments, addMomentComment, type MomentPost, type MomentComment } from "@/lib/moments-storage";
import { resolveUserIdentity } from "@/lib/settings-storage";
import { ChevronLeft, MessageSquare, Phone, Heart, Sparkles, Send, Image as ImageIcon, Info, Calendar, ShieldCheck, Share2, Music, Play } from "lucide-react";
import { ChatFallbackAvatar } from "./chat-fallback-avatar";

interface CharacterProfilePageProps {
    character: Character;
    session?: ChatSession | null;
    onBack: () => void;
    onStartChat?: () => void;
    onVoiceCall?: () => void;
    onVideoCall?: () => void;
    onPlayMusic?: (query: string) => void;
}

export function CharacterProfilePage({
    character,
    session,
    onBack,
    onStartChat,
    onVoiceCall,
    onVideoCall,
    onPlayMusic,
}: CharacterProfilePageProps) {
    const [activeTab, setActiveTab] = useState<"posts" | "media" | "music" | "about">("posts");
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const currentSession = useMemo(() => {
        if (session) return session;
        const sessions = loadChatSessions();
        return sessions.find(s => s.contactId === character.id) || null;
    }, [session, character.id, refreshTrigger]);

    const userIdentity = useMemo(() => resolveUserIdentity(character.id, "chat"), [character.id]);

    // 生成独一无二的 Handle（如 @qinghan_ice 或基于拼音/id）
    const userHandle = useMemo(() => {
        const base = character.name.replace(/[^a-zA-Z0-9]/g, "");
        if (base && base.length >= 2) return `@${base.toLowerCase()}`;
        return `@${character.id.slice(0, 8)}`;
    }, [character.name, character.id]);

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

    // 拉取相册配图
    const mediaPosts = useMemo(() => {
        return posts.filter(p => p.photoUrl);
    }, [posts]);

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

    return (
        <div className="character-profile-page fixed inset-0 z-50 flex flex-col bg-[var(--c-bg)] text-[var(--c-text-title)] overflow-y-auto select-none">
            {/* Top Bar */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-[var(--c-bg)]/80 backdrop-blur-md border-b border-[var(--c-border)]/50">
                <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-[var(--c-input)] transition-colors"
                    onClick={onBack}
                >
                    <ChevronLeft size={22} />
                </button>
                <span className="text-xs font-semibold tracking-wide text-[var(--c-text-sub)]">
                    {userHandle}
                </span>
                <div className="w-7" />
            </div>

            {/* Banner & Floating Avatar */}
            <div className="relative w-full h-36 bg-gradient-to-tr from-[var(--c-primary)]/20 via-[var(--c-primary)]/10 to-[var(--c-card)] shrink-0 overflow-hidden">
                {character.avatar && (
                    <img
                        src={character.avatar}
                        alt=""
                        className="w-full h-full object-cover filter blur-2xl scale-125 opacity-30 select-none"
                    />
                )}
                <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-4.5 -mt-12 flex flex-col gap-3 relative z-10">
                {/* Avatar & Action Button */}
                <div className="flex items-end justify-between">
                    <div className="relative w-20 h-20 rounded-full ring-4 ring-[var(--c-bg)] overflow-hidden bg-[var(--c-card)] shadow-lg shrink-0">
                        {character.avatar ? (
                            <img src={character.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <ChatFallbackAvatar />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        {onStartChat && (
                            <button
                                type="button"
                                onClick={onStartChat}
                                className="px-4 py-1.5 rounded-full bg-[var(--c-primary)] text-white text-xs font-semibold hover:opacity-90 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                            >
                                <MessageSquare size={13} />
                                发私信
                            </button>
                        )}
                        {onVoiceCall && (
                            <button
                                type="button"
                                onClick={onVoiceCall}
                                className="p-2 rounded-full border border-[var(--c-border)] hover:bg-[var(--c-input)] transition-colors text-[var(--c-text-sub)]"
                            >
                                <Phone size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Name, Handle & Verified Badge */}
                <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold tracking-tight text-[var(--c-text-title)]">
                            {character.name}
                        </span>
                        <ShieldCheck size={16} className="text-[var(--c-primary)]" />
                    </div>
                    <span className="text-xs text-[var(--c-text-sub)] opacity-75">
                        {userHandle}
                    </span>
                </div>

                {/* Bio / Persona Quote */}
                <div className="text-xs text-[var(--c-text-sub)] leading-relaxed whitespace-pre-wrap">
                    {character.personality || character.persona || "这个人很神秘，还没有写下个性签名。"}
                </div>

                {/* 专属羁绊与称谓卡片（Threads 风格轻奢展示） */}
                {(currentSession?.characterUserRelationship || currentSession?.characterUserRemark) && (
                    <div className="mt-1 p-3 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)]/80 flex flex-col gap-2 shadow-xs">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--c-primary)]">
                            <Sparkles size={13} />
                            <span>专属记忆与羁绊</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            {currentSession.characterUserRelationship && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--c-bg)] border border-[var(--c-border)]">
                                    <span className="text-[var(--c-text-sub)] text-[11px]">关系:</span>
                                    <span className="font-medium text-[var(--c-text-title)]">{currentSession.characterUserRelationship}</span>
                                </div>
                            )}
                            {currentSession.characterUserRemark && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--c-bg)] border border-[var(--c-border)]">
                                    <span className="text-[var(--c-text-sub)] text-[11px]">TA对你的备注:</span>
                                    <span className="font-medium text-[var(--c-primary)]">“{currentSession.characterUserRemark}”</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 统计指标 */}
                <div className="flex items-center gap-4 text-xs text-[var(--c-text-sub)] pt-1">
                    <span className="hover:underline cursor-pointer"><strong className="text-[var(--c-text-title)]">{posts.length}</strong> 动态</span>
                    <span className="hover:underline cursor-pointer"><strong className="text-[var(--c-text-title)]">{mediaPosts.length}</strong> 相册</span>
                    <span className="hover:underline cursor-pointer"><strong className="text-[var(--c-text-title)]">100%</strong> 契合度</span>
                </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center border-b border-[var(--c-border)] mt-4 px-2 shrink-0 bg-[var(--c-bg)] sticky top-11 z-20">
                <button
                    type="button"
                    className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "posts"
                            ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                            : "border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]"
                    }`}
                    onClick={() => setActiveTab("posts")}
                >
                    动态 ({posts.length})
                </button>
                <button
                    type="button"
                    className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "media"
                            ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                            : "border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]"
                    }`}
                    onClick={() => setActiveTab("media")}
                >
                    媒体 ({mediaPosts.length})
                </button>
                <button
                    type="button"
                    className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "music"
                            ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                            : "border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]"
                    }`}
                    onClick={() => setActiveTab("music")}
                >
                    歌单
                </button>
                <button
                    type="button"
                    className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "about"
                            ? "border-[var(--c-primary)] text-[var(--c-primary)]"
                            : "border-transparent text-[var(--c-text-sub)] hover:text-[var(--c-text-title)]"
                    }`}
                    onClick={() => setActiveTab("about")}
                >
                    关于 TA
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-4 flex flex-col gap-4">
                {activeTab === "posts" && (
                    posts.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--c-text-sub)] gap-2 opacity-60">
                            <MessageSquare size={28} strokeWidth={1.5} />
                            <span>TA 还没有发布任何动态</span>
                        </div>
                    ) : (
                        posts.map(post => {
                            const comments = postCommentsMap[post.id] || [];
                            return (
                                <div
                                    key={post.id}
                                    className="p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] flex flex-col gap-3 shadow-xs"
                                >
                                    {/* Author & Time */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--c-input)] shrink-0">
                                                {character.avatar ? <img src={character.avatar} alt="" className="w-full h-full object-cover" /> : <ChatFallbackAvatar />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-[var(--c-text-title)]">{character.name}</span>
                                                <span className="text-[10px] text-[var(--c-text-sub)]">{new Date(post.createdAt).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    <div className="text-xs leading-relaxed text-[var(--c-text-title)] whitespace-pre-wrap">
                                        {post.content}
                                    </div>

                                    {/* Post Photo */}
                                    {post.photoUrl && (
                                        <div className="rounded-xl overflow-hidden max-h-64 border border-[var(--c-border)]/60 bg-black/5">
                                            <img src={post.photoUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Interactions & Comments */}
                                    <div className="pt-2 border-t border-[var(--c-border)]/60 flex flex-col gap-2">
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

                                        {/* Comment list */}
                                        {comments.length > 0 && (
                                            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--c-bg)] text-xs">
                                                {comments.map(c => (
                                                    <div key={c.id} className="leading-relaxed">
                                                        <strong className="text-[var(--c-primary)] font-medium mr-1.5">
                                                            {c.authorName || (c.authorType === "user" ? (userIdentity?.name || "我") : character.name)}:
                                                        </strong>
                                                        <span className="text-[var(--c-text-title)] opacity-90">{c.content}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Send comment bar */}
                                        <div className="flex items-center gap-1.5 mt-1">
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
                                                className="p-1.5 rounded-full bg-[var(--c-primary)] text-white hover:opacity-90 transition-transform active:scale-95"
                                            >
                                                <Send size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}

                {activeTab === "media" && (
                    mediaPosts.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--c-text-sub)] gap-2 opacity-60">
                            <ImageIcon size={28} strokeWidth={1.5} />
                            <span>暂无相册图片</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {mediaPosts.map(p => (
                                <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-black/5 border border-[var(--c-border)]">
                                    <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )
                )}

                {activeTab === "music" && (
                    <div className="flex flex-col gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-r from-[var(--c-primary)]/10 to-transparent border border-[var(--c-border)] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--c-primary)]/20 flex items-center justify-center text-[var(--c-primary)] shrink-0">
                                <Music size={18} />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-sm font-semibold text-[var(--c-text-title)]">{character.name} 的私藏歌单</span>
                                <span className="text-[10px] text-[var(--c-text-sub)]">点击即可与 TA 一起听</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {[
                                { title: "Drown", artist: "Bring Me The Horizon", tag: "摇滚" },
                                { title: "Starboy", artist: "The Weeknd", tag: "R&B" },
                                { title: "夜曲", artist: "周杰伦", tag: "流行" },
                                { title: "Merry Christmas Mr. Lawrence", artist: "坂本龙一", tag: "纯音乐" },
                            ].map((song, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] shadow-xs hover:border-[var(--c-primary)]/50 transition-colors cursor-pointer group" 
                                    onClick={() => onPlayMusic?.(`${song.title} ${song.artist}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--c-input)] flex items-center justify-center text-[var(--c-text-sub)] group-hover:text-[var(--c-primary)] transition-colors">
                                            <Play size={14} className="ml-0.5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-[var(--c-text-title)]">{song.title}</span>
                                            <span className="text-[10px] text-[var(--c-text-sub)]">{song.artist}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-input)] text-[var(--c-text-sub)]">{song.tag}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "about" && (
                    <div className="p-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] flex flex-col gap-3.5 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-sm text-[var(--c-text-title)]">
                            <Info size={16} className="text-[var(--c-primary)]" />
                            <span>关于 {character.name}</span>
                        </div>
                        <div className="flex flex-col gap-2 text-[var(--c-text-sub)] leading-relaxed">
                            <div><strong className="text-[var(--c-text-title)]">姓名：</strong>{character.name}</div>
                            {character.gender && <div><strong className="text-[var(--c-text-title)]">性别：</strong>{character.gender}</div>}
                            {character.timeZone && <div><strong className="text-[var(--c-text-title)]">所在时区：</strong>{character.timeZone}</div>}
                            <div><strong className="text-[var(--c-text-title)]">设定详情：</strong><br />{character.persona || "暂无详细设定"}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
