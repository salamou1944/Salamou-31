import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 5;
const LOCK_MAX_WAIT_MS = 2_000;

export class RequestLedger {
  constructor(file){
    this.file=file;
    fs.mkdirSync(path.dirname(file),{recursive:true});
    this.lockFile=file+".lock";
  }
  read(){
    try{return JSON.parse(fs.readFileSync(this.file,"utf8"));}catch{return {version:1,requests:{}};}
  }
  write(data){
    const tmp=this.file+"."+process.pid+".tmp";
    fs.writeFileSync(tmp,JSON.stringify(data,null,2)+"\n",{mode:0o600});
    fs.renameSync(tmp,this.file);
  }
  acquireLock(){
    const started=Date.now();
    while(true){
      try{
        const fd=fs.openSync(this.lockFile,"wx",{mode:0o600});
        fs.writeSync(fd,JSON.stringify({pid:process.pid,createdAt:Date.now()}));
        return fd;
      }catch(error){
        if(error?.code!=="EEXIST") throw error;
        try{
          const stat=fs.statSync(this.lockFile);
          if(Date.now()-stat.mtimeMs>LOCK_STALE_MS) fs.unlinkSync(this.lockFile);
        }catch{}
        if(Date.now()-started>=LOCK_MAX_WAIT_MS) throw new Error("idempotency_lock_timeout");
        const sab=new SharedArrayBuffer(4);
        Atomics.wait(new Int32Array(sab),0,0,LOCK_WAIT_MS);
      }
    }
  }
  releaseLock(fd){
    try{fs.closeSync(fd);}finally{try{fs.unlinkSync(this.lockFile);}catch{}}
  }
  withLock(fn){
    const fd=this.acquireLock();
    try{return fn();}finally{this.releaseLock(fd);}
  }
  key(idempotencyKey){return crypto.createHash("sha256").update(idempotencyKey).digest("hex");}
  fingerprint({method,route,body}){
    return crypto.createHash("sha256").update(JSON.stringify({method,route,body:body??null})).digest("hex");
  }
  begin({idempotencyKey,api,route,requestFingerprint}){
    if(!idempotencyKey) return {accepted:true,replayed:false};
    return this.withLock(()=>{
      const data=this.read();
      const k=this.key(idempotencyKey);
      const existing=data.requests[k];
      if(existing){
        if(existing.requestFingerprint && requestFingerprint && existing.requestFingerprint!==requestFingerprint){
          return {accepted:false,replayed:false,conflict:true,record:existing};
        }
        return {accepted:false,replayed:true,record:existing};
      }
      data.requests[k]={
        api,route,status:"started",
        requestFingerprint:requestFingerprint||null,
        createdAt:new Date().toISOString()
      };
      this.write(data);
      return {accepted:true,replayed:false};
    });
  }
  finish({idempotencyKey,status,usage,responseBody,contentType}){
    if(!idempotencyKey) return;
    return this.withLock(()=>{
      const data=this.read();
      const k=this.key(idempotencyKey);
      if(!data.requests[k]) return;
      data.requests[k]={
        ...data.requests[k],
        status,
        usage:usage??null,
        responseBody:responseBody??null,
        contentType:contentType??"application/json",
        finishedAt:new Date().toISOString()
      };
      this.write(data);
    });
  }
  async waitForCompletion(idempotencyKey,timeoutMs=30_000){
    if(!idempotencyKey) return null;
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      const record=this.read().requests[this.key(idempotencyKey)];
      if(!record) return null;
      if(record.status!=="started") return record;
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    return this.read().requests[this.key(idempotencyKey)]||null;
  }
}
