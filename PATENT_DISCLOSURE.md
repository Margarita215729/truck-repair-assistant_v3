# PATENT DISCLOSURE

## AI-Powered Truck Diagnostic and Repair Assistance System with Real-Time Telematics Integration

---

### Document Information

| Field | Value |
|-------|-------|
| **Document Type** | Patent Disclosure / Provisional Patent Application Support |
| **Title** | AI-Powered Truck Diagnostic and Repair Assistance System with Real-Time Telematics Integration |
| **Inventor** | Margarita Makeeva |
| **Contact** | makeeva01m@gmail.com |
| **Date of Disclosure** | March 7, 2026 |
| **Date of First Public Disclosure** | June 7, 2025 (v1.0) |
| **Previous Disclosure Versions** | v1.0 (June 7, 2025), v3.0 (February 8, 2026) |
| **Current Disclosure Version** | 3.1 |
| **Repository** | github.com/Margarita215729/truck-repair-assistant_v3 |
| **Deployed Instance** | https://www.tra.tools |
| **Software Version** | 3.1.0 |

---

### 1. Field of the Invention

The present invention relates to the field of artificial intelligence-assisted vehicle diagnostics, and more specifically to an integrated web-based platform that employs multi-modal AI analysis — including natural language processing, acoustic pattern recognition, computer vision, and **real-time electronic control unit (ECU) data acquisition via telematics integration** — to diagnose mechanical faults in commercial trucks, provide guided repair instructions, and connect operators with relevant services and parts.

---

### 2. Background and Problem Statement

Commercial truck maintenance and emergency roadside repair represent a critical operational challenge. Current solutions suffer from:

- **Fragmented diagnostic workflows** — drivers must consult separate tools for error codes, sound-based diagnosis, and visual inspection, with no unified AI-driven analysis pipeline.
- **Language barriers** — the global trucking workforce operates across language boundaries, yet existing diagnostic tools are predominantly English-only with no real-time adaptive translation of technical automotive terminology.
- **Disconnected service discovery** — no existing system integrates real-time diagnostic output with geolocation-based service center recommendations filtered by the specific diagnosed fault.
- **Loss of community repair knowledge** — field-proven repair solutions discovered by experienced mechanics are not systematically captured, validated, or matched to future diagnostic cases.
- **Manual data entry for vehicle state** — drivers must manually read and type fault codes from OBD scanners or dashboard lights, introducing transcription errors and omissions. No existing AI diagnostic platform directly reads the truck's J1939/OBD-II data bus through the driver's existing ELD/telematics hardware to obtain a complete, machine-accurate vehicle state.
- **Disconnected telematics data** — fleet telematics platforms (Motive, Samsara, etc.) collect rich ECU data but present it in fleet-management dashboards not designed for diagnostics. No system feeds raw telematics signals into an AI diagnostic engine that cross-references fault codes, sensor readings, and inspection defects to produce actionable repair guidance.

---

### 3. Summary of the Invention

The invention is an integrated AI-powered platform comprising the following novel subsystems operating as a unified diagnostic pipeline:

**3.1. Multi-Modal Diagnostic Input Engine**

A system that accepts and correlates five distinct input modalities for a single diagnostic session:

- (a) **Natural language symptom description** via conversational AI chat
- (b) **Standardized fault codes** (OBD-II, J1939/SPN-FMI) with automated lookup and cross-referencing
- (c) **Acoustic signal capture and analysis** — in-browser audio recording of engine/component sounds, transmitted to an AI model trained to identify patterns associated with specific mechanical failures (bearing wear, belt slippage, exhaust leaks, injector malfunction)
- (d) **Photographic component analysis** — camera capture of truck parts transmitted to a vision-capable AI model for part identification, wear assessment, and compatibility matching
- (e) **Real-time ECU data acquisition via telematics providers** — one-click connection to the vehicle's onboard computer through existing ELD/telematics hardware (Motive KeepTruckin, Samsara), reading 65+ canonical signals including engine parameters, fault codes, aftertreatment system state, brake air pressures, tire pressures, transmission data, and dashboard tell-tale lamp states

The novelty lies in the **simultaneous correlation** of all five input modalities within a single diagnostic session to produce a unified fault assessment with confidence scoring, and specifically in the automated acquisition of ECU data through third-party telematics APIs that is then fed directly into an AI interpretation engine.

**3.2. Telematics-Integrated Live Vehicle State System (NEW)**

A novel subsystem comprising:

**(a) Provider-Agnostic Telematics Abstraction Layer**

A software architecture that normalizes data from multiple telematics providers (Motive, Samsara, and extensible to others) into a unified canonical signal schema of 65+ vehicle parameters organized across 10 categories:

| Category | Example Signals | Count |
|----------|----------------|-------|
| Engine | RPM, load, coolant temp, oil pressure, turbo boost, exhaust gas temp | 16 |
| Fuel | Level, rate, economy, consumption, idle fuel used | 5 |
| Aftertreatment | DEF level, DPF soot/ash load, regen status, SCR efficiency, EGR position | 12 |
| Transmission | Gear, oil temp, oil pressure, output shaft speed | 4 |
| Brakes | Air pressure (primary/secondary), pad wear, ABS, traction control | 6 |
| Tires (TPMS) | Pressure and temperature per axle position | 10 |
| Electrical | Battery voltage, alternator voltage | 2 |
| Location | GPS coordinates, speed, heading, odometer | 5 |
| Tell-tales | MIL, stop lamp, warning lamp, protect lamp, DPF lamp, wait-to-start | 6 |
| Misc | Cruise control, engine hours, gateway status | 3 |

Each provider's raw data format is mapped through a provider-specific normalizer that converts proprietary field names and data structures into the canonical schema, allowing the diagnostic engine to operate identically regardless of the data source.

**(b) Secure OAuth Token Vault**

A security subsystem that:

- Facilitates one-time OAuth 2.0 authorization with telematics providers
- Encrypts all refresh tokens using AES-256-GCM with a server-side master key before database storage
- Stores encrypted tokens in a dedicated `encrypted_tokens` table with IV and authentication tag
- Automatically refreshes access tokens via a scheduled cron job (hourly) before expiration
- Ensures that plaintext tokens never persist in the database

**(c) Vehicle System Snapshot Builder**

A data aggregation engine that:

- Collects all normalized signals, fault events, and inspection defects for a given vehicle
- Assembles them into a single point-in-time snapshot with computed statistics (total active faults, fault severity distribution, signal anomaly flags)
- Implements a staleness protocol: snapshots older than 5 minutes are automatically rebuilt from fresh provider data
- Persists snapshots for historical trending and comparison

**(d) Improbability Drive — AI Diagnostic Interpretation Engine**

A specialized AI layer that:

- Receives the complete vehicle system snapshot as structured JSON
- Uses a purpose-built system prompt instructing the AI to cross-reference fault codes with live sensor readings (e.g., correlating a coolant temperature fault code with actual coolant temperature sensor value)
- Produces a structured diagnostic output with: overall severity, safe-to-drive boolean assessment, immediate required actions, fault-by-fault analysis with probable root causes, correlated fault groups, affected systems, and recommended next steps
- Returns results in a strict JSON schema to enable programmatic rendering in the UI

**(e) Chat Bridge — Diagnostic Context Injection**

A method whereby the raw vehicle state snapshot and AI interpretation are formatted into a structured context block and injected into the diagnostic chat session, allowing the conversational AI to have complete, up-to-date knowledge of the vehicle's computer state when answering user questions. This creates a novel feedback loop where:

1. Live ECU data → AI interpretation → structured diagnosis
2. User asks follow-up questions → AI has full vehicle context → precise answers referencing actual sensor values and fault codes

**(f) Webhook-Based Real-Time Data Ingestion**

A system for receiving push-based updates from telematics providers via webhook endpoints:

- HMAC-SHA256 signature verification for webhook payload authenticity
- Raw event storage for audit trail
- Normalized event extraction (faults, signals, operational events)
- Automatic snapshot rebuild triggered by incoming webhook data
- Provider-specific webhook handlers with configurable event type routing

**(g) Automatic Vehicle Resolution**

A method whereby the system automatically resolves which vehicle to scan without requiring manual selection by the user. When a user initiates a scan, the system queries the user's active telematics connection, retrieves the mapped vehicle profile from the database, and proceeds with the scan — eliminating friction in the one-click diagnostic flow.

**3.3. Context-Aware Adaptive Repair Guidance Generator**

A method for dynamically generating step-by-step repair procedures that are parameterized by:

- Specific truck make, model, year, and engine configuration
- Diagnosed fault condition(s) from Section 3.1 (including live ECU data)
- Available tools (via a user-maintained digital toolkit inventory)
- Operator skill level (novice / intermediate / professional)
- Environmental conditions (roadside emergency vs. shop environment)
- **Real-time vehicle sensor values** that provide additional context (e.g., if coolant temp is 240°F, the repair guidance emphasizes immediate shutdown; if oil pressure is low, guidance differs from a code-only diagnosis)

The system generates repair instructions that adapt in real-time based on user feedback during the repair process, adjusting steps, adding safety warnings, or suggesting alternative approaches.

**3.4. Diagnostic-Aware Geolocation Service Matching**

A system that combines:

- Real-time diagnostic results (specific fault codes, diagnosed systems, **live ECU sensor data severity**)
- User geolocation (GPS coordinates, **or GPS from telematics provider**)
- Service center capability database (specializations, certifications, parts inventory)
- Real-time availability and rating data

To produce a **ranked list of service recommendations** where ranking factors include diagnostic relevance (whether the facility specializes in the diagnosed fault type), distance, user ratings, and estimated wait time.

**3.5. Community-Sourced Verified Repair Knowledge Base**

A collaborative system where:

- Verified repair solutions are submitted by users with structured metadata (truck model, fault code, symptoms, solution steps, parts used, time required)
- Solutions are matched to future diagnostic cases using semantic similarity
- A reputation and voting system ensures quality control
- Successfully applied solutions increase in ranking, creating a **self-improving diagnostic knowledge repository**

**3.6. Bilingual Adaptive Technical Interface**

A dynamic internationalization system specifically designed for automotive technical content, featuring:

- Context-aware translation that maintains technical precision of automotive terminology across languages (English / Russian)
- Consistent translation of OBD-II/J1939 fault code descriptions
- Language-adaptive UI that restructures layout and content density based on the selected language
- Seamless mid-session language switching without loss of diagnostic state

---

### 4. Detailed Technical Architecture

**4.1. AI Integration Layer**

The system employs a proprietary prompt engineering architecture that:

- Constructs diagnostic prompts combining truck-specific context, symptom history, multi-modal inputs, **and live telematics data**
- Implements a chain-of-reasoning approach where the AI first identifies affected systems, then narrows to specific components, then generates repair procedures
- Uses structured output parsing to extract actionable data (fault codes, part numbers, severity ratings) from AI responses
- Maintains conversational context across a diagnostic session via message history management
- **Injects real-time vehicle computer state into the conversation context**, allowing the AI to reference actual sensor values (e.g., "Your coolant temperature is currently 228°F, which combined with fault code SPN 110/FMI 16 suggests...")

**4.2. Telematics Integration Architecture (NEW)**

| Component | Technology |
|-----------|-----------|
| OAuth Flow | Server-side OAuth 2.0 with secure state persistence |
| Token Storage | AES-256-GCM encrypted tokens in PostgreSQL |
| Token Refresh | Vercel Cron (hourly auto-refresh) |
| Data Normalization | Provider-specific adapters → 65+ canonical signals |
| Snapshot Assembly | Aggregation engine with 5-minute staleness threshold |
| AI Interpretation | Google Gemini 2.5 Flash with structured JSON schema output |
| Webhook Ingestion | HMAC-SHA256 verified, raw + normalized storage |
| Real-time Sync | 7 parallel API calls to provider (vehicles, faults, locations, diagnostics, engine summary, fuel data, IFTA) |

**4.3. Technology Stack**

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18.3 with JSX |
| Build System | Vite 6 |
| Styling | Tailwind CSS 3 with shadcn/ui component library |
| Authentication | Supabase Auth (email/password, session management) |
| Database | Supabase PostgreSQL with Row Level Security |
| AI Models | Google Gemini 2.5 Flash (diagnostic chat + telematics interpretation) |
| Telematics Providers | Motive (KeepTruckin) API, Samsara API (extensible) |
| Token Encryption | AES-256-GCM via Node.js crypto |
| Payments | Stripe (subscription management) |
| Maps | Google Maps JavaScript API |
| Video Integration | YouTube Data API v3 |
| Deployment | Vercel Edge Network with Serverless Functions |
| Internationalization | Custom React Context-based i18n system |

**4.4. Source Code Structure**

The implementation comprises 165+ source files organized as:

- 7 page-level route components
- 40+ specialized UI components across 7 feature domains (diagnostics, community, parts, profile, reports, services, UI library)
- **12 telematics backend modules** (OAuth, token vault, provider adapters, snapshot builder, AI interpreter, chat bridge, webhook handlers, signal normalizers, capability matrix, vehicle mapper, token refresh cron)
- 5 service modules (AI, authentication, entity management, audio analysis, video search)
- **1 telematics frontend service** (provider connection, vehicle mapping, scan, status)
- Complete bilingual translation corpus (English, Russian)
- Truck-specific data models and knowledge base
- **12 database migration files** including telematics schema with encrypted token storage, vehicle snapshots, fault events, signal events, and webhook state

---

### 5. Claims of Novelty

The following aspects are believed to be novel individually and in combination:

1. **Claim 1:** A method for diagnosing commercial truck mechanical faults by simultaneously correlating natural language descriptions, standardized fault codes, acoustic recordings, photographic inputs, **and live ECU data obtained via telematics provider integration** within a single AI-powered diagnostic session.

2. **Claim 2:** A system for generating adaptive repair instructions parameterized by vehicle specification, diagnosed fault, available tools, operator skill level, environmental conditions, **and real-time vehicle sensor values from the onboard computer**, with real-time adjustment based on user feedback during the repair process.

3. **Claim 3:** A method for ranking nearby service facilities by computing a composite score that incorporates diagnostic relevance to the specific identified fault, geographic proximity, facility ratings, and estimated availability.

4. **Claim 4:** A self-improving repair knowledge base that matches community-submitted verified solutions to new diagnostic cases using semantic similarity, with quality controlled by a reputation-weighted voting system.

5. **Claim 5:** A bilingual technical interface system that provides context-aware translation of automotive diagnostic terminology while maintaining diagnostic session state across language transitions.

6. **Claim 6 (NEW):** A method for acquiring real-time vehicle electronic control unit (ECU) data from commercial trucks through third-party telematics provider APIs (ELD devices such as Motive and Samsara), normalizing 65+ sensor signals from provider-specific formats into a unified canonical schema, and feeding the normalized data into an AI diagnostic interpretation engine that cross-references fault codes with live sensor readings to produce structured diagnostic assessments including severity classification, safe-to-drive determination, and fault correlation analysis.

7. **Claim 7 (NEW):** A system for one-click vehicle scanning that: (a) automatically resolves the target vehicle from the user's telematics connection without manual selection, (b) retrieves live data from the truck's onboard computer through the existing ELD hardware, (c) passes the complete vehicle state through an AI interpretation engine, and (d) injects both raw data and AI interpretation into an ongoing diagnostic chat session, creating a feedback loop where subsequently asked questions are answered with full awareness of the vehicle's actual computer state.

8. **Claim 8 (NEW):** A secure token management system for telematics provider OAuth credentials that encrypts refresh tokens using AES-256-GCM with a server-side master key before database storage, implements automatic token refresh via scheduled execution, and verifies incoming webhook payloads using HMAC-SHA256 signatures — ensuring that at no point are plaintext credentials persisted or webhook data accepted without cryptographic verification.

9. **Claim 9:** The integrated combination of Claims 1-8 into a unified truck repair assistance platform accessible via a web browser, where telematics data acquisition, AI interpretation, conversational diagnostics, service discovery, parts matching, and community knowledge operate as a single cohesive system.

---

### 6. Prior Art Differentiation

| Existing Solution | Limitation | This Invention's Advancement |
|-------------------|-----------|------------------------------|
| OBD-II scan tools | Single-modal (code only), no AI interpretation, requires physical scanner | Multi-modal AI correlation of codes + text + audio + photo + live ECU data via existing ELD hardware |
| General AI chatbots (ChatGPT, etc.) | No vehicle-specific context, no integrated services, no live data | Truck-parameterized prompts, integrated service/parts discovery, live ECU data awareness |
| Repair manual databases (AllData, Mitchell) | Static content, not adaptive to situation | Dynamic AI-generated instructions adapted to specific context and live sensor values |
| Service finder apps (Yelp, Google Maps) | Generic location search, not diagnostic-aware | Rankings incorporate specific diagnosed fault relevance |
| Forum-based communities (TruckersReport) | Unstructured, no semantic matching | Structured solutions with automated matching to diagnostic cases |
| Fleet telematics dashboards (Motive, Samsara) | Data presentation only, no AI diagnostic interpretation, designed for fleet managers not mechanics | Consumer-facing AI diagnostic engine that ingests telematics data and produces actionable repair guidance |
| Standalone OBD-II AI apps (FIXD, Carly) | Require dedicated OBD-II dongle, limited to light-duty vehicles, no J1939 support | Uses existing ELD hardware (no additional hardware purchase), full J1939 commercial truck support, 65+ signal coverage |

---

### 7. Commercial Applications

- **Independent truck operators** — one-click roadside diagnostics using existing ELD hardware, AI-powered fault interpretation, nearest-capable-shop finding
- **Fleet management companies** — standardized diagnostic workflows across multilingual driver populations, centralized vehicle health monitoring
- **Truck repair shop chains** — AI-assisted intake and diagnosis with live vehicle data to improve technician efficiency
- **Insurance companies** — standardized diagnostic documentation with time-stamped ECU data for claims processing
- **OEM warranty departments** — structured fault documentation with correlated sensor data and repair verification
- **ELD/telematics providers** — value-added diagnostic intelligence layer on top of existing hardware infrastructure

---

### 8. Development Timeline

| Date | Milestone |
|------|-----------|
| June 6, 2025 | v1.0 — Initial prototype with basic AI chat diagnostics (first commit) |
| June 7, 2025 | v1.0 Patent Disclosure published on GitHub |
| 2025 | v2.0 — TypeScript rewrite, expanded services, Supabase integration |
| February 2026 | v3.0 — Complete architectural rewrite: multi-modal diagnostics, bilingual i18n (EN/RU), new JSX architecture, production deployment |
| February 8, 2026 | v3.0 Patent Disclosure published on GitHub |
| March 2026 | v3.1 — **Telematics integration**: Motive/Samsara OAuth, 65+ canonical ECU signals, AES-256-GCM token vault, AI-powered snapshot interpretation (Improbability Drive), webhook-based real-time data ingestion, one-click SCAN TRUCK, automatic vehicle resolution, chat context injection, provider capability matrix, normalized fault/signal event pipeline |
| March 7, 2026 | v3.1 Patent Disclosure published on GitHub |

---

### 9. Inventor Declaration

I, **Margarita Makeeva**, declare that I am the sole inventor of the system described in this disclosure. The concepts, architecture, and implementation described herein are my original work. This disclosure is made to establish a public record of the invention and its date of conception.

This document supersedes and extends all prior Patent Disclosures: v1.0 (June 7, 2025) and v3.0 (February 8, 2026).

**Inventor:** Margarita Makeeva
**Date:** March 7, 2026

---

### 10. Intellectual Property Notice

Copyright 2025-2026 Margarita Makeeva. All Rights Reserved.

This document and the associated software constitute proprietary intellectual property. No license is granted for commercial reproduction, adaptation, or implementation of the methods, algorithms, systems, or architectural patterns described herein without explicit written permission from the inventor.

The public disclosure of this document on GitHub establishes a prior art date of **March 7, 2026** for all new claims described in this version (Claims 6-9). The prior art date of **February 8, 2026** is preserved for Claims 1-5 as described in Patent Disclosure v3.0. The original prior art date of **June 7, 2025** is preserved for claims present in Patent Disclosure v1.0.