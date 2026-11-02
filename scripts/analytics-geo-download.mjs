import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { open } from 'maxmind';

// Public reference dataset only. No visitor IP is ever sent to this provider.
// DB-IP City Lite, CC BY 4.0. Attribution is included in the admin dashboard.
const knownSha1={ '2026-10':'df17bd24390108ed1d24dcb7718dc60f6b9abd4f' };
export async function downloadAnalyticsGeo(output,{ now=new Date(), fetcher=fetch }={}) {
  await mkdir(dirname(output),{recursive:true});
  const temporary=output+'.'+randomUUID()+'.part';
  try{
    let response,edition;
    for(let offset=0;offset<2;offset++){
      const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-offset,1));
      edition=date.toISOString().slice(0,7);
      response=await fetcher(`https://download.db-ip.com/free/dbip-city-lite-${edition}.mmdb.gz`,{redirect:'error',signal:AbortSignal.timeout(90000)});
      if(response.ok)break;
      if(response.status!==404 || offset===1)throw new Error('Geo database download unavailable');
    }
    if(!response?.ok || !response.body)throw new Error('Geo database download unavailable');
    const compressed=createHash('sha1'),raw=createHash('sha1');let input=0,outputSize=0;
    const limit=(maximum,onChunk)=>new Transform({transform(chunk,encoding,done){
      try{onChunk(chunk);if((maximum==='input'?input:outputSize)>(maximum==='input'?180:450)*1024*1024)throw new Error('Geo database exceeds size limit');done(null,chunk);}catch(error){done(error);}
    }});
    await pipeline(Readable.fromWeb(response.body),limit('input',chunk=>{input+=chunk.length;compressed.update(chunk);}),
      createGunzip(),limit('output',chunk=>{outputSize+=chunk.length;raw.update(chunk);}),createWriteStream(temporary,{flags:'wx',mode:0o600}));
    const expected=knownSha1[edition];
    if(expected && ![compressed.digest('hex'),raw.digest('hex')].includes(expected))throw new Error('Geo database checksum mismatch');
    const reader=await open(temporary,{cache:{max:10}});
    if(!reader.get('8.8.8.8')?.country?.iso_code)throw new Error('Invalid GeoIP database');
    await rename(temporary,output);
    return {edition,bytes:outputSize,path:output};
  }finally{await rm(temporary,{force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--output');
  const destination=index>=0?process.argv[index+1]:process.env.ANALYTICS_GEOIP_DB||resolve('.analytics/geoip.mmdb');
  if(!destination)throw new Error('Missing GeoIP output path');
  downloadAnalyticsGeo(destination).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Could not install the local GeoIP database.');process.exitCode=1;});
}
