export const AGE_BANDS=['18–24','25–34','35–44','45–54','55–64','65+'] as const;
export const GENDERS=['Woman','Man','Non-binary','Self-described','Prefer not to say'] as const;
export const RESEARCH_VERSION='audience-research-v1';
export type AudienceProfile={allowed:boolean;country:string;city:string;age_band:string;gender:string;updatedAt?:string;consentAt?:string|null;version?:string};
export const EMPTY_AUDIENCE:AudienceProfile={allowed:false,country:'',city:'',age_band:'',gender:''};
