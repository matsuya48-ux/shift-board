/**
 * メール送信ユーティリティ（Resend）
 *
 * - 環境変数:
 *   - RESEND_API_KEY: Resend の API キー（必須）
 *   - FEEDBACK_EMAIL_TO: 通知先メール（未設定時は送信スキップ）
 *   - FEEDBACK_EMAIL_FROM: 送信元（未設定時は onboarding@resend.dev）
 *   - APP_PUBLIC_URL: アプリのURL（メール本文のリンク用）
 *
 * 設定が不十分な場合はエラーを投げずに false を返すだけにする（DB書き込みは成功させる）。
 */

import { Resend } from "resend";

type SendResult = { ok: boolean; error?: string };

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export async function sendMail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  const sender = from ?? process.env.FEEDBACK_EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await client.emails.send({
      from: sender,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
    if (error) {
      return { ok: false, error: error.message ?? "Unknown email error" };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * 機能リクエスト到着を管理者にメール通知する。
 * - 失敗しても throw しない（DB登録は成功扱いにするため）
 */
export async function notifyFeedbackByEmail(payload: {
  category: "feature" | "ui" | "bug" | "other";
  title: string;
  body: string;
  staffName: string;
  warehouseName: string | null;
}): Promise<SendResult> {
  const to = process.env.FEEDBACK_EMAIL_TO;
  if (!to) return { ok: false, error: "FEEDBACK_EMAIL_TO is not set" };

  const categoryLabel = {
    feature: "✨ 機能",
    ui: "🎨 見た目",
    bug: "🐛 不具合",
    other: "💬 その他",
  }[payload.category];

  const appUrl = process.env.APP_PUBLIC_URL ?? "";
  const adminUrl = appUrl ? `${appUrl}/admin/feedback` : "/admin/feedback";

  const subject = `[SHIFT BOARD / ${categoryLabel.replace(/^.\s/, "")}] ${payload.title}`;

  const safeBody = payload.body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1713; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 4px; font-size: 12px; letter-spacing: 0.1em; color: #2d5545; text-transform: uppercase;">SHIFT BOARD / Feedback</p>
  <h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.4;">${escapeHtml(payload.title)}</h1>
  <table style="font-size: 13px; color: #555; margin-bottom: 20px; border-collapse: collapse;">
    <tr><td style="padding: 2px 12px 2px 0;">カテゴリ</td><td>${categoryLabel}</td></tr>
    <tr><td style="padding: 2px 12px 2px 0;">送信者</td><td>${escapeHtml(payload.staffName)}${payload.warehouseName ? `（${escapeHtml(payload.warehouseName)}）` : ""}</td></tr>
  </table>
  <div style="background: #f5f3ee; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.7;">
    ${safeBody}
  </div>
  ${
    appUrl
      ? `<p style="margin-top: 24px;"><a href="${adminUrl}" style="display: inline-block; background: #2d5545; color: #fff; padding: 10px 18px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: 600;">管理画面で確認する</a></p>`
      : ""
  }
  <p style="margin-top: 32px; font-size: 11px; color: #999;">このメールは SHIFT BOARD から自動送信されました。</p>
</div>`.trim();

  const text = [
    `[SHIFT BOARD] 新しいリクエスト`,
    ``,
    `カテゴリ: ${categoryLabel}`,
    `送信者: ${payload.staffName}${payload.warehouseName ? `（${payload.warehouseName}）` : ""}`,
    `タイトル: ${payload.title}`,
    ``,
    `--- 内容 ---`,
    payload.body,
    ``,
    appUrl ? `管理画面: ${adminUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendMail({ to, subject, html, text });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
