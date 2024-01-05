import { DPoPGenerator, DPoPInfo } from "./dpop/DPoPGenerator.js";
import {MintRequest, PublicKeyDischargeRequest } from './types/Requests.js'
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import fetch  from 'node-fetch'
import NodeRSA from 'node-rsa'
import macaroons from 'macaroons.js'
import { v4 as uuidv4 } from 'uuid';
import { MbacsaClientI } from "./MbacsaClientI.js";
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse } from "./types/Responses.js";
import { extractModeFromMacaroon, getFollowingDelegationPosition, getThirdPartyCIDLastInChain, retrieveDischargeLocationFromWebId, retrieveMintLocationFromWebId, retrievePublicKeyLocationFromWebId, retrieveRevocationLocationFromURI } from "./Util.js";
import { RSA_JWK, jwk2pem } from "pem-jwk";
import { CredentialsGenerator } from "./dpop/CredentialsGenerator.js";
import { WebID} from './types/WebID.js'





export class MbacsaClient implements MbacsaClientI {


  public constructor(){
  }

  private async authenticatedDPoPFetch(dpopInfo:DPoPInfo, url:string, init:RequestInit):Promise<Response>{
    const {accessToken, dpopKey} = dpopInfo;
    const authenticatedFetch = await buildAuthenticatedFetch(fetch, accessToken, {dpopKey});
    return await authenticatedFetch(url,init);
  }

  /**
   * Retrieves a DPoP (Demonstration of Proof-of-Possession) token.
   * @param podServerUri The URI of the pod server.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns A promise resolving to DPoPInfo.
   */
    public async retrieveDPoPToken(podServerUri:string, email:string, password:string):Promise<DPoPInfo> {
      const credentials = await CredentialsGenerator.generateCredentials(podServerUri,email, password);
      const dpopInfo = await DPoPGenerator.generateDPoPAccessToken(podServerUri,credentials);
      return dpopInfo;
    }

  
  /**
   * Requests to mint a delegation token.
   * @param minter The WebID of the entity minting the token.
   * @param requestBody The request body containing minting details.
   * @param dpop The DPoP token info.
   * @returns A promise resolving to a MintResponse.
   */
  public async mintDelegationToken(minter: WebID, requestBody: MintRequest, dpop: DPoPInfo): Promise<MintResponse> {
    const mintLocation = retrieveMintLocationFromWebId(minter);
    const mintResponse = await this.authenticatedDPoPFetch(dpop,mintLocation,{
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const mintData = await mintResponse.json() 

    return mintData
  }

  /**
   * Discharges the last third-party caveat of a macaroon.
   * @param serializedMacaroon The serialized macaroon to be discharged.
   * @param dischargee The WebID of the entity to be discharged.
   * @param dpop The DPoP token info for authenticating the dischargee.
   * @returns A promise resolving to a DischargeResponse.
   */
  public async dischargeLastThirdPartyCaveat(serializedMacaroon:string, dischargee:WebID, dpop: DPoPInfo):Promise<DischargeResponse>{

    // Get last third-party caveat identifier
    const cid = getThirdPartyCIDLastInChain(serializedMacaroon);

    const dischargeLocation = retrieveDischargeLocationFromWebId(dischargee);
    const dischargeResponse = await this.authenticatedDPoPFetch(dpop, dischargeLocation, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        agentToDischarge: dischargee,
        thirdPartyCaveatIdentifier: cid
      })
    });
    const dischargeData = await dischargeResponse.json();
    return dischargeData;
  }

  /**
   * Retrieves the public discharge key of an agent.
   * @param subject The WebID of the agent.
   * @returns A promise resolving to a PublicDischargeKeyResponse.
   */
  public async getPublicDischargeKey(subject: WebID): Promise<PublicDischargeKeyResponse> {
    const publicDischargeKeyLocation = retrievePublicKeyLocationFromWebId(subject);
    const requestBody:PublicKeyDischargeRequest = {subjectToRetrieveKeyFrom: subject};
    const response = await fetch(publicDischargeKeyLocation, 
      {method: 'POST', 
       headers: { 'Content-Type': 'application/json'}, 
       body: JSON.stringify(requestBody)});

    const data = await response.json()
    return data;
  }

  /**
   * Delegates access to another agent using a macaroon.
   * @param serializedMacaroon The serialized root macaroon to be delegated.
   * @param delegatee The WebID of the agent to whom access is being delegated.
   * @param pdk The public discharge key (RSA_JWK) of the delegatee.
   * @returns A promise resolving to the attenuated serialized root macaroon macaroon.
   */
  public async delegateAccessTo(serializedMacaroon: string, delegatee: WebID, pdk:RSA_JWK): Promise<string> {

    // Deserialize macaroon
    const originalMacaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedMacaroon);
    // Get root mode
    const mode = extractModeFromMacaroon(originalMacaroon);
    // Get following position
    const delegationPosition = getFollowingDelegationPosition(originalMacaroon);
    // Create third-party caveat id
    const dischargeLocation = retrieveDischargeLocationFromWebId(delegatee);
    const caveatKey = uuidv4();
    const agentPredicate = `agent = ${delegatee}`;
    const modePredicate = `mode = ${mode}`
    const positionPredicate = `position = ${delegationPosition}`
    const caveatId = caveatKey + "::" + agentPredicate + "::" + modePredicate
        + "::" + positionPredicate;
    // Encrypt caveat with public discharge key of delegatee
    const rsa = new NodeRSA();
    const dischargeKey = rsa.importKey(jwk2pem(pdk));
    const encryptedCaveatId = dischargeKey.encrypt(caveatId,'base64').toString();
    // Attenuate original macaroon

    const attenuatedMacaroon = new macaroons.MacaroonsBuilder(originalMacaroon)
      .add_third_party_caveat(dischargeLocation,caveatKey,encryptedCaveatId);

    return attenuatedMacaroon.getMacaroon().serialize();
  }

  /**
   * Revokes a previously issued delegation token.
   * @param revoker The WebID of the entity revoking the access.
   * @param revokee The WebID of the entity whose access is being revoked.
   * @param serializedMacaroons An array of serialized macaroons that are being revoked.
   * @returns A promise resolving to a RevocationResponse.
   */
  public async revokeDelegationToken(revoker:WebID, revokee:WebID, serializedMacaroons:Array<string>): Promise<any> {
    // Retrieve revocationLocation from root macaroon
    const rootMacaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedMacaroons[0]);
    const revocationLocation = retrieveRevocationLocationFromURI(rootMacaroon.location);
     // Prepare discharge macaroons
    const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(serializedMacaroons);
    
    const revocationResponse = await fetch(revocationLocation, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        revoker: revoker,
        revokee: revokee,
        serializedMacaroons: preparedSerializedMacaroons
      })
    });
    const data = await revocationResponse.json();
    return data;
  }

  /**
   * Accesses a resource using a delegation token.
   * @param resourceURI The URI of the resource to access.
   * @param serializedMacaroons An array of serialized macaroons that grant access to the resource.
   * @returns A promise resolving to the response from accessing the resource.
   */
  public async accessWithDelegationToken(resourceURI: string, serializedMacaroons: Array<string>): Promise<any> {

    try {
      // Prepare discharge macaroons for request
      const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(serializedMacaroons);
      const [serializedRootMacaroon,...serializedPreparedDischargeMacaroons] = preparedSerializedMacaroons
      const resource = await fetch(resourceURI,{
        method: 'POST',
        headers: {
          'content-type': "application/json",
          'authorization': 'macaroon',
          'macaroon': serializedRootMacaroon

        },
        body: JSON.stringify({
          serializedDischargeMacaroons: serializedPreparedDischargeMacaroons,
          body: JSON.stringify({update: "Updated @ : " + new Date().getTime()})
        })
      })
    return await resource.text();
    } catch (error) {
      console.log("[MbacsaClient Error]: " + error)
    }
  
  }
  

  /**
   * Inspects a serialized macaroon and returns its inspection string.
   * @param serializedMacaroon The serialized macaroon to inspect.
   * @returns The inspection string of the macaroon.
   */
  public static inspectSerializedMacaroon(serializedMacaroon:string):string {
    const macaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedMacaroon);
    return macaroon.inspect()
  }


  /**
   * Prepares an array of serialized macaroons for a request by modifying them for discharge.
   * @param serializedMacaroons Array of serialized macaroons to prepare.
   * @returns An array of prepared serialized macaroons.
   */
  private prepareMacaroonsForRequest(serializedMacaroons: Array<string>):Array<string>{
    const [serializedRootMacaroon,...serializedDischargeMacaroons] = serializedMacaroons;
    const rootMacaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedRootMacaroon);
    const preparedSerializedDischargeMacaroons = serializedDischargeMacaroons.map((serializedDischargeMacaroon) => {
      const dischargeMacaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedDischargeMacaroon);
      const preparedDischargeMacaroon = macaroons.MacaroonsBuilder.modify(rootMacaroon)
        .prepare_for_request(dischargeMacaroon)
        .getMacaroon();
      return macaroons.MacaroonsSerializer.serialize(preparedDischargeMacaroon);
    })
    return [serializedRootMacaroon,...preparedSerializedDischargeMacaroons]
  }



}