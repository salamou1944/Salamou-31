export class QuotaExceededError extends Error {
  constructor(limit){super("Request quota exceeded");this.name="QuotaExceededError";this.code="QUOTA_EXCEEDED";this.limit=limit;}
}
export class QuotaGuard {
  constructor(limit){this.limit=Number.isFinite(limit)&&limit>0?Math.floor(limit):0;this.used=0;}
  check(){if(this.limit>0&&this.used>=this.limit)throw new QuotaExceededError(this.limit);}
  consume(){this.check();this.used+=1;return this.used;}
  snapshot(){return {limit:this.limit||null,used:this.used,remaining:this.limit>0?Math.max(this.limit-this.used,0):null};}
}
