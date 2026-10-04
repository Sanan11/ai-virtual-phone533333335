"use client";

import { useCallback, useState } from "react";
import { VnSelect } from "./vn-select";
import { VnChapters } from "./vn-chapters";
import { VnPlayer } from "./vn-player";
import { loadVnConfig, saveVnConfig } from "@/lib/vn-storage";

interface VnAppProps {
  onClose: () => void;
  initialCharacterId?: string | null;
  initialDateInfo?: {
    location?: string;
    time?: string;
    matter?: string;
  } | null;
}

type VnView = "select" | "chapters" | "player";

import { useEffect, useRef } from "react";
import { createOrGetVnSession, startNewChapter, pushVnMessage } from "@/lib/vn-storage";

export function VnApp({ onClose, initialCharacterId, initialDateInfo }: VnAppProps) {
  const initializedRef = useRef(false);
  const [view, setView] = useState<VnView>(() => initialCharacterId ? "player" : "select");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() => initialCharacterId || null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);

  useEffect(() => {
    if (initializedRef.current || !initialCharacterId || !initialDateInfo) return;
    initializedRef.current = true;

    const session = createOrGetVnSession(initialCharacterId);
    const location = initialDateInfo.location?.trim() || "线下之约";
    const time = initialDateInfo.time?.trim() || "约定时刻";
    const matter = initialDateInfo.matter?.trim() || "心动赴约";

    // 自动为本次线下约会开辟独立漫卷章节
    const chapterTitle = `约会 · ${location}`;
    const chapterSubtitle = `${time} · ${matter}`;
    const chapter = startNewChapter(session.id, chapterTitle, chapterSubtitle);
    const newIdx = chapter ? chapter.index : Math.max(0, session.chapters.length - 1);
    setActiveChapterIndex(newIdx);

    // 预置初见开场剧情背景
    const initialScript = `<scene bg="${location}">\n【${location} · ${time}】\n${matter}\n你依约前赴，四周的光景渐渐与相约时的低语重叠。\n</scene>`;
    pushVnMessage({
      sessionId: session.id,
      chapterIndex: newIdx,
      role: "assistant",
      rawContent: initialScript,
    });
  }, [initialCharacterId, initialDateInfo]);
  const [vnTheme, setVnThemeState] = useState(() => loadVnConfig("theme") || "default");

  const setVnTheme = useCallback((t: string) => {
    setVnThemeState(t);
    saveVnConfig("theme", t);
  }, []);

  const handleCharacterSelect = useCallback((characterId: string) => {
    setSelectedCharacterId(characterId);
    setView("chapters");
  }, []);

  const handleChapterSelect = useCallback((chapterIndex: number) => {
    setActiveChapterIndex(chapterIndex);
    setView("player");
  }, []);

  const handleChapterEnd = useCallback(() => {
    setView("chapters");
  }, []);

  const handleBackFromChapters = useCallback(() => {
    setSelectedCharacterId(null);
    setView("select");
  }, []);

  const handleBackFromPlayer = useCallback(() => {
    setView("chapters");
  }, []);

  const handleOpenAssets = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-app", { detail: { appId: "resources", resourcePage: "vn_assets" } }));
  }, []);

  if (view === "select") {
    return (
      <VnSelect
        onClose={onClose}
        onSelect={handleCharacterSelect}
        vnTheme={vnTheme}
        onThemeChange={setVnTheme}
        onOpenAssets={handleOpenAssets}
      />
    );
  }

  if (view === "chapters" && selectedCharacterId) {
    return (
      <VnChapters
        characterId={selectedCharacterId}
        onClose={handleBackFromChapters}
        onSelect={handleChapterSelect}
        vnTheme={vnTheme}
      />
    );
  }

  if (view === "player" && selectedCharacterId) {
    return (
      <VnPlayer
        characterId={selectedCharacterId}
        chapterIndex={activeChapterIndex}
        onClose={handleBackFromPlayer}
        onChapterEnd={handleChapterEnd}
        vnTheme={vnTheme}
      />
    );
  }

  return null;
}
