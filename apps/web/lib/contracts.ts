export const CRYPTO_WILL_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
export const CRYPTO_WILL_V2_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V2_ADDRESS as `0x${string}`;

export const CRYPTO_WILL_ABI = [
  {
    type: "function",
    name: "createWill",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "tokens", type: "address[]" },
      { name: "gracePeriod", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signAlive",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeWill",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeWill",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateBeneficiary",
    inputs: [{ name: "newBeneficiary", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateTokens",
    inputs: [{ name: "newTokens", type: "address[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositETH",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
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
  {
    type: "function",
    name: "pendingETH",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimETH",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signAliveBySig",
    inputs: [
      { name: "owner", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "issuedAt", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "aliveNonce",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const CRYPTO_WILL_V2_ABI = [
  {
    type: "function",
    name: "createWill",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "tokens", type: "address[]" },
      { name: "gracePeriod", type: "uint256" },
    ],
    outputs: [{ name: "willId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signAlive",
    inputs: [{ name: "willId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "signAlive",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
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
    name: "revokeWill",
    inputs: [{ name: "willId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateBeneficiary",
    inputs: [
      { name: "willId", type: "uint256" },
      { name: "newBeneficiary", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateTokens",
    inputs: [
      { name: "willId", type: "uint256" },
      { name: "newTokens", type: "address[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateNFTs",
    inputs: [
      { name: "willId", type: "uint256" },
      {
        name: "newNFTs",
        type: "tuple[]",
        components: [
          { name: "contractAddr", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "nftType", type: "uint8" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createWillWithNFTs",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "tokens", type: "address[]" },
      {
        name: "nfts",
        type: "tuple[]",
        components: [
          { name: "contractAddr", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "nftType", type: "uint8" },
        ],
      },
      { name: "gracePeriod", type: "uint256" },
    ],
    outputs: [{ name: "willId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositETH",
    inputs: [{ name: "willId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claimETH",
    inputs: [],
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
          {
            name: "nfts",
            type: "tuple[]",
            components: [
              { name: "contractAddr", type: "address" },
              { name: "tokenId", type: "uint256" },
              { name: "amount", type: "uint256" },
              { name: "nftType", type: "uint8" },
            ],
          },
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
    name: "getWillCount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "ethBalances",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingETH",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "signAliveBySig",
    inputs: [
      { name: "owner", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "issuedAt", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "aliveNonce",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setGuardians",
    inputs: [
      { name: "willId", type: "uint256" },
      { name: "guardians", type: "address[]" },
      { name: "threshold", type: "uint8" },
      { name: "votingWindow", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "voteToExecute",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "voteAlive",
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
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "owner", type: "address" },
      { name: "willId", type: "uint256" },
      { name: "guardian", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "WillCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "gracePeriod", type: "uint256", indexed: false },
      { name: "willId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GuardiansSet",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "willId", type: "uint256", indexed: false },
      { name: "guardians", type: "address[]", indexed: false },
      { name: "threshold", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VotingStarted",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "willId", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GuardianVoted",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "willId", type: "uint256", indexed: false },
      { name: "guardian", type: "address", indexed: true },
      { name: "voteType", type: "string", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const ERC721_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

export const ERC1155_ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "uri",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;
