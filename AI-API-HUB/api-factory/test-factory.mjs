import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {validateSpec,compileApi} from "./factory.mjs";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-"));
const spec={name:"demo-orders",version:"v1",description:"Generated test API",auth:"api-key",operations:[
 {method:"GET",path:"/v1/orders",summary:"List orders"},
 {method:"POST",path:"/v1/orders",summary:"Create order"}
]};
assert.equal(validateSpec(spec).name,"demo-orders");
const artifact=compileApi(spec,root);
for(const file of artifact.files) assert.equal(fs.existsSync(path.join(root,"demo-orders",file)),true);
assert.match(fs.readFileSync(path.join(root,"demo-orders","server.mjs"),"utf8"),/v1\/orders/);
assert.throws(()=>validateSpec({...spec,name:"Bad Name"}),/name/);
assert.throws(()=>validateSpec({...spec,operations:[spec.operations[0],spec.operations[0]]}),/duplicate/);
console.log("api-factory compiler: PASS");
