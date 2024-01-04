# MBACSA Client

This is a Typescript client for interacting with the [MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css).

## Installation

The client is published as a library to npm. It can be installed via the following command:

`npm i mbacsa-client`

## Features

### retrieveDPoPToken
- **Purpose**: Retrieves a DPoP token for provided credentials.
- **Parameters**:
  - `podServerUri`: URI of the pod server.
  - `email`: Email of the user.
  - `password`: Password of the user.
- **Returns**: A promise that resolves to `DPoPInfo`.

### mintDelegationToken
- **Purpose**: Creates a delegation token.
- **Parameters**:
  - `minter`: WebID of the minter.
  - `requestBody`: Details of the mint request.
  - `dpop`: DPoP information.
- **Returns**: A promise that resolves to a `MintResponse`.

### dischargeLastThirdPartyCaveat
- **Purpose**: Discharges the last third-party caveat of a macaroon.
- **Parameters**:
  - `serializedMacaroon`: The serialized macaroon.
  - `dischargee`: WebID of the entity discharging the caveat.
  - `dpop`: DPoP information.
- **Returns**: A promise that resolves to a `DischargeResponse`.

### getPublicDischargeKey
- **Purpose**: Retrieves the public discharge key for a given subject.
- **Parameters**:
  - `subject`: WebID of the subject.
- **Returns**: A promise that resolves to a `PublicDischargeKeyResponse`.

### delegateAccessTo
- **Purpose**: Delegates access to a resource to another entity.
- **Parameters**:
  - `serializedMacaroon`: The serialized macaroon.
  - `delegatee`: WebID of the delegatee.
  - `pdk`: RSA_JWK public discharge key.
- **Returns**: A promise that resolves to a string.

### revokeDelegationToken
- **Purpose**: Revokes a delegation token.
- **Parameters**:
  - `revoker`: WebID of the revoker.
  - `revokee`: WebID of the entity whose token is being revoked.
  - `serializedMacaroons`: Array of serialized macaroons.
- **Returns**: A promise that resolves to a `RevocationResponse`.

### accessWithDelegationToken
- **Purpose**: Accesses a resource using a delegation token.
- **Parameters**:
  - `resourceURI`: URI of the resource.
  - `serializedMacaroons`: Array of serialized macaroons.
- **Returns**: A promise.


## Future improvements

Right now the client only allows `read` access requests. In the future, the client should support any access mode. However, the [MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css) does support the delegation of any access mode and you are free to interact with it independently of this client.

## Example usage

Before trying the client out, make sure to run an instance of the adapted Community Solid Server ([MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css)) and make sure that you seed pods for Alice, Bob and Jane. Check out the [README](https://github.com/RubenLauwaert/mbacsa-css) file for more details. Given that you have an instance running at `http://localhost:3000/` and you have seeded the pods for Alice, Bob and Jane, you can try the following example. This example shows how Bob mints a delegation token for Alice's resource `post1.json` (for which he is authorized via WAC). After minting, Bob delegates the minted permissions to Jane. Finally Jane access the resource via the delegated access permissions.

```typescript
// Server location
const serverLocation = "http://localhost:3000/"

// Configure the client
const client = new MbacsaClient();

// Retrieve DPoP token for Bob
const credentialsBob = {email: "Bob@example.com", password: "Bob"}
const dpopTokenBob = await client.retrieveDPoPToken(serverLocation,
credentialsBob.email,credentialsBob.password);

// Retrieve DPoP token for Jane
const credentialsJane = {email: "Jane@example.com", password: "Jane"}
const dpopTokenJane = await client.retrieveDPoPToken(serverLocation,
credentialsJane.email,credentialsJane.password);

// Get public discharge key of Bob
const webIdBob = serverLocation + "Bob/profile/card#me";
const {dischargeKey: pubKeyBob} = await client.getPublicDischargeKey(webIdBob)

// Mint delegation token for Alice's resource (Bob is authorized via WAC)
const resourceLocation = serverLocation + "Alice/social/post1.json"
const mintInfoBob = {
  resourceURI: resourceLocation,
  requestor: webIdBob,
  dischargeKey: pubKeyBob,
  mode: 'read'
}
const {mintedMacaroon: macaroonBob} = await client.mintDelegationToken(webIdBob, mintInfoBob, dpopTokenBob)

console.log(MbacsaClient.inspectSerializedMacaroon(macaroonBob))


// Attain discharge macaroon for Bob
const {dischargeMacaroon: dischargeProofBob} = await client.dischargeLastThirdPartyCaveat(macaroonBob,webIdBob,dpopTokenBob);

console.log(MbacsaClient.inspectSerializedMacaroon(dischargeProofBob))


// Delegate permissions to Jane
const webIdJane = serverLocation + "Jane/profile/card#me";
const {dischargeKey: pubKeyJane} = await client.getPublicDischargeKey(webIdJane);
const macaroonJane = await client.delegateAccessTo(macaroonBob,webIdJane,pubKeyJane);

console.log(MbacsaClient.inspectSerializedMacaroon(macaroonJane))


// Attain discharge macaroon for Jane
const {dischargeMacaroon: dischargeProofJane} = await client.dischargeLastThirdPartyCaveat(macaroonJane,webIdJane,dpopTokenJane);

console.log(MbacsaClient.inspectSerializedMacaroon(dischargeProofBob))
console.log(MbacsaClient.inspectSerializedMacaroon(dischargeProofJane))

// Jane accesses Alice's resource via delegated permissions
const postAlice = await client.accessWithDelegationToken(resourceLocation,[macaroonJane,dischargeProofBob,dischargeProofJane])
console.log(postAlice)


