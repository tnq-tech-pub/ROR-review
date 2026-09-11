# Legal & Compliance Document

**Product:** Affiliation Review (ROR Review)  
**Maintainer:** TNQTech (open-source contribution)  
**Repository:** [https://github.com/tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)  
**Last updated:** August 2026

This document summarizes licensing, branding, privacy, disclaimer, and compliance expectations for publishing and operating Affiliation Review as open source.

---

## 1. Product positioning (important)

Affiliation Review is:

- Developed and maintained by **TNQTech** as an open-source contribution supporting the ROR community
- An **independent community tool**
- **Not** an official ROR service
- **Not** a channel for automatic acceptance of organizations into the ROR registry

Submitted reviews and insertion drafts created with this tool remain subject to the official
[ROR curation process](https://ror.org/).

In-app disclaimer (required messaging):

> This is an independent community tool and is not an official ROR service. Submitted reviews are subject to the ROR curation process.

---

## 2. Software licensing

### 2.1 Application source code

- **License:** MIT License
- **Copyright:** TNQ Tech - Public (see repository `LICENSE`)
- **Repository:** [tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)

Under MIT, recipients may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to including the copyright and permission notice.

### 2.2 Recommended notice in distributions

Include:

1. The MIT `LICENSE` file
2. Attribution to TNQTech / repository URL
3. Clear separation between software license and ROR data license

---

## 3. Data licensing

### 3.1 ROR registry data and schemas

- **License:** Creative Commons CC0 1.0 Universal
- **Reference:** [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- ROR data accessed via the public API should be treated under ROR’s published data terms (CC0 for registry data/schemas as communicated by ROR).

### 3.2 User-provided content

Affiliation strings, remarks, verification outcomes, and insertion drafts are supplied by users/operators of a deployment. Those parties are responsible for ensuring they have rights to process that content and for any confidentiality obligations.

---

## 4. Branding and third-party marks

### 4.1 ROR

- ROR name/logo usage must follow
  [ROR logos and display guidelines](https://ror.readme.io/docs/display)
- Prefer official SVG assets
- Do not imply official endorsement or operation by ROR
- Brand colors commonly referenced by ROR guidance include `#53baa1` and `#2c2c2c`

### 4.2 TNQTech

- Use official TNQTech logo assets (for example, reverse logo for dark backgrounds)
- Tagline usage: “A Lumina Datamatics Company” as provided in official assets
- Do not alter logo artwork in ways that violate brand rules

### 4.3 GitHub / other marks

Use third-party marks only as needed for factual linking (for example, “Go to GitHub”).

---

## 5. Privacy

### 5.1 Application privacy policy

Primary privacy policy for this application:

- [https://ror.org/about/privacy/](https://ror.org/about/privacy/)

TNQTech’s corporate privacy policy applies to TNQTech’s own website and related TNQ channels, not as the primary privacy notice for this application.

### 5.2 Application data considerations

The application may process:

- Affiliation text pasted or uploaded by users
- Reviewer comments / remarks
- Verification outcomes
- Organization insertion draft fields
- Match results returned by the ROR API

Default architecture stores this data on the filesystem of the deployment host (`ror_results/`).  
There is no built-in end-user authentication in the default distribution.

### 5.3 Operator obligations

Deployers should:

- Restrict access to production instances
- Use HTTPS in production
- Define retention and deletion policies for `ror_results/`
- Avoid uploading unnecessary personal data
- Inform internal users how review data is stored in their environment

---

## 6. Security and compliance posture

See also the in-app page: `/security`

Key points for open-source operators:

| Topic | Guidance |
|---|---|
| Transport security | Terminate TLS at reverse proxy in production |
| Access control | Add auth/network controls; app is open by default |
| Secrets | Do not commit credentials, private proxies, or private result dumps |
| Dependencies | Keep Python packages and base images updated |
| External API | Depends on public ROR API availability and fair use |
| Integrity | CSV appends use file locking to reduce concurrent-write corruption |

This tool does **not** claim formal certification (for example SOC 2 / ISO) by itself. Enterprise compliance is the responsibility of the deploying organization.

---

## 7. Accessibility

See also the in-app page: `/accessibility`

Commitment summary:

- Aim toward WCAG 2.1 Level AA practices where practical ([WCAG 2.1](https://www.w3.org/TR/WCAG21/))
- Provide text alternatives for key images
- Support keyboard use for primary workflows
- Document known limitations and accept accessibility feedback via [GitHub Issues](https://github.com/tnq-tech-pub/ROR-review/issues)

---

## 8. Terms of use summary

See also the in-app page: `/terms`

Users/operators agree that:

1. The tool is provided as-is for lawful scholarly/publishing workflows
2. Match outputs require human review
3. Exports are not automatic ROR acceptances
4. Misuse, overload, or unauthorized data processing is prohibited
5. Liability is limited to the extent permitted by applicable law and the MIT license warranty disclaimer

---

## 9. Open-source release checklist

Before publishing or updating a public release:

- [ ] MIT `LICENSE` present and accurate
- [ ] README states purpose, stack, and that the tool is not an official ROR service
- [ ] Contribution statement uses community-contributor wording (TNQTech)
- [ ] Disclaimer visible in UI footer/contribute panel
- [ ] Software vs data licensing separated (MIT vs CC0)
- [ ] Privacy Policy link points to [ROR Privacy Policy](https://ror.org/about/privacy/)
- [ ] Terms / Security / Accessibility pages available (`/terms`, `/security`, `/accessibility`)
- [ ] Accessibility statement links WCAG 2.1 to [https://www.w3.org/TR/WCAG21/](https://www.w3.org/TR/WCAG21/)
- [ ] Accessibility blockers reportable via [GitHub Issues](https://github.com/tnq-tech-pub/ROR-review/issues)
- [ ] GitHub link points to [tnq-tech-pub/ROR-review](https://github.com/tnq-tech-pub/ROR-review)
- [ ] ROR and TNQTech logos used per brand guidance
- [ ] No secrets, private customer data, or unsanitized production dumps in the repo
- [ ] Deployment docs include HTTPS/access-control recommendations

---

## 10. Contribution expectations

Contributions via GitHub are welcome under the repository’s MIT license terms.

Suggested contribution types:

- Bug fixes and tests
- Accessibility improvements
- Documentation updates
- Deployment hardening examples
- UI clarity improvements that preserve disclaimer/licensing messaging

Do not contribute changes that remove required disclaimers, misrepresent ROR endorsement, or weaken licensing clarity without maintainer review.

---

## 11. Contact and references

| Resource | URL |
|---|---|
| Source repository | https://github.com/tnq-tech-pub/ROR-review |
| Accessibility issues | https://github.com/tnq-tech-pub/ROR-review/issues |
| TNQTech | https://tnqtech.com/ |
| ROR Privacy Policy | https://ror.org/about/privacy/ |
| ROR home | https://ror.org/ |
| ROR API / docs | https://ror.readme.io/ |
| ROR REST API rate limits | https://ror.readme.io/docs/rest-api |
| ROR API client ID | https://ror.readme.io/docs/client-id |
| ROR display guidelines | https://ror.readme.io/docs/display |
| WCAG 2.1 | https://www.w3.org/TR/WCAG21/ |
| MIT License | https://opensource.org/licenses/MIT |
| CC0 1.0 | https://creativecommons.org/publicdomain/zero/1.0/ |

---

## 12. Related documents

- [Design Document](./DESIGN.md)
- [Deployment Procedure](./DEPLOYMENT.md)
- In-app legal pages: `/terms`, `/security`, `/accessibility`
