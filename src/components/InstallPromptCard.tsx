"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, Share, Plus, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type OS = "ios" | "android";

const DISMISS_KEY = "install_dismissed_v1";

export function InstallPromptCard() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [os, setOs] = useState<OS>("ios");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 既にスタンドアロンモードならスキップ
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean })
        .standalone === true;
    if (isStandalone) return;

    // 前回dismiss済みならスキップ
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    // OS検出（スマホのみ対象）
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (!isIos && !isAndroid) {
      // PCでは表示しない
      return;
    }

    if (isIos) setOs("ios");
    else setOs("android");

    // beforeinstallprompt（Android Chrome系）
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    setShow(true);

    return () =>
      window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function handleNativeInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      dismiss();
    }
  }

  if (!show) return null;

  const canNativeInstall = installEvent !== null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl bg-[color:var(--surface)] shadow-[var(--shadow-sm)] animate-rise">
      {/* 上部 */}
      <button
        type="button"
        onClick={() =>
          canNativeInstall ? handleNativeInstall() : setExpanded(!expanded)
        }
        className="flex w-full items-center gap-3.5 p-4 text-left transition-colors active:bg-[color:var(--bg)]"
      >
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)]">
          <Smartphone
            className="h-[18px] w-[18px] text-[color:var(--accent)]"
            strokeWidth={1.8}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[13px] font-semibold leading-snug tracking-tight text-[color:var(--ink)]">
            ホーム画面に追加すると便利です
          </p>
          <p className="truncate text-[11px] leading-snug text-[color:var(--ink-3)]">
            {canNativeInstall
              ? "タップしてインストール"
              : "タップで手順を表示"}
          </p>
        </div>
        {canNativeInstall ? (
          <Download
            className="h-4 w-4 flex-shrink-0 text-[color:var(--accent)]"
            strokeWidth={2}
          />
        ) : null}
      </button>

      {/* 手順 */}
      {!canNativeInstall && expanded && (
        <div className="border-t border-[color:var(--line)] p-4 pt-3 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
          {os === "ios" && (
            <ol className="space-y-2">
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  1.
                </span>
                <span>
                  画面下（または上）の
                  <span className="mx-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[color:var(--bg)] align-middle">
                    <Share className="h-3 w-3" strokeWidth={2} />
                  </span>
                  共有ボタンをタップ
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  2.
                </span>
                <span>
                  メニューから
                  <span className="mx-1 inline-flex items-center gap-0.5 rounded bg-[color:var(--bg)] px-1.5 py-0.5 align-middle">
                    <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium">
                      ホーム画面に追加
                    </span>
                  </span>
                  を選択
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  3.
                </span>
                <span>右上の「追加」をタップして完了</span>
              </li>
            </ol>
          )}
          {os === "android" && (
            <ol className="space-y-2">
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  1.
                </span>
                <span>ブラウザの「⋮」メニューをタップ</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  2.
                </span>
                <span>「ホーム画面に追加」を選択</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-[color:var(--accent)]">
                  3.
                </span>
                <span>「追加」をタップで完了</span>
              </li>
            </ol>
          )}
        </div>
      )}

      {/* 閉じるボタン */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--ink-4)] transition-colors hover:bg-[color:var(--bg)] hover:text-[color:var(--ink-2)]"
        aria-label="閉じる"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
