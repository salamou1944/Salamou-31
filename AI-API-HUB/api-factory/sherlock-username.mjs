import {execFile} from "node:child_process";

const DEFAULT_TIMEOUT_MS=30_000;
const MAX_USERNAME_LENGTH=128;

export function validateUsername(username){
  if(typeof username!=="string")throw new Error("username must be a string");
  const value=username.trim();
  if(!value)throw new Error("username must not be empty");
  if(value.length>MAX_USERNAME_LENGTH)throw new Error("username exceeds maximum length");
  if(/[\s/]/.test(value))throw new Error("username contains unsupported characters");
  return value;
}

export function buildSherlockArgs(username){
  return [validateUsername(username),"--print-found","--no-color","--timeout","20"];
}

export function parseSherlockOutput(stdout,username){
  const value=validateUsername(username);
  const lines=String(stdout??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const urls=[];
  for(const line of lines){
    const match=line.match(/https?:\/\/[^\s]+/);
    if(!match)continue;
    const url=match[0].replace(/[),.;]+$/,"");
    try{
      const parsed=new URL(url);
      if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")continue;
      urls.push({url,username:value});
    }catch{}
  }
  const seen=new Set();
  return urls.filter(item=>!seen.has(item.url)&&seen.add(item.url));
}

export function runSherlock(username,{executable=process.env.SHERLOCK_BIN||"sherlock",timeoutMs=DEFAULT_TIMEOUT_MS}={}){
  const value=validateUsername(username);
  if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300_000)throw new Error("timeoutMs must be between 1000 and 300000");
  const args=buildSherlockArgs(value);
  return new Promise((resolve,reject)=>{
    const child=execFile(executable,args,{timeout:timeoutMs,maxBuffer:2*1024*1024,windowsHide:true},(error,stdout,stderr)=>{
      const evidence=parseSherlockOutput(stdout,value);
      if(error){
        const unavailable=error.code==="ENOENT";
        const timeout=error.killed===true||error.signal==="SIGTERM";
        const message=unavailable?"Sherlock executable not found":timeout?"Sherlock execution timed out":"Sherlock failed: "+(stderr?.trim()||error.message);
        return reject(Object.assign(new Error(message),{code:unavailable?"SHERLOCK_UNAVAILABLE":timeout?"SHERLOCK_TIMEOUT":"SHERLOCK_FAILED",evidence}));
      }
      resolve({username:value,status:"DISCOVERED",verified:false,evidence});
    });
    child.on("error",()=>{});
  });
}
