/**
 * usePaymentDateLogic.ts
 *
 * Frontend layer for payment date awareness.
 * - Detects today's date zone (1st, 20th, 24th, 25th, 26th+)
 * - Returns the right message, urgency level, and popup flag
 * - Also triggers auto reset / late marking via Supabase RPC
 *   as a fallback if cron hasn't run yet
 */

import { useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentStatus } from "@/lib/store";

// ── TEST MODE ─────────────────────────────────────────────
// Test பண்ண இந்த number மாத்துங்க (1-31), null = real today
// Example: const TEST_DAY: number | null = 26;
// Done-ஆனப்பறம் null-ஆ வையுங்க!
const TEST_DAY: number | null = null;

export type PaymentDateZone =
  | "first_of_month"   // 1st  → auto reset
  | "reminder"         // 2nd–20th pending → gentle reminder
  | "warning"          // 21st–24th → stronger warning
  | "tomorrow_last"    // 24th → "நாளை last date"
  | "today_last"       // 25th → "இன்று last date"
  | "overdue"          // 26th+ → late
  | "paid";            // already paid

export interface PaymentDateInfo {
  zone: PaymentDateZone;
  day: number;
  month: string;           // e.g. "மே"
  monthEn: string;         // e.g. "May"
  nextMonth: string;       // e.g. "ஜூன்"
  nextMonthEn: string;
  currentYear: number;
  showPopup: boolean;
  urgency: "low" | "medium" | "high" | "critical";
  cardMessage: string | null;
  notificationTitle: string | null;
  notificationBody: string | null;
}

const TAMIL_MONTHS: Record<number, string> = {
  1: "ஜனவரி", 2: "பிப்ரவரி", 3: "மார்ச்", 4: "ஏப்ரல்",
  5: "மே", 6: "ஜூன்", 7: "ஜூலை", 8: "ஆகஸ்ட்",
  9: "செப்டம்பர்", 10: "அக்டோபர்", 11: "நவம்பர்", 12: "டிசம்பர்",
};

const EN_MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function usePaymentDateLogic(
  paymentStatus: PaymentStatus,
  studentId: string,
  onAutoStatusChange?: (newStatus: PaymentStatus) => void,
): PaymentDateInfo {
  const now = new Date();
  const day = TEST_DAY ?? now.getDate(); // TEST_DAY உள்ளே number போட்டு test பண்ணுங்க
  const monthIdx = now.getMonth() + 1; // 1-based
  const nextMonthIdx = monthIdx === 12 ? 1 : monthIdx + 1;
  const currentYear = now.getFullYear();

  const month = TAMIL_MONTHS[monthIdx];
  const monthEn = EN_MONTHS[monthIdx];
  const nextMonth = TAMIL_MONTHS[nextMonthIdx];
  const nextMonthEn = EN_MONTHS[nextMonthIdx];

  // ── Frontend auto-trigger (fallback if cron missed) ─────

  // Month 1st → reset THIS student to pending via SECURITY DEFINER function
  const triggerAutoReset = useCallback(async () => {
    if (paymentStatus === "pending") return; // already pending
    const key = `auto_reset_${monthIdx}_${currentYear}_${studentId}`;
    if (localStorage.getItem(key)) return;
    try {
      const { error } = await (supabase.rpc as any)("auto_mark_student_pending", { p_student_id: studentId });
      if (!error) {
        localStorage.setItem(key, "1");
        onAutoStatusChange?.("pending");
      }
    } catch { /* cron will handle */ }
  }, [monthIdx, currentYear, studentId, paymentStatus, onAutoStatusChange]);

  // 26th+ → mark THIS student late via SECURITY DEFINER function (bypasses RLS)
  const triggerAutoLate = useCallback(async () => {
    if (paymentStatus !== "pending") return; // only pending → late
    const key = `auto_late_${monthIdx}_${currentYear}_${studentId}`;
    if (localStorage.getItem(key)) return;
    try {
      const { error } = await (supabase.rpc as any)("auto_mark_student_late", { p_student_id: studentId });
      if (!error) {
        localStorage.setItem(key, "1");
        onAutoStatusChange?.("late");
      }
    } catch { /* cron will handle */ }
  }, [monthIdx, currentYear, studentId, paymentStatus, onAutoStatusChange]);

  useEffect(() => {
    if (day === 1) triggerAutoReset();
    if (day >= 26) triggerAutoLate();
  }, [day, triggerAutoReset, triggerAutoLate]);

  // ── Compute zone & messages ──────────────────────────────
  const info = useMemo((): PaymentDateInfo => {
    const base = { day, month, monthEn, nextMonth, nextMonthEn, currentYear };

    // Already paid → no messages needed
    if (paymentStatus === "paid") {
      return {
        ...base,
        zone: "paid",
        showPopup: false,
        urgency: "low",
        cardMessage: null,
        notificationTitle: null,
        notificationBody: null,
      };
    }

    // Late (26th+, status already set to late)
    if (paymentStatus === "late" || day >= 26) {
      const cardMessage =
        `நீங்கள் ${month} மாதத்துக்குரிய பணத்தினை செலுத்த தாமதமானதால் ${month} மாதத்துக்குரிய பருவகால சீட்டுக்களினை பெற்றுக் கொள்ள முடியாது😔\n\n${nextMonth} மாதம் 25ஆம் திகதிக்கு முன் பணத்தை செலுத்தி பருவக்கால சீட்டுகளை பெற்றுக் கொள்ளவும்`;
      return {
        ...base,
        zone: "overdue",
        showPopup: true,
        urgency: "critical",
        cardMessage,
        notificationTitle: `${month} மாத கட்டணம் தாமதம்! ⚠️`,
        notificationBody: `${nextMonth} 25-க்கு முன் செலுத்தவும். சீட்டு கிடைக்காது.`,
      };
    }

    // 25th → Today is last date
    if (day === 25) {
      const cardMessage =
        `பருவகால சீட்டுகளுக்குரிய பணத்தினை 25ஆம் திகதிக்கு முன் செலுத்தவும்\nபணம் செலுத்த தாமதமானால் இந்த மாதத்திற்குரிய பருவக்கால சீட்டுகளை பெற்றுக் கொள்ள முடியாது😔\n\n⏰ இன்று last date!`;
      return {
        ...base,
        zone: "today_last",
        showPopup: true,
        urgency: "critical",
        cardMessage,
        notificationTitle: "இன்று last date! ⏰",
        notificationBody: `${month} மாத கட்டணம் இன்றே செலுத்தவும் — நாளை சீட்டு கிடைக்காது.`,
      };
    }

    // 24th → Tomorrow is last date
    if (day === 24) {
      const cardMessage =
        `பருவகால சீட்டுகளுக்குரிய பணத்தினை 25ஆம் திகதிக்கு முன் செலுத்தவும்\nபணம் செலுத்த தாமதமானால் இந்த மாதத்திற்குரிய பருவக்கால சீட்டுகளை பெற்றுக் கொள்ள முடியாது😔\n\n📅 நாளை last date!`;
      return {
        ...base,
        zone: "tomorrow_last",
        showPopup: true,
        urgency: "high",
        cardMessage,
        notificationTitle: "நாளை last date! 📅",
        notificationBody: `${month} 25 last date. நாளை செலுத்தவும்!`,
      };
    }

    // 21st–23rd → Warning zone
    if (day >= 21 && day <= 23) {
      const cardMessage =
        `பருவகால சீட்டுகளுக்குரிய பணத்தினை 25ஆம் திகதிக்கு முன் செலுத்தவும்\nபணம் செலுத்த தாமதமானால் இந்த மாதத்திற்குரிய பருவக்கால சீட்டுகளை பெற்றுக் கொள்ள முடியாது😔`;
      return {
        ...base,
        zone: "warning",
        showPopup: false,
        urgency: "high",
        cardMessage,
        notificationTitle: `${month} கட்டணம் — ${25 - day} நாட்கள் மட்டுமே!`,
        notificationBody: "25-க்கு முன் செலுத்தவும். தாமதமானால் சீட்டு கிடைக்காது.",
      };
    }

    // 2nd–20th → Gentle reminder
    if (day >= 2 && day <= 20) {
      const cardMessage =
        `பருவகால சீட்டுகளுக்குரிய பணத்தினை 25ஆம் திகதிக்கு முன் செலுத்தவும்\nபணம் செலுத்த தாமதமானால் இந்த மாதத்திற்குரிய பருவக்கால சீட்டுகளை பெற்றுக் கொள்ள முடியாது😔`;
      return {
        ...base,
        zone: "reminder",
        showPopup: false,
        urgency: "medium",
        cardMessage,
        notificationTitle: `${month} கட்டணம் — Due before 25th`,
        notificationBody: "25ஆம் திகதிக்கு முன் Rs.530 செலுத்தவும்.",
      };
    }

    // 1st of month
    return {
      ...base,
      zone: "first_of_month",
      showPopup: false,
      urgency: "low",
      cardMessage: `${month} மாத கட்டணம் — 25ஆம் திகதிக்கு முன் செலுத்தவும்`,
      notificationTitle: `புதிய மாதம் — ${month} கட்டணம் Due`,
      notificationBody: "Rs.530 — 25ஆம் திகதிக்கு முன் செலுத்தவும்.",
    };
  }, [day, paymentStatus, month, monthEn, nextMonth, nextMonthEn, currentYear]);

  return info;
}
