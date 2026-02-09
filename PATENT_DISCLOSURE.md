# PATENT DISCLOSURE

## AI-Powered Truck Diagnostic and Repair Assistance System

---

### Document Information

| Field | Value |
|-------|-------|
| **Document Type** | Patent Disclosure / Provisional Patent Application Support |
| **Title** | AI-Powered Truck Diagnostic and Repair Assistance System |
| **Inventor** | Margarita Makeeva |
| **Contact** | makeeva01m@gmail.com |
| **Date of Disclosure** | February 8, 2026 |
| **Date of First Public Disclosure** | June 7, 2025 (v1.0) |
| **Current Disclosure Version** | 3.0 |
| **Repository** | github.com/Margarita215729/truck-repair-assistant_v2 |
| **Deployed Instance** | https://truck-repair-assistantv3-main.vercel.app |
| **Software Version** | 3.0.0 |

---

### 1. Field of the Invention

The present invention relates to the field of artificial intelligence-assisted vehicle diagnostics, and more specifically to an integrated web-based platform that employs multi-modal AI analysis — including natural language processing, acoustic pattern recognition, and computer vision — to diagnose mechanical faults in commercial trucks, provide guided repair instructions, and connect operators with relevant services and parts.

---

### 2. Background and Problem Statement

Commercial truck maintenance and emergency roadside repair represent a critical operational challenge. Current solutions suffer from:

- **Fragmented diagnostic workflows** — drivers must consult separate tools for error codes, sound-based diagnosis, and visual inspection, with no unified AI-driven analysis pipeline.
- **Language barriers** — the global trucking workforce operates across language boundaries, yet existing diagnostic tools are predominantly English-only with no real-time adaptive translation of technical automotive terminology.
- **Disconnected service discovery** — no existing system integrates real-time diagnostic output with geolocation-based service center recommendations filtered by the specific diagnosed fault.
- **Loss of community repair knowledge** — field-proven repair solutions discovered by experienced mechanics are not systematically captured, validated, or matched to future diagnostic cases.

---

### 3. Summary of the Invention

The invention is an integrated AI-powered platform comprising the following novel subsystems operating as a unified diagnostic pipeline:

**3.1. Multi-Modal Diagnostic Input Engine**

A system that accepts and correlates four distinct input modalities for a single diagnostic session:

- (a) **Natural language symptom description** via conversational AI chat
- (b) **Standardized fault codes** (OBD-II, J1939/SPN-FMI) with automated lookup and cross-referencing
- (c) **Acoustic signal capture and analysis** — in-browser audio recording of engine/component sounds, transmitted to an AI model trained to identify patterns associated with specific mechanical failures (bearing wear, belt slippage, exhaust leaks, injector malfunction)
- (d) **Photographic component analysis** — camera capture of truck parts transmitted to a vision-capable AI model for part identification, wear assessment, and compatibility matching

The novelty lies in the **simultaneous correlation** of all four input modalities within a single diagnostic session to produce a unified fault assessment with confidence scoring.

**3.2. Context-Aware Adaptive Repair Guidance Generator**

A method for dynamically generating step-by-step repair procedures that are parameterized by:

- Specific truck make, model, year, and engine configuration
- Diagnosed fault condition(s) from Section 3.1
- Available tools (via a user-maintained digital toolkit inventory)
- Operator skill level (novice / intermediate / professional)
- Environmental conditions (roadside emergency vs. shop environment)

The system generates repair instructions that adapt in real-time based on user feedback during the repair process, adjusting steps, adding safety warnings, or suggesting alternative approaches.

**3.3. Diagnostic-Aware Geolocation Service Matching**

A system that combines:

- Real-time diagnostic results (specific fault codes, diagnosed systems)
- User geolocation (GPS coordinates)
- Service center capability database (specializations, certifications, parts inventory)
- Real-time availability and rating data

To produce a **ranked list of service recommendations** where ranking factors include diagnostic relevance (whether the facility specializes in the diagnosed fault type), distance, user ratings, and estimated wait time.

**3.4. Community-Sourced Verified Repair Knowledge Base**

A collaborative system where:

- Verified repair solutions are submitted by users with structured metadata (truck model, fault code, symptoms, solution steps, parts used, time required)
- Solutions are matched to future diagnostic cases using semantic similarity
- A reputation and voting system ensures quality control
- Successfully applied solutions increase in ranking, creating a **self-improving diagnostic knowledge repository**

**3.5. Bilingual Adaptive Technical Interface**

A dynamic internationalization system specifically designed for automotive technical content, featuring:

- Context-aware translation that maintains technical precision of automotive terminology across languages (English / Russian)
- Consistent translation of OBD-II/J1939 fault code descriptions
- Language-adaptive UI that restructures layout and content density based on the selected language
- Seamless mid-session language switching without loss of diagnostic state

---

### 4. Detailed Technical Architecture

**4.1. AI Integration Layer**

The system employs a proprietary prompt engineering architecture that:

- Constructs diagnostic prompts combining truck-specific context, symptom history, and multi-modal inputs
- Implements a chain-of-reasoning approach where the AI first identifies affected systems, then narrows to specific components, then generates repair procedures
- Uses structured output parsing to extract actionable data (fault codes, part numbers, severity ratings) from AI responses
- Maintains conversational context across a diagnostic session via message history management

**4.2. Technology Stack**

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18.3 with JSX |
| Build System | Vite 6 |
| Styling | Tailwind CSS 3 with shadcn/ui component library |
| Authentication | Supabase Auth (email/password, session management) |
| Database | Supabase PostgreSQL |
| AI Models | GitHub Models API (GPT-4o, GPT-4o-mini) |
| Maps | Google Maps JavaScript API |
| Video Integration | YouTube Data API v3 |
| Deployment | Vercel Edge Network |
| Internationalization | Custom React Context-based i18n system |

**4.3. Source Code Structure**

The implementation comprises 119+ source files organized as:

- 7 page-level route components
- 40+ specialized UI components across 7 feature domains (diagnostics, community, parts, profile, reports, services, UI library)
- 5 service modules (AI, authentication, entity management, audio analysis, video search)
- Complete bilingual translation corpus (English, Russian)
- Truck-specific data models and knowledge base

---

### 5. Claims of Novelty

The following aspects are believed to be novel individually and in combination:

1. **Claim 1:** A method for diagnosing commercial truck mechanical faults by simultaneously correlating natural language descriptions, standardized fault codes, acoustic recordings, and photographic inputs within a single AI-powered diagnostic session.

2. **Claim 2:** A system for generating adaptive repair instructions parameterized by vehicle specification, diagnosed fault, available tools, operator skill level, and environmental conditions, with real-time adjustment based on user feedback during the repair process.

3. **Claim 3:** A method for ranking nearby service facilities by computing a composite score that incorporates diagnostic relevance to the specific identified fault, geographic proximity, facility ratings, and estimated availability.

4. **Claim 4:** A self-improving repair knowledge base that matches community-submitted verified solutions to new diagnostic cases using semantic similarity, with quality controlled by a reputation-weighted voting system.

5. **Claim 5:** A bilingual technical interface system that provides context-aware translation of automotive diagnostic terminology while maintaining diagnostic session state across language transitions.

6. **Claim 6:** The integrated combination of Claims 1-5 into a unified truck repair assistance platform accessible via a web browser.

---

### 6. Prior Art Differentiation

| Existing Solution | Limitation | This Invention's Advancement |
|-------------------|-----------|------------------------------|
| OBD-II scan tools | Single-modal (code only), no AI interpretation | Multi-modal AI correlation of codes + text + audio + photo |
| General AI chatbots (ChatGPT, etc.) | No vehicle-specific context, no integrated services | Truck-parameterized prompts, integrated service/parts discovery |
| Repair manual databases (AllData, Mitchell) | Static content, not adaptive to situation | Dynamic AI-generated instructions adapted to specific context |
| Service finder apps (Yelp, Google Maps) | Generic location search, not diagnostic-aware | Rankings incorporate specific diagnosed fault relevance |
| Forum-based communities (TruckersReport) | Unstructured, no semantic matching | Structured solutions with automated matching to diagnostic cases |

---

### 7. Commercial Applications

- **Independent truck operators** — roadside emergency diagnostics and nearest-capable-shop finding
- **Fleet management companies** — standardized diagnostic workflows across multilingual driver populations
- **Truck repair shop chains** — AI-assisted intake and diagnosis to improve technician efficiency
- **Insurance companies** — standardized diagnostic documentation for claims processing
- **OEM warranty departments** — structured fault documentation and repair verification

---

### 8. Development Timeline

| Date | Milestone |
|------|-----------|
| June 6, 2025 | v1.0 — Initial prototype with basic AI chat diagnostics (first commit) |
| June 7, 2025 | v1.0 Patent Disclosure published on GitHub |
| 2025 | v2.0 — TypeScript rewrite, expanded services, Supabase integration |
| February 2026 | v3.0 — Complete architectural rewrite: multi-modal diagnostics, bilingual i18n (EN/RU), new JSX architecture, production deployment |
| February 8, 2026 | v3.0 Patent Disclosure published on GitHub |

---

### 9. Inventor Declaration

I, **Margarita Makeeva**, declare that I am the sole inventor of the system described in this disclosure. The concepts, architecture, and implementation described herein are my original work. This disclosure is made to establish a public record of the invention and its date of conception.

This document supersedes and extends the prior Patent Disclosure v1.0 dated June 7, 2025.

**Inventor:** Margarita Makeeva
**Date:** February 8, 2026

---

### 10. Intellectual Property Notice

Copyright 2025-2026 Margarita Makeeva. All Rights Reserved.

This document and the associated software constitute proprietary intellectual property. No license is granted for commercial reproduction, adaptation, or implementation of the methods, algorithms, systems, or architectural patterns described herein without explicit written permission from the inventor.

The public disclosure of this document on GitHub establishes a prior art date of **February 8, 2026** for all claims described in this version. The original prior art date of **June 7, 2025** is preserved for claims present in Patent Disclosure v1.0.
