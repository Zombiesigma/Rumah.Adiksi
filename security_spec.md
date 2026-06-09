# Security Specification & "Dirty Dozen" Test Spec for Rumah Adiksi

## 1. Data Invariants
- **CommunityPost Collection (posts)**:
  - Document IDs must conform to alphanumeric constraints to prevent poisoning.
  - Creation requires a valid author name, title, content, and category group.
  - Users can only edit or delete posts they authored, or likes/comments can be incremented atomically depending on status.
  - `createdAt` / `timestamp` should be verified or bounded.

- **ArtEvent Collection (events)**:
  - Events can be read by any member/visitor.
  - Creating or writing new events requires administrative or approved privileges.
  - RSVPs can increment or decrement `registeredCount` but must not spoof other event fields.

---

## 2. The "Dirty Dozen" Payloads (Theoretical Vulnerability Vectors)

1. **Self-Appointed Administrator Post Bypass (Identity Spoofing)**
   - Attempting to declare creator/admin metadata on client register without authorization.

2. **Poison Document ID (Resource Poisoning)**
   - Attempting to pass a 1.5MB junk-character key as a post document ID.

3. **Status Hijacking (State Shortcutting)**
   - Setting total likes directly on creation to `999999` to cheat rankings.

4. **Foreign Post Hijack (Write Gap)**
   - Trying to modify or overwrite another creator's post content or field description.

5. **PII Collection Scanning (PII Leak)**
   - Trying to query all authenticated emails via deep collection scans without verification.

6. **Blanket Read Request (Data Leakage)**
   - Expecting rules to trust client-side filters for private items.

7. **Comment Spoofing (Identity Integrity)**
   - Injecting malicious comment author names different from the signed-in user's profile.

8. **Over-limit Array Exhaustion (Denial of Wallet)**
   - Overfilling and ballooning the comments array inside a post past realistic limits (e.g., > 100 elements).

9. **Double-RSVP Counter Manipulation (Temporal Fraud)**
   - Trying to set registration counts to negative numbers.

10. **Shadow Field Injection**
    - Spawning secret hidden parameters like `isPromoted: true`.

11. **Malicious Empty Payload**
    - Writing a post with empty title or only spaces to break rendering layout.

12. **Tampered Timestamps**
    - Passing future timestamps inside newly compiled posts to pin them permanently to the top of the feed.

---

## 3. Recommended Firebase Security Rules (firestore.rules Skeleton)
These are mapped out in detail inside `firestore.rules` adhering to the Eight Pillars of Access Control.
