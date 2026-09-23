import fs from "node:fs";
import path from "node:path";

export class UsageLedger {
  constructor(file){this.file=file;fs.mkdirSync(path.dirname(file),{recursive:true});}
  read(){try{return JSON.parse(fs.readFileSync(this.file,"utf8"));}catch{return {version:1,total:0,byRoute:{}};}}
  record(route){
    const d=this.read();d.total+=1;d.byRoute[route]=(d.byRoute[route]||0)+1;
    const tmp=this.file+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(d,null,2)+"\n",{mode:0o600});fs.renameSync(tmp,this.file);return d;
  }
  snapshot(){return this.read();}
}
