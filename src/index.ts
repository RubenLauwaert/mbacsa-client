import { MbacsaClient } from "./MbacsaClient"
import { CredentialsGenerator } from "./dpop/CredentialsGenerator"
import { DPoPGenerator } from "./dpop/DPoPGenerator"
import { DischargeRequest, MintRequest } from "./types/Requests"
import macaroons from 'macaroons.js'

// Variables 
const POD_SERVER_1_BASE_PATH = "http://localhost:3000/"
const ENDPOINT_MINT = ".macaroon/mint"
const ENDPOINT_DISCHARGE = ".macaroon/discharge"
const ENDPOINT_REVOKE = ".macaroon/revoke"



// MBACSA client
const mbacsaClient = new MbacsaClient();

// Get discharge key for Alice
const dischargeKeyAlice = await mbacsaClient.getPublicDischargeKey("http://localhost:3000/Alice/profile/card#me")
// Generate DPOP Credentials for Alice
const credentialsAlice = await CredentialsGenerator.generateCredentials("Alice@example.com","Alice");
const dpopDataAlice = await DPoPGenerator.generateDPoPAccessToken(credentialsAlice);
// Generate DPOP Credentials for Jane
const credentialsJane = await CredentialsGenerator.generateCredentials("Jane@example.com","Jane");
const dpopDataJane = await DPoPGenerator.generateDPoPAccessToken(credentialsAlice);
// Mint a macaroon for Alice for Bob's first post
const mintRequest:MintRequest = {
  resourceURI: POD_SERVER_1_BASE_PATH + "Bob/social/post1.txt",
  requestor: "http://localhost:3000/Alice/profile/card#me",
  requestedAccessMode: 'read',
  dischargeKey: dischargeKeyAlice.dischargeKey
}
const mintResponse = await mbacsaClient.mintDelegationToken(POD_SERVER_1_BASE_PATH + ENDPOINT_MINT,mintRequest,dpopDataAlice);
const deserializedMacaroonAlice = macaroons.MacaroonsDeSerializer.deserialize(mintResponse.mintedMacaroon)
// console.log(macaroons.MacaroonsDeSerializer.deserialize(mintedMacaroon).inspect())
// Get a discharge macaroon for Alice
const dischargeRequest:DischargeRequest = {
  serializedMacaroon: mintResponse.mintedMacaroon,
  agentToDischarge: "http://localhost:3000/Alice/profile/card#me",
}
const {dischargeMacaroon} = await mbacsaClient.dischargeDelegationToken(POD_SERVER_1_BASE_PATH + ENDPOINT_DISCHARGE,dischargeRequest,dpopDataAlice)
// console.log(macaroons.MacaroonsDeSerializer.deserialize(dischargeMacaroon).inspect())

// Delegate Access To Jane
const attenuatedMacaroonJane = await mbacsaClient.delegateAccessTo(deserializedMacaroonAlice,"http://localhost:3000/Jane/profile/card#me")
console.log(attenuatedMacaroonJane.inspect())

// Jane discharges macaroon 
const dischargeMacaroonJane = await mbacsaClient.dischargeDelegationToken(POD_SERVER_1_BASE_PATH + ENDPOINT_DISCHARGE, 
  {serializedMacaroon: attenuatedMacaroonJane.serialize(), agentToDischarge: "http://localhost:3000/Jane/profile/card#me"}, dpopDataJane );
console.log(macaroons.MacaroonsDeSerializer.deserialize(dischargeMacaroonJane.dischargeMacaroon).inspect())


