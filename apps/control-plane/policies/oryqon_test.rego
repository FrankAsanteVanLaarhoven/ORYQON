# Unit tests for the ORYQON authorization policy. Run with `opa test policies/`.
package oryqon.authz_test

import rego.v1

import data.oryqon.authz

test_expired_denies if {
	authz.decision == "DENY" with input as {"actionType": "PUBLISH_CONTENT", "riskClass": 1, "hasEvidence": true, "expired": true}
	authz.reason == "ACTION_EXPIRED" with input as {"actionType": "PUBLISH_CONTENT", "riskClass": 1, "hasEvidence": true, "expired": true}
}

test_publish_without_evidence_denies if {
	authz.decision == "DENY" with input as {"actionType": "PUBLISH_CONTENT", "riskClass": 1, "hasEvidence": false, "expired": false}
	authz.reason == "PUBLISH_WITHOUT_EVIDENCE" with input as {"actionType": "PUBLISH_CONTENT", "riskClass": 1, "hasEvidence": false, "expired": false}
}

test_high_risk_publish_reviews if {
	authz.decision == "REVIEW" with input as {"actionType": "PUBLISH_CONTENT", "riskClass": 5, "hasEvidence": true, "expired": false}
}

test_high_risk_price_reviews if {
	authz.decision == "REVIEW" with input as {"actionType": "PRICE_CHANGE", "riskClass": 4, "hasEvidence": true, "expired": false}
}

test_low_risk_import_allows if {
	authz.decision == "ALLOW" with input as {"actionType": "IMPORT_PRODUCT", "riskClass": 1, "hasEvidence": false, "expired": false}
}

test_unmatched_denies_by_default if {
	authz.decision == "DENY" with input as {"actionType": "SOMETHING_NEW", "riskClass": 2, "hasEvidence": true, "expired": false}
	authz.reason == "DEFAULT_DENY" with input as {"actionType": "SOMETHING_NEW", "riskClass": 2, "hasEvidence": true, "expired": false}
}
