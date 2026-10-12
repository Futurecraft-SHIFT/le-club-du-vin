export const CURRENCIES=['EUR','USD','GBP','CHF','CAD','AUD'] as const;
export const PURCHASE_CONTEXTS=['Shop','Bar','Restaurant','Gift','Other'] as const;
export const money=(amount:number,currency:string)=>new Intl.NumberFormat('en',{style:'currency',currency}).format(amount);
