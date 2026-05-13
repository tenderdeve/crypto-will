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
  {
    type: "function",
    name: "ethBalances",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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
] as const;
