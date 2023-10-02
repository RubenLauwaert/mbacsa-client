import { DPoPInfo } from "./dpop/DPoPGenerator";
import {MintRequest, DischargeRequest, PublicKeyDischargeRequest, RevocationRequest} from './types/Requests'
import { buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import fetch  from 'node-fetch'
import NodeRSA from 'node-rsa'
import macaroons from 'macaroons.js'
import { v4 as uuidv4 } from 'uuid';
import { MbacsaClientI } from "./MbacsaClientI";
import { DischargeResponse, MintResponse, PublicDischargeKeyResponse } from "./types/Responses";
import { Macaroon } from "macaroons.js";
import { retrieveDischargeLocationFromWebId, retrieveMintLocationFromWebId, retrievePublicKeyLocationFromWebId, retrieveRevocationLocationFromWebId } from "./Util";
import { jwk2pem } from "pem-jwk";



export class MbacsaClient implements MbacsaClientI {

  public constructor(){}

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
  public async dischargeDelegationToken(dischargee: WebID, requestBody: DischargeRequest, dpop: DPoPInfo): Promise<DischargeResponse> {
    const dischargeLocation = retrieveDischargeLocationFromWebId(dischargee);
    const dischargeResponse = await this.authenticatedDPoPFetch(dpop, dischargeLocation, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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


  public async delegateAccessTo(originalMacaroon: Macaroon, delegatee: WebID, mode?: string ): Promise<Macaroon> {

    // Generate encrypted Third-Party caveat to discharge delegatee
    const dischargeKeyDelegateeJWK = await this.getPublicDischargeKey(delegatee);
    const dischargeLocation = retrieveDischargeLocationFromWebId(delegatee);
    const caveatKey = uuidv4();
    const predicate = `agent = ${delegatee}`;
    const caveatId = caveatKey + "::" + predicate;
    // Encrypt caveat with public discharge key of delegatee
    const rsa = new NodeRSA();
    const dischargeKey = rsa.importKey(jwk2pem(dischargeKeyDelegateeJWK.dischargeKey));
    const encryptedCaveatId = dischargeKey.encrypt(caveatId,'base64').toString();
    // Attenuate original macaroon
    const attenuatedMacaroon = macaroons.MacaroonsBuilder.modify(originalMacaroon)
      .add_third_party_caveat(dischargeLocation,caveatKey,encryptedCaveatId);

    if(mode){
      attenuatedMacaroon.add_first_party_caveat(`mode = ${mode}`)
    }
    return attenuatedMacaroon.getMacaroon();
  }

  public async revokeDelegationToken(revocationInfo: RevocationRequest, dpop: DPoPInfo): Promise<any> {
    const {resourceOwner} = revocationInfo;
    const revocationLocation = retrieveRevocationLocationFromWebId(resourceOwner);
    // Prepare discharge macaroons
    const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(revocationInfo.serializedMacaroons);
    revocationInfo.serializedMacaroons = preparedSerializedMacaroons;
    const revocationResponse = await this.authenticatedDPoPFetch(dpop, revocationLocation, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(revocationInfo)
    });
    const data = await revocationResponse.json();
    return data;
  }

  public async accessWithDelegationToken(resourceURI: string, serializedMacaroons: Array<string>): Promise<any> {

    // Prepare discharge macaroons for request
    const preparedSerializedMacaroons = this.prepareMacaroonsForRequest(serializedMacaroons);

    const resource = await fetch(resourceURI,{
      method: 'GET',
      headers: {
        'content-type': "application/json",
        'authorization': 'macaroon',
        'macaroon': preparedSerializedMacaroons.toString()
  
      }
    })
    return await resource.text();
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