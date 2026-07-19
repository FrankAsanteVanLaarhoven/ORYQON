# ORYQON authorization policy — default-deny.
#
# The externalized decision policy for the OPA sidecar. It mirrors, rule for
# rule, the in-process evaluator in ../src/policy/policy-engine.ts. First match
# wins; anything unmatched is denied.
package oryqon.authz

import rego.v1

publish_actions := {"PUBLISH_CONTENT", "ACTIVATE_OFFER"}

price_actions := {"PRICE_CHANGE"}

low_risk_allow := {"IMPORT_PRODUCT", "COMPILE_CHANNEL_VARIANT"}

high_risk := 4

decision := "DENY" if input.expired

else := "DENY" if {
	publish_actions[input.actionType]
	not input.hasEvidence
}

else := "REVIEW" if high_risk_publish_or_price

else := "ALLOW" if low_risk_import_compile

else := "DENY"

reason := "ACTION_EXPIRED" if input.expired

else := "PUBLISH_WITHOUT_EVIDENCE" if {
	publish_actions[input.actionType]
	not input.hasEvidence
}

else := "HIGH_RISK_REQUIRES_REVIEW" if high_risk_publish_or_price

else := "LOW_RISK_ALLOWED" if low_risk_import_compile

else := "DEFAULT_DENY"

high_risk_publish_or_price if {
	publish_actions[input.actionType]
	input.riskClass >= high_risk
}

high_risk_publish_or_price if {
	price_actions[input.actionType]
	input.riskClass >= high_risk
}

low_risk_import_compile if {
	low_risk_allow[input.actionType]
	input.riskClass < high_risk
}
