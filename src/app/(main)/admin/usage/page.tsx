"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { key: string; calls: number; inputTokens: number; outputTokens: number; thinkingTokens: number; costUsd: number | null };
type Data = {
  byUser: Row[]; byRef: Row[]; byStep: Row[]; byModel: Row[]; unpricedModels: string[];
  totalCostUsd: number | null; emails: Record<string, string>; recordCount: number;
};

type Admin = { uid: string; email: string | null };

/** Lists admins and lets an admin add or remove one by email. Renders nothing for non-admins (the API returns 403). */
function AdminsCard() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [you, setYou] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchAdmins = async () => {
    const res = await apiFetch("/api/admin/admins");
    return res.ok ? ((await res.json()) as { admins: Admin[]; you: string }) : null;
  };
  const apply = (j: { admins: Admin[]; you: string } | null) => {
    setAdmins(j?.admins ?? null);
    setYou(j?.you ?? "");
  };
  const refresh = () => fetchAdmins().then(apply);
  useEffect(() => { fetchAdmins().then(apply).catch(() => setAdmins(null)); }, []);

  async function change(target: string, admin: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, admin }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) setMsg(j?.error || "Could not update admin rights.");
      else {
        setMsg(`${admin ? "Added" : "Removed"} ${j.email}.`);
        if (admin) setEmail("");
        await refresh();
      }
    } catch {
      setMsg("Could not update admin rights.");
    } finally {
      setBusy(false);
    }
  }

  if (!admins) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Admins</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1">
          {admins.map((a) => (
            <li key={a.uid} className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs">{a.email ?? a.uid}{a.uid === you ? " (you)" : ""}</span>
              {a.uid !== you && a.email && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => change(a.email!, false)}>Remove</Button>
              )}
            </li>
          ))}
        </ul>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); change(email, true); }}>
          <div className="space-y-1">
            <Label htmlFor="new-admin">Add admin by email</Label>
            <Input id="new-admin" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-72" />
          </div>
          <Button type="submit" disabled={busy}>Add</Button>
        </form>
        <p className="text-sm text-muted-foreground">They must have signed up in the app first.</p>
        {msg && <p className="text-sm">{msg}</p>}
      </CardContent>
    </Card>
  );
}

const today = new Date().toISOString().slice(0, 10);
const n = (x: number) => x.toLocaleString("en-IN");

export default function AdminUsagePage() {
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg(null);
    setData(null);
    try {
      const res = await apiFetch(`/api/admin/usage?from=${from}&to=${to}`);
      if (res.status === 403) setMsg("Not authorised.");
      else if (res.status === 401) setMsg("Sign in again.");
      else if (!res.ok) setMsg((await res.json().catch(() => null))?.error || "Could not load usage.");
      else setData(await res.json());
    } catch {
      setMsg("Could not load usage.");
    } finally {
      setLoading(false);
    }
  }

  const usd = (c: number | null) => (c === null ? "Price not set" : `$${c.toFixed(2)}`);

  const table = (title: string, rows: Row[], label: (k: string) => string = (k) => k) => (
    <Card key={title}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.replace("By ", "")}</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Input</TableHead>
              <TableHead className="text-right">Output</TableHead>
              <TableHead className="text-right">Thinking</TableHead>
              <TableHead className="text-right">USD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="font-mono text-xs">{label(r.key)}</TableCell>
                <TableCell className="text-right">{n(r.calls)}</TableCell>
                <TableCell className="text-right">{n(r.inputTokens)}</TableCell>
                <TableCell className="text-right">{n(r.outputTokens)}</TableCell>
                <TableCell className="text-right">{n(r.thinkingTokens)}</TableCell>
                <TableCell className="text-right">{usd(r.costUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Gemini usage</h1>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="usage-from">From</Label>
          <Input id="usage-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="usage-to">To</Label>
          <Input id="usage-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Load"}</Button>
      </div>
      {msg && <p>{msg}</p>}
      <AdminsCard />
      {data && (
        <>
          <p className="text-lg">
            {n(data.recordCount)} calls, estimated total {usd(data.totalCostUsd)}
          </p>
          {data.unpricedModels.length > 0 && (
            <p className="text-sm">No price for: {data.unpricedModels.join(", ")}. Add prices in src/lib/usage/prices.ts.</p>
          )}
          {table("By user", data.byUser, (k) => (data.emails[k] ? `${data.emails[k]} (${k})` : k))}
          {table("By ref", data.byRef)}
          {table("By step", data.byStep)}
          {table("By model", data.byModel)}
        </>
      )}
    </div>
  );
}
