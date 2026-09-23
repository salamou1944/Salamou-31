import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class RequestLedger {
  constructor(file){
    this.file=file;
    fs.mkdirSync(path.dirname(file),{recursive:true});
  }
  read(){
    try{return JSON.parse(fs.readFileSync(this.file,"utf8"));}catch{return {version:1,requests:{}};}
  }
  write(data){
    const tmp=this.file+"."+process.pid+".tmp";
    fs.writeFileSync(tmp,JSON.stringify(data,null,2)+"\n",{mode:0o600});
    fs.renameSync(tmp,this.file);
  }
  key(idempotencyKey){return crypto.createHash("sha256").update(idempotencyKey).digest("hex");}
  begin({idempotencyKey,api,route}){
    if(!idempotencyKey) return {accepted:true,replayed:false};
    const data=this.read();
    const k=this.key(idempotencyKey);
    const existing=data.requests[k];
    if(existing) return {accepted:false,replayed:true,record:existing};
    data.requests[k]={api,route,status:"started",createdAt:new Date().toISOString()};
    this.write(data);
    return {accepted:true,replayed:false};
  }
  finish({idempotencyKey,status,usage}){
    if(!idempotencyKey) return;
    const data=this.read();
    const k=this.key(idempotencyKey);
    if(!data.requests[k]) return;
    data.requests[k]={...data.requests[k],status,usage:usage??null,finishedAt:new Date().toISOString()};
    this.write(data);
  }
}
