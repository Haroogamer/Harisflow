const CORE_ATS_SEED_URLS = [
  // Greenhouse
  'https://boards.greenhouse.io/servicenow',
  'https://boards.greenhouse.io/datadog',
  'https://boards.greenhouse.io/cloudflare',
  'https://boards.greenhouse.io/okta',
  'https://boards.greenhouse.io/hubspot',
  'https://boards.greenhouse.io/coinbase',
  // Lever
  'https://jobs.lever.co/snowflake',
  'https://jobs.lever.co/atlassian',
  'https://jobs.lever.co/airtable',
  'https://jobs.lever.co/openai',
  // Ashby
  'https://jobs.ashbyhq.com/notion',
  'https://jobs.ashbyhq.com/figma',
  'https://jobs.ashbyhq.com/ramp',
  'https://jobs.ashbyhq.com/retool',
  // SmartRecruiters
  'https://careers.smartrecruiters.com/Visa',
  'https://careers.smartrecruiters.com/Dynatrace',
  // iCIMS
  'https://careers-fisglobal.icims.com/jobs/search',
  'https://careers-splunk.icims.com/jobs/search',
  // Dayforce
  'https://jobs.dayforcehcm.com/en-US/okta/alljobs',
  'https://jobs.dayforcehcm.com/en-US/trimble/alljobs',
  // Oracle Cloud
  'https://edel.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/jobs',
  'https://hcrw.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
]

const EXTENDED_ATS_SEED_URLS = [
  // Workday
  'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
  'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite',
  'https://target.wd5.myworkdayjobs.com/en-US/targetcareers',
  'https://bah.wd1.myworkdayjobs.com/en-US/BAH_Jobs',
  'https://mantech.wd1.myworkdayjobs.com/en-US/External',
  'https://proofpoint.wd5.myworkdayjobs.com/ProofpointCareers',
  'https://cvshealth.wd1.myworkdayjobs.com/en-US/CVS_Health_Careers',
  'https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM',
  'https://dell.wd1.myworkdayjobs.com/External',
  'https://mars.wd3.myworkdayjobs.com/en-US/External',
  'https://msd.wd5.myworkdayjobs.com/en-US/SearchJobs',
  'https://wholefoods.wd5.myworkdayjobs.com/en-US/wholefoods',
  // UltiPro
  'https://recruiting.ultipro.ca/PAS5000PASON/JobBoard/e2d2ceaa-a04e-4f8f-a0e0-0c6b5a89397c',
  'https://recruiting2.ultipro.com/UHG1004UHG/JobBoard/0f7f8c8c-2ee2-4a6f-b191-17648d5f33e0',
  // More SmartRecruiters / iCIMS
  'https://careers.smartrecruiters.com/DocuSign',
  'https://careers.smartrecruiters.com/NIKE',
  'https://careers-intuitive.icims.com/jobs/search',
  'https://careers-paychex.icims.com/jobs/search',
  // More Dayforce
  'https://jobs.dayforcehcm.com/en-US/allstate/alljobs',
  'https://jobs.dayforcehcm.com/en-US/adayinlife/alljobs',
]

export async function searchServiceNowJobUrls() {
  return [...CORE_ATS_SEED_URLS]
}

export async function searchGoogleJobsForServiceNow() {
  return [...EXTENDED_ATS_SEED_URLS]
}
