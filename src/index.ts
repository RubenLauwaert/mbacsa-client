import { MbacsaClient } from './MbacsaClient.js';
import { extractPathToPodServer } from './Util.js';

export {MbacsaClient} from './MbacsaClient.js'


// MbacsaClient
const client = new MbacsaClient()

// target
const target = 'http://localhost:3000/Alice/social/post1.json';

// minter
const minter = { webId: "http://localhost:3000/Bob/profile/card#me",
                email: "Bob@example.com",
                password: "Bob"}

// Retrieve discharge key for minter
const dKeyAgent2 = await client.getPublicDischargeKey(minter.webId);
// Minter mints macaroon
const dpopKeyMinter = await client.retrieveDPoPToken(extractPathToPodServer(minter.webId) + "/",minter.email,minter.password);
const mintedMacaroon  = await client.mintDelegationToken(minter.webId,{
  dischargeKey: dKeyAgent2.dischargeKey,
  mode: 'write',
  requestor: minter.webId,
  resourceURI: target
},dpopKeyMinter);

// Minter gets discharge proof

const dischargeProofMinter = await client.dischargeLastThirdPartyCaveat(mintedMacaroon.mintedMacaroon,minter.webId,dpopKeyMinter);

// Minter accesses corresponding resource via macaroon
const post1Alice = await client.accessWithDelegationToken(target,[mintedMacaroon.mintedMacaroon,dischargeProofMinter.dischargeMacaroon])

console.log(post1Alice)