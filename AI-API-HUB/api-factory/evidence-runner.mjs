import {spawn} from "node:child_process";

export async function runEvidenceCommand({
  command,
  args=[],
  cwd=process.cwd(),
  timeoutMs=10000,
  env=process.env,
}={}) {
  if(!command || typeof command!=="string") throw new Error("INVALID_COMMAND");
  if(!Array.isArray(args)) throw new Error("INVALID_ARGS");
  if(!Number.isFinite(timeoutMs) || timeoutMs<=0) throw new Error("INVALID_TIMEOUT");

  return await new Promise((resolve)=>{
    const startedAt=Date.now();
    const child=spawn(command,args,{cwd,env,shell:false});
    let stdout="", stderr="", timedOut=false, settled=false;

    const finish=(result)=>{
      if(settled) return;
      settled=true;
      resolve({
        schema:"evidence-command/v1",
        command,
        args,
        cwd,
        timeoutMs,
        startedAt,
        durationMs:Date.now()-startedAt,
        ...result,
      });
    };

    child.stdout?.on("data",(chunk)=>{ stdout+=chunk.toString(); });
    child.stderr?.on("data",(chunk)=>{ stderr+=chunk.toString(); });

    const timer=setTimeout(()=>{
      timedOut=true;
      child.kill("SIGTERM");
      setTimeout(()=>child.kill("SIGKILL"),100);
    },timeoutMs);

    child.on("error",(error)=>{
      clearTimeout(timer);
      finish({status:"error",exitCode:null,signal:null,timedOut:false,stdout,stderr:stderr+String(error.message)});
    });

    child.on("close",(code,signal)=>{
      clearTimeout(timer);
      finish({
        status:timedOut ? "timeout" : code===0 ? "passed" : "failed",
        exitCode:code,
        signal:signal||null,
        timedOut,
        stdout,
        stderr,
      });
    });
  });
}
