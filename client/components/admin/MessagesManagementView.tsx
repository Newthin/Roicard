/**
 * MessagesManagementView
 *
 * Admin-only manual email console. Two tabs:
 *  - Compose: filter members, pick recipients, write plain-text mail, preview,
 *    test to self, and send one individual email per recipient through the
 *    queue.
 *  - Sent: delivery progress, per-recipient failure reasons and retry.
 *
 * Route: /admin/messages
 */

"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import {
  checkAdminMessageDuplicates,
  createAdminMessage,
  getAdminMessage,
  getAdminMessageQuota,
  getAdminMessageRecipients,
  getAdminMessages,
  previewAdminMessage,
  retryAdminMessage,
  sendAdminMessageTest,
  type AdminMessage,
  type AdminMessageAudienceFilters,
  type AdminMessageAudiencePayload,
  type AdminMessageCategory,
  type AdminMessagePreview,
  type AdminMessageQuota,
  type AdminMessageRecipient,
  type AdminMessageRecipientPreview,
} from "@/lib/api/admin";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab = "compose" | "sent";

type FiltersState = {
  search: string;
  status: "" | "draft" | "active";
  onboarding: "" | "yes" | "no";
  verified: "" | "yes" | "no";
  campaign: string;
  createdFrom: string;
  createdTo: string;
  includeAdmins: boolean;
};

const EMPTY_FILTERS: FiltersState = {
  search: "",
  status: "",
  onboarding: "",
  verified: "",
  campaign: "",
  createdFrom: "",
  createdTo: "",
  includeAdmins: false,
};

type Template = {
  id: string;
  label: string;
  category: AdminMessageCategory;
  subject: string;
  body: string;
};

const TEMPLATES: Template[] = [
  {
    id: "disruption",
    label: "Service disruption",
    category: "service",
    subject: "Roicard service disruption",
    body: `Hi {full_name},

We are currently investigating a disruption affecting Roicard. You may be unable to access your profile or dashboard for a short time.

We are working on it now and will email you again as soon as service is restored. No action is needed from you.

Thanks for your patience,
The Roicard Team`,
  },
  {
    id: "restored",
    label: "Service restored",
    category: "service",
    subject: "Roicard service restored",
    body: `Hi {full_name},

Roicard is back online. You can sign in and use your profile and dashboard as usual.

If anything still looks wrong, contact our support team using the address in the footer of this email.

Thanks for bearing with us,
The Roicard Team`,
  },
  {
    id: "draft-nudge",
    label: "Draft nudge",
    category: "nudge",
    subject: "Your Roicard draft is still saved",
    body: `Hi {full_name},

Your Roicard profile is saved privately as a draft — it is not visible to anyone yet.

When you are ready, activate your membership to make it live and start connecting. If you have any questions, our support team is happy to help.

Thanks,
The Roicard Team`,
  },
];

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `admin-message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function apiError(error: unknown): string {
  const response = (error as { response?: { data?: unknown } })?.response;
  const data = response?.data as
    | { message?: string; errors?: string[] | Record<string, string[]> }
    | undefined;

  if (Array.isArray(data?.errors)) {
    return data.errors.join(" ");
  }

  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }

  return data?.message || "Something went wrong. Please try again.";
}

function statusStyles(status: AdminMessage["status"]): string {
  switch (status) {
    case "sent":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "partial":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "sending":
      return "border-sky-500/30 bg-sky-500/10 text-sky-400";
    default:
      return "border-roicard-border bg-roicard-bg-muted text-roicard-text-muted";
  }
}

function recipientStatusStyles(status: AdminMessageRecipient["status"]): string {
  switch (status) {
    case "sent":
      return "text-emerald-400";
    case "failed":
      return "text-red-400";
    case "sending":
      return "text-sky-400";
    default:
      return "text-roicard-text-muted";
  }
}

export function MessagesManagementView() {
  const [tab, setTab] = useState<Tab>("compose");

  /* ------------------------------ audience ------------------------------ */
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recipients, setRecipients] = useState<AdminMessageRecipientPreview[]>([]);
  const [matchingCount, setMatchingCount] = useState(0);
  const [recipientsLastPage, setRecipientsLastPage] = useState(1);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [quota, setQuota] = useState<AdminMessageQuota | null>(null);

  const [scope, setScope] = useState<"none" | "all" | "selected">("none");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [excludedIds, setExcludedIds] = useState<Set<number>>(() => new Set());

  /* ------------------------------ composer ------------------------------ */
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AdminMessageCategory>("service");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [testState, setTestState] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<AdminMessagePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* ------------------------------- send -------------------------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [duplicateInfo, setDuplicateInfo] = useState<{
    count: number;
    window_days: number;
    recipients: AdminMessageRecipientPreview[];
  } | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<AdminMessage | null>(null);
  const sendKeyRef = useRef("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /* ------------------------------- sent -------------------------------- */
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesLastPage, setMessagesLastPage] = useState(1);
  const [messageSearch, setMessageSearch] = useState("");
  const [messageStatus, setMessageStatus] = useState("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    message: AdminMessage;
    recipients: AdminMessageRecipient[];
    total: number;
    current_page: number;
    last_page: number;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const loadQuota = useCallback(async () => {
    try {
      setQuota(await getAdminMessageQuota());
    } catch {
      // A quota read failure should not block composing.
    }
  }, []);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    setRecipientsError(null);

    try {
      const response = await getAdminMessageRecipients({
        page,
        per_page: 20,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        onboarding_completed:
          filters.onboarding === "yes"
            ? true
            : filters.onboarding === "no"
              ? false
              : undefined,
        email_verified:
          filters.verified === "yes"
            ? true
            : filters.verified === "no"
              ? false
              : undefined,
        campaign_code: filters.campaign.trim() || undefined,
        created_from: filters.createdFrom || undefined,
        created_to: filters.createdTo || undefined,
        include_admins: filters.includeAdmins,
      });

      setRecipients(response.data);
      setMatchingCount(response.count);
      setRecipientsLastPage(response.last_page);
    } catch (error) {
      setRecipientsError(apiError(error));
    } finally {
      setLoadingRecipients(false);
    }
  }, [
    page,
    debouncedSearch,
    filters.status,
    filters.onboarding,
    filters.verified,
    filters.campaign,
    filters.createdFrom,
    filters.createdTo,
    filters.includeAdmins,
  ]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const updateFilter = <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K]
  ) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const selectedCount = useMemo(() => {
    if (scope === "all") return Math.max(0, matchingCount - excludedIds.size);
    if (scope === "selected") return selectedIds.size;
    return 0;
  }, [scope, matchingCount, excludedIds.size, selectedIds.size]);

  const isChecked = (id: number): boolean => {
    if (scope === "all") return !excludedIds.has(id);
    if (scope === "selected") return selectedIds.has(id);
    return false;
  };

  const toggleRecipient = (id: number) => {
    if (scope === "all") {
      setExcludedIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }

    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    setSelectedIds(next);
    setScope(next.size === 0 ? "none" : "selected");
  };

  // Page-scoped select-all: toggles every row currently visible in the table.
  const pageIds = useMemo(() => recipients.map((recipient) => recipient.id), [recipients]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => isChecked(id));
  const someOnPageSelected =
    !allOnPageSelected && pageIds.some((id) => isChecked(id));

  const togglePageSelection = () => {
    if (pageIds.length === 0) return;

    const selectPage = !allOnPageSelected;

    if (scope === "all") {
      setExcludedIds((previous) => {
        const next = new Set(previous);
        for (const id of pageIds) {
          if (selectPage) next.delete(id);
          else next.add(id);
        }
        return next;
      });
      return;
    }

    if (scope === "none") {
      if (!selectPage) return;
      setSelectedIds(new Set(pageIds));
      setScope("selected");
      return;
    }

    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const id of pageIds) {
        if (selectPage) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAllMatching = () => {
    setScope("all");
    setExcludedIds(new Set());
    setSelectedIds(new Set());
  };

  const clearSelection = () => {
    setScope("none");
    setExcludedIds(new Set());
    setSelectedIds(new Set());
  };

  const buildFilters = (): AdminMessageAudienceFilters => ({
    search: debouncedSearch.trim() || undefined,
    status: filters.status || undefined,
    onboarding_completed:
      filters.onboarding === "yes"
        ? true
        : filters.onboarding === "no"
          ? false
          : undefined,
    email_verified:
      filters.verified === "yes"
        ? true
        : filters.verified === "no"
          ? false
          : undefined,
    has_campaign_code: undefined,
    campaign_code: filters.campaign.trim() || undefined,
    created_from: filters.createdFrom || undefined,
    created_to: filters.createdTo || undefined,
  });

  const buildAudience = (): AdminMessageAudiencePayload => {
    if (scope === "selected") {
      return {
        include_user_ids: Array.from(selectedIds),
        include_admins: filters.includeAdmins,
      };
    }

    if (scope === "all") {
      return {
        filters: buildFilters(),
        exclude_user_ids: Array.from(excludedIds),
        include_admins: filters.includeAdmins,
      };
    }

    return {};
  };

  const insertPlaceholder = (token: string) => {
    const element = bodyRef.current;
    const start = element?.selectionStart ?? body.length;
    const end = element?.selectionEnd ?? start;

    setBody(body.slice(0, start) + token + body.slice(end));

    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      const position = start + token.length;
      element.setSelectionRange(position, position);
    });
  };

  const applyTemplate = (template: Template) => {
    setActiveTemplate(template.id === activeTemplate ? null : template.id);
    if (template.id === activeTemplate) return;

    setSubject(template.subject);
    setBody(template.body);
    setCategory(template.category);
    setComposerError(null);
    setTestState(null);
  };

  const validateComposer = (): string | null => {
    if (!subject.trim()) return "Add a subject before continuing.";
    if (!body.trim()) return "Write a message before continuing.";
    if (selectedCount === 0) return "Select at least one recipient.";
    return null;
  };

  const openConfirm = () => {
    const problem = validateComposer();
    if (problem) {
      setComposerError(problem);
      return;
    }

    if (quota && selectedCount > quota.daily_remaining) {
      setComposerError(
        `This send needs ${selectedCount} emails but only ${quota.daily_remaining} of today's Resend budget remain.`
      );
      return;
    }

    setComposerError(null);
    setSendError(null);
    setConfirmationText("");
    setDuplicateInfo(null);
    setDuplicateAcknowledged(false);
    sendKeyRef.current = newIdempotencyKey();
    setConfirmOpen(true);
  };

  const runDuplicateCheck = useCallback(async () => {
    if (!subject.trim()) return;

    setCheckingDuplicates(true);
    setSendError(null);

    try {
      const result = await checkAdminMessageDuplicates(subject.trim(), buildAudience());
      setDuplicateInfo(result);
      setDuplicateAcknowledged(false);
    } catch (error) {
      setSendError(apiError(error));
    } finally {
      setCheckingDuplicates(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, scope, selectedIds, excludedIds, filters]);

  useEffect(() => {
    if (confirmOpen) {
      void runDuplicateCheck();
    }
  }, [confirmOpen, runDuplicateCheck]);

  const handleSend = async () => {
    if (sending) return;

    const problem = validateComposer();
    if (problem) {
      setSendError(problem);
      return;
    }

    if (duplicateInfo && duplicateInfo.count > 0 && !duplicateAcknowledged) {
      setSendError(
        "Acknowledge the recent duplicate warning before sending. Duplicates will be skipped."
      );
      return;
    }

    if (selectedCount > 50 && confirmationText.trim() !== String(selectedCount)) {
      setSendError(`Type ${selectedCount} to confirm this large send.`);
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const message = await createAdminMessage(
        {
          subject: subject.trim(),
          body,
          category,
          expected_recipient_count: selectedCount,
          confirmation_text: confirmationText.trim() || undefined,
          acknowledge_duplicates: duplicateAcknowledged || undefined,
          ...buildAudience(),
        },
        sendKeyRef.current || newIdempotencyKey()
      );

      setLastSent(message);
      setConfirmOpen(false);
      clearSelection();
      await loadQuota();
      setTab("sent");
      setMessagesPage(1);
    } catch (error) {
      setSendError(apiError(error));
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    if (!subject.trim() || !body.trim()) {
      setComposerError("Add a subject and message before previewing.");
      return;
    }

    setPreviewLoading(true);
    setComposerError(null);

    // Preview with a real recipient when one is available, so the placeholder
    // substitution can be checked against an actual member's name.
    const previewUserId =
      scope === "selected"
        ? Array.from(selectedIds)[0]
        : recipients[0]?.id;

    try {
      const result = await previewAdminMessage({
        subject: subject.trim(),
        body,
        category,
        user_id: previewUserId,
      });
      setPreview(result);
      setPreviewOpen(true);
    } catch (error) {
      setComposerError(apiError(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setComposerError("Add a subject and message before sending a test.");
      return;
    }

    setTesting(true);
    setComposerError(null);
    setTestState(null);

    try {
      const result = await sendAdminMessageTest({
        subject: subject.trim(),
        body,
        category,
      });
      setTestState({ type: "success", message: result.message });
    } catch (error) {
      setTestState({ type: "error", message: apiError(error) });
    } finally {
      setTesting(false);
    }
  };

  /* ------------------------------ sent list ----------------------------- */

  const loadMessages = useCallback(
    async (targetPage: number) => {
      setMessagesLoading(true);
      setMessagesError(null);

      try {
        const response = await getAdminMessages({
          page: targetPage,
          per_page: 20,
          search: messageSearch.trim() || undefined,
          status: messageStatus || undefined,
        });

        setMessages(response.data);
        setMessagesLastPage(response.last_page);
      } catch (error) {
        setMessagesError(apiError(error));
      } finally {
        setMessagesLoading(false);
      }
    },
    [messageSearch, messageStatus]
  );

  useEffect(() => {
    if (tab === "sent") void loadMessages(messagesPage);
  }, [tab, messagesPage, loadMessages]);

  const hasActiveMessages = messages.some(
    (message) =>
      message.status === "queued" || message.status === "sending" || message.is_stuck
  );

  const loadDetail = useCallback(
    async (id: number, targetPage: number, status: string) => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAdminMessage(id, {
          page: targetPage,
          per_page: 50,
          status: status || undefined,
        });

        setDetail({
          message: response.message,
          recipients: response.recipients,
          total: response.total,
          current_page: response.current_page,
          last_page: response.last_page,
        });
      } catch (error) {
        setDetailError(apiError(error));
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (tab !== "sent" || !hasActiveMessages) return;

    const timer = setInterval(() => {
      void loadMessages(messagesPage);
      if (detailId !== null) void loadDetail(detailId, detailPage, detailStatus);
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hasActiveMessages, messagesPage, detailId, detailPage, detailStatus]);

  useEffect(() => {
    if (detailId === null) {
      setDetail(null);
      return;
    }

    void loadDetail(detailId, detailPage, detailStatus);
  }, [detailId, detailPage, detailStatus, loadDetail]);

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailPage(1);
    setDetailStatus("");
  };

  const handleRetry = async () => {
    if (detailId === null || retrying) return;

    setRetrying(true);
    setDetailError(null);

    try {
      await retryAdminMessage(detailId, newIdempotencyKey());
      await loadDetail(detailId, detailPage, detailStatus);
      await loadMessages(messagesPage);
      await loadQuota();
    } catch (error) {
      setDetailError(apiError(error));
    } finally {
      setRetrying(false);
    }
  };

  /* -------------------------------- render ------------------------------ */

  const quotaTone =
    quota && quota.daily_remaining < 10 ? "text-amber-400" : "text-roicard-text-muted";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-roicard-text">
            <Mail className="h-6 w-6 text-roicard-accent" />
            Messages
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-roicard-text-muted">
            Send a service notice or a truthful draft nudge to selected members.
            Every recipient gets their own email — never a shared To/CC list.
          </p>
        </div>

        <div className="flex rounded-lg border border-roicard-border bg-roicard-bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab("compose")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              tab === "compose"
                ? "bg-roicard-bg-elevated text-roicard-text shadow-sm"
                : "text-roicard-text-muted hover:text-roicard-text"
            )}
          >
            Compose
          </button>
          <button
            type="button"
            onClick={() => setTab("sent")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              tab === "sent"
                ? "bg-roicard-bg-elevated text-roicard-text shadow-sm"
                : "text-roicard-text-muted hover:text-roicard-text"
            )}
          >
            Sent messages
          </button>
        </div>
      </div>

      {lastSent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            “{lastSent.subject}” queued for {lastSent.recipient_count} recipient
            {lastSent.recipient_count === 1 ? "" : "s"}
            {lastSent.skipped_count > 0
              ? ` (${lastSent.skipped_count} duplicate${lastSent.skipped_count === 1 ? "" : "s"} skipped)`
              : ""}
            .
          </span>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => setLastSent(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {tab === "compose" ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Recipient picker */}
          <section className="space-y-4 rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-roicard-text">
                  <Filter className="h-4 w-4 text-roicard-accent" />
                  Recipients
                </h2>
                <p className="text-xs text-roicard-text-muted">
                  Soft-deleted accounts and admins are excluded unless you opt in.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllMatching}>
                  Select all {matchingCount} matching
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted"
                  aria-hidden
                />
                <Input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search name or email…"
                  className="pl-9"
                  aria-label="Search members"
                />
              </div>

              <select
                value={filters.status}
                onChange={(event) =>
                  updateFilter("status", event.target.value as FiltersState["status"])
                }
                className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
                aria-label="Status filter"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft membership</option>
                <option value="active">Active membership</option>
              </select>

              <select
                value={filters.onboarding}
                onChange={(event) =>
                  updateFilter(
                    "onboarding",
                    event.target.value as FiltersState["onboarding"]
                  )
                }
                className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
                aria-label="Onboarding filter"
              >
                <option value="">Any onboarding state</option>
                <option value="yes">Onboarding complete</option>
                <option value="no">Onboarding incomplete</option>
              </select>

              <select
                value={filters.verified}
                onChange={(event) =>
                  updateFilter(
                    "verified",
                    event.target.value as FiltersState["verified"]
                  )
                }
                className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
                aria-label="Email verification filter"
              >
                <option value="">Any verification state</option>
                <option value="yes">Email verified</option>
                <option value="no">Email unverified</option>
              </select>

              <Input
                value={filters.campaign}
                onChange={(event) => updateFilter("campaign", event.target.value)}
                placeholder="Campaign code (e.g. NLF)"
                aria-label="Campaign code"
              />

              <Input
                type="date"
                value={filters.createdFrom}
                onChange={(event) => updateFilter("createdFrom", event.target.value)}
                aria-label="Registered from"
              />

              <Input
                type="date"
                value={filters.createdTo}
                onChange={(event) => updateFilter("createdTo", event.target.value)}
                aria-label="Registered to"
              />

              <label className="flex items-center gap-2 text-sm text-roicard-text sm:col-span-2">
                <input
                  type="checkbox"
                  checked={filters.includeAdmins}
                  onChange={(event) =>
                    updateFilter("includeAdmins", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-roicard-border"
                />
                Include admin accounts in the audience
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-roicard-bg-muted px-3 py-2 text-sm">
              <span className="text-roicard-text-muted">
                Matching: <strong className="text-roicard-text">{matchingCount}</strong>
              </span>
              <span className="text-roicard-text-muted">
                Selected:{" "}
                <strong className="text-roicard-text">{selectedCount}</strong>
              </span>
              {scope === "all" && (
                <span className="text-xs text-roicard-text-muted">
                  all matching minus {excludedIds.size} excluded
                </span>
              )}
            </div>

            {recipientsError && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {recipientsError}
              </p>
            )}

            <div className="overflow-x-auto rounded-lg border border-roicard-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-roicard-bg-muted text-xs uppercase tracking-wide text-roicard-text-muted">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = someOnPageSelected;
                        }}
                        onChange={togglePageSelection}
                        disabled={recipients.length === 0}
                        className="h-4 w-4 rounded border-roicard-border disabled:opacity-40"
                        aria-label="Select all members on this page"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Campaign</th>
                    <th className="px-3 py-2">Draft window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-roicard-border">
                  {loadingRecipients ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
                      </td>
                    </tr>
                  ) : recipients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-sm text-roicard-text-muted"
                      >
                        No members match these filters.
                      </td>
                    </tr>
                  ) : (
                    recipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-roicard-bg-muted/60">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked(recipient.id)}
                            onChange={() => toggleRecipient(recipient.id)}
                            className="h-4 w-4 rounded border-roicard-border"
                            aria-label={`Select ${recipient.name}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-roicard-text">
                            {recipient.name || "Unnamed member"}
                          </p>
                          <p className="text-xs text-roicard-text-muted">
                            {recipient.email}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium",
                                recipient.status === "active"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              )}
                            >
                              {recipient.status}
                            </span>
                            <span className="text-xs text-roicard-text-muted">
                              {recipient.onboarding_completed
                                ? "Onboarding done"
                                : "Onboarding incomplete"}
                              {recipient.email_verified ? " · verified" : " · unverified"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-roicard-text-muted">
                          {recipient.campaign_code || "—"}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {recipient.draft_closes_at ? (
                            <span
                              className={cn(
                                "inline-flex flex-col rounded-md px-2 py-1",
                                (recipient.draft_days_remaining ?? 99) <= 2
                                  ? "bg-red-500/10 text-red-400"
                                  : (recipient.draft_days_remaining ?? 99) <= 4
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "text-roicard-text-muted"
                              )}
                            >
                              <span className="font-semibold">
                                {recipient.draft_days_remaining ?? 0} day
                                {(recipient.draft_days_remaining ?? 0) === 1 ? "" : "s"} left
                              </span>
                              <span>Closes {formatDate(recipient.draft_closes_at)}</span>
                            </span>
                          ) : (
                            <span className="text-roicard-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-roicard-text-muted">
              <span>
                Page {page} of {recipientsLastPage}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || loadingRecipients}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= recipientsLastPage || loadingRecipients}
                  onClick={() =>
                    setPage((current) => Math.min(recipientsLastPage, current + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          {/* Composer */}
          <section className="space-y-4 self-start rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-5 xl:sticky xl:top-6">
            <div>
              <h2 className="text-lg font-semibold text-roicard-text">Compose</h2>
              <p className="text-xs text-roicard-text-muted">
                Plain text with automatic links. Raw HTML is escaped, and unknown
                placeholders are rejected.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-roicard-text-muted">
                Quick-start templates
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      activeTemplate === template.id
                        ? "border-roicard-accent bg-roicard-accent/10 text-roicard-accent"
                        : "border-roicard-border text-roicard-text-muted hover:border-roicard-accent/50 hover:text-roicard-text"
                    )}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              placeholder="Roicard service disruption"
            />

            <div className="space-y-2">
              <label
                htmlFor="message-category"
                className="block text-sm font-medium text-roicard-text"
              >
                Message type
              </label>
              <select
                id="message-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as AdminMessageCategory)
                }
                className="h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
              >
                <option value="service">Service / account notice</option>
                <option value="nudge">Draft activation nudge</option>
              </select>
              <p className="text-xs text-roicard-text-muted">
                Draft nudges are checked so they never claim a draft profile is live
                or shareable.
              </p>
            </div>

            <Textarea
              ref={bodyRef}
              label="Message"
              rows={12}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={20000}
              placeholder={"Hi {full_name},\n\n…"}
              hint="Each recipient gets their own copy with their own details filled in. Blank lines become paragraphs."
            />

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-roicard-text-muted">Insert:</span>
              {(["full_name", "first_name", "last_name", "email"] as const).map(
                (token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertPlaceholder(`{${token}}`)}
                    className="rounded-full border border-roicard-border px-2.5 py-1 font-mono text-roicard-text-muted transition hover:border-roicard-accent/50 hover:text-roicard-text"
                    title={`Insert {${token}} at the cursor`}
                  >
                    {`{${token}}`}
                  </button>
                )
              )}
            </div>
            <p className="-mt-2 text-xs text-roicard-text-muted">
              Tip: start with <code className="font-mono">Hi {"{full_name}"},</code> and
              Ebenezer Akparibo gets “Hi Ebenezer Akparibo,” — every member sees their
              own name.
            </p>

            {composerError && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {composerError}
              </p>
            )}

            {testState && (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  testState.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                )}
              >
                {testState.message}
              </p>
            )}

            <div className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-xs text-roicard-text-muted">
              <span className={cn("font-semibold", quotaTone)}>
                Resend daily budget: {quota ? `${quota.daily_remaining} left` : "…"}
              </span>
              {quota && (
                <span>
                  {" "}
                  · tracked manual sends today: {quota.committed_today}/{quota.daily_limit}
                </span>
              )}
              <p className="mt-1">
                Other app email (welcome, reminders) also counts toward the real Resend
                quota. Sends that would exceed the tracked daily budget are blocked.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={handlePreview}
                isLoading={previewLoading}
                disabled={previewLoading}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="secondary"
                onClick={handleTestSend}
                isLoading={testing}
                disabled={testing}
              >
                <Send className="h-4 w-4" />
                Send test to myself
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={openConfirm}
              disabled={selectedCount === 0}
            >
              <Send className="h-4 w-4" />
              Review &amp; send to {selectedCount}{" "}
              {selectedCount === 1 ? "recipient" : "recipients"}
            </Button>
          </section>
        </div>
      ) : (
        /* ----------------------------- sent tab ---------------------------- */
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted"
                  aria-hidden
                />
                <Input
                  value={messageSearch}
                  onChange={(event) => {
                    setMessageSearch(event.target.value);
                    setMessagesPage(1);
                  }}
                  placeholder="Search subject…"
                  className="pl-9"
                  aria-label="Search sent messages"
                />
              </div>
              <select
                value={messageStatus}
                onChange={(event) => {
                  setMessageStatus(event.target.value);
                  setMessagesPage(1);
                }}
                className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
                aria-label="Filter by delivery status"
              >
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="sending">Sending</option>
                <option value="sent">Sent</option>
                <option value="partial">Partially failed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => void loadMessages(messagesPage)}
              isLoading={messagesLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {hasActiveMessages && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
              <Clock className="h-4 w-4" />
              Delivery is in progress. This view refreshes every 5 seconds — queued
              means the worker has not picked it up yet.
            </div>
          )}

          {messagesError && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {messagesError}
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-roicard-border bg-roicard-bg-elevated">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-roicard-bg-muted text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Sent by</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {messagesLoading && messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
                    </td>
                  </tr>
                ) : messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-roicard-text-muted"
                    >
                      No messages sent yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((message) => (
                    <tr key={message.id} className="hover:bg-roicard-bg-muted/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-roicard-text">
                          {message.subject}
                        </p>
                        <p className="text-xs text-roicard-text-muted">
                          {message.category === "nudge" ? "Draft nudge" : "Service notice"}
                          {message.skipped_count > 0
                            ? ` · ${message.skipped_count} duplicate skipped`
                            : ""}
                        </p>
                        {message.is_stuck && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Stuck — check that roicard-worker is running.
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-roicard-text-muted">
                        {message.sent_by_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-emerald-400">{message.sent_count} sent</span>
                        <span className="text-roicard-text-muted">
                          {" "}
                          · {message.queued_count} queued
                        </span>
                        {message.failed_count > 0 && (
                          <span className="text-red-400">
                            {" "}
                            · {message.failed_count} failed
                          </span>
                        )}
                        <p className="text-roicard-text-muted">
                          of {message.recipient_count}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                            statusStyles(message.status)
                          )}
                        >
                          {message.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-roicard-text-muted">
                        {formatDate(message.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(message.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-roicard-text-muted">
            <span>
              Page {messagesPage} of {messagesLastPage}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={messagesPage <= 1}
                onClick={() => setMessagesPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={messagesPage >= messagesLastPage}
                onClick={() =>
                  setMessagesPage((current) => Math.min(messagesLastPage, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Preview modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Message preview"
        description={preview ? `Subject: ${preview.subject}` : undefined}
        className="max-w-3xl"
      >
        {preview && (
          <div className="space-y-3">
            <iframe
              title="Rendered email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[480px] w-full rounded-lg border border-roicard-border bg-white"
            />
            <p className="text-xs text-roicard-text-muted">
              Rendered for {preview.recipient?.name || "the signed-in admin"}. Each
              recipient receives a separately addressed copy.
            </p>
          </div>
        )}
      </Modal>

      {/* Confirmation modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => (sending ? undefined : setConfirmOpen(false))}
        title="Confirm send"
        description="This queues one individual email per recipient."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 py-3 text-sm">
            <p className="text-roicard-text-muted">Subject</p>
            <p className="font-semibold text-roicard-text">{subject.trim()}</p>
            <p className="mt-2 text-roicard-text-muted">Recipients</p>
            <p className="font-semibold text-roicard-text">
              {selectedCount} {selectedCount === 1 ? "member" : "members"} ·{" "}
              {category === "nudge" ? "Draft nudge" : "Service notice"}
            </p>
            {quota && (
              <p className="mt-2 text-xs text-roicard-text-muted">
                Resend daily budget after this send:{" "}
                {Math.max(0, quota.daily_remaining - selectedCount)} of{" "}
                {quota.daily_limit}.
              </p>
            )}
          </div>

          {checkingDuplicates && (
            <p className="flex items-center gap-2 text-sm text-roicard-text-muted">
              <Clock className="h-4 w-4 animate-spin" />
              Checking recent messages with this subject…
            </p>
          )}

          {duplicateInfo && duplicateInfo.count > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                {duplicateInfo.count} recipient
                {duplicateInfo.count === 1 ? "" : "s"} already received this subject in
                the last {duplicateInfo.window_days} days
              </p>
              <p className="text-xs">
                They will be skipped to prevent an accidental duplicate send. The rest
                still receive their own copy.
              </p>
              {duplicateInfo.recipients.length > 0 && (
                <p className="text-xs">
                  e.g. {duplicateInfo.recipients.map((person) => person.email).join(", ")}
                </p>
              )}
              <label className="mt-2 flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={duplicateAcknowledged}
                  onChange={(event) => setDuplicateAcknowledged(event.target.checked)}
                  className="h-4 w-4 rounded border-roicard-border"
                />
                Skip these recent recipients and send to the rest
              </label>
            </div>
          )}

          {selectedCount > 50 && (
            <Input
              label={`Type ${selectedCount} to confirm this large send`}
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              inputMode="numeric"
              placeholder={String(selectedCount)}
            />
          )}

          {sendError && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {sendError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSend()}
              isLoading={sending}
              disabled={
                sending ||
                checkingDuplicates ||
                (duplicateInfo !== null &&
                  duplicateInfo.count > 0 &&
                  !duplicateAcknowledged) ||
                (selectedCount > 50 && confirmationText.trim() !== String(selectedCount))
              }
            >
              <Send className="h-4 w-4" />
              Send {selectedCount} email{selectedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sent detail modal */}
      <Modal
        isOpen={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail?.message.subject || "Message detail"}
        description={
          detail
            ? `${detail.message.sent_count} sent · ${detail.message.queued_count} queued · ${detail.message.failed_count} failed`
            : undefined
        }
        className="max-w-4xl"
      >
        {detailLoading && !detail ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {detail.message.is_stuck && (
              <p className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Delivery looks stuck. Confirm roicard-worker is active on the server.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Recipients", detail.message.recipient_count],
                ["Sent", detail.message.sent_count],
                ["Queued", detail.message.queued_count],
                ["Failed", detail.message.failed_count],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2"
                >
                  <p className="text-xs text-roicard-text-muted">{label}</p>
                  <p className="text-lg font-semibold text-roicard-text">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-roicard-text-muted">
                Message
              </p>
              <pre className="mt-1 whitespace-pre-wrap text-sm text-roicard-text">
                {detail.message.body}
              </pre>
              <p className="mt-2 text-xs text-roicard-text-muted">
                Sent by {detail.message.sent_by_name || "an admin"} ·{" "}
                {formatDate(detail.message.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={detailStatus}
                onChange={(event) => {
                  setDetailStatus(event.target.value);
                  setDetailPage(1);
                }}
                className="h-10 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 text-sm text-roicard-text"
                aria-label="Filter recipients by status"
              >
                <option value="">All recipients</option>
                <option value="queued">Queued</option>
                <option value="sending">Sending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>

              {detail.message.failed_count > 0 &&
                (detail.message.status === "failed" ||
                  detail.message.status === "partial") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRetry()}
                  isLoading={retrying}
                  disabled={retrying}
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry {detail.message.failed_count} failed
                </Button>
              )}
            </div>

            {detailError && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {detailError}
              </p>
            )}

            <div className="max-h-[320px] overflow-auto rounded-lg border border-roicard-border">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-roicard-bg-muted text-xs uppercase tracking-wide text-roicard-text-muted">
                  <tr>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Attempts</th>
                    <th className="px-3 py-2">Sent</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-roicard-border">
                  {detail.recipients.map((recipient) => (
                    <tr key={recipient.id}>
                      <td className="px-3 py-2">
                        <p className="text-roicard-text">{recipient.name || "—"}</p>
                        <p className="text-xs text-roicard-text-muted">
                          {recipient.email}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium capitalize",
                            recipientStatusStyles(recipient.status)
                          )}
                        >
                          {recipient.status === "sent" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : recipient.status === "failed" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {recipient.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-roicard-text-muted">
                        {recipient.attempts}
                      </td>
                      <td className="px-3 py-2 text-xs text-roicard-text-muted">
                        {formatDate(recipient.sent_at)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-400">
                        {recipient.error || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-roicard-text-muted">
              <span>
                Page {detail.current_page} of {detail.last_page} · {detail.total}{" "}
                recipients
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={detailPage <= 1}
                  onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={detailPage >= detail.last_page}
                  onClick={() =>
                    setDetailPage((current) => Math.min(detail.last_page, current + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : detailError ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
            {detailError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
