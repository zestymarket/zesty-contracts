"""
Shamir Secrets decoding and encoding using Solidity byte formatting
"""
from binascii import hexlify
from Crypto.Util.Padding import pad
from Crypto.Random import get_random_bytes
from Crypto.Protocol.SecretSharing import Shamir
from web3 import Web3


def main():
    # Encryption Process
    # We will use padding because pycryptodome sss supports 16 bytes
    key = get_random_bytes(16)
    key_padded = pad(key, 32)
    key_sol = Web3.toHex(key_padded)
    key_hash = Web3.solidityKeccak(['bytes32'], [key_sol])
    shares = Shamir.split(2, 5, key)

    print("************* ENCRYPTION ************")
    print("Generating Shamir Secrets")
    print()
    print("Padded Key Generated = ", key_sol)
    print("Hash Generated = ", key_hash.hex())
    print()
    print("Shamir Shares")

    for idx, share in shares:
        print("{}-{}".format(idx, Web3.toHex(share)))

    # Decryption Process
    print()
    print("************* DECRYPTION ************")
    
    # Get shares
    new_shares = []
    for x in range(2):
        inp = input("Input Share: ")
        inp = inp.strip()  # clean white space
        idx, key = inp.split('-')
        byte_key = Web3.toBytes(hexstr=key)
        new_shares.append((int(idx), byte_key))

    # Get Key
    re_key = Shamir.combine(new_shares)
    re_key_pad = pad(re_key, 32)
    re_key_hash = Web3.solidityKeccak(['bytes32'], [re_key_pad])

    print()
    print("Key reconstructed = ", Web3.toHex(re_key))
    print("Padded key = ", Web3.toHex(re_key_pad))
    print("Hash Generated = ", Web3.toHex(re_key_hash))
    print()
    print("Hash Match = {}".format(re_key_hash == key_hash))


if __name__ == '__main__':
    main()