import axios from 'axios';
import { NFTStorage } from 'nft.storage';

const client = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_KEY });

const isValidUrl = (uri: string) => {
  let url = null;
  try {
    url = new URL(uri);
  } catch (_) {
    return false;
  }
  return url.protocol === 'ipfs:' || url.protocol === 'http:' || url.protocol === 'https:';
};

export function ipfsCIDToHttpUrl(url: string, isJson = false) {
  if (!url) {
    return url;
  }
  if (!url.includes('https://'))
    return isJson
      ? `https://infura-ipfs.io/ipfs/${url.replace('ipfs://', '')}/metadata.json`
      : `https://infura-ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  return url;
}

export const storeImageAsBlob = async (file: File): Promise<string> => {
  const cid = await client.storeBlob(file);
  return `ipfs://${cid}`;
};

export const storeAsBlob = async (json: any): Promise<string> => {
  const encodedJson = new TextEncoder().encode(JSON.stringify(json));
  const blob = new Blob([encodedJson], {
    type: 'application/json;charset=utf-8',
  });
  const file = new File([blob], 'metadata.json');
  const cid = await client.storeBlob(file);
  return `ipfs://${cid}`;
};

const storeAsJson = async (json: any): Promise<string> => {
  const metadata = await client.store(json as any);
  return metadata.ipnft;
};

export async function storeMetadata(json: any, convertImageBlobToFile: (blob: Blob) => File = null) {
  if (convertImageBlobToFile && isValidUrl(json.image)) {
    const result = await axios.get(json.image, {
      responseType: 'blob',
    });
    json.image = convertImageBlobToFile(result.data);
  }

  if (isValidUrl(json.image)) {
    return storeAsBlob(json);
  }
  return storeAsJson(json);
}
