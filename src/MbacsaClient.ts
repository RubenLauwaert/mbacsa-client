import { DPoPGenerator, DPoPInfo } from "./dpop/DPoPGenerator.js";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests.js'
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import fetch  from 'node-fetch'
import NodeRSA from 'node-rsa'
import macaroons, { MacaroonsConstants, MacaroonsDeSerializer } from 'macaroons.js'
import { v4 as uuidv4 } from 'uuid';
import { MbacsaClientI } from "./MbacsaClientI.js";
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse } from "./types/Responses.js";
import { Macaroon } from "macaroons.js";
import { extractModeFromMacaroon, getFollowingDelegationPosition, getThirdPartyCIDLastInChain, retrieveDischargeLocationFromWebId, retrieveMintLocationFromWebId, retrievePublicKeyLocationFromWebId, retrieveRevocationLocationFromURI } from "./Util.js";
import { RSA_JWK, jwk2pem } from "pem-jwk";
import { CredentialsGenerator } from "./dpop/CredentialsGenerator.js";
import { WebID} from './types/WebID.js'
import { timeStamp } from "console";





export class MbacsaClient implements MbacsaClientI {


  public constructor(){
  }

  private async authenticatedDPoPFetch(dpopInfo:DPoPInfo, url:string, init:RequestInit):Promise<Response>{
    const {accessToken, dpopKey} = dpopInfo;
    const authenticatedFetch = await buildAuthenticatedFetch(fetch, accessToken, {dpopKey});
    return await authenticatedFetch(url,init);
  }


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
  
  public async getResource(resourceURI: string, serializedMacaroons: string[]): Promise<any> {
    // Prepare discharge macaroons for request
    const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(serializedMacaroons);

    // Make request
    const resource = await fetch(resourceURI,{
      method: 'GET',
      headers: {
        'content-type': "application/json",
        'authorization': 'macaroon',
        'macaroon': preparedSerializedMacaroons.toString()
      },
    })
    return await resource.text();
  }

  public async appendToResource(resourceURI: string, serializedMacaroons: string[], data: object) : Promise<any> {
    // Prepare discharge macaroons for request
    const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(serializedMacaroons);
    // Make request
    const response = await fetch(resourceURI,{
      method: 'PUT',
      headers: {
        'content-type': "application/json",
        'authorization': 'macaroon',
        'macaroon': preparedSerializedMacaroons.toString()
      },
      data: JSON.stringify(data)
    })
    return await response.text();
  }


  public async retrieveDPoPToken(podServerUri:string, email:string, password:string):Promise<DPoPInfo> {
    const credentials = await CredentialsGenerator.generateCredentials(podServerUri,email, password);
    const dpopInfo = await DPoPGenerator.generateDPoPAccessToken(podServerUri,credentials);
    return dpopInfo;
  }

  public static inspectSerializedMacaroon(serializedMacaroon:string):string {
    const macaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedMacaroon);
    return macaroon.inspect()
  }

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