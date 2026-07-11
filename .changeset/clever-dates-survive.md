---
"@react-form-engine/core": patch
---

Class instances in API values (such as `Date`) now survive parsing intact. The internal deep clone rebuilt every object property-by-property, which stripped prototypes and handed transforms an empty object — breaking the documented `Date` ↔ ISO-string transform pattern. Non-plain objects are now treated as leaves and copied by reference.
