"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { categories, chapters, contract, explorer, proofImage, proofs } from "./content";

export function ContractStatus() {
  const [status, setStatus] = useState("Checking deployment configuration");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ contractId: string; usdcTokenId: string; network: string }>("blockchain/config", { signal: controller.signal })
      .then((config) => {
        if (controller.signal.aborted) return;
        setStatus(config.network === "TESTNET" && config.contractId === contract.id && config.usdcTokenId === contract.usdc
          ? "Deployment configuration matches"
          : "Deployment configuration differs");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("Configuration check unavailable"); });
    return () => controller.abort();
  }, []);
  return <p className="proof-status eyebrow" role="status"><span aria-hidden="true" />Stellar Testnet · {status}</p>;
}

function chapterTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Walkthrough() {
  const player = useRef<HTMLVideoElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  return <div className="proof-card proof-walkthrough">
    <div>
      <video ref={player} controls playsInline preload="metadata" poster={proofImage("01_wallet.png")}
        src="/recordings/savecircle_walkthrough.webm" aria-label="SaveCircle screen walkthrough"
        onError={() => setUnavailable(true)} />
      {unavailable && <p role="status">The video is unavailable. You can browse the captured screens in the gallery below.</p>}
    </div>
    <div className="proof-chapters">
      <h3>Chapters</h3>
      <ol>{chapters.map(({ start, title }) => <li key={start}><button type="button" disabled={unavailable} onClick={() => {
        if (!player.current) return;
        player.current.currentTime = start;
      }}><time dateTime={`PT${start}S`}>{chapterTime(start)}</time>{title}</button></li>)}</ol>
    </div>
  </div>;
}

export function Gallery() {
  const [category, setCategory] = useState<(typeof categories)[number] | "All Proofs">("All Proofs");
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const bodyOverflow = useRef<string | null>(null);
  const filtered = proofs.filter((proof) => category === "All Proofs" || proof.category === category);
  const proof = filtered[selected] ?? filtered[0];

  function move(direction: number) {
    setSelected((previous) => (previous + direction + filtered.length) % filtered.length);
  }

  function unlock() {
    if (bodyOverflow.current !== null) {
      document.body.style.overflow = bodyOverflow.current;
      bodyOverflow.current = null;
    }
  }

  useEffect(() => () => {
    if (bodyOverflow.current !== null) document.body.style.overflow = bodyOverflow.current;
  }, []);

  return <>
    <div className="proof-filters" role="group" aria-label="Filter proofs">
      {(["All Proofs", ...categories] as const).map((label) => <button key={label} type="button"
        aria-pressed={label === category} onClick={() => { setCategory(label); setSelected(0); }}>{label}</button>)}
    </div>
    <div className="proof-gallery">
      {filtered.map((item, index) => <button type="button" className="proof-card proof-thumb" key={item.file} aria-haspopup="dialog"
        onClick={(event) => {
          if (!dialog.current) return;
          opener.current = event.currentTarget;
          setSelected(index);
          dialog.current.showModal();
          bodyOverflow.current = document.body.style.overflow;
          document.body.style.overflow = "hidden";
        }}>
        <Image src={proofImage(item.file)} alt="" width={1440} height={900} sizes="(max-width: 660px) 90vw, (max-width: 1000px) 44vw, 350px" />
        <span className="proof-caption"><span className="eyebrow">{item.category}</span><strong>{item.title}</strong><span>{item.description}</span></span>
      </button>)}
    </div>
    <dialog ref={dialog} className="proof-dialog" aria-labelledby="proof-image-title" onClose={() => {
      unlock();
      opener.current?.focus();
    }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }
    }} onClick={(event) => {
      if (event.target === event.currentTarget) dialog.current?.close();
    }}>
      <article>
        <div className="proof-dialog-bar">
          <p aria-live="polite">Proof {selected + 1} of {filtered.length}</p>
          <div><button type="button" aria-label="Previous proof" disabled={filtered.length < 2} onClick={() => move(-1)}>←</button>
            <button type="button" aria-label="Next proof" disabled={filtered.length < 2} onClick={() => move(1)}>→</button>
            <button type="button" onClick={() => dialog.current?.close()}>Close</button></div>
        </div>
        <Image src={proofImage(proof.file)} alt={proof.title} width={1440} height={900} sizes="90vw" />
        <div className="proof-dialog-caption" aria-live="polite">
          <h3 id="proof-image-title">{proof.title}</h3><p>{proof.description}</p>
          <p><code>{proof.method}</code> · <code>{proof.endpoint}</code></p>
        </div>
      </article>
    </dialog>
  </>;
}

export function Credentials() {
  const [feedback, setFeedback] = useState("");
  const rows = [
    ["Contract ID", contract.id], ["WASM hash", contract.wasm], ["USDC SAC token", contract.usdc],
    ["Admin wallet", contract.admin], ["Deploy transaction", contract.deployment],
  ];

  return <div className="proof-credentials">
    <h2 id="credentials-heading">Stellar Testnet Deployment Specifications</h2>
    <dl>{rows.map(([label, value]) => <div key={label}>
      <dt>{label}</dt><dd><code>{value}</code><button type="button" aria-label={`Copy ${label}`} onClick={async () => {
        try { await navigator.clipboard.writeText(value); setFeedback(`${label} copied.`); }
        catch { setFeedback(`Clipboard unavailable. Select the ${label.toLowerCase()} to copy it.`); }
      }}>Copy</button></dd>
    </div>)}</dl>
    <p role="status">{feedback}</p>
    <div className="actions">
      <a className="button" href={explorer.lab} target="_blank" rel="noopener noreferrer">Stellar Lab contract ↗</a>
      <a className="button" href={explorer.deployment} target="_blank" rel="noopener noreferrer">Deploy transaction ↗</a>
    </div>
  </div>;
}
