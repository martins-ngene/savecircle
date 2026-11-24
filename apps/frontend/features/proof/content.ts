export const contract = {
  id: "CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB",
  wasm: "8dd3e801c3c35b1ceaf62965764f045456cabe6334a6c8106ad75118e984af6f",
  usdc: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  admin: "GCPZAXFI45FYYEG25SDJYI7EP7PR67EV2M24CGT6KJOHUBSEEYF5E36M",
  deployment: "9be507afc5f7454ebb51f333462993876c1ba9908ec989ce72cf577a3f0f5564",
};

export const explorer = {
  contract: `https://stellar.expert/explorer/testnet/contract/${contract.id}`,
  lab: `https://lab.stellar.org/r/testnet/contract/${contract.id}`,
  deployment: `https://stellar.expert/explorer/testnet/tx/${contract.deployment}`,
};

export const categories = ["Wallet & Auth", "Circle Studio", "Contribution Escrow", "Rotating Payouts", "Financial Ledger", "Soroban Contract"] as const;

export const proofs = [
  { file: "01_wallet.png", category: categories[0], title: "Freighter sign-in", description: "The wallet connection screen starts the signed challenge flow.", method: "signMessage", endpoint: "POST /api/auth/challenge · POST /api/auth/verify" },
  { file: "02_circle.png", category: categories[1], title: "A circle ready to share", description: "A local circle was created through the API and received an invitation link.", method: "create_group · Testnet registration step", endpoint: "POST /api/groups" },
  { file: "07_rules.png", category: categories[1], title: "Member rules acceptance", description: "An invited member reviews the circle rules before accepting and joining.", method: "accept_rules · on-chain counterpart", endpoint: "POST /api/groups/join" },
  { file: "03_contribution.png", category: categories[2], title: "Contribution schedule", description: "The schedule shows pool targets, collected amounts, and member obligations from a local fixture.", method: "contribute", endpoint: "GET /api/schedules/group/:groupId" },
  { file: "04_payout.png", category: categories[3], title: "Payout eligibility", description: "The payout screen shows cycle states and the Stellar linking requirement for the local circle.", method: "execute_payout", endpoint: "GET /api/blockchain/tx/:hash" },
  { file: "05_ledger.png", category: categories[4], title: "Member and group ledger", description: "A local indexed-payment fixture shows how recorded contributions appear in the ledger.", method: "contribute · indexed event", endpoint: "GET /api/ledger/group/:groupId/my-ledger" },
  { file: "06_contract.png", category: categories[5], title: "Testnet deployment credentials", description: "Public identifiers for independently checking the contract and deployment transaction.", method: "create_group", endpoint: "GET /api/blockchain/config" },
] as const;

export const chapters = [
  { start: 0, title: "Landing & Circle Planner" },
  { start: 13, title: "Wallet sign-in & challenge" },
  { start: 16, title: "Circle studio & creation" },
  { start: 149, title: "Member invitation & rules" },
  { start: 153, title: "Dashboard overview" },
  { start: 158, title: "Contribution schedule & pool" },
  { start: 166, title: "Rotating payout eligibility" },
  { start: 168, title: "Financial ledger & reconciliation" },
  { start: 172, title: "Approvals & group management" },
  { start: 174, title: "Stellar Testnet credentials" },
  { start: 178, title: "Live Observable Proof & Lightbox" },
];

export const proofImage = (file: string) => `/recordings/screenshots/${file}`;
