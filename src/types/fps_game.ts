/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fps_game.json`.
 */
export type FpsGame = {
  "address": "HTewvNaFXBYjBnEixXXGUAHwjU2yAJbAAdDfouzm3a51",
  "metadata": {
    "name": "fpsGame",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "createMatch",
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "u64"
        },
        {
          "name": "winPoints",
          "type": "u8"
        }
      ]
    },
    {
      "name": "finishMatch",
      "discriminator": [
        65,
        193,
        5,
        71,
        16,
        64,
        11,
        186
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "joinMatch",
      "discriminator": [
        244,
        8,
        47,
        130,
        192,
        59,
        179,
        44
      ],
      "accounts": [
        {
          "name": "player",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "recordKill",
      "discriminator": [
        199,
        67,
        232,
        200,
        144,
        122,
        230,
        56
      ],
      "accounts": [
        {
          "name": "shooter",
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "victim",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "matchAccount",
      "discriminator": [
        235,
        36,
        243,
        39,
        81,
        16,
        144,
        87
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "matchFull",
      "msg": "Match is already full"
    },
    {
      "code": 6001,
      "name": "matchFinished",
      "msg": "Match already finished"
    },
    {
      "code": 6002,
      "name": "notEnoughPlayers",
      "msg": "Not enough players in match"
    },
    {
      "code": 6003,
      "name": "notAPlayer",
      "msg": "Caller is not one of the players"
    },
    {
      "code": 6004,
      "name": "alreadyJoined",
      "msg": "Already joined as player1"
    },
    {
      "code": 6005,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "unauthorized"
    }
  ],
  "types": [
    {
      "name": "matchAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "matchId",
            "type": "u64"
          },
          {
            "name": "player1",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "player2",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "score1",
            "type": "u8"
          },
          {
            "name": "score2",
            "type": "u8"
          },
          {
            "name": "winPoints",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "matchStatus"
              }
            }
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "matchStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "finished"
          }
        ]
      }
    }
  ]
};
