# Vibe Compliance Studio - Project Roadmap

## Phase 1: MVP Core (Completed ✅)
- [x] Next.js SaaS Skeleton (Auth, Dashboard, Navigation)
- [x] Supabase Database Schema (Assets, Assessments, Controls, Evidence)
- [x] Assessment Wizard (Template-based creation)
- [x] Automated Evidence Collection (GitHub API Integration)
- [x] AI Validator (Multimodal Vision Analysis for screenshots)
- [x] RAG Knowledge Base (Vector Search for policies)

## Phase 2: The "Global Brain" Refactor (Current Priority 🚧)
- [ ] **Smart Chunking (Critical):** Upgrade Ingestion API to split text by paragraph/sentence context rather than raw character limits.
    - *Why:* Solves the "Dilution Problem" where specific keywords get drowned out in large paragraphs.
- [ ] **PDF Parsing:** Integrate `pdf-parse` or unstructured.io to handle raw PDF uploads instead of text pasting.
- [ ] **Hybrid Search:** Combine Vector Search (Semantic) with Keyword Search (Exact Match) for higher accuracy.
- [ ] **Policy/Controls Mapping enhancements:** Point AI to a repository of policies and automatically match them to a selected group of controls standards.
- [ ] **Automated Assessments** Upload a questionaire and conduct the assessment based on the controls


## Phase 3: Enterprise Administration
- [ ] **Admin Portal:** User Management table (Invite/Revoke access).
- [ ] **RBAC:** Implement Roles (Admin vs. Auditor vs. Read-Only).
- [ ] **Audit Logs:** Track who changed a control status and when.

## Phase 4: Expansion
- [ ] **Jira Integration:** Two-way sync for remediation tickets.
- [ ] **Okta Integration:** Automated User Access Reviews.
- [ ] **Export Engine:** Generate PDF/Word SSP (System Security Plan) documents.
- [ ] **Attach Standards to assets:** drag and drop standards and/or assesments to assets.