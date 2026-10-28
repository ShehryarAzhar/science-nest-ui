import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { studentAccessFallback } from "@/components/student-access/student-access-fallback";
import { cn } from "@/lib/utils";
import { getAccount, type Account } from "./account-data";
import { AccountErrorBoundary } from "./account-error-boundary";
import { AccountShell } from "./account-shell";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

function DetailRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("wrap-anywhere", className)}>{children}</dd>
    </div>
  );
}

function AccountDetails({ account }: { account: Account }) {
  const name = [account.first_name, account.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const email = account.email.trim();

  return (
    <>
      <dl className="divide-y divide-border rounded-lg border bg-card p-6">
        <DetailRow label="Username">{account.username}</DetailRow>
        <DetailRow label="Email">{email || <NotSet />}</DetailRow>
        <DetailRow label="Name">{name || <NotSet />}</DetailRow>
        {/* Admin accounts have no phone number, so no row */}
        {account.phone_number !== null && (
          <DetailRow label="Phone" className="tabular-nums">
            {account.phone_number}
          </DetailRow>
        )}
      </dl>
      <p className="mt-4 text-muted-foreground">
        To change these details, ask your tutor.
      </p>
    </>
  );
}

// The guard's states replace the whole page (they bring their own layout
// and h1). Anything else is rethrown to AccountErrorBoundary
async function AccountContent() {
  let account: Account;
  try {
    account = await getAccount();
  } catch (error) {
    const fallback = studentAccessFallback(error);
    if (fallback) return fallback;
    throw error;
  }

  return (
    <AccountShell>
      <AccountDetails account={account} />
    </AccountShell>
  );
}

// Part of the prerendered shell, so the heading shows at once. Static on
// purpose: CLAUDE.md › Design › Motion allows no pulse
function AccountFallback() {
  return (
    <AccountShell>
      <div role="status">
        <span className="sr-only">Loading…</span>
        <div aria-hidden className="h-56 rounded-lg bg-muted sm:h-48" />
      </div>
    </AccountShell>
  );
}

export default function AccountPage() {
  return (
    <AccountErrorBoundary>
      <Suspense fallback={<AccountFallback />}>
        <AccountContent />
      </Suspense>
    </AccountErrorBoundary>
  );
}
