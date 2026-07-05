export const US_STATE_NAMES = [
  'alabama',
  'alaska',
  'arizona',
  'arkansas',
  'california',
  'colorado',
  'connecticut',
  'delaware',
  'florida',
  'georgia',
  'hawaii',
  'idaho',
  'illinois',
  'indiana',
  'iowa',
  'kansas',
  'kentucky',
  'louisiana',
  'maine',
  'maryland',
  'massachusetts',
  'michigan',
  'minnesota',
  'mississippi',
  'missouri',
  'montana',
  'nebraska',
  'nevada',
  'new hampshire',
  'new jersey',
  'new mexico',
  'new york',
  'north carolina',
  'north dakota',
  'ohio',
  'oklahoma',
  'oregon',
  'pennsylvania',
  'rhode island',
  'south carolina',
  'south dakota',
  'tennessee',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'washington',
  'west virginia',
  'wisconsin',
  'wyoming',
  'district of columbia',
  'washington dc',
]

export const US_STATE_ABBREVIATIONS_PATTERN =
  /\b[A-Za-z]+(?:[ .'-][A-Za-z]+)*,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy|dc)\b/i

export const CANADA_PROVINCE_NAMES = [
  'alberta',
  'british columbia',
  'manitoba',
  'new brunswick',
  'newfoundland and labrador',
  'nova scotia',
  'ontario',
  'prince edward island',
  'quebec',
  'saskatchewan',
  'northwest territories',
  'nunavut',
  'yukon',
]

export const CANADA_PROVINCE_ABBREVIATIONS_PATTERN =
  /\b[A-Za-z]+(?:[ .'-][A-Za-z]+)*,\s*(ab|bc|mb|nb|nl|ns|nt|nu|on|pe|qc|sk|yt)\b/i

export const NORTH_AMERICA_LOCATION_TERMS = [
  'united states',
  'usa',
  'u.s.',
  'us',
  'canada',
  'north america',
  'north american',
  'us and canada',
  'u.s. and canada',
  'united states and canada',
  'canada and usa',
  'canada and us',
  'remote',
  'work from home',
  'home based',
  'telecommute',
  'virtual',
  'toronto',
  'vancouver',
  'montreal',
  'calgary',
  'ottawa',
  'edmonton',
  'winnipeg',
  'halifax',
]

export const BLOCKED_INTERNATIONAL_LOCATION_TERMS = [
  'india',
  'uk',
  'united kingdom',
  'england',
  'germany',
  'france',
  'spain',
  'netherlands',
  'singapore',
  'australia',
  'philippines',
  'mexico',
  'brazil',
  'ireland',
  'poland',
  'romania',
  'czech republic',
  'hungary',
  'israel',
  'pakistan',
  'uae',
  'united arab emirates',
  'south africa',
  'colombia',
  'argentina',
  'portugal',
  'italy',
  'sweden',
  'denmark',
  'norway',
  'finland',
  'switzerland',
  'belgium',
  'austria',
  'new zealand',
  'malaysia',
  'indonesia',
  'vietnam',
  'japan',
  'china',
  'hong kong',
  'sri lanka',
  'bangladesh',
  'egypt',
  'morocco',
  'nigeria',
  'kenya',
]

function includesAnyTerm(
  text: string,
  terms: string[],
  includesTerm: (text: string, term: string) => boolean,
) {
  return terms.some((term) => includesTerm(text, term))
}

export function hasUsStateIndicator(
  text: string,
  includesTerm: (text: string, term: string) => boolean,
) {
  return (
    US_STATE_NAMES.some((term) =>
      includesTerm(text, term),
    ) || US_STATE_ABBREVIATIONS_PATTERN.test(text)
  )
}

export function hasCanadaProvinceIndicator(
  text: string,
  includesTerm: (text: string, term: string) => boolean,
) {
  return (
    CANADA_PROVINCE_NAMES.some((term) =>
      includesTerm(text, term),
    ) || CANADA_PROVINCE_ABBREVIATIONS_PATTERN.test(text)
  )
}

export function hasNorthAmericaLocationIndicator(
  text: string,
  includesTerm: (text: string, term: string) => boolean,
) {
  return (
    includesAnyTerm(text, NORTH_AMERICA_LOCATION_TERMS, includesTerm) ||
    hasUsStateIndicator(text, includesTerm) ||
    hasCanadaProvinceIndicator(text, includesTerm)
  )
}

export function hasBlockedInternationalLocation(
  text: string,
  includesTerm: (text: string, term: string) => boolean,
) {
  return includesAnyTerm(text, BLOCKED_INTERNATIONAL_LOCATION_TERMS, includesTerm)
}
