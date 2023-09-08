// Constants
export const WEBID_POSTFIX = '/profile/card#me'
export const ENDPOINT_MINT = '/.macaroon/mint'
export const ENDPOINT_DISCHARGE = '/.macaroon/discharge'
export const ENDPOINT_DISCHARGE_KEY = '/.macaroon/discharge/key'
export const ENDPOINT_REVOKE = '/.macaroon/revoke'


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