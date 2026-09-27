"use strict";

const { idempotencyHeaders, unwrapIdempotentResult } = require("../request");

const perform = async (z, bundle) => {
  const response = await z.request({
    method: "POST",
    url: `${bundle.authData.baseUrl}/api/v1/partners/verifications`,
    headers: idempotencyHeaders(bundle.inputData.requestId),
    body: {
      applicationId: bundle.inputData.applicationId,
      documentReferences: bundle.inputData.documentReferences,
    },
  });
  return unwrapIdempotentResult(response);
};

module.exports = {
  key: "verify_partner_documents",
  noun: "Partner Verification",
  display: {
    label: "Verify Partner Documents",
    description:
      "Records synthetic document verification with replay-safe idempotency.",
  },
  operation: {
    inputFields: [
      { key: "requestId", label: "Request ID", required: true },
      { key: "applicationId", label: "Application ID", required: true },
      {
        key: "documentReferences",
        label: "Document References",
        list: true,
        required: true,
      },
    ],
    perform,
    sample: {
      applicationId: "partner-application-001",
      status: "VERIFIED",
      replayed: false,
    },
  },
};
