// Central branding config for this ERP. Every school-specific string in the app should be
// read from here — not hardcoded — so cloning this project for a new school only requires
// setting these values in .env.local (see .env.example), never editing component code.
//
// Falls back to the original Skylark School values if a variable isn't set, so the app keeps
// working out of the box even without a .env file configured.

export const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || 'Skylark School'
export const SCHOOL_SHORT_NAME = import.meta.env.VITE_SCHOOL_SHORT_NAME || 'Skylark'
export const SCHOOL_EMAIL_DOMAIN = import.meta.env.VITE_SCHOOL_EMAIL_DOMAIN || 'skylarkschool.edu'
export const SCHOOL_CONTACT_EMAIL = import.meta.env.VITE_SCHOOL_CONTACT_EMAIL || `hello@${SCHOOL_EMAIL_DOMAIN}`
export const SCHOOL_ACADEMIC_YEAR = import.meta.env.VITE_SCHOOL_ACADEMIC_YEAR || '2026–27'
// Short code used in generated School IDs (e.g. SKY-STU-2026-0001). Also set via the
// database migration when a new school's Supabase project is created — see NEW_SCHOOL_SETUP.md.
export const SCHOOL_ID_PREFIX = import.meta.env.VITE_SCHOOL_ID_PREFIX || 'SKY'
