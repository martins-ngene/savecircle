"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { setWalletSession, useWalletSession, type WalletSession } from "@/lib/wallet-session";
import type { ApiCircle } from "./api";

function useRead<T>(read: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ data: T } | { error: unknown }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    read(controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ error });
    });
    return () => controller.abort();
  }, [read, attempt]);

  return {
    result,
    refresh() {
      setResult((current) => current && "error" in current ? undefined : current);
      setAttempt((value) => value + 1);
    },
  };
}

function ReadError({ error, retry }: { error: unknown; retry: () => void }) {
  if (error instanceof ApiError && error.status === 401) return <div role="alert">
    <p>Your wallet session expired.</p>
    <Link className="button outline" href="/connect" onClick={() => setWalletSession(null)}>Reconnect wallet</Link>
  </div>;
  return <div role="alert">
    <p>{error instanceof Error ? error.message : "Could not load your data."}</p>
    <button type="button" className="button outline" onClick={retry}>Try again</button>
  </div>;
}

type Props<T> = {
  path: string;
  read: (circleId: string, token: string, signal: AbortSignal) => Promise<T>;
  children: (circle: ApiCircle, data: T, refresh: () => void) => ReactNode;
};

export function CircleReader<T>(props: Props<T>) {
  const session = useWalletSession();
  if (session === undefined) return <p role="status">Loading wallet session…</p>;
  if (!session) return <Link className="button primary" href="/connect">Connect wallet</Link>;
  return <WalletCircles key={session.accessToken} {...props} session={session} />;
}

function WalletCircles<T>({ session, path, read, children }: Props<T> & { session: WalletSession }) {
  const params = useSearchParams();
  const router = useRouter();
  const [readCircles] = useState(() => (signal: AbortSignal) => apiRequest<ApiCircle[]>("groups/my-circles", { token: session.accessToken, signal }));
  const { result, refresh } = useRead(readCircles);
  if (!result) return <p role="status">Loading your circles…</p>;
  if ("error" in result) return <ReadError error={result.error} retry={refresh} />;
  const circles = result.data;
  if (!circles.length) return <p>You haven’t joined a circle yet. <Link href="/dashboard/circles">Go to My Circles</Link></p>;

  const requested = params.get("circle");
  const selected = requested ? circles.find((circle) => circle.id === requested) : circles[0];
  return <>
    <div>
      <select className="dash-circle-picker" aria-label="Savings circle" value={selected?.id ?? ""} onChange={(event) => {
        const query = new URLSearchParams(params.toString());
        query.set("circle", event.target.value);
        router.push(`${path}?${query}`);
      }}>
        {!selected && <option value="" disabled>Select a circle</option>}
        {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
      </select>
    </div>
    {selected ? <CircleRecord key={selected.id} circle={selected} token={session.accessToken} read={read}>{children}</CircleRecord>
      : <p role="status">This circle is unavailable for your wallet.</p>}
  </>;
}

function CircleRecord<T>({ circle, token, read, children }: Omit<Props<T>, "path"> & { circle: ApiCircle; token: string }) {
  const [readCircle] = useState(() => (signal: AbortSignal) => read(circle.id, token, signal));
  const { result, refresh } = useRead(readCircle);
  if (!result) return <p role="status">Loading circle records…</p>;
  if ("error" in result) return <ReadError error={result.error} retry={refresh} />;
  return children(circle, result.data, refresh);
}
