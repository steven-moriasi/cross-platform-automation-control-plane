"use strict";

const { idempotencyHeaders, unwrapIdempotentResult } = require("../request");

const perform = async (z, bundle) => {
  const response = await z.request({
    method: "PATCH",
    url: `${bundle.authData.baseUrl}/api/v1/partners/cases/${bundle.inputData.caseId}/status`,
    headers: idempotencyHeaders(bundle.inputData.requestId),
    body: {
      status: bundle.inputData.status,
    },
  });
  return unwrapIdempotentResult(response);
};

module.exports = {
  key: "update_partner_status",
  noun: "Partner Case",
  display: {
    label: "Update Partner Status",
    description: "Advances a synthetic onboarding case.",
  },
  operation: {
    inputFields: [
      { key: "requestId", label: "Request ID", required: true },
      { key: "caseId", label: "Case ID", required: true },
      {
        key: "status",
        label: "Status",
        choices: ["APPROVED", "REJECTED", "REQUIRES_INFORMATION"],
        required: true,
      },
    ],
    perform,
    sample: {
      applicationId: "partner-application-001",
      caseId: "partner-case-001",
      status: "APPROVED",
      replayed: false,
    },
  },
};
