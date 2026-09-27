"use strict";

const { idempotencyHeaders, unwrapIdempotentResult } = require("../request");

const perform = async (z, bundle) => {
  const response = await z.request({
    method: "POST",
    url: `${bundle.authData.baseUrl}/api/v1/partners/cases`,
    headers: idempotencyHeaders(bundle.inputData.requestId),
    body: {
      applicationId: bundle.inputData.applicationId,
      caseId: bundle.inputData.caseId,
    },
  });
  return unwrapIdempotentResult(response);
};

module.exports = {
  key: "create_partner_case",
  noun: "Partner Case",
  display: {
    label: "Create Partner Case",
    description: "Creates a synthetic partner onboarding case.",
  },
  operation: {
    inputFields: [
      { key: "requestId", label: "Request ID", required: true },
      { key: "applicationId", label: "Application ID", required: true },
      { key: "caseId", label: "Case ID", required: true },
    ],
    perform,
    sample: {
      applicationId: "partner-application-001",
      caseId: "partner-case-001",
      status: "OPEN",
      replayed: false,
    },
  },
};
