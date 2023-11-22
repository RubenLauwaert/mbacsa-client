import { Macaroon } from "macaroons.js"
import { WebID } from "./types/WebID"
import macaroons, { MacaroonsConstants, MacaroonsDeSerializer } from 'macaroons.js'


// Constants
export const WEBID_POSTFIX = '/profile/card#me'
export const ENDPOINT_MINT = '/.macaroon/mint'
export const ENDPOINT_DISCHARGE = '/.macaroon/discharge'
export const ENDPOINT_DISCHARGE_KEY = '/.macaroon/discharge/key'
export const ENDPOINT_REVOKE = '/.macaroon/revoke'

export enum AccessMode {
  read = 'read',
  append = 'append',
  write = 'write',
  create = 'create',
  delete = 'delete',
}

const accessModeToHttpMethod: { [key in AccessMode]: string } = {
  [AccessMode.read]: 'GET',
  [AccessMode.append]: 'POST',
  [AccessMode.write]: 'PUT',
  [AccessMode.create]: 'POST',
  [AccessMode.delete]: 'DELETE',
};

export function accessModeToHttpMethodString(mode:AccessMode){
  return accessModeToHttpMethod[mode];
}


export function extractPathToPodServer(agent: WebID){
  const url = new URL(agent);
  const pathToPodServer = url.origin;
  return pathToPodServer;
}


export function extractPathToPod(resourceUri:string):string{
  const url = new URL(resourceUri);
  const baseUrl = url.origin;
  const path = url.pathname;
  const pathSegments = path.split('/');
  const podName = pathSegments[1];
  return baseUrl + '/' + podName;
}


export function extractPodName(rootPathToPod:string):string{
  const pathSegments =rootPathToPod.split('/');
  return pathSegments[pathSegments.length - 1];
}

export function extractWebID(resourceUri:string):string{
  const podName = extractPathToPod(resourceUri);
  return podName + WEBID_POSTFIX;
}

export function retrieveMintLocationFromWebId(webId: string):string{
  const podServerUri = extractPathToPodServer(webId);
  return podServerUri + ENDPOINT_MINT
}

export function retrieveDischargeLocationFromWebId(webId: string):string{
  const podServerUri = extractPathToPodServer(webId);
  return podServerUri + ENDPOINT_DISCHARGE
}

export function retrievePublicKeyLocationFromWebId(webId: string):string{
  const podServerUri = extractPathToPodServer(webId);
  return podServerUri + ENDPOINT_DISCHARGE_KEY
}

export function retrieveRevocationLocationFromURI(webId: string):string{
  const podServerUri = extractPathToPodServer(webId);
  return podServerUri + ENDPOINT_REVOKE
}


export function getThirdPartyCIDLastInChain(serializedMacaroon:string):string {
  const macaroon = macaroons.MacaroonsDeSerializer.deserialize(serializedMacaroon);
  const {caveatPackets} = macaroon;
  // Get all third-party caveats
  const thirdPartyCaveats = caveatPackets.filter((caveatPacket,index) => {
      const isCId = caveatPacket.type === 3;
      const hasCorrespondingVid = (caveatPackets[index + 1] !== undefined) && caveatPackets[index + 1].type === 4;
      const hasCorrespondingLocation = (caveatPackets[index + 2] !== undefined) && caveatPackets[index + 2].type === 5;
      return isCId && hasCorrespondingVid && hasCorrespondingLocation;
  })

  return thirdPartyCaveats[thirdPartyCaveats.length - 1].getValueAsText();

}

export function extractModeFromMacaroon(macaroon:Macaroon):AccessMode {
  const caveats = macaroon.caveatPackets;
  let mode = AccessMode.read;
  for(let i = 0 ; i < caveats.length ; i++){
    const caveat = caveats[i];
    const caveatMessage = caveat.getValueAsText();
    if(caveatMessage.includes("mode = ")){
      const modeStr = caveatMessage.split('=')[1].trim();
      mode = AccessMode[modeStr as keyof typeof AccessMode];
      break;
    }
  }
  return mode;
}


export function getFollowingDelegationPosition(rootMacaroon:Macaroon):number {
  const { caveatPackets } = rootMacaroon;
  const thirdPartyCaveatPackets = caveatPackets.filter((caveatPacket,index,caveatPackets) => {
    return (caveatPacket.type === 3) && (caveatPackets[index + 1].type === 4) && (caveatPackets[index + 2].type === 5);
  })
  
  return thirdPartyCaveatPackets.length + 1;
}