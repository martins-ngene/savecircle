import Image from "next/image";
import { faqs, navigation, security, steps, visibility } from "@/features/landing/content";
import { HeaderMenu } from "@/features/landing/header-menu";
import { Icon } from "@/features/landing/icon";
import { Planner } from "@/features/landing/planner";

function Brand() {
  return <a className="brand" href="#top"><span><Icon name="users" /></span>SaveCircle</a>;
}

function Navigation({ label }: { label: string }) {
  return <nav aria-label={label}>{navigation.map(([id, text]) => <a key={id} href={`#${id}`}>{id === "planner" && label === "Footer" ? "Circle planner" : text}</a>)}{label === "Footer" && <><a href="/dashboard">Dashboard</a><a href="/proof">Product proof</a></>}</nav>;
}

function StartLink({ short = false }: { short?: boolean }) {
  return <a className="button primary" href="#planner">{short ? "Start a circle" : <>Start a savings circle <Icon name="arrow" /></>}</a>;
}

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header id="top" className="header">
        <div className="wrap header-inner">
          <Brand />
          <HeaderMenu>
            <Navigation label="Main" />
            <div className="actions"><a className="button outline" href="/connect">Connect wallet</a><StartLink short /></div>
          </HeaderMenu>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="wrap hero">
          <div>
            <span className="pill eyebrow"><i />Built on Stellar · Powered by Soroban</span>
            <h1>Save together.<em>Grow with trust.</em></h1>
            <p className="hero-description">A transparent home for ajo, esusu and community savings. Set the rules, contribute in USDC, and let secure smart contracts keep everyone accountable.</p>
            <div className="actions"><StartLink /><a className="button outline" href="#how-it-works">See how it works</a></div>
            <ul className="proofs">
              <li><Icon name="shield" />On-chain records</li><li><Icon name="lock" />Rule-based payouts</li><li><Icon name="coin" />Testnet USDC</li>
            </ul>
          </div>
          <figure className="hero-art">
            <div className="hero-image">
              <Image src="/assets/heroImage.jpg" alt="Friends laughing around a dinner table" fill sizes="(max-width: 900px) 92vw, 500px" preload />
              <span className="pill friend-pill"><Icon name="users" />Friends saving with purpose</span>
              <figcaption><span className="eyebrow">The Growth Circle</span><strong>Different dreams. One circle<br className="desktop-break" /> that moves everyone forward.</strong><small>5 friends <b>•</b> Monthly contributions <b>•</b> 500 USDC shared goal</small></figcaption>
            </div>
            <div className="progress"><div className="eyebrow">Circle progress</div><div className="spread"><strong>400</strong><small>of 500 USDC</small></div><progress aria-label="Example circle funding" value="400" max="500" /><small><Icon name="clock" />One friend to go</small></div>
            <div className="receipt"><div><span className="round"><Icon name="check" /></span><span>Contribution paid<strong>100.00 USDC</strong></span></div><small className="spread"><span>Stellar Testnet</span><span>Verified <Icon name="external" /></span></small></div>
          </figure>
        </section>
        <div className="stats"><dl className="wrap">{[["100%", "transparent records"], ["3", "flexible schedules"], ["USDC", "testnet contributions"], ["24/7", "ledger visibility"]].map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}</dl></div>
        <section className="wrap section" id="how-it-works" tabIndex={-1}>
          <div className="section-intro"><div><span className="eyebrow rule">A better way to save together</span><h2>From agreement to payout,<br /> everyone stays in the loop.</h2></div><p>SaveCircle digitizes the trust and discipline of community savings without making blockchain feel complicated.</p></div>
          <ol className="steps">{steps.map(([icon, title, body, tag], index) => <li key={title} className="panel"><div className="spread"><span className="tile"><Icon name={icon} /></span><span className="eyebrow muted">0{index + 1}</span></div><h3>{title}</h3><p>{body}</p><span className="tag"><Icon name="check" />{tag}</span></li>)}</ol>
        </section>
        <section className="dark" id="security" tabIndex={-1}><div className="wrap section security">
          <div><span className="pill eyebrow"><Icon name="shield" />Trust, built into the rules</span><h2>Not just a promise.<em>Proof everyone can see.</em></h2><p>Soroban is the source of truth for every contribution, balance, approval and payout, so no single person can quietly change the books.</p><a className="text-link" href="#planner">Build a transparent plan <Icon name="arrow" /></a></div>
          <div className="security-grid">{security.map(([icon, title, body]) => <article key={title}><Icon name={icon} /><h3>{title}</h3><p>{body}</p></article>)}</div>
        </div></section>
        <section className="planner-section" id="planner" tabIndex={-1}><div className="wrap section">
          <div className="center section-heading"><span className="eyebrow rule">Interactive circle planner</span><h2>See what your circle could achieve.</h2><p>Adjust your group size, contribution and frequency. We’ll map the rotating payout structure instantly.</p></div>
          <Planner />
        </div></section>
        <section className="wrap section community">
          <div className="community-grid">
            <figure className="community-art"><Image src="/assets/sectionImage.jpg" alt="Three women talking together over coffee" fill sizes="(max-width: 900px) 92vw, 470px" /><figcaption className="panel"><Icon name="users" /><strong>Built for the way communities already save.</strong><small>Ajo · Esusu · Adashi</small></figcaption></figure>
            <div><span className="eyebrow rule">Clarity for every member</span><h2>No chasing. No guesswork. No hidden books.</h2><p>Every member sees the same schedule, payment status, payout position and group activity on mobile or desktop.</p>
              <div className="visibility">{visibility.map(([icon, title, body]) => <article key={title}><span className="tile"><Icon name={icon} /></span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
            </div>
          </div>
          <section className="ledger panel" id="ledger">
            <div className="ledger-intro"><span className="eyebrow rule">Member ledger</span><h2>Your full savings story, in one view.</h2><p>Contributions, obligations and payouts are clearly separated, so members always know what has happened and what comes next.</p><div className="deadline"><small className="spread">Next payment deadline <Icon name="calendar" /></small><strong>May 28, 2025</strong><small>100.00 USDC · Cycle 4</small></div></div>
            <div className="ledger-body"><dl className="metrics">{[["Total contributed", "300.00", "USDC"], ["Outstanding", "100.00", "USDC"], ["Payout position", "# 3", "of 5"]].map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value} <small>{unit}</small></dd></div>)}</dl>
              <div className="spread"><strong>Recent activity</strong><span className="small">Example ledger</span></div>
              <ul className="activity">{[["Contribution · Cycle 3", "May 01, 2025", "+100.00 USDC", "Confirmed"], ["Contribution · Cycle 2", "Apr 01, 2025", "+100.00 USDC", "Confirmed"], ["Payout received", "Mar 04, 2025", "+500.00 USDC", "Completed"]].map(([title, date, value, status]) => <li key={title}><span className="round"><Icon name={status === "Completed" ? "coin" : "arrow"} /></span><div>{title}<small>{date}</small></div><strong>{value}<small>{status}</small></strong></li>)}</ul>
            </div>
          </section>
        </section>
        <section className="faq-section" id="faqs" tabIndex={-1}><div className="wrap section faq">
          <div><span className="eyebrow rule">Good to know</span><h2>Questions, answered simply.</h2><p>Still curious? We’re making community finance easier to understand.</p></div>
          <div>{faqs.map(([question, answer], index) => <details key={question} name="faq" open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div></section>
        <section className="wrap closing center">
          <span className="pill eyebrow"><Icon name="users" />Better together</span><h2>Turn shared goals into shared progress.</h2><p>Create a circle where every contribution counts, every rule is clear and every payout can be verified.</p>
          <div className="actions"><StartLink /><a className="button outline" href="/connect">Connect wallet</a></div>
        </section>
      </main>
      <footer className="wrap footer">
        <div className="spread"><div><Brand /><p>Transparent group savings and rotating<br /> payouts, built on Stellar.</p></div><Navigation label="Footer" /></div>
        <div className="spread footer-bottom"><span>© 2025 SaveCircle. Built for communities that grow together.</span><span><i />Stellar Testnet MVP</span></div>
      </footer>
    </>
  );
}
