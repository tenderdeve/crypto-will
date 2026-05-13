export const CRYPTO_WILL_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
export const CRYPTO_WILL_V2_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V2_ADDRESS as `0x${string}`;

export const CRYPTO_WILL_ABI = [
  {
    type: "function",
    name: "executeWill",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getWill",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "tokens", type: "address[]" },
          { name: "lastAlive", type: "uint256" },
          { name: "gracePeriod", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

export const CRYPTO_WILL_V2_ABI = [
  {
    type: "function",
    name: "executeWill",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getWill",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "tokens", type: "address[]" },
          { name: "lastAlive", type: "uint256" },
          { name: "gracePeriod", type: "uint256" },
          { name: "active", type: "bool" },
          {
            name: "guardianConfig",
            type: "tuple",
            components: [
              { name: "guardians", type: "address[]" },
              { name: "threshold", type: "uint8" },
              { name: "votingWindow", type: "uint256" },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveWillIds",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "startVoting",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getGuardianConfig",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "guardians", type: "address[]" },
          { name: "threshold", type: "uint8" },
          { name: "votingWindow", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVoteStatus",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [
      { name: "votes", type: "uint256" },
      { name: "threshold", type: "uint256" },
      { name: "votingEndsAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;
