import { chromium } from '/Users/martinium-dev/projects/buildershq-projects/ticketchain/ticketchain-frontend/node_modules/playwright/index.mjs';
import { Keypair } from '@stellar/stellar-sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const RECORDINGS_DIR = path.resolve(__dirname, '../apps/frontend/public/recordings');
const SCREENSHOTS_DIR = path.resolve(RECORDINGS_DIR, 'screenshots');
const FINAL_VIDEO_PATH = path.resolve(RECORDINGS_DIR, 'savecircle_walkthrough.webm');

if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let currentMouseX = 120;
let currentMouseY = 120;

async function smoothMouseMove(page, targetX, targetY, steps = 20) {
  const startX = currentMouseX;
  const startY = currentMouseY;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = 1 - Math.pow(1 - t, 3);
    const x = startX + (targetX - startX) * ease;
    const y = startY + (targetY - startY) * ease;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  currentMouseX = targetX;
  currentMouseY = targetY;
  await page.waitForTimeout(140);
}

async function hoverAndClick(page, selectorOrLocator, delayAfter = 700) {
  try {
    const locator = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
    const box = await locator.boundingBox();
    if (box) {
      await smoothMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(120);
      await page.mouse.up();
      await page.waitForTimeout(delayAfter);
      return;
    }
  } catch (_) {}
  try {
    if (typeof selectorOrLocator === 'string') {
      await page.click(selectorOrLocator);
    } else {
      await selectorOrLocator.click();
    }
    await page.waitForTimeout(delayAfter);
  } catch (_) {}
}

async function humanType(page, selectorOrLocator, text, delayPerChar = 45) {
  const locator = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
  try {
    await hoverAndClick(page, locator, 250);
    await locator.fill('');
    for (const char of text) {
      await page.keyboard.type(char, { delay: delayPerChar + Math.floor(Math.random() * 20) });
    }
    await page.waitForTimeout(400);
  } catch (_) {
    try {
      await locator.fill(text);
      await page.waitForTimeout(300);
    } catch (_) {}
  }
}

async function cinematicScroll(page, targetY, duration = 1100) {
  try {
    await page.evaluate(
      ({ targetY, duration }) => {
        return new Promise((resolve) => {
          const startY = window.scrollY;
          const diff = targetY - startY;
          const startTime = performance.now();
          function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            window.scrollTo(0, startY + diff * ease);
            if (progress < 1) requestAnimationFrame(step);
            else resolve();
          }
          requestAnimationFrame(step);
        });
      },
      { targetY, duration }
    );
    await page.waitForTimeout(700);
  } catch (_) {
    try {
      await page.evaluate((y) => window.scrollTo(0, y), targetY);
      await page.waitForTimeout(500);
    } catch (_) {}
  }
}

async function authenticateWallet(keypair) {
  const chal = await fetch(`${API_URL}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: keypair.publicKey() })
  }).then(r => r.json());

  const sig = keypair.sign(Buffer.from(chal.message, 'utf-8')).toString('base64');
  return fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: keypair.publicKey(), signature: sig, message: chal.message })
  }).then(r => r.json());
}

async function seedCompleteCircleState() {
  console.log('🌱 Seeding rich production circle state...');
  const organizerKp = Keypair.random();
  const organizerAuth = await authenticateWallet(organizerKp);

  // Create circle
  const groupRes = await fetch(`${API_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${organizerAuth.accessToken}`
    },
    body: JSON.stringify({
      name: 'Apex Founders Circle',
      description: 'A premier rotating savings circle for African tech founders and builders.',
      contributionAmount: '200',
      totalMembers: 5,
      cycleDurationDays: 30,
      payoutModel: 'ROTATING',
      rules: '1. Members contribute 200 USDC on the 1st of every month.\n2. Payouts rotate strictly by seniority.\n3. Emergency withdrawals require 3 approvals.',
      approvalThreshold: 3
    })
  });
  const group = await groupRes.json();

  // Add Member 2: Chioma
  const member2Kp = Keypair.random();
  const member2Auth = await authenticateWallet(member2Kp);
  await fetch(`${API_URL}/groups/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${member2Auth.accessToken}`
    },
    body: JSON.stringify({
      inviteToken: group.inviteToken,
      displayName: 'Chioma (DevOps Lead)',
      rotationPosition: 2
    })
  });

  // Add Member 3: Tunde
  const member3Kp = Keypair.random();
  const member3Auth = await authenticateWallet(member3Kp);
  await fetch(`${API_URL}/groups/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${member3Auth.accessToken}`
    },
    body: JSON.stringify({
      inviteToken: group.inviteToken,
      displayName: 'Tunde (Frontend Eng)',
      rotationPosition: 3
    })
  });

  // Add Member 4: Amara
  const member4Kp = Keypair.random();
  const member4Auth = await authenticateWallet(member4Kp);
  await fetch(`${API_URL}/groups/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${member4Auth.accessToken}`
    },
    body: JSON.stringify({
      inviteToken: group.inviteToken,
      displayName: 'Amara (Smart Contracts)',
      rotationPosition: 4
    })
  });

  console.log(`✅ Circle seeded successfully: ${group.name} (ID: ${group.id})`);
  return {
    organizerKp,
    organizerAuth,
    group,
  };
}

async function recordSaveCircleWalkthrough() {
  console.log('🎬 Starting SaveCircle Full Observable Walkthrough Suite...');
  const seed = await seedCompleteCircleState();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  // Inject SaveCircle-branded virtual cursor (Electric Lime with Deep Forest Green border & ripple)
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('savecircle-virtual-cursor')) return;

      const cursor = document.createElement('div');
      cursor.id = 'savecircle-virtual-cursor';
      cursor.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #d8ff63;
        box-shadow: 0 0 12px rgba(216, 255, 99, 0.9), 0 0 24px rgba(21, 59, 45, 0.4);
        border: 2px solid #153b2d;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-50%, -50%);
        transition: width 0.12s ease, height 0.12s ease, background 0.15s ease;
      `;
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });

      window.addEventListener('mousedown', (e) => {
        cursor.style.width = '14px';
        cursor.style.height = '14px';
        cursor.style.background = '#6a8527';

        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid #d8ff63;
          pointer-events: none;
          z-index: 2147483646;
          transform: translate(-50%, -50%);
          transition: width 0.45s ease-out, height 0.45s ease-out, opacity 0.45s ease-out;
        `;
        document.body.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.width = '36px';
          ripple.style.height = '36px';
          ripple.style.opacity = '0';
        });
        setTimeout(() => ripple.remove(), 500);
      });

      window.addEventListener('mouseup', () => {
        cursor.style.width = '18px';
        cursor.style.height = '18px';
        cursor.style.background = '#d8ff63';
      });
    });
  });

  const startTime = Date.now();
  const getElapsed = () => Math.round((Date.now() - startTime) / 1000);
  const chapterTimestamps = [];

  function recordChapter(title) {
    const elapsed = getElapsed();
    chapterTimestamps.push({ start: elapsed, title });
    console.log(`⏱️ [Chapter @ ${elapsed}s] ${title}`);
  }

  // ---------------------------------------------------------------------------
  // SCENE 1: Landing Page & Interactive Savings Planner
  // ---------------------------------------------------------------------------
  recordChapter('Landing & Circle Planner');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Smooth scroll down to savings planner
  await cinematicScroll(page, 720, 1200);
  await page.waitForTimeout(800);

  // Interact with members slider
  const membersSlider = page.locator('#members');
  if (await membersSlider.isVisible()) {
    await hoverAndClick(page, membersSlider, 400);
    await page.evaluate(() => {
      const el = document.getElementById('members');
      if (el) {
        el.value = '6';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const el = document.getElementById('members');
      if (el) {
        el.value = '5';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
  }

  // Interact with contribution input
  const amountInput = page.locator('#amount');
  if (await amountInput.isVisible()) {
    await humanType(page, amountInput, '200');
    await page.waitForTimeout(600);
  }

  // Click Copy savings plan
  const copyBtn = page.locator('button.copy');
  if (await copyBtn.isVisible()) {
    await hoverAndClick(page, copyBtn, 1000);
  }
  await cinematicScroll(page, 0, 900);
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // SCENE 2: Wallet Connection & Challenge Auth (Capture 01_wallet.png)
  // ---------------------------------------------------------------------------
  recordChapter('Wallet sign-in & challenge');
  await page.goto(`${BASE_URL}/connect`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Hover over the Freighter wallet option
  const walletOption = page.locator('.invite-wallet-option');
  if (await walletOption.isVisible()) {
    const box = await walletOption.boundingBox();
    if (box) await smoothMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(600);
  }

  // Screenshot 01: Wallet Connection Screen
  console.log('📸 Capturing 01_wallet.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '01_wallet.png'), fullPage: false });
  await page.waitForTimeout(500);

  // Inject authenticated organizer session into sessionStorage for all dashboard scenes
  const organizerSession = {
    walletAddress: seed.organizerKp.publicKey(),
    accessToken: seed.organizerAuth.accessToken,
  };
  await page.evaluate((sess) => {
    sessionStorage.setItem('savecircle:wallet-session', JSON.stringify(sess));
  }, organizerSession);

  // ---------------------------------------------------------------------------
  // SCENE 3: Circle Creation Wizard (Capture 02_circle.png)
  // ---------------------------------------------------------------------------
  recordChapter('Circle studio & creation');
  await page.goto(`${BASE_URL}/dashboard/circles/create`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Step 0: Name & Description
  const circleNameInput = page.locator('input[placeholder="Surulere Savers"]');
  if (await circleNameInput.isVisible()) {
    await humanType(page, circleNameInput, 'Genesis Builders Circle');
  }
  const circleDescInput = page.locator('textarea[required]');
  if (await circleDescInput.isVisible()) {
    await humanType(page, circleDescInput, 'High-velocity rotating savings pool for decentralized community builders on Stellar.');
  }
  await hoverAndClick(page, 'button.button.primary', 1000);

  // Step 1: Members and Amount
  await page.waitForTimeout(600);
  const amountField = page.locator('input[inputmode="decimal"]');
  if (await amountField.isVisible()) {
    await humanType(page, amountField, '250');
  }
  await hoverAndClick(page, 'button.button.primary', 1000);

  // Step 2: Approvals and Rules
  await page.waitForTimeout(600);
  await hoverAndClick(page, 'button.button.primary', 1000);

  // Step 3: Review and Confirm
  await page.waitForTimeout(600);
  const confirmBox = page.locator('label.circle-confirm input[type="checkbox"]');
  if (await confirmBox.isVisible()) {
    await hoverAndClick(page, confirmBox, 600);
  }
  // Click Create circle
  await hoverAndClick(page, 'button.button.primary', 1400);

  // Screenshot 02: Circle Created Screen with shareable invite link
  console.log('📸 Capturing 02_circle.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '02_circle.png'), fullPage: false });
  await page.waitForTimeout(800);

  // ---------------------------------------------------------------------------
  // SCENE 4: Member Invitation & Rules Acceptance (Capture 07_rules.png)
  // ---------------------------------------------------------------------------
  recordChapter('Member invitation & rules');
  // Navigate to invitation review as a member
  await page.goto(`${BASE_URL}/connect?invite=${seed.group.inviteToken}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Scroll smoothly down the review columns to show what you commit to and payout order
  await cinematicScroll(page, 450, 1000);
  await page.waitForTimeout(800);

  // Screenshot 07: Rules and Invitation Review
  console.log('📸 Capturing 07_rules.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '07_rules.png'), fullPage: false });
  await page.waitForTimeout(600);

  // Re-apply organizer session
  await page.evaluate((sess) => {
    sessionStorage.setItem('savecircle:wallet-session', JSON.stringify(sess));
  }, organizerSession);

  // ---------------------------------------------------------------------------
  // SCENE 5: Dashboard Overview & Active Circles
  // ---------------------------------------------------------------------------
  recordChapter('Dashboard overview');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await cinematicScroll(page, 300, 800);
  await page.waitForTimeout(600);
  await cinematicScroll(page, 0, 600);

  // ---------------------------------------------------------------------------
  // SCENE 6: Contribution Schedule & Pool Escrow (Capture 03_contribution.png)
  // ---------------------------------------------------------------------------
  recordChapter('Contribution schedule & pool');
  await page.goto(`${BASE_URL}/dashboard/schedule?circle=${seed.group.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Filter cycles
  const pendingFilter = page.locator('button:has-text("Pending")').first();
  if (await pendingFilter.isVisible()) {
    await hoverAndClick(page, pendingFilter, 600);
    const allFilter = page.locator('button:has-text("All cycles")').first();
    if (await allFilter.isVisible()) await hoverAndClick(page, allFilter, 600);
  }

  // Toggle to Calendar view
  const calView = page.locator('a:has-text("Calendar")').first();
  if (await calView.isVisible()) {
    await hoverAndClick(page, calView, 800);
    const listView = page.locator('a:has-text("List")').first();
    if (await listView.isVisible()) await hoverAndClick(page, listView, 800);
  }

  // Screenshot 03: Contribution Schedule
  console.log('📸 Capturing 03_contribution.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '03_contribution.png'), fullPage: false });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // SCENE 7: Rotating Payout Eligibility (Capture 04_payout.png)
  // ---------------------------------------------------------------------------
  recordChapter('Rotating payout eligibility');
  await page.goto(`${BASE_URL}/dashboard/payouts?circle=${seed.group.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Screenshot 04: Payout Screen
  console.log('📸 Capturing 04_payout.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '04_payout.png'), fullPage: false });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // SCENE 8: Member & Group Ledger (Capture 05_ledger.png)
  // ---------------------------------------------------------------------------
  recordChapter('Financial ledger & reconciliation');
  await page.goto(`${BASE_URL}/dashboard/ledger?circle=${seed.group.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await cinematicScroll(page, 350, 900);
  await page.waitForTimeout(700);

  // Screenshot 05: Ledger Screen
  console.log('📸 Capturing 05_ledger.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '05_ledger.png'), fullPage: false });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // SCENE 9: Multi-Member Approvals & Group Management
  // ---------------------------------------------------------------------------
  recordChapter('Approvals & group management');
  await page.goto(`${BASE_URL}/dashboard/approvals?circle=${seed.group.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.goto(`${BASE_URL}/dashboard/group-management?circle=${seed.group.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // ---------------------------------------------------------------------------
  // SCENE 10: Stellar Testnet Credentials (Capture 06_contract.png)
  // ---------------------------------------------------------------------------
  recordChapter('Stellar Testnet credentials');
  await page.goto(`${BASE_URL}/proof#credentials`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Highlight credentials section
  const creds = page.locator('#credentials');
  if (await creds.isVisible()) {
    const box = await creds.boundingBox();
    if (box) await cinematicScroll(page, Math.max(0, box.y - 120), 800);
  }

  // Screenshot 06: Testnet Credentials
  console.log('📸 Capturing 06_contract.png...');
  await page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, '06_contract.png'), fullPage: false });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // SCENE 11: Observable Proof Showcase & Lightbox
  // ---------------------------------------------------------------------------
  recordChapter('Live Observable Proof & Lightbox');
  await page.goto(`${BASE_URL}/proof`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Hover over verification badge
  const statusPill = page.locator('.proof-status');
  if (await statusPill.isVisible()) {
    const box = await statusPill.boundingBox();
    if (box) await smoothMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
  }

  // Scroll to metrics
  await cinematicScroll(page, 400, 900);
  await page.waitForTimeout(800);

  // Scroll to gallery
  await cinematicScroll(page, 1100, 1000);
  await page.waitForTimeout(600);

  // Click filter buttons in gallery
  const circleFilter = page.locator('.proof-filters button:has-text("Circle Studio")').first();
  if (await circleFilter.isVisible()) {
    await hoverAndClick(page, circleFilter, 500);
  }
  const payoutFilter = page.locator('.proof-filters button:has-text("Rotating Payouts")').first();
  if (await payoutFilter.isVisible()) {
    await hoverAndClick(page, payoutFilter, 500);
  }
  const allProofFilter = page.locator('.proof-filters button:has-text("All Proofs")').first();
  if (await allProofFilter.isVisible()) {
    await hoverAndClick(page, allProofFilter, 600);
  }

  // Open Lightbox by clicking the first gallery card
  const firstCard = page.locator('button.proof-thumb').first();
  if (await firstCard.isVisible()) {
    await hoverAndClick(page, firstCard, 1200);

    // Navigate right
    const nextBtn = page.locator('button[aria-label="Next proof"]');
    if (await nextBtn.isVisible()) {
      await hoverAndClick(page, nextBtn, 900);
      await hoverAndClick(page, nextBtn, 900);
    }

    // Close Lightbox
    const closeBtn = page.locator('dialog.proof-dialog button:has-text("Close")');
    if (await closeBtn.isVisible()) {
      await hoverAndClick(page, closeBtn, 800);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }
  }

  // Wrap up video
  await cinematicScroll(page, 0, 1000);
  await page.waitForTimeout(1500);

  console.log('🏁 Walkthrough sequence completed! Closing browser and compiling video...');
  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tempVideoPath = await video.path();
    console.log(`📹 Raw video recorded at: ${tempVideoPath}`);
    fs.copyFileSync(tempVideoPath, FINAL_VIDEO_PATH);
    console.log(`✅ Saved final walkthrough video to: ${FINAL_VIDEO_PATH}`);
  } else {
    console.warn('⚠️ No video object found on page.');
  }

  console.log('\n📊 Recorded Chapter Timestamps:');
  console.log(JSON.stringify(chapterTimestamps, null, 2));

  return chapterTimestamps;
}

recordSaveCircleWalkthrough()
  .then((chapters) => {
    console.log('🎉 Full Observable Proof Walkthrough & High-Res Screenshots generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error during walkthrough execution:', err);
    process.exit(1);
  });
