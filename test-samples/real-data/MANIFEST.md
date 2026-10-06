# Real public sample documents — MANIFEST

Fetched 2026-10-07 for DocSetu demo use. Download only: nothing was uploaded anywhere, and no file was edited, re-encoded or resized (no TIFs were encountered, so no conversion was needed). Each file was fetched individually; no full dataset was downloaded.

Sizes are in bytes. Every image is under 2.4 MB. Every PDF is under 8 MB except one, which is flagged below.

## 1. IndicDLP — `indicdlp/`

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `indicdlp_rp_as_000229_0.png` | https://raw.githubusercontent.com/AI4Bharat/IndicDLP/main/data/examples/rp_as_000229_0.png | MIT (licence of the GitHub repo AI4Bharat/IndicDLP) | PNG 1654x2339 | 344373 | Clean Assamese research-paper page (p. 239): body prose with a footnote. |
| `indicdlp_rp_as_000242_0.png` | https://raw.githubusercontent.com/AI4Bharat/IndicDLP/main/data/examples/rp_as_000242_0.png | MIT (same repo) | PNG 1654x2339 | 223718 | Clean Assamese research-paper page (p. 252): paragraphs of narrative prose. |

Notes: the full dataset on Hugging Face (`ai4bharat/indicdlp`) is gated and needs a login plus accepting its terms, so it was not used. The repo contains only 4 clean (unannotated) example pages, all in Assamese. Its Malayalam image (`fig/images/sy_ml_000721_0.png`) has the layout-annotation boxes drawn over it, so it was left out as unsuitable for OCR.

## 2. Mozhi (IIIT Hyderabad CVIT) — `mozhi/` (Malayalam)

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `mozhi_ml_test_064.jpg` | HF datasets-server rows API, `darknight054/indic-mozhi-ocr`, config `malayalam`, split `test`, row 64 (https://datasets-server.huggingface.co/rows?dataset=darknight054/indic-mozhi-ocr&config=malayalam&split=test&offset=64&length=1) | No licence stated. The HF mirror says "refer to the source page" (https://cvit.iiit.ac.in/usodi/tdocrmil.php) | JPEG 620x48 | 7685 | Printed Malayalam word-image crop. Ground truth: ശരീരസുഖസൌകര്യാദികളും |
| `mozhi_ml_test_077.jpg` | Same mirror, `malayalam/test` row 77 | Same as above | JPEG 584x48 | 7269 | Printed Malayalam word-image crop. Ground truth: പഠിച്ചുകൊണ്ടിരുന്നപ്പോഴാണ്, |

Notes: Mozhi is a word-level dataset, so these are single-word strips, not full pages. They are fine for testing Malayalam OCR but will look sparse in the app.

## 3. RVL-CDIP — `rvl-cdip/`

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `rvlcdip_test000_letter.jpg` | HF rows API, `nielsr/rvl_cdip_10_examples_per_class`, split `test`, row 0 (label 0 = letter) | RVL-CDIP is a subset of IIT-CDIP / Legacy Tobacco Document Library. Terms: https://www.industrydocuments.ucsf.edu/help/copyright/ (HF tag `license:other`) | JPEG 778x1000 (grayscale) | 169252 | Noisy scanned letter from Université de Sherbrooke to Dr. R. L. Lehman (Rutgers) reporting TG/DTG/FTIR analysis results. The date is partly illegible (Aug 198x). |
| `rvlcdip_test150_memo.jpg` | Same mirror, split `test`, row 150 (label 15 = memo) | Same as above | JPEG 762x1000 (grayscale) | 62921 | Brown & Williamson R&D memo dated December 15, 1993: product-monitoring results, with a small tar/nicotine table. |

Notes: the original RVL-CDIP images are TIFs. The HF mirror serves JPEG, so the files are kept in that format as served. The official archive (`aharley/rvl_cdip`) is a single ~38 GB tar, so it was not used.

## 4. DocVQA — `docvqa/`

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `docvqa_val_9.jpg` | HF rows API, `nielsr/docvqa_1200_examples`, split `test`, row 1 (DocVQA id `val_9`) | No licence on the mirror. Images come from the UCSF Industry Documents Library (footer: industrydocuments.ucsf.edu/docs/zxfk0226). The official DocVQA download (rrc.cvc.uab.es) needs registration. | JPEG 1750x2270 | 302499 | Robert A. Welch Foundation "Budget Request Summary" form (May 1966 – Apr 1967), with amounts. Sample Q: total other expenses? A: $975.00 |
| `docvqa_val_10.jpg` | Same mirror, split `test`, row 2 (`val_10`) | Same as above (footer: docs/zxpp0227) | JPEG 850x1644 | 151579 | Meeting agenda page with times (TRRF General Session, coffee break, interviews). Sample Q: who is presiding? A: TRRF Vice President / Lee A. Waller |

## 5. FUNSD — `funsd/`

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `funsd_test_0.jpg` | HF rows API, `nielsr/funsd`, split `test`, row 0 | Not stated on the mirror. The official site (https://guillaumejaume.github.io/FUNSD/) has a "License" link, but its text could not be retrieved. Check it before any non-research use. | JPEG 754x1000 | 98065 | Ohio Attorney General confidential fax cover sheet dated 12/10/98, with TO / fax / phone / pages fields. |
| `funsd_test_1.jpg` | Same mirror, split `test`, row 1 | Same as above | JPEG 754x1000 | 84608 | Lorillard form dated 09/17/97: progress report on Old Gold menthol lights, with region/division fields and an accounts table. |

## 6. IIIT-AR-13K — `iiit-ar-13k/`

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `ar_alstom_2010_eng_124.jpg` | https://cvit.iiit.ac.in/usodi/img/projects/detection/iiit-ar-13/dataset/IIIT-AR-13K_dataset.zip → `test_images.zip` → `test_images/ar_alstom_2010_eng_124.jpg` | No licence text on the project page (https://cvit.iiit.ac.in/usodi/iiitar13k.php). Research dataset; cite the IIIT-AR-13K paper. | JPEG 827x1169 | 283669 | Alstom Registration Document 2010/11, p. 10: "Main Partnerships & Projects Portfolio" chart plus two-column text. |
| `ar_siemens_2011_eng_209.jpg` | Same zip, `test_images/ar_siemens_2011_eng_209.jpg` | Same as above | JPEG 827x1169 | 254026 | Siemens Annual Report 2011, p. 196: notes 21–23 (other liabilities, debt), with financial tables. |

Notes: the archive is 2.97 GB, made of nested zips. Only about 3 MB was streamed, using HTTP range requests and the start of the inner `test_images.zip`, to pull these two individual images.

## 7. KMRL / Kerala Government documents — `kmrl-kerala-govt/`

All are text PDFs (extractable text verified with pypdf). The official sites state no explicit licence; these are publicly published government or PSU documents.

### Tenders

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `kmrl_tender_contract_award_notice_KBC3.pdf` | https://kochimetro.org/tenders/site_media/news/Contract_Award_Notice_KBC.pdf | Public notice on kochimetro.org | PDF, 4 pp | 386864 | KMRL Contract Award Notice for tender 2023_KMRL_599346_1 (KMRL/PROC/TENDER/2023-24/231). Covers Phase II viaduct + 10 stations, JLN Stadium–Infopark, with the bidders list. Contact email: queries@kmrl.co.in |
| `kseb_tender_NIT_PMU-KKD_03-24-25.pdf` | https://kseb.in/uploads/TenderItem/PMU-KKD-e%20TENDER-03-24-25-25-07-2024-17219061511817826297.pdf | Public notice on kseb.in (Kerala State Electricity Board Ltd, state PSU) | PDF, 2 pp | 115271 | KSEB Notice Inviting Tender, 11 kV feeder Kinalur–Koottalida. Has EMD, PAC and fee; published 25-07-2024; bid deadlines on 06-08-2024 and 13-08-2024. |
| `anert_etender_details_2020_ANERT_363783_1.pdf` (extra) | https://anert.gov.in/assets/web_user/images/tenders/883722.pdf | Public, anert.gov.in (Govt of Kerala agency) | PDF, 4 pp | 487996 | "eTendering System Government of Kerala" tender-details printout, ANERT-TECH/133/2019. Has fees, EMD, and publish / bid-submission / opening dates (June–July 2020). |

Why not KMRL's own NITs: the tender listing on kochimetro.org/tenders shows the bid deadlines, but every tender document there is behind a sign-in ("Please sign in to download this document"). The only public KMRL tender PDF was the contract award notice above. Two Kerala-government NITs with explicit bid due dates were added instead.

### Annual reports

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `kmrl_annual_report_2013-14.pdf` | https://kochimetro.org/wp-content/uploads/2015/01/kochi_metro_pages_english_new_CTP.compressed.pdf (linked from https://kochimetro.org/annual-reports/) | Public, kochimetro.org | PDF, 60 pp | 2229723 | KMRL Annual Report for FY 2013-14: board of directors, AGM notice, chairman's letter, directors' report, financial statements, auditor and CAG comments. |
| `kmrl_annual_report_2017-18.pdf` | https://kochimetro.org/wp-content/uploads/2018/01/KMRL_AR_2018-19_ENG.pdf | Public, kochimetro.org | PDF, 104 pp | 8418915 | KMRL Annual Report covering FY 2017-18 (the site file name says 2018-19). Includes AGM notice, directors' report, corporate governance, financials and CAG comments. **Slightly over the ~8 MB target (8.4 MB).** It is the smallest other English KMRL annual report available; every other one is 10–150 MB. |

### RTI documents

| File | Origin URL | Licence / terms | Type | Size | Description |
|---|---|---|---|---|---|
| `kmrl_rti_applications_under_rti_act.pdf` | https://kochimetro.org/kmrl_portal/site_media/rti/applications_under_rti_act.pdf (from https://kochimetro.org/rti/) | Public, kochimetro.org RTI disclosure | PDF, 2 pp | 274070 | KMRL guidance on filing RTI applications and appeals: CPIO address, fee Rs.10, payment modes. Email: rti@kmrl.co.in |
| `kmrl_rti_annual_report_2024-25.pdf` | https://kochimetro.org/kmrl_portal/site_media/rti/RTI%20Annual%20Report%202024-25.pdf | Public, kochimetro.org RTI disclosure | PDF, 1 p | 491227 | KMRL RTI Annual Return for 1 Apr 2024 – 31 Mar 2025: requests and appeals, fees collected, Section 8 exemptions invoked. |

## Skipped or partial

- **IndicDLP (full dataset):** gated on Hugging Face (login plus terms acceptance), so it was skipped. Two clean pages came from the public GitHub repo instead, but there were no clean Malayalam pages there.
- **Mozhi page-level samples:** none exist; the dataset is word-level crops only.
- **KMRL tender NIT documents:** need sign-in on kochimetro.org. Substitutes are listed above.
- No source was fully unreachable.
